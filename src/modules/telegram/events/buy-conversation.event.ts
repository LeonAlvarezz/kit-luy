import { Context, Effect } from "effect";
import type { Context as TelegrafContext, Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import type { GroupService } from "@/modules/group/group.service";
import type { MemberModel } from "@/modules/member/member.model";
import type { MemberService } from "@/modules/member/member.service";
import { AllocationKind } from "@/modules/purchase/purchase-allocation.model";
import { PurchaseNoActiveMembers } from "@/modules/purchase/purchase.error";
import { PurchaseStatus } from "@/modules/purchase/purchase.model";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { splitEqually, toCents } from "@/modules/purchase/purchase.utils";
import {
  BuyConversationStep,
  type BuyConversationPayload,
  TelegramConversationFlow,
  TelegramConversationStatus,
} from "@/modules/telegram-conversation/telegram-conversation.model";
import type { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { formatAmount } from "@/shared/currency";
import {
  formatBuyAllReply,
  type BeneficiaryAllocation,
} from "../commands/buy.utils";
import { runTelegramCommand } from "../commands/command-error";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import { IncorrectTelegramCommand } from "../telegram.error";
import {
  escapeHtml,
  formatMemberName,
  isGroupContext,
} from "../telegram.utils";

export type BuyConversationEventDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
  createPurchaseWithAllocations: Context.Tag.Service<
    typeof PurchaseService
  >["createWithAllocations"];
  findActiveSession: Context.Tag.Service<
    typeof TelegramConversationService
  >["findActiveSession"];
  findSessionById: Context.Tag.Service<
    typeof TelegramConversationService
  >["findSessionById"];
  updateSession: Context.Tag.Service<
    typeof TelegramConversationService
  >["updateSession"];
  completeSession: Context.Tag.Service<
    typeof TelegramConversationService
  >["completeSession"];
  cancelSession: Context.Tag.Service<
    typeof TelegramConversationService
  >["cancelSession"];
  cancelActiveSession: Context.Tag.Service<
    typeof TelegramConversationService
  >["cancelActiveSession"];
};

export const registerBuyConversationEvents = (
  bot: Telegraf,
  dependencies: BuyConversationEventDependencies,
) => {
  bot.command("cancel", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const sender = yield* findSender(ctx, dependencies);
      yield* dependencies.cancelActiveSession({
        group_id: sender.group_id,
        member_id: sender.id,
      });

      return yield* Effect.promise(() => ctx.reply("Cancelled."));
    });

    return runTelegramCommand(
      ctx,
      { command: "/cancel", fallbackMessage: "Could not cancel." },
      commandFlow,
    );
  });

  bot.on(message("text"), async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) {
      return next();
    }

    const commandFlow = Effect.gen(function* () {
      const sender = yield* findSender(ctx, dependencies);

      const session = yield* dependencies.findActiveSession({
        group_id: sender.group_id,
        member_id: sender.id,
      });

      if (!session || session.flow !== TelegramConversationFlow.BUY) {
        return yield* Effect.promise(() => next());
      }

      if (session.step !== BuyConversationStep.AMOUNT) {
        return yield* Effect.promise(() => next());
      }

      const amount = parseAmount(ctx.message.text);
      if (!amount) {
        return yield* Effect.promise(() =>
          ctx.reply("Please send a valid amount greater than 0."),
        );
      }

      const members = yield* dependencies.findActiveByGroupId(sender.group_id);
      if (members.filter((member) => member.id !== sender.id).length <= 0) {
        return yield* Effect.fail(
          new PurchaseNoActiveMembers({
            tg_chat_id: String(ctx.chat.id),
            message: "There are no other active members in this group.",
          }),
        );
      }

      const payload: BuyConversationPayload = {
        amount,
        selectedMemberIds: [sender.id],
      };
      const updatedSession = yield* dependencies.updateSession(session.id, {
        step: BuyConversationStep.MEMBERS,
        payload,
      });

      return yield* Effect.promise(() =>
        ctx.reply("Who shared this purchase?", {
          reply_markup: memberPickerKeyboard(
            updatedSession.id,
            sender,
            members,
            payload,
          ),
        }),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/buy",
        fallbackMessage: getDefaultLocale().buy.fallback(),
      },
      commandFlow,
    );
  });

  bot.action(
    /^buy_flow:(toggle|everyone|done|confirm|cancel):(\d+)(?::(\d+))?$/,
    async (ctx) => {
      const commandFlow = Effect.gen(function* () {
        const action = ctx.match[1];
        const sessionId = Number(ctx.match[2]);
        const targetMemberId = ctx.match[3] ? Number(ctx.match[3]) : undefined;
        const sender = yield* findSender(ctx, dependencies);
        const session = yield* dependencies.findSessionById(sessionId);

        if (
          !session ||
          session.status !== TelegramConversationStatus.ACTIVE ||
          session.flow !== TelegramConversationFlow.BUY ||
          session.group_id !== sender.group_id ||
          session.member_id !== sender.id
        ) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery("This buy flow is not yours or has expired."),
          );
          return;
        }

        const payload = parsePayload(session.payload_json);
        const members = yield* dependencies.findActiveByGroupId(
          sender.group_id,
        );

        if (action === "cancel") {
          yield* dependencies.cancelSession(session.id);
          yield* Effect.promise(() => ctx.answerCbQuery("Cancelled."));
          return yield* Effect.promise(() => ctx.editMessageText("Cancelled."));
        }

        if (action === "everyone") {
          const nextPayload = {
            ...payload,
            selectedMemberIds: members.map((member) => member.id),
          };
          yield* dependencies.updateSession(session.id, {
            step: BuyConversationStep.MEMBERS,
            payload: nextPayload,
          });
          yield* Effect.promise(() => ctx.answerCbQuery("Everyone selected."));
          return yield* Effect.promise(() =>
            ctx.editMessageReplyMarkup(
              memberPickerKeyboard(session.id, sender, members, nextPayload),
            ),
          );
        }

        if (action === "toggle" && targetMemberId) {
          const selected = new Set(payload.selectedMemberIds ?? []);
          if (selected.has(targetMemberId)) {
            selected.delete(targetMemberId);
          } else {
            selected.add(targetMemberId);
          }

          const nextPayload = {
            ...payload,
            selectedMemberIds: [...selected],
          };
          yield* dependencies.updateSession(session.id, {
            step: BuyConversationStep.MEMBERS,
            payload: nextPayload,
          });
          yield* Effect.promise(() => ctx.answerCbQuery());
          return yield* Effect.promise(() =>
            ctx.editMessageReplyMarkup(
              memberPickerKeyboard(session.id, sender, members, nextPayload),
            ),
          );
        }

        if (action === "done") {
          const allocations = buildEqualAllocations(sender, members, payload);
          if (allocations.beneficiaryAllocations.length <= 0) {
            yield* Effect.promise(() =>
              ctx.answerCbQuery("Select at least one person besides yourself."),
            );
            return;
          }

          yield* dependencies.updateSession(session.id, {
            step: BuyConversationStep.CONFIRM,
            payload,
          });
          yield* Effect.promise(() => ctx.answerCbQuery());
          return yield* Effect.promise(() =>
            ctx.editMessageText(
              formatSummary(
                sender,
                payload.amount ?? 0,
                allocations.beneficiaryAllocations,
              ),
              {
                parse_mode: "HTML",
                reply_markup: confirmKeyboard(session.id),
              },
            ),
          );
        }

        if (action === "confirm") {
          const allocations = buildEqualAllocations(sender, members, payload);
          const totalAmount = payload.amount;
          if (!totalAmount || allocations.beneficiaryAllocations.length <= 0) {
            yield* Effect.promise(() =>
              ctx.answerCbQuery("This buy flow is incomplete."),
            );
            return;
          }

          const createdPurchase =
            yield* dependencies.createPurchaseWithAllocations({
              purchase: {
                group_id: sender.group_id,
                payer_member_id: sender.id,
                tg_message_id: ctx.callbackQuery.message?.message_id ?? 0,
                amount: totalAmount,
                note: null,
                status: PurchaseStatus.ACTIVE,
                created_at: Date.now(),
              },
              allocations: allocations.beneficiaryAllocations.map(
                ({ member, allocation }) => ({
                  beneficiary_member_id: member.id,
                  responsible_member_id: member.id,
                  amount: allocation.amount,
                  allocation_kind: allocation.allocation_kind,
                }),
              ),
            });
          yield* dependencies.completeSession(session.id);

          const t = yield* getGroupLocale(
            dependencies.findGroupById,
            sender.group_id,
          );
          yield* Effect.promise(() => ctx.answerCbQuery("Purchase recorded."));
          return yield* Effect.promise(() =>
            ctx.editMessageText(
              formatBuyAllReply({
                t,
                purchaseId: createdPurchase.purchase.id,
                totalAmount,
                payer: sender,
                beneficiaryAllocations: allocations.beneficiaryAllocations,
              }),
              { parse_mode: "HTML" },
            ),
          );
        }
      });

      return runTelegramCommand(
        ctx,
        {
          command: "/buy",
          fallbackMessage: getDefaultLocale().buy.fallback(),
        },
        commandFlow,
      );
    },
  );
};

