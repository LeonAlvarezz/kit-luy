const amountPattern = "((?:\\d+(?:\\.\\d+)?)|(?:\\.\\d+))";
const paidCommandRegex = /^\/paid(?:@\w+)?\s+(.+)$/i;
const firstSettlementRegex = new RegExp(`^${amountPattern}$`);
const explicitSettlementRegex = new RegExp(
  `^@([a-zA-Z0-9_]{1,32})\\s*=\\s*${amountPattern}$`,
);

export type PaidCommand =
  | {
      readonly type: "first";
      readonly totalAmount: number;
    }
  | {
      readonly type: "explicit";
      readonly totalAmount: number;
      readonly username: string;
    };

export type PaidCommandParseResult =
  | {
      readonly ok: true;
      readonly command: PaidCommand;
    }
  | {
      readonly ok: false;
      readonly reason: "usage";
    };

export const parsePaidCommand = (text: string): PaidCommandParseResult => {
  const paidMatch = text.match(paidCommandRegex);

  if (!paidMatch) {
    return {
      ok: false,
      reason: "usage",
    };
  }

  const paidText = paidMatch[1].trim();
  const firstSettlementMatch = paidText.match(firstSettlementRegex);

  if (firstSettlementMatch) {
    return {
      ok: true,
      command: {
        type: "first",
        totalAmount: Number(firstSettlementMatch[1]),
      },
    };
  }

  const explicitSettlementMatch = paidText.match(explicitSettlementRegex);

  if (explicitSettlementMatch) {
    return {
      ok: true,
      command: {
        type: "explicit",
        username: explicitSettlementMatch[1],
        totalAmount: Number(explicitSettlementMatch[2]),
      },
    };
  }

  return {
    ok: false,
    reason: "usage",
  };
};
