import { Effect, Runtime } from "effect";
import { Telegraf } from "telegraf";
import { TelegramDeps } from "../telegram.types";
import { message } from "telegraf/filters";
import { MemberService } from "@/modules/member/member.service";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { runTelegramCommand } from "../commands/command-error";
import { isGroupContext } from "../telegram.utils";
import { IncorrectTelegramCommand } from "../telegram.error";
import { getDefaultLocale } from "../lang/group-locale";
import { buyStrategy, parseSessionIfBelongToUser } from "./buy-strategy";
import { paidStrategy } from "./paid-strategy";
import { qrStrategy } from "./qr-strategy";

const strategies = [buyStrategy, paidStrategy, qrStrategy];
const getStrategy = (flow: string) => strategies.find((s) => s.flow === flow);

export const registerConversationEvents = (
  bot: Telegraf,
  runtime: Runtime.Runtime<TelegramDeps>,
) => {
  bot.on(message("text"), async (ctx, next) => {
    if (ctx.message.text.startsWith("/")) {
      return next();
    }

    const commandFlow = Effect.gen(function* () {
      const memberService = yield* MemberService;
      const telegramConversationService = yield* TelegramConversationService;

      if (!isGroupContext(ctx)) {
        return yield* Effect.promise(() => next());
      }

      const sender = yield* memberService
        .findTelegramMember({
          tg_chat_id: String(ctx.chat.id),
          tg_user_id: String(ctx.from.id),
        })
        .pipe(Effect.catchAll(() => Effect.fail("skip")));

      const session = yield* telegramConversationService.findActiveSession({
        group_id: sender.group_id,
        member_id: sender.id,
      });

      if (!session) {
        return yield* Effect.fail("skip");
      }

      const strategy = getStrategy(session.flow);

      if (!strategy) {
        return yield* Effect.fail("skip");
      }

      return yield* strategy.onText(ctx, sender, session);
    });

    return runTelegramCommand(
      runtime,
      ctx,
      {
        command: "conversation flow (text)",
        fallbackMessage: "Could not process message.",
      },
      commandFlow.pipe(
        Effect.catchAll((err) => {
          if (err === "skip") {
            return Effect.promise(() => next());
          }
          return Effect.fail(err);
        }),
      ),
    );
  });

  bot.action(
    /^flow:(toggle|user|everyone|done|confirm|cancel):(\d+)(?::(\d+))?$/,
    async (ctx) => {
      const commandFlow = Effect.gen(function* () {
        const action = ctx.match[1];

        const sessionId = Number(ctx.match[2]);
        const targetMemberId = ctx.match[3] ? Number(ctx.match[3]) : undefined;

        const memberService = yield* MemberService;
        const telegramConversationService = yield* TelegramConversationService;

        if (!isGroupContext(ctx)) {
          return yield* Effect.fail(
            new IncorrectTelegramCommand({
              command: "conversation callback",
              message: getDefaultLocale().command.useInGroup({
                command: "callback",
              }),
            }),
          );
        }

        const sender = yield* memberService.findTelegramMember({
          tg_chat_id: String(ctx.chat.id),
          tg_user_id: String(ctx.from.id),
        });

        let session =
          yield* telegramConversationService.findSessionById(sessionId);
        session = parseSessionIfBelongToUser(sender, session);

        if (!session) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery("This flow is not yours or has expired."),
          );
          return;
        }

        const strategy = getStrategy(session.flow);
        if (!strategy) {
          yield* Effect.promise(() =>
            ctx.answerCbQuery("This conversation flow is invalid."),
          );
          return;
        }

        return yield* strategy.onAction(
          ctx,
          action,
          sender,
          session,
          targetMemberId,
        );
      });

      return runTelegramCommand(
        runtime,
        ctx,
        {
          command: "conversation callback",
          fallbackMessage: "Could not process callback.",
        },
        commandFlow,
      );
    },
  );
};
