import { convertRielToUsd } from "../telegram.utils";

const amountPattern = "((?:\\d+(?:\\.\\d+)?)|(?:\\.\\d+))";
const purchaseIdPattern = "(?:\\s+#?(\\d+))?";
const paidCommandRegex = /^\/paid(?:@\w+)?\s+(.+)$/i;
const firstSettlementRegex = new RegExp(`^${amountPattern}${purchaseIdPattern}$`);
const explicitSettlementRegex = new RegExp(
  `^@([a-zA-Z0-9_]{1,32})\\s*=\\s*${amountPattern}${purchaseIdPattern}$`,
);

export type PaidCommand =
  | {
      readonly type: "first";
      readonly totalAmount: number;
      readonly purchaseId?: number;
    }
  | {
      readonly type: "explicit";
      readonly totalAmount: number;
      readonly username: string;
      readonly purchaseId?: number;
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
  const convertedText = convertRielToUsd(text);
  const paidMatch = convertedText.match(paidCommandRegex);

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
        purchaseId: firstSettlementMatch[2] ? Number(firstSettlementMatch[2]) : undefined,
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
        purchaseId: explicitSettlementMatch[3] ? Number(explicitSettlementMatch[3]) : undefined,
      },
    };
  }

  return {
    ok: false,
    reason: "usage",
  };
};
