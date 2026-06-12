import type { MemberModel } from "@/modules/member/member.model";
import type { TelegramUserModel } from "@/modules/telegram-user/telegram-user.model";

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_bot?: boolean;
};

export type TelegramChat = {
  id: number;
  type: string;
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

const getUserDisplayName = (user: TelegramUser) => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return name || user.username || null;
};

const getChatTitle = (chat: TelegramChat) => {
  if (chat.title) {
    return chat.title;
  }

  const name = [chat.first_name, chat.last_name].filter(Boolean).join(" ");
  return name || chat.username || `${chat.type}:${chat.id}`;
};

export const toRegisterTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
): MemberModel.RegisterTelegramMember | null => {
  const telegramUser = toUpsertTelegramUser(user);

  if (!telegramUser || !Number.isFinite(chat.id)) {
    return null;
  }

  return {
    group: {
      tg_chat_id: String(chat.id),
      title: getChatTitle(chat),
    },
    telegram_user: telegramUser,
    member: {
      tg_user_id: String(user.id),
      display_name: getUserDisplayName(user),
      alias: user.username ?? null,
    },
  };
};

export const toUpsertTelegramUser = (
  user: TelegramUser,
): TelegramUserModel.UpsertTelegramUser | null => {
  if (user.is_bot || !Number.isFinite(user.id)) {
    return null;
  }

  return {
    tg_user_id: String(user.id),
    username: user.username ?? null,
    display_name: getUserDisplayName(user),
  };
};

export const toDeactivateTelegramMember = (
  chat: TelegramChat,
  user: TelegramUser,
): MemberModel.DeactivateTelegramMember | null => {
  if (user.is_bot || !Number.isFinite(chat.id) || !Number.isFinite(user.id)) {
    return null;
  }

  return {
    tg_chat_id: String(chat.id),
    tg_user_id: String(user.id),
  };
};
