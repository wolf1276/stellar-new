#![cfg(test)]

use super::*;
use membership::{MembershipContract, MembershipContractClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Env, String,
};

const DAY: u64 = 86_400;

/// Registers both contracts and wires the voting contract to the membership
/// one, exercising the real cross-contract call `vote()` makes.
fn setup(env: &Env) -> (GovernanceContractClient<'_>, MembershipContractClient<'_>) {
    env.mock_all_auths();
    let membership_id = env.register(MembershipContract, ());
    let membership_client = MembershipContractClient::new(env, &membership_id);
    let contract_id = env.register(GovernanceContract, (membership_id,));
    let client = GovernanceContractClient::new(env, &contract_id);
    (client, membership_client)
}

fn advance_to(env: &Env, ts: u64) {
    env.ledger().with_mut(|l| l.timestamp = ts);
}

#[test]
fn test_create_proposal() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Raise quorum"),
        &String::from_str(&env, "Bump quorum from 5% to 10%"),
        &(now + DAY),
    );

    assert_eq!(id, 0);
    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.title, String::from_str(&env, "Raise quorum"));
    assert_eq!(proposal.creator, creator);
    assert_eq!(proposal.yes_votes, 0);
    assert_eq!(proposal.no_votes, 0);
    assert_eq!(proposal.status, ProposalStatus::Active);
}

#[test]
fn test_invalid_deadline_rejected() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let now = env.ledger().timestamp();

    let result = client.try_create_proposal(
        &creator,
        &String::from_str(&env, "Too soon"),
        &String::from_str(&env, "Deadline in the past"),
        &now,
    );
    assert_eq!(result, Err(Ok(Error::InvalidDeadline)));
}

#[test]
fn test_vote_yes() {
    let env = Env::default();
    let (client, membership) = setup(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    membership.join(&voter);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    client.vote(&voter, &id, &VoteChoice::Yes);

    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.yes_votes, 1);
    assert_eq!(proposal.no_votes, 0);
    assert!(client.has_voted(&id, &voter));
}

#[test]
fn test_vote_no() {
    let env = Env::default();
    let (client, membership) = setup(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    membership.join(&voter);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    client.vote(&voter, &id, &VoteChoice::No);

    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.yes_votes, 0);
    assert_eq!(proposal.no_votes, 1);
}

#[test]
fn test_duplicate_vote_fails() {
    let env = Env::default();
    let (client, membership) = setup(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    membership.join(&voter);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    client.vote(&voter, &id, &VoteChoice::Yes);

    let result = client.try_vote(&voter, &id, &VoteChoice::No);
    assert_eq!(result, Err(Ok(Error::AlreadyVoted)));
}

#[test]
fn test_vote_after_deadline_fails() {
    let env = Env::default();
    let (client, membership) = setup(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    membership.join(&voter);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    advance_to(&env, now + DAY + 1);

    let result = client.try_vote(&voter, &id, &VoteChoice::Yes);
    assert_eq!(result, Err(Ok(Error::VotingClosed)));
}

#[test]
fn test_vote_by_non_member_fails() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );

    // voter never joined the membership contract, so the cross-contract
    // is_member() check should reject the vote.
    let result = client.try_vote(&voter, &id, &VoteChoice::Yes);
    assert_eq!(result, Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_vote_on_missing_proposal_fails() {
    let env = Env::default();
    let (client, membership) = setup(&env);
    let voter = Address::generate(&env);
    membership.join(&voter);

    let result = client.try_vote(&voter, &99, &VoteChoice::Yes);
    assert_eq!(result, Err(Ok(Error::ProposalNotFound)));
}

#[test]
fn test_proposal_lookup_not_found() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let result = client.try_get_proposal(&42);
    assert_eq!(result, Err(Ok(Error::ProposalNotFound)));
}

#[test]
fn test_get_all_proposals() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let now = env.ledger().timestamp();

    client.create_proposal(
        &creator,
        &String::from_str(&env, "A"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    client.create_proposal(
        &creator,
        &String::from_str(&env, "B"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );

    let all = client.get_all_proposals();
    assert_eq!(all.len(), 2);
}

#[test]
fn test_proposal_auto_closes_after_expiry() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    advance_to(&env, now + DAY + 1);

    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.status, ProposalStatus::Closed);
}

#[test]
fn test_execute_proposal_passed() {
    let env = Env::default();
    let (client, membership) = setup(&env);
    let creator = Address::generate(&env);
    let voter1 = Address::generate(&env);
    membership.join(&voter1);
    let voter2 = Address::generate(&env);
    membership.join(&voter2);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    client.vote(&voter1, &id, &VoteChoice::Yes);
    client.vote(&voter2, &id, &VoteChoice::Yes);
    advance_to(&env, now + DAY + 1);

    let passed = client.execute_proposal(&id);
    assert!(passed);

    let proposal = client.get_proposal(&id);
    assert_eq!(proposal.status, ProposalStatus::Executed);
}

#[test]
fn test_execute_before_deadline_fails() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );

    let result = client.try_execute_proposal(&id);
    assert_eq!(result, Err(Ok(Error::VotingStillActive)));
}

#[test]
fn test_execute_twice_fails() {
    let env = Env::default();
    let (client, _membership) = setup(&env);
    let creator = Address::generate(&env);
    let now = env.ledger().timestamp();

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "T"),
        &String::from_str(&env, "D"),
        &(now + DAY),
    );
    advance_to(&env, now + DAY + 1);
    client.execute_proposal(&id);

    let result = client.try_execute_proposal(&id);
    assert_eq!(result, Err(Ok(Error::AlreadyExecuted)));
}
