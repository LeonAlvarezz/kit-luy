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
import { TelegramDeps } from "./telegram.types";
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
import { Update } from "telegraf/types";

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
    const memberService = yield* MemberService;
    const telegramUserService = yield* TelegramUserService;
    const runtime = yield* Effect.runtime<TelegramDeps>();
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

    registerTelegramEvents(bot, runtime);

    registerTelegramCommands(bot, runtime);

    const handleUpdate = (update: Update) =>
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
