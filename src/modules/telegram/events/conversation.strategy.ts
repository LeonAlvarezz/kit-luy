import { MemberModel } from "@/modules/member/member.model";
import { TelegramConversationModel } from "@/modules/telegram-conversation/telegram-conversation.model";
import { Effect } from "effect";
import { Context } from "telegraf";
import { Message } from "telegraf/types";
import { TelegramDeps } from "../telegram.types";

export interface ConversationStrategy {
  readonly flow: "buy" | "paid" | "qr";
  onText(
    ctx: Context,
    sender: MemberModel.Entity,
    session: TelegramConversationModel.Entity,
  ): Effect.Effect<void | Message.TextMessage, unknown, TelegramDeps>;

  onAction(
    ctx: Context,
    action: string,
    sender: MemberModel.Entity,
    session: TelegramConversationModel.Entity,
    targetMemberId?: number,
  ): Effect.Effect<unknown, unknown, TelegramDeps>;
}
