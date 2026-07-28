import { describe, expect, it } from "vitest";
import { isValidStellarAddress, isValidAmount, stellarExpertTxUrl } from "./transaction";

describe("isValidStellarAddress", () => {
  it("accepts a valid ed25519 public key", () => {
    expect(isValidStellarAddress("GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidStellarAddress("not-an-address")).toBe(false);
    expect(isValidStellarAddress("")).toBe(false);
  });
});

describe("isValidAmount", () => {
  it("accepts positive numeric strings", () => {
    expect(isValidAmount("10")).toBe(true);
    expect(isValidAmount("0.5")).toBe(true);
  });

  it("rejects zero, negative, and non-numeric values", () => {
    expect(isValidAmount("0")).toBe(false);
    expect(isValidAmount("-5")).toBe(false);
    expect(isValidAmount("abc")).toBe(false);
  });
});

describe("stellarExpertTxUrl", () => {
  it("builds a testnet explorer link for a tx hash", () => {
    expect(stellarExpertTxUrl("abc123")).toBe(
      "https://stellar.expert/explorer/testnet/tx/abc123"
    );
  });
});