const findSender = (
  ctx: TelegrafContext,
  dependencies: Pick<BuyConversationEventDependencies, "findTelegramMember">,
) =>
  Effect.gen(function* () {
    if (!isGroupContext(ctx)) {
      return yield* Effect.fail(
        new IncorrectTelegramCommand({
          command: "/buy",
          message: getDefaultLocale().command.useInGroup({
            command: "/buy",
          }),
        }),
      );
    }

    return yield* dependencies.findTelegramMember({
      tg_chat_id: String(ctx.chat.id),
      tg_user_id: String(ctx.from.id),
    });
  });

const parseAmount = (text: string) => {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return toCents(value);
};

const parsePayload = (payloadJson: string): BuyConversationPayload => {
  try {
    return JSON.parse(payloadJson) as BuyConversationPayload;
  } catch {
    return {};
  }
};

const memberPickerKeyboard = (
  sessionId: number,
  sender: MemberModel.Entity,
  members: readonly MemberModel.Entity[],
  payload: BuyConversationPayload,
) => {
  const selected = new Set(payload.selectedMemberIds ?? []);

  return {
    inline_keyboard: [
      [{ text: "Everyone", callback_data: `buy_flow:everyone:${sessionId}` }],
      ...members.map((member) => [
        {
          text: `${selected.has(member.id) ? "✓ " : ""}${formatPickerMemberName(
            sender,
            member,
          )}`,
          callback_data: `buy_flow:toggle:${sessionId}:${member.id}`,
        },
      ]),
      [
        { text: "Done", callback_data: `buy_flow:done:${sessionId}` },
        { text: "Cancel", callback_data: `buy_flow:cancel:${sessionId}` },
      ],
    ],
  };
};

