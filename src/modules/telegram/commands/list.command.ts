import type { MemberModel } from "@/modules/member/member.model";
import type { GroupService } from "@/modules/group/group.service";
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
import type { TranslationFunctions } from "../lang/i18n-types";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
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
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
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
            message: getDefaultLocale().command.useInGroup({
              command: "/list",
            }),
          }),
        );
      }

      const tgChatId = String(ctx.chat.id);
      const tgUserId = String(ctx.from.id);
      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: tgChatId,
        tg_user_id: tgUserId,
      });
      const t = yield* getGroupLocale(
        dependencies.findGroupById,
        sender.group_id,
      );

      const purchases = yield* dependencies.findAllPurchaseByGroupId(
        sender.group_id,
      );

      const members = yield* dependencies.findActiveByGroupId(sender.group_id);
      const replyMessage = formatPurchasesReply({ t, purchases, members });

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
        fallbackMessage: getDefaultLocale().list.fallback(),
      },
      commandFlow,
    );
  });
};

const formatPurchasesReply = ({
  t,
  purchases,
  members,
}: {
  readonly t: TranslationFunctions;
  readonly purchases: readonly PurchaseModel.Entity[];
  readonly members: readonly MemberModel.Entity[];
}) => {
  const activePurchases = purchases
    .filter((purchase) => purchase.status === PurchaseStatus.ACTIVE)
    .toSorted((left, right) => right.created_at - left.created_at)
    .slice(0, PURCHASE_LIST_LIMIT);

  if (activePurchases.length <= 0) {
    return t.list.empty();
  }

  const memberById = new Map(members.map((member) => [member.id, member]));

  return `${t.list.header()}\n${activePurchases
    .map((purchase) => formatPurchaseLine(t, purchase, memberById))
    .join("\n")}`;
};

const formatPurchaseLine = (
  t: TranslationFunctions,
  purchase: PurchaseModel.Entity,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) =>
  t.list.purchaseLine({
    purchaseId: purchase.id,
    amount: formatAmount(purchase.amount),
    payer: formatPayerName(t, purchase, memberById),
    date: formatPurchaseDate(purchase.created_at),
  });

const formatPayerName = (
  t: TranslationFunctions,
  purchase: PurchaseModel.Entity,
  memberById: ReadonlyMap<number, MemberModel.Entity>,
) => {
  const payer = memberById.get(purchase.payer_member_id);

  return escapeHtml(
    payer
      ? formatMemberName(payer)
      : t.list.unknownMember({ memberId: purchase.payer_member_id }),
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
