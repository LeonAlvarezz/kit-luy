import { Context, Effect, Layer } from "effect";
import { Telegraf } from "telegraf";

import { WorkerEnv } from "@/http/worker-env";
import { GroupService, GroupServiceLive } from "@/modules/group/group.service";
import {
  MemberService,
  MemberServiceLive,
} from "@/modules/member/member.service";
import {
  PurchaseService,
  PurchaseServiceLive,
} from "@/modules/purchase/purchase.service";
import { registerTelegramCommands } from "./commands";
import { registerTelegramEvents } from "./events";
import {
  toRegisterTelegramMember,
  toUpsertTelegramUser,
  type TelegramChat,
  type TelegramUser,
} from "./telegram.mapper";
import {
  isChatMigrationMessage,
  isSettlementGroupChat,
} from "./telegram.utils";
import {
  InvalidTelegramMemberPayload,
  TelegramSetWebhookFailed,
  TelegramUpdateHandlingFailed,
} from "./telegram.error";
import {
  RepaymentClaimService,
  RepaymentClaimServiceLive,
} from "../repayment/repayment-claim.service";
import {
  RepaymentService,
  RepaymentServiceLive,
} from "../repayment/repayment.service";
import {
  TelegramConversationService,
  TelegramConversationServiceLive,
} from "../telegram-conversation/telegram-conversation.service";
import {
  TelegramUserService,
  TelegramUserServiceLive,
} from "../telegram-user/telegram-user.service";

export class TelegramService extends Context.Tag("TelegramService")<
  TelegramService,
  {
    readonly bot: Telegraf;
    readonly handleUpdate: (
      update: any,
    ) => Effect.Effect<void, TelegramUpdateHandlingFailed, never>;
    readonly setWebhook: (
      url: string,
    ) => Effect.Effect<true, TelegramSetWebhookFailed, never>;
  }
>() {}

