import { describe, expect, test } from "bun:test";
import {
  toRegisterTelegramMember,
  toUpsertTelegramUser,
} from "./telegram.mapper";

describe("telegram mapper", () => {
  test("maps Telegram user to global telegram user payload", () => {
    expect(
      toUpsertTelegramUser({
        id: 123,
        first_name: "Alice",
        last_name: "Doe",
        username: "alice",
      }),
    ).toEqual({
      tg_user_id: "123",
      username: "alice",
      display_name: "Alice Doe",
    });
  });

  test("includes global telegram user payload when registering member", () => {
    expect(
      toRegisterTelegramMember(
        {
          id: -100,
          type: "supergroup",
          title: "Coffee",
        },
        {
          id: 123,
          first_name: "Alice",
          username: "alice",
        },
      ),
    ).toEqual({
      group: {
        tg_chat_id: "-100",
        title: "Coffee",
      },
      telegram_user: {
        tg_user_id: "123",
        username: "alice",
        display_name: "Alice",
      },
      member: {
        tg_user_id: "123",
        display_name: "Alice",
        alias: "alice",
      },
    });
  });
});
