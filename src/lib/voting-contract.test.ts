import { describe, expect, it } from "vitest";
import { decodeContractError } from "./voting-contract";

describe("decodeContractError", () => {
  it("maps known contract error codes to plain-language messages", () => {
    expect(decodeContractError("Error(Contract, #2)").message).toBe(
      "This wallet has already voted on this proposal."
    );
    expect(decodeContractError("Error(Contract, #3)").message).toBe(
      "Voting is closed for this proposal."
    );
  });

  it("falls back to a generic message for unknown codes", () => {
    expect(decodeContractError("Error(Contract, #99)").message).toBe("Contract error #99");
  });

  it("passes through non-contract errors unchanged", () => {
    const err = new Error("network timeout");
    expect(decodeContractError(err)).toBe(err);
  });
});
