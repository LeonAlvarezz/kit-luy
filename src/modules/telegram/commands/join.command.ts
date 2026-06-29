import { Context, Effect, Runtime } from "effect";
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
import { isGroupContext } from "../telegram.utils";
import { runTelegramCommand } from "./command-error";
import { MemberService } from "@/modules/member/member.service";
import { getDefaultLocale } from "../lang/group-locale";
import type { TelegramDeps } from "../telegram.types";

export const registerJoinCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("join", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const t = getDefaultLocale();
      if (!isGroupContext(ctx)) {
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
          return yield* memberService.registerTelegramMember(payload);
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
      runtime,
      ctx,
      {
        command: "/join",
        fallbackMessage: getDefaultLocale().join.fallback(),
      },
      commandFlow,
    );
  });
};
