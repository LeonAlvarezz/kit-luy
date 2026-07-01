import { describe, expect, test } from "bun:test";

import { parseBuyCommand } from "./buy.parser";

describe("parseBuyCommand", () => {
  test("parses bare user allocations", () => {
    expect(parseBuyCommand("/buy 6 @userA @userB")).toEqual({
      ok: true,
      command: {
        type: "users",
        totalAmount: 6,
        allocations: [
          {
            username: "userA",
            value: {
              type: "equal",
            },
          },
          {
            username: "userB",
            value: {
              type: "equal",
            },
          },
        ],
      },
    });
  });

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

  test("parses Khmer Riel amount and converts it to USD", () => {
    expect(parseBuyCommand("/buy 2000R @userA @userB")).toEqual({
      ok: true,
      command: {
        type: "users",
        totalAmount: 0.5,
        allocations: [
          {
            username: "userA",
            value: {
              type: "equal",
            },
          },
          {
            username: "userB",
            value: {
              type: "equal",
            },
          },
        ],
      },
    });

    expect(parseBuyCommand("/buy 4000 r")).toEqual({
      ok: true,
      command: {
        type: "all",
        totalAmount: 1,
      },
    });

    expect(parseBuyCommand("/buy 8000 riels")).toEqual({
      ok: true,
      command: {
        type: "all",
        totalAmount: 2,
      },
    });

    expect(parseBuyCommand("/buy 10 @dara=2000R")).toEqual({
      ok: true,
      command: {
        type: "users",
        totalAmount: 10,
        allocations: [
          {
            username: "dara",
            value: {
              type: "amount",
              amount: 0.5,
            },
          },
        ],
      },
    });
  });
});
