import type { Telegraf } from "telegraf";
import { Effect, Runtime } from "effect";

import { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { getDefaultLocale, getGroupLocale } from "../../lang/group-locale";
import { isGroupContext } from "../../telegram.utils";
import type { TelegramDeps } from "../../telegram.types";

export const TELEGRAM_COMMAND_HELP_MESSAGE = getDefaultLocale().help.message();

export const registerHelpCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.help(async (ctx) => {
    if (!isGroupContext(ctx as any)) {
      return ctx.reply(getDefaultLocale().help.message());
    }

    const message = await Runtime.runPromise(runtime)(
      Effect.gen(function* () {
        const groupService = yield* GroupService;
        const memberService = yield* MemberService;

        const member = yield* memberService.findTelegramMember({
          tg_chat_id: String(ctx.chat?.id),
          tg_user_id: String(ctx.from?.id),
        });
        const t = yield* getGroupLocale(
          groupService.findById,
          member.group_id,
        );
        return t.help.message();
      }).pipe(
        Effect.catchAll(() =>
          Effect.succeed(getDefaultLocale().help.message()),
        ),
      ),
    );

    return ctx.reply(message);
  });
};
