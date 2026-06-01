import { Effect } from "effect";
import type { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import type { TelegramChat, TelegramUser } from "../telegram.mapper";

type RegisterTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
) => Effect.Effect<void, unknown>;

type DeactivateTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
) => Effect.Effect<void, unknown>;

type UpdateTelegramChatId = (
  oldChatId: string,
  newChatId: string,
) => Effect.Effect<unknown, unknown>;

export const registerTelegramEvents = (
  bot: Telegraf,
  dependencies: {
    readonly updateTelegramChatId: UpdateTelegramChatId;
    readonly registerTelegramMember: RegisterTelegramMember;
    readonly deactivateTelegramMember: DeactivateTelegramMember;
  },
) => {
  const {
    updateTelegramChatId,
    registerTelegramMember,
    deactivateTelegramMember,
  } = dependencies;

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

    return Effect.runPromise(updateTelegramChatId(oldChatId, newChatId));
  });

  bot.on(message("migrate_to_chat_id"), (ctx) => {
    const oldChatId = String(ctx.chat.id);
    const newChatId = String(ctx.message.migrate_to_chat_id);

    console.log(
      `Group migrated! Updating chat ID from ${oldChatId} to ${newChatId}`,
    );

    return Effect.runPromise(updateTelegramChatId(oldChatId, newChatId));
  });
};
