import { regex } from "./regex";

export type BuyAllocation = {
  readonly username: string;
  readonly amount: number;
};

export type BuyCommand =
  | {
      readonly type: "all";
      readonly totalAmount: number;
    }
  | {
      readonly type: "users";
      readonly totalAmount: number;
      readonly allocations: BuyAllocation[];
    };

export type BuyCommandParseResult =
  | {
      readonly ok: true;
      readonly command: BuyCommand;
    }
  | {
      readonly ok: false;
      readonly reason: "usage" | "allocationUsage";
    };
export const parseBuyCommand = (text: string): BuyCommandParseResult => {
  const buyMatch = text.match(regex.buy);

  if (!buyMatch) {
    return {
      ok: false,
      reason: "usage",
    };
  }

  const totalAmount = Number(buyMatch[1]);
  const allocationText = buyMatch[2]?.trim();

  if (!allocationText || allocationText.toLowerCase() === "@all") {
    return {
      ok: true,
      command: {
        type: "all",
        totalAmount,
      },
    };
  }

  const allocations = [...allocationText.matchAll(regex.allocation)].map(
    (match) => ({
      username: match[1],
      amount: Number(match[2]),
    }),
  );

  const unmatchedAllocationText = allocationText
    .replace(regex.allocation, "")
    .trim();

  if (allocations.length === 0 || unmatchedAllocationText) {
    return {
      ok: false,
      reason: "allocationUsage",
    };
  }

  return {
    ok: true,
    command: {
      type: "users",
      totalAmount,
      allocations,
    },
  };
};
