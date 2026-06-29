import { Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";
import { runTelegramCommand } from "./command-error";
import { parseLangCommand } from "../parsers/lang.parser";
import { IncorrectTelegramCommand } from "../telegram.error";
import { getLocale } from "../lang/get";
import { MemberService } from "@/modules/member/member.service";
import { GroupService } from "@/modules/group/group.service";
import { TelegramGroupNotFound } from "@/modules/member/member.error";
import { isGroupContext } from "../telegram.utils";
import { getDefaultLocale } from "../lang/group-locale";
import type { TelegramDeps } from "../telegram.types";

export const registerLangCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("lang", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const groupService = yield* GroupService;
      const result = parseLangCommand(ctx.message.text);

      if (!result.ok) {
        const t = getDefaultLocale();
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/lang",
            message:
              result.reason === "usage" ? t.lang.usage() : t.lang.supported(),
          }),
        );
      }

      if (!isGroupContext(ctx)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/lang",
            message: getDefaultLocale().command.useInGroup({
              command: "/lang",
            }),
          }),
        );
      }

      const { command } = result;
      const tgChatId = String(ctx.chat.id);
      const tgUserId = String(ctx.from.id);
      const sender = yield* memberService.findTelegramMember({
        tg_chat_id: tgChatId,
        tg_user_id: tgUserId,
      });
      const group = yield* groupService.findById(sender.group_id);

      if (!group) {
        return yield* Effect.fail(
          new TelegramGroupNotFound({
            tg_chat_id: tgChatId,
          }),
        );
      }

      if (command.type === "show") {
        const t = getLocale(group.language);
        return yield* Effect.promise(() =>
          ctx.reply(t.lang.current({ language: group.language })),
        );
      }

      const updatedGroup = yield* groupService.updateLang(
        command.language,
        group.id,
      );

      const t = getLocale(updatedGroup.language);
      return yield* Effect.promise(() =>
        ctx.reply(t.lang.changed({ language: updatedGroup.language })),
      );
    });
    return runTelegramCommand(
      runtime,
      ctx,
      {
        command: "/lang",
        fallbackMessage: getDefaultLocale().lang.fallback(),
      },
      commandFlow,
    );
  });
};
