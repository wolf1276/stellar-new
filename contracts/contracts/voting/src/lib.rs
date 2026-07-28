#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, Address, Env, String, Vec,
};

/// Minimum voting window, guards against a deadline that closes before anyone can vote.
const MIN_VOTING_SECONDS: u64 = 60;

#[contracttype]
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum ProposalStatus {
    Active,
    Closed,
    Executed,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum VoteChoice {
    Yes,
    No,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub creator: Address,
    pub created_at: u64,
    pub deadline: u64,
    pub status: ProposalStatus,
    pub yes_votes: u32,
    pub no_votes: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    ProposalCount,
    Proposal(u32),
    Voted(u32, Address), // (proposal_id, voter) -> VoteChoice
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    ProposalNotFound = 1,
    AlreadyVoted = 2,
    VotingClosed = 3,
    InvalidDeadline = 4,
    Unauthorized = 5,
    InvalidProposal = 6,
    AlreadyExecuted = 7,
    VotingStillActive = 8,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct ProposalCreated {
    #[topic]
    pub proposal_id: u32,
    pub creator: Address,
    pub title: String,
    pub deadline: u64,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct VoteCast {
    #[topic]
    pub proposal_id: u32,
    #[topic]
    pub voter: Address,
    pub choice: VoteChoice,
    pub yes_votes: u32,
    pub no_votes: u32,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct ProposalClosed {
    #[topic]
    pub proposal_id: u32,
    pub yes_votes: u32,
    pub no_votes: u32,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct ProposalExecuted {
    #[topic]
    pub proposal_id: u32,
    pub passed: bool,
}

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    /// Creates a proposal that is votable until `deadline` (unix seconds, must be
    /// strictly in the future by at least `MIN_VOTING_SECONDS`). Returns the new
    /// proposal's id.
    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        deadline: u64,
    ) -> Result<u32, Error> {
        creator.require_auth();

        if title.is_empty() || description.is_empty() {
            return Err(Error::InvalidProposal);
        }

        let now = env.ledger().timestamp();
        if deadline < now + MIN_VOTING_SECONDS {
            return Err(Error::InvalidDeadline);
        }

        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);

        let proposal = Proposal {
            id,
            title: title.clone(),
            description,
            creator: creator.clone(),
            created_at: now,
            deadline,
            status: ProposalStatus::Active,
            yes_votes: 0,
            no_votes: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(id), &proposal);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &(id + 1));

        ProposalCreated {
            proposal_id: id,
            creator,
            title,
            deadline,
        }
        .publish(&env);

        Ok(id)
    }

    /// Casts `choice` on behalf of `voter`. One vote per wallet per proposal;
    /// rejected once the deadline has passed (the proposal is lazily closed).
    pub fn vote(env: Env, voter: Address, proposal_id: u32, choice: VoteChoice) -> Result<(), Error> {
        voter.require_auth();

        let mut proposal = Self::load_proposal(&env, proposal_id)?;
        let now = env.ledger().timestamp();

        if now >= proposal.deadline {
            Self::close_if_expired(&env, &mut proposal);
            return Err(Error::VotingClosed);
        }
        if proposal.status != ProposalStatus::Active {
            return Err(Error::VotingClosed);
        }

        let voted_key = DataKey::Voted(proposal_id, voter.clone());
        if env.storage().persistent().has(&voted_key) {
            return Err(Error::AlreadyVoted);
        }

        match choice {
            VoteChoice::Yes => proposal.yes_votes += 1,
            VoteChoice::No => proposal.no_votes += 1,
        }

        env.storage().persistent().set(&voted_key, &choice);
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        VoteCast {
            proposal_id,
            voter,
            choice,
            yes_votes: proposal.yes_votes,
            no_votes: proposal.no_votes,
        }
        .publish(&env);

        Ok(())
    }

    /// Finalizes a proposal after its deadline: marks it Closed (or Executed if
    /// it passed, i.e. yes_votes > no_votes). Callable by anyone once expired.
    pub fn execute_proposal(env: Env, proposal_id: u32) -> Result<bool, Error> {
        let mut proposal = Self::load_proposal(&env, proposal_id)?;
        let now = env.ledger().timestamp();

        if proposal.status == ProposalStatus::Executed {
            return Err(Error::AlreadyExecuted);
        }
        if now < proposal.deadline {
            return Err(Error::VotingStillActive);
        }

        let passed = proposal.yes_votes > proposal.no_votes;
        proposal.status = ProposalStatus::Executed;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        ProposalExecuted {
            proposal_id,
            passed,
        }
        .publish(&env);

        Ok(passed)
    }

    pub fn get_proposal(env: Env, proposal_id: u32) -> Result<Proposal, Error> {
        let mut proposal = Self::load_proposal(&env, proposal_id)?;
        Self::close_if_expired(&env, &mut proposal);
        Ok(proposal)
    }

    pub fn get_all_proposals(env: Env) -> Vec<Proposal> {
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);

        let mut proposals = Vec::new(&env);
        for id in 0..count {
            if let Ok(mut proposal) = Self::load_proposal(&env, id) {
                Self::close_if_expired(&env, &mut proposal);
                proposals.push_back(proposal);
            }
        }
        proposals
    }

    pub fn has_voted(env: Env, proposal_id: u32, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Voted(proposal_id, voter))
    }

    fn load_proposal(env: &Env, proposal_id: u32) -> Result<Proposal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)
    }

    /// Persists Active -> Closed once past the deadline, and emits ProposalClosed.
    /// No-op for proposals that are already Closed/Executed or still active.
    fn close_if_expired(env: &Env, proposal: &mut Proposal) {
        if proposal.status == ProposalStatus::Active && env.ledger().timestamp() >= proposal.deadline {
            proposal.status = ProposalStatus::Closed;
            env.storage()
                .persistent()
                .set(&DataKey::Proposal(proposal.id), proposal);
            ProposalClosed {
                proposal_id: proposal.id,
                yes_votes: proposal.yes_votes,
                no_votes: proposal.no_votes,
            }
            .publish(env);
        }
    }
}

mod test;
