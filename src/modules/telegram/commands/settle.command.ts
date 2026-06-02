import { Context, Effect } from "effect";
import type { Telegraf } from "telegraf";

import type { MemberService } from "@/modules/member/member.service";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import { calculateRepayments } from "@/modules/purchase/purchase.utils";
import { runTelegramCommand } from "./command-error";
import { createMemberLookup, formatRepayments } from "./settle.utils";
import { IncorrectTelegramCommand } from "../telegram.error";
import { isSettlementGroupChat } from "../telegram.utils";

export type SettleCommandDependencies = Pick<
  Context.Tag.Service<typeof MemberService>,
  "findTelegramMember" | "findActiveByGroupId"
> & {
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
      if (!ctx.chat || !ctx.from || !isSettlementGroupChat(ctx.chat)) {
        return yield* Effect.fail(
          new IncorrectTelegramCommand({
            command: "/settle",
            message: "Use /settle inside your Kit Luy group.",
          }),
        );
      }

      const sender = yield* dependencies.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });

      const [members, balances] = yield* Effect.all([
        dependencies.findActiveByGroupId(sender.group_id),
        dependencies.findSettlementBalancesByGroupId(sender.group_id),
      ]);

      console.log({ balances });

      const memberById = createMemberLookup(members);
      const repayments = calculateRepayments(balances);

      if (repayments.length <= 0) {
        return yield* Effect.promise(() =>
          ctx.reply("All clear. No repayments are needed."),
        );
      }

      const repaymentLines = formatRepayments(repayments, memberById);

      return yield* Effect.promise(() =>
        ctx.reply(`Repayments to settle:\n${repaymentLines}`, {
          parse_mode: "HTML",
        }),
      );
    });

    return runTelegramCommand(
      ctx,
      {
        command: "/settle",
        fallbackMessage: "Could not calculate settlement.",
      },
      commandFlow,
    );
  });
};
