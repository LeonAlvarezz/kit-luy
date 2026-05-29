import { Context, Effect, Layer } from "effect";
import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import { WorkerEnv } from "@/http/worker-env";
import { GroupService, GroupServiceLive } from "@/modules/group/group.service";
import {
  MemberService,
  MemberServiceLive,
} from "@/modules/member/member.service";
import {
  toDeactivateTelegramMember,
  toRegisterTelegramMember,
  type TelegramChat,
  type TelegramUser,
} from "./telegram.mapper";

export class TelegramService extends Context.Tag("TelegramService")<
  TelegramService,
  {
    readonly bot: Telegraf;
    readonly handleUpdate: (update: any) => Effect.Effect<void, Error, never>;
    readonly setWebhook: (url: string) => Effect.Effect<void, Error, never>;
  }
>() {}

export const TelegramServiceLive = Layer.effect(
  TelegramService,
  Effect.gen(function* () {
    const env = yield* WorkerEnv;
    const groupService = yield* GroupService;
    const memberService = yield* MemberService;
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

    const isSettlementGroupChat = (chat: TelegramChat) =>
      chat.type === "group" || chat.type === "supergroup";

    const isChatMigrationMessage = (message?: object) =>
      !!message &&
      ("migrate_from_chat_id" in message || "migrate_to_chat_id" in message);

    bot.catch((error, ctx) => {
      throw new Error(
        `Telegram update ${ctx.update.update_id} failed: ${String(error)}`,
      );
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

    // Register basic bot events and commands
    bot.start((ctx) => {
      return ctx.reply("Welcome to Kit Luy Bot!");
    });

    bot.help((ctx) => {
      return ctx.reply("Send me any message, and I will echo it back to you.");
    });

    bot.command("join", (ctx) => {
      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return ctx.reply("Use /join inside your Kit Luy group.");
      }

      return Effect.runPromise(
        registerTelegramMember(ctx.chat, ctx.from),
      ).then(() => ctx.reply("You are registered in this settlement group."));
    });

    bot.on(message("text"), (ctx) => {
      if (ctx.message.text.startsWith("/")) {
        return;
      }

      return ctx.reply(`You said: ${ctx.message.text}`);
    });

    bot.on(message("new_chat_members"), async (ctx) => {
      const registerNewMembers = Effect.all(
        ctx.message.new_chat_members.map((member) =>
          registerTelegramMember(ctx.chat, member),
        ),
        { concurrency: "unbounded" },
      );

      const botWasAdded = ctx.message.new_chat_members.some(
        (member) => member.id === ctx.botInfo.id,
      );

      return Effect.runPromise(registerNewMembers).then(() => {
        if (botWasAdded) {
          return ctx.reply(
            "Thanks for adding Kit Luy. Telegram does not let bots import the existing member list, so I will register members when they send a message here. Ask everyone to send /join once.",
          );
        }

        return ctx.reply("New group members registered.");
      });
    });

    bot.on(message("left_chat_member"), (ctx) => {
      return Effect.runPromise(
        deactivateTelegramMember(ctx.chat, ctx.message.left_chat_member),
      );
    });

    bot.on(message("migrate_from_chat_id"), (ctx) => {
      const oldChatId = String(ctx.message.migrate_from_chat_id);
      const newChatId = String(ctx.chat.id);

      console.log(
        `Group migrated! Updating chat ID from ${oldChatId} to ${newChatId}`,
      );

      return Effect.runPromise(
        groupService.updateTelegramChatId(oldChatId, newChatId),
      );
    });

    bot.on(message("migrate_to_chat_id"), (ctx) => {
      const oldChatId = String(ctx.chat.id);
      const newChatId = String(ctx.message.migrate_to_chat_id);

      console.log(
        `Group migrated! Updating chat ID from ${oldChatId} to ${newChatId}`,
      );

      return Effect.runPromise(
        groupService.updateTelegramChatId(oldChatId, newChatId),
      );
    });

    const handleUpdate = (update: any) =>
      Effect.tryPromise({
        try: () => bot.handleUpdate(update),
        catch: (error) => new Error(`Telegraf update error: ${error}`),
      }).pipe(Effect.asVoid);

    const setWebhook = (url: string) =>
      Effect.tryPromise({
        try: () => bot.telegram.setWebhook(url),
        catch: (error) => new Error(`Telegram setWebhook error: ${error}`),
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
);
