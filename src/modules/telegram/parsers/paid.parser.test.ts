import { describe, expect, it } from "bun:test";

import { parsePaidCommand } from "./paid.parser";

describe("parsePaidCommand", () => {
  it("parses an amount paid to the first settlement", () => {
    expect(parsePaidCommand("/paid 2")).toEqual({
      ok: true,
      command: {
        type: "first",
        totalAmount: 2,
      },
    });
  });

  it("parses an explicit username payment", () => {
    expect(parsePaidCommand("/paid @userA=10")).toEqual({
      ok: true,
      command: {
        type: "explicit",
        username: "userA",
        totalAmount: 10,
      },
    });
  });

  it("supports spaces around the explicit payment separator", () => {
    expect(parsePaidCommand("/paid @userA = 10.5")).toEqual({
      ok: true,
      command: {
        type: "explicit",
        username: "userA",
        totalAmount: 10.5,
      },
    });
  });

  it("rejects malformed paid commands", () => {
    expect(parsePaidCommand("/paid")).toEqual({
      ok: false,
      reason: "usage",
    });

    expect(parsePaidCommand("/paid @userA 10")).toEqual({
      ok: false,
      reason: "usage",
    });
  });
});
