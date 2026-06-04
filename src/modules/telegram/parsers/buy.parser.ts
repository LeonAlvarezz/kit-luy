import { regex } from "./regex";

export type BuyAllocationValue =
  | {
      readonly type: "amount";
      readonly amount: number;
    }
  | {
      readonly type: "fraction";
      readonly numerator: number;
      readonly denominator: number;
    };

export type BuyAllocation = {
  readonly username: string;
  readonly value: BuyAllocationValue;
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

  const allocations: BuyAllocation[] = [];
  for (const match of allocationText.matchAll(regex.allocation)) {
    const value = parseAllocationValue(match[2]);

    if (!value) {
      return {
        ok: false,
        reason: "allocationUsage",
      };
    }

    allocations.push({
      username: match[1],
      value,
    });
  }

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

const parseAllocationValue = (
  rawValue: string | undefined,
): BuyAllocationValue | null => {
  if (!rawValue) {
    return null;
  }

  if (rawValue.includes("/")) {
    const [rawNumerator, rawDenominator] = rawValue.split("/");
    const numerator = Number(rawNumerator);
    const denominator = Number(rawDenominator);

    if (
      !Number.isInteger(numerator) ||
      !Number.isInteger(denominator) ||
      numerator <= 0 ||
      denominator <= 0
    ) {
      return null;
    }

    return {
      type: "fraction",
      numerator,
      denominator,
    };
  }

  return {
    type: "amount",
    amount: Number(rawValue),
  };
};