export const TelegramServiceLive = Layer.effect(
  TelegramService,
  Effect.gen(function* () {
    const env = yield* WorkerEnv;
    const groupService = yield* GroupService;
    const memberService = yield* MemberService;
    const purchaseService = yield* PurchaseService;
    const repaymentClaimService = yield* RepaymentClaimService;
    const repaymentService = yield* RepaymentService;
    const telegramConversationService = yield* TelegramConversationService;
    const telegramUserService = yield* TelegramUserService;
    const token = env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return yield* Effect.dieMessage(
        "TELEGRAM_BOT_TOKEN is missing in the environment bindings.",
      );
    }

    const bot = new Telegraf(token);

    const registerTelegramMember = (chat: TelegramChat, user: TelegramUser) =>
      Effect.gen(function* () {
        const payload = toRegisterTelegramMember(chat, user);
        if (!payload) {
          return yield* Effect.fail(
            new InvalidTelegramMemberPayload({
              operation: "register",
              tg_chat_id: String(chat.id),
              tg_user_id: String(user.id),
            }),
          );
        }
        return yield* memberService.registerTelegramMember(payload);
      });

    const upsertTelegramUser = (user: TelegramUser) =>
      Effect.gen(function* () {
        const payload = toUpsertTelegramUser(user);
        if (!payload) {
          return;
        }

        return yield* telegramUserService.upsertByTelegramUser(payload);
      });

    bot.catch((error, ctx) => {
      throw new TelegramUpdateHandlingFailed({
        message: `Telegram update ${ctx.update.update_id} failed: ${String(error)}`,
      });
    });

    bot.use(async (ctx, next) => {
      console.log("[TelegramService] Global middleware received update:", JSON.stringify(ctx.update));
      if (!ctx.from || ctx.from.is_bot || isChatMigrationMessage(ctx.message)) {
        return next();
      }

      if (ctx.chat && isSettlementGroupChat(ctx.chat)) {
        return Effect.runPromise(
          registerTelegramMember(ctx.chat, ctx.from).pipe(Effect.asVoid),
        ).then(() => next());
      }

      return Effect.runPromise(
        upsertTelegramUser(ctx.from).pipe(Effect.asVoid),
      ).then(() => next());
    });

    registerTelegramEvents(bot, {
      updateTelegramChatId: groupService.updateTelegramChatId,
      registerTelegramMember: memberService.registerTelegramMember,
      deactivateTelegramMember: memberService.deactivateTelegramMember,
      buyConversationEvents: {
        findTelegramMember: memberService.findTelegramMember,
        findActiveByGroupId: memberService.findActiveByGroupId,
        findGroupById: groupService.findById,
        createPurchaseWithAllocations: purchaseService.createWithAllocations,
        findActiveSession: telegramConversationService.findActiveSession,
        findSessionById: telegramConversationService.findSessionById,
        updateSession: telegramConversationService.updateSession,
        completeSession: telegramConversationService.completeSession,
        cancelSession: telegramConversationService.cancelSession,
        cancelActiveSession: telegramConversationService.cancelActiveSession,
      },
      repaymentClaimEvents: {
        confirmClaim: repaymentClaimService.confirmClaim,
        rejectClaim: repaymentClaimService.rejectClaim,
        findById: repaymentClaimService.findById,
        findGroupById: groupService.findById,
        findTelegramMember: memberService.findTelegramMember,
        createRepaymentFromConfirmedClaim:
          repaymentService.createFromConfirmedClaim,
      },
    });

    registerTelegramCommands(
      bot,
      {
        registerTelegramMember: memberService.registerTelegramMember,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findGroupById: groupService.findById,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findActiveByGroupId: memberService.findActiveByGroupId,
        findGroupById: groupService.findById,
        createPurchaseWithAllocations: purchaseService.createWithAllocations,
        startBuySession: telegramConversationService.startBuySession,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findActiveByGroupId: memberService.findActiveByGroupId,
        findGroupById: groupService.findById,
        findSettlementBalancesByGroupId:
          purchaseService.findSettlementBalancesByGroupId,
      },

      {
        findTelegramMember: memberService.findTelegramMember,
        findActiveByGroupId: memberService.findActiveByGroupId,
        findGroupById: groupService.findById,
        findSettlementBalancesByGroupId:
          purchaseService.findSettlementBalancesByGroupId,
        createRepaymentClaim: repaymentClaimService.create,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findActiveByGroupId: memberService.findActiveByGroupId,
        findGroupById: groupService.findById,
        findAllPurchaseByGroupId: purchaseService.findAllByGroupId,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findGroupById: groupService.findById,
        findPurchaseById: purchaseService.findById,
        updatePurchase: purchaseService.update,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findByGroupId: groupService.findById,
        updateGroupLang: groupService.updateLang,
      },
      {
        updatePaymentQr: telegramUserService.updatePaymentQr,
      },
      {
        findTelegramMember: memberService.findTelegramMember,
        findActiveByGroupId: memberService.findActiveByGroupId,
        findGroupById: groupService.findById,
        findByTgUserId: telegramUserService.findByTgUserId,
        findByUsername: telegramUserService.findByUsername,
      },
    );

    const handleUpdate = (update: any) =>
      Effect.tryPromise({
        try: () => bot.handleUpdate(update),
        catch: (error) =>
          new TelegramUpdateHandlingFailed({
            message: `Telegraf update error: ${String(error)}`,
          }),
      }).pipe(Effect.asVoid);

    const setWebhook = (url: string) =>
      Effect.tryPromise({
        try: () => bot.telegram.setWebhook(url),
        catch: (error) =>
          new TelegramSetWebhookFailed({
            message: `Telegram setWebhook error: ${String(error)}`,
          }),
      });

    return {
      bot,
      handleUpdate,
      setWebhook,
    };
  }),
).pipe(
  Layer.provide(GroupServiceLive),
  Layer.provide(MemberServiceLive),
  Layer.provide(PurchaseServiceLive),
  Layer.provide(TelegramConversationServiceLive),
  Layer.provide(RepaymentClaimServiceLive),
  Layer.provide(RepaymentServiceLive),
  Layer.provide(TelegramUserServiceLive),
);
