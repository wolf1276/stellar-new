#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env};

/// Voter registry the voting contract calls cross-contract to gate `vote()`.
/// Membership is open self-registration for this demo — swap `join` for an
/// admin-gated or token-balance-gated check to restrict who can vote.
#[contracttype]
#[derive(Clone)]
enum DataKey {
    Member(Address),
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct MemberJoined {
    #[topic]
    pub member: Address,
}

#[contract]
pub struct MembershipContract;

#[contractimpl]
impl MembershipContract {
    pub fn join(env: Env, member: Address) {
        member.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Member(member.clone()), &true);
        MemberJoined { member }.publish(&env);
    }

    pub fn is_member(env: Env, member: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Member(member))
            .unwrap_or(false)
    }
}

mod test;
