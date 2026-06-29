import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { GroupService } from "@/modules/group/group.service";
import type { MemberService } from "@/modules/member/member.service";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { calculateRepayments } from "@/modules/purchase/purchase.utils";
import { runTelegramCommand } from "./command-error";
import { createMemberLookup, formatRepayments } from "./settle.utils";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isGroupContext } from "../telegram.utils";
import { getDefaultLocale, getGroupLocale } from "../lang/group-locale";

export type SettleCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
  findGroupById: Context.Tag.Service<typeof GroupService>["findById"];
  findSettlementBalancesByGroupId: Context.Tag.Service<
    typeof PurchaseService
  >["findSettlementBalancesByGroupId"];
};

export const registerSettleCommand = (
  bot: Telegraf,
  dependencies: SettleCommandDependencies,
) => {
  bot.command("settle", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      if (!isGroupContext(ctx)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/settle",
            message: getDefaultLocale().command.useInGroup({
              command: "/settle",
            }),
          }),
        );
      }

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });
      const t = yield* getGroupLocale(dependencies.findGroupById, sender.group_id);

      const [members, balances] = yield* Effect.all([
        dependencies.findActiveByGroupId(sender.group_id),
        dependencies.findSettlementBalancesByGroupId(sender.group_id),
      ]);

      const memberById = createMemberLookup(members);
      const repayments = calculateRepayments(balances);

      if (repayments.length <= 0) {
        return yield* Effect.promise(() =>
          ctx.reply(t.settle.allClear()),
        );
      }

      const repaymentLines = formatRepayments(t, repayments, memberById);

      return yield* Effect.promise(() =>
        ctx.reply(`${t.settle.header()}\n\n${repaymentLines}`, {
          parse_mode: "HTML",
        }),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/settle",
        fallbackMessage: getDefaultLocale().settle.fallback(),
      },
      commandFlow,
    );
  });
};
