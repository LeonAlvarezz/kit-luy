import { describe, expect, test } from "bun:test";
import { convertRielToUsd, parseAmount } from "./telegram.utils";
import type { Context } from "telegraf";

describe("convertRielToUsd", () => {
  test("converts standalone riel amounts", () => {
    expect(convertRielToUsd("2000R")).toBe("0.5");
    expect(convertRielToUsd("4000 r")).toBe("1");
    expect(convertRielToUsd("8000riel")).toBe("2");
    expect(convertRielToUsd("12000 riels")).toBe("3");
  });

  test("does not convert numbers in usernames or other contexts", () => {
    expect(convertRielToUsd("@user2000R")).toBe("@user2000R");
    expect(convertRielToUsd("@2000R")).toBe("@2000R");
    expect(convertRielToUsd("@user_2000R")).toBe("@user_2000R");
  });

  test("converts allocations and text commands correctly", () => {
    expect(convertRielToUsd("/buy 2000R @user1")).toBe("/buy 0.5 @user1");
    expect(convertRielToUsd("/paid @user1=2000R")).toBe("/paid @user1=0.5");
    expect(convertRielToUsd("/buy 10 @user1=2000R @user2=4000 r")).toBe("/buy 10 @user1=0.5 @user2=1");
  });
});

describe("parseAmount", () => {
  test("parses riel inputs to USD cents", () => {
    const mockCtx = {
      message: {
        text: "2000R",
      },
    } as unknown as Context;

    expect(parseAmount(mockCtx)).toBe(50); // 0.5 USD = 50 cents
  });

  test("parses standard USD inputs", () => {
    const mockCtx = {
      message: {
        text: "10.5",
      },
    } as unknown as Context;

    expect(parseAmount(mockCtx)).toBe(1050); // 10.50 USD = 1050 cents
  });
});
