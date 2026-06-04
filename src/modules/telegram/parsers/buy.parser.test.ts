import { describe, expect, test } from "bun:test";

import { parseBuyCommand } from "./buy.parser";

describe("parseBuyCommand", () => {
  test("parses fractional allocations", () => {
    expect(parseBuyCommand("/buy 5 @dara=1/4")).toEqual({
      ok: true,
      command: {
        type: "users",
        totalAmount: 5,
        allocations: [
          {
            username: "dara",
            value: {
              type: "fraction",
              numerator: 1,
              denominator: 4,
            },
          },
        ],
      },
    });
  });

  test("keeps exact amount allocations supported", () => {
    expect(parseBuyCommand("/buy 5 @dara=1.25")).toEqual({
      ok: true,
      command: {
        type: "users",
        totalAmount: 5,
        allocations: [
          {
            username: "dara",
            value: {
              type: "amount",
              amount: 1.25,
            },
          },
        ],
      },
    });
  });

  test("rejects invalid fractional allocations", () => {
    expect(parseBuyCommand("/buy 5 @dara=1/0")).toEqual({
      ok: false,
      reason: "allocationUsage",
    });
  });
});
