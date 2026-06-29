import type { TelegramChat, TelegramUser } from "./telegram.mapper";

// Returns true when the chat is a standard group or supergroup
export const isSettlementGroupChat = (chat: TelegramChat) =>
  chat.type === "group" || chat.type === "supergroup";

// Narrows a Telegram handler context to settlement-group messages with a sender.
export const isGroupContext = (ctx: {
  readonly chat?: TelegramChat;
  readonly from?: TelegramUser;
}): ctx is { readonly chat: TelegramChat; readonly from: TelegramUser } =>
  !!ctx.chat && !!ctx.from && isSettlementGroupChat(ctx.chat);

export const isChatMigrationMessage = (message?: object) =>
  !!message &&
  ("migrate_from_chat_id" in message || "migrate_to_chat_id" in message);

export const formatMemberName = (member: {
  readonly id: number;
  readonly alias: string | null;
  readonly display_name: string | null;
}) => (member.display_name ? member.display_name : `@${member.alias}`);

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
