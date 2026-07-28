#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;

fn setup(env: &Env) -> MembershipContractClient<'_> {
    env.mock_all_auths();
    let contract_id = env.register(MembershipContract, ());
    MembershipContractClient::new(env, &contract_id)
}

#[test]
fn test_not_a_member_by_default() {
    let env = Env::default();
    let client = setup(&env);
    let addr = Address::generate(&env);
    assert!(!client.is_member(&addr));
}

#[test]
fn test_join_makes_member() {
    let env = Env::default();
    let client = setup(&env);
    let addr = Address::generate(&env);

    client.join(&addr);

    assert!(client.is_member(&addr));
}
