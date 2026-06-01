import type { TelegramChat } from "./telegram.mapper";

export const isSettlementGroupChat = (chat: TelegramChat) =>
  chat.type === "group" || chat.type === "supergroup";

export const isChatMigrationMessage = (message?: object) =>
  !!message &&
  ("migrate_from_chat_id" in message || "migrate_to_chat_id" in message);
