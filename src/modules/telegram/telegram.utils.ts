import type { TelegramChat } from "./telegram.mapper";

export const isSettlementGroupChat = (chat: TelegramChat) =>
  chat.type === "group" || chat.type === "supergroup";

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
