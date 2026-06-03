import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import {
  toRegisterTelegramMember,
  type TelegramChat,
  type TelegramUser,
} from "../telegram.mapper";
import {
  IncorrectTelegramCommand,
  InvalidTelegramMemberPayload,
  TelegramReplyFailed,
} from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";
import { runTelegramCommand } from "./command-error";
import { MemberService } from "@/modules/member/member.service";
import { getDefaultLocale } from "../lang/group-locale";

export type JoinCommandDependencies = {
  readonly registerTelegramMember: Context.Tag.Service<
    typeof MemberService
  >["registerTelegramMember"];
};

export const registerJoinCommand = (
  bot: Telegraf,
  dependencies: JoinCommandDependencies,
) => {
  bot.command("join", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const t = getDefaultLocale();
      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/join",
            message: t.command.useInKitLuyGroup({ command: "/join" }),
          }),
        );
      }

      const register = (chat: TelegramChat, user: TelegramUser) =>
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
          return yield* dependencies.registerTelegramMember(payload);
        });

      return yield* register(ctx.chat, ctx.from).pipe(
        Effect.zipRight(
          Effect.tryPromise({
            try: () =>
              ctx.reply(t.join.registered()),
            catch: () => new TelegramReplyFailed({ command: "/join" }),
          }),
        ),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/join",
        fallbackMessage: getDefaultLocale().join.fallback(),
      },
      commandFlow,
    );
  });
};
