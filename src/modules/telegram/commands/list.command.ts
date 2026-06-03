import type { MemberModel } from "@/modules/member/member.model";
import { MemberService } from "@/modules/member/member.service";
import {
  PurchaseStatus,
  type PurchaseModel,
} from "@/modules/purchase/purchase.model";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { formatAmount } from "@/shared/currency";
import { Context, Effect } from "effect";
import { Telegraf } from "telegraf";
import { runTelegramCommand } from "./command-error";
import { IncorrectTelegramCommand } from "../telegram.error";
import {
  escapeHtml,
  formatMemberName,
  isSettlementGroupChat,
} from "../telegram.utils";

const PURCHASE_LIST_LIMIT = 10;

export type ListCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  findAllPurchaseByGroupId: Context.Tag.Service<
    typeof PurchaseService
  >["findAllByGroupId"];
};

export const registerListCommand = (
  bot: Telegraf,
  dependencies: ListCommandDependencies,
) => {
  bot.command("list", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/list",
            message: "Use /list inside a group.",
          }),
        );
      }

      const tgChatId = String(ctx.chat.id);
      const tgUserId = String(ctx.from.id);
      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: tgChatId,
        tg_user_id: tgUserId,
      });

      const purchases = yield* dependencies.findAllPurchaseByGroupId(
        sender.group_id,
      );

      const members = yield* dependencies.findActiveByGroupId(sender.group_id);
      const replyMessage = formatPurchasesReply({ purchases, members });

      return yield* Effect.promise(() =>
        ctx.reply(replyMessage, {
          parse_mode: "HTML",
        }),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/list",
        fallbackMessage: "Could not list purchases.",
      },
      commandFlow,
    );
  });
};

const formatPurchasesReply = ({
  purchases,
  members,
}: {
  readonly purchases: readonly PurchaseModel.Entity[];
  readonly members: readonly MemberModel.Entity[];
}) => {
  const activePurchases = purchases
    .filter((purchase) => purchase.status === PurchaseStatus.ACTIVE)
    .toSorted((left, right) => right.created_at - left.created_at)
    .slice(0, PURCHASE_LIST_LIMIT);

  if (activePurchases.length <= 0) {
    return "No active purchases found.";
  }

  const memberById = new Map(members.map((member) => [member.id, member]));

  return `Recent purchases:\n${activePurchases
    .map((purchase) => formatPurchaseLine(purchase, memberById))
    .join("\n")}`;
};

const formatPurchaseLine = (
  purchase: PurchaseModel.Entity,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  `   - #<code>${purchase.id}</code> ${formatPurchaseAmount(
    purchase,
  )} paid by ${formatPayerName(purchase, memberById)} on ${formatPurchaseDate(
    purchase.created_at,
  )}`;

const formatPurchaseAmount = (purchase: PurchaseModel.Entity) =>
  `<code>$${formatAmount(purchase.amount)}</code>`;

const formatPayerName = (
  purchase: PurchaseModel.Entity,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) => {
  const payer = memberById.get(purchase.payer_member_id);

  return escapeHtml(
    payer ? formatMemberName(payer) : `member #${purchase.payer_member_id}`,
  );
};

const formatPurchaseDate = (createdAt: number) =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(createdAt))
    .replace(",", "");
