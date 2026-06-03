import type { Telegraf } from "telegraf";
import type { Context } from "effect";
import { Effect } from "effect";

import type { GroupService } from "@/modules/group/group.service";
import type { MemberService } from "@/modules/member/member.service";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";
import { isSettlementGroupChat } from "../telegram.utils";

export type HelpCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember"
> & {
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
};

export const TELEGRAM_COMMAND_HELP_MESSAGE = getDefaultLocale().help.message();

export const registerHelpCommand = (
  bot: Telegraf,
  dependencies?: HelpCommandDependencies,
) => {
  bot.help(async (ctx) => {
    if (
      !dependencies ||
      !ctx.chat ||
      !ctx.from ||
      !isSettlementGroupChat(ctx.chat)
    ) {
      return ctx.reply(getDefaultLocale().help.message());
    }

    const message = await Effect.runPromise(
      Effect.gen(function* () {
        const member = yield* dependencies.findTelegramMember({
          tg_chat_id: String(ctx.chat?.id),
          tg_user_id: String(ctx.from?.id),
        });
        const t = yield* getGroupLocale(
          dependencies.findGroupById,
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