const formatPickerMemberName = (
  sender: MemberModel.Entity,
  member: MemberModel.Entity,
) => (member.id === sender.id ? "Myself 👤" : formatMemberName(member));

const confirmKeyboard = (sessionId: number) => ({
  inline_keyboard: [
    [
      { text: "Confirm", callback_data: `buy_flow:confirm:${sessionId}` },
      { text: "Cancel", callback_data: `buy_flow:cancel:${sessionId}` },
    ],
  ],
});

const buildEqualAllocations = (
  sender: MemberModel.Entity,
  members: readonly MemberModel.Entity[],
  payload: BuyConversationPayload,
) => {
  const selectedIds = new Set(payload.selectedMemberIds ?? []);
  const selectedMembers = members.filter((member) =>
    selectedIds.has(member.id),
  );
  const memberAllocations = splitEqually(
    payload.amount ?? 0,
    selectedMembers.length,
  );
  const beneficiaryAllocations = selectedMembers
    .map((member, index) => ({
      member,
      allocation: memberAllocations[index] ?? {
        amount: 0,
        allocation_kind: AllocationKind.EQUAL,
      },
    }))
    .filter(({ member }) => member.id !== sender.id);

  return { beneficiaryAllocations };
};

const formatSummary = (
  sender: MemberModel.Entity,
  totalAmount: number,
  beneficiaryAllocations: readonly BeneficiaryAllocation[],
) =>
  `Record purchase?\n\nTotal: <code>${formatAmount(totalAmount)}</code>\nPaid by: <b>${escapeHtml(
    formatMemberName(sender),
  )}</b>\n\nBeneficiaries:\n${beneficiaryAllocations
    .map(
      ({ member, allocation }) =>
        `   - ${escapeHtml(formatMemberName(member))}\t\t\t\t\t<code>${formatAmount(
          allocation.amount,
        )}</code>`,
    )
    .join("\n")}`;
