import { Context, Effect, Runtime } from "effect";
import type { Telegraf } from "telegraf";

import { GroupService } from "@/modules/group/group.service";
import { MemberService } from "@/modules/member/member.service";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { calculateRepayments } from "@/modules/purchase/purchase.utils";
import { runTelegramCommand } from "../command-error";
import { createMemberLookup, formatRepayments } from "./settle.utils";
import { IncorrectTelegramCommand } from "../../telegram.error";
import { isGroupContext } from "../../telegram.utils";
import { getDefaultLocale, getGroupLocale } from "../../lang/group-locale";
import type { TelegramDeps } from "../../telegram.types";

export const registerSettleCommand = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.command("settle", async (ctx) => {
    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const groupService = yield* GroupService;
      const purchaseService = yield* PurchaseService;
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

      const sender = yield* memberService.findTelegramMember({
        tg_chat_id: String(ctx.chat.id),
        tg_user_id: String(ctx.from.id),
      });
      const t = yield* getGroupLocale(groupService.findById, sender.group_id);

      const [members, balances] = yield* Effect.all([
        memberService.findActiveByGroupId(sender.group_id),
        purchaseService.findSettlementBalancesByGroupId(sender.group_id),
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
      runtime,
      ctx,
      {
        command: "/settle",
        fallbackMessage: getDefaultLocale().settle.fallback(),
      },
      commandFlow,
    );
  });
};
