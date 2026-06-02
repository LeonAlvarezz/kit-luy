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
  toDeactivateTelegramMember,
  toRegisterTelegramMember,
  type TelegramChat,
  type TelegramUser,
} from "./telegram.mapper";
import {
  isChatMigrationMessage,
  isSettlementGroupChat,
} from "./telegram.utils";
import {
  TelegramSetWebhookFailed,
  TelegramUpdateHandlingFailed,
} from "./telegram.error";

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
    const token = env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return yield* Effect.dieMessage(
        "TELEGRAM_BOT_TOKEN is missing in the environment bindings.",
      );
    }

    const bot = new Telegraf(token);

    const registerTelegramMember = (chat: TelegramChat, user: TelegramUser) => {
      const payload = toRegisterTelegramMember(chat, user);
      return payload
        ? memberService.registerTelegramMember(payload).pipe(Effect.asVoid)
        : Effect.void;
    };

    const deactivateTelegramMember = (
      chat: TelegramChat,
      user: TelegramUser,
    ) => {
      const payload = toDeactivateTelegramMember(chat, user);
      return payload
        ? memberService.deactivateTelegramMember(payload).pipe(Effect.asVoid)
        : Effect.void;
    };

    bot.catch((error, ctx) => {
      throw new TelegramUpdateHandlingFailed({
        message: `Telegram update ${ctx.update.update_id} failed: ${String(error)}`,
      });
    });

    bot.use(async (ctx, next) => {
      if (
        !ctx.chat ||
        !ctx.from ||
        !isSettlementGroupChat(ctx.chat) ||
        isChatMigrationMessage(ctx.message)
      ) {
        return next();
      }

      return Effect.runPromise(registerTelegramMember(ctx.chat, ctx.from)).then(
        () => next(),
      );
    });

    registerTelegramCommands(bot, registerTelegramMember, {
      findTelegramMember: memberService.findTelegramMember,
      findActiveByGroupId: memberService.findActiveByGroupId,
      createPurchaseWithAllocations: purchaseService.createWithAllocations,
    });

    registerTelegramEvents(bot, {
      updateTelegramChatId: groupService.updateTelegramChatId,
      registerTelegramMember,
      deactivateTelegramMember,
    });

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
);
