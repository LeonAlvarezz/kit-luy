import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";
import { message } from "telegraf/filters";

import {
  toDeactivateTelegramMember,
  toRegisterTelegramMember,
  type TelegramChat,
  type TelegramUser,
} from "../telegram.mapper";
import { MemberService } from "@/modules/member/member.service";
import { GroupService } from "@/modules/group/group.service";
import { InvalidTelegramMemberPayload } from "../telegram.error";
import {
  registerRepaymentClaimEvents,
  type RepaymentClaimEventDependencies,
} from "./repayment-claim.event";

export type TelegramEventDependency = Pick<
  Context.Tag.Service<typeof MemberService>,
  "registerTelegramMember" | "deactivateTelegramMember"
> & {
  updateTelegramChatId: Context.Tag.Service<
    typeof GroupService
  >["updateTelegramChatId"];
} & {
  repaymentClaimEvents: RepaymentClaimEventDependencies;
};

export const registerTelegramEvents = (
  bot: Telegraf,
  dependencies: TelegramEventDependency,
) => {
  const {
    updateTelegramChatId,
    registerTelegramMember,
    deactivateTelegramMember,
    repaymentClaimEvents,
  } = dependencies;

  bot.on(message("text"), (ctx) => {
    if (ctx.message.text.startsWith("/")) {
      return;
    }

    return ctx.reply(`You said: ${ctx.message.text}`);
  });

  bot.on(message("new_chat_members"), async (ctx) => {
    const membersToRegister = ctx.message.new_chat_members.filter(
      (member) => !member.is_bot,
    );

    const toRegisterPayloadEffect = (chat: TelegramChat, user: TelegramUser) =>
      Effect.fromNullable(toRegisterTelegramMember(chat, user)).pipe(
        Effect.mapError(
          () =>
            new InvalidTelegramMemberPayload({
              operation: "register",
              tg_chat_id: String(chat.id),
              tg_user_id: String(user.id),
            }),
        ),
      );

    const register = (chat: TelegramChat, user: TelegramUser) =>
      toRegisterPayloadEffect(chat, user).pipe(
        Effect.flatMap((payload) => registerTelegramMember(payload)),
      );

    const registerNewMembers = Effect.forEach(
      membersToRegister,
      (member) => register(ctx.chat, member),
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
    const toDeactivatePayloadEffect = (
      chat: TelegramChat,
      user: TelegramUser,
    ) =>
      Effect.fromNullable(toDeactivateTelegramMember(chat, user)).pipe(
        Effect.mapError(
          () =>
            new InvalidTelegramMemberPayload({
              operation: "register",
              tg_chat_id: String(chat.id),
              tg_user_id: String(user.id),
            }),
        ),
      );

    const deactivate = (chat: TelegramChat, user: TelegramUser) =>
      toDeactivatePayloadEffect(chat, user).pipe(
        Effect.flatMap((payload) => deactivateTelegramMember(payload)),
      );

    return Effect.runPromise(
      deactivate(ctx.chat, ctx.message.left_chat_member),
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

  registerRepaymentClaimEvents(bot, repaymentClaimEvents);
};
