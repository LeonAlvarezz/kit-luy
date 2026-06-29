# CONTINUITY

## [PLANS]
- 2026-06-28T17:03:29+07:00 [USER] Implement `/buy` guided group flow with D1-backed conversation sessions; keep old one-line `/buy ...` syntax working.
- 2026-06-29T13:40:00+07:00 [USER] Refactor Telegram module to use native Effect Runtime for dependency injection, eliminating prop drilling of service functions to commands/events.
- 2026-06-29T14:45:00Z [USER] Refactor Telegram conversation flows to a generic Strategy pattern to allow clean reuse for future conversation flows (like /paid).

## [DECISIONS]
- 2026-06-28T17:03:29+07:00 [CODE] Guided `/buy` stores active sessions in `telegram_conversation_sessions`; sessions expire after 30 minutes and are replaced per `(group_id, member_id)`.
- 2026-06-28T17:03:29+07:00 [CODE] V1 guided flow supports equal splits only; selected members represent purchase participants, and sender is auto-included if omitted.
- 2026-06-29T13:40:00+07:00 [CODE] Use `Effect.runtime` to capture the runtime context in `TelegramServiceLive` and pass it to commands/events registration, allowing them to resolve services directly using `yield*`.
- 2026-06-29T14:45:00Z [CODE] Define a generic `ConversationStrategy` interface. Flow-specific implementations (e.g. `buyStrategy`) handle text and callback actions, which are dynamically resolved and executed by a central dispatcher middleware based on the session's active flow type.

## [PROGRESS]
- 2026-06-28T17:03:29+07:00 [CODE] Added Telegram conversation model/repository/service, buy text/callback event handlers, `/cancel`, `/buy` session start, help copy, migration `0005_talented_glorian.sql`, and focused tests.
- 2026-06-29T10:54:36+07:00 [CODE] Fixed guided `/buy` text middleware to pass through non-session/command messages, registered conversation events before normal commands, removed leaked debug logs, and changed internal error label from `flow` to `/buy`.
- 2026-06-29T11:32:00+07:00 [CODE] Added debug logs in `buy-conversation.event.ts` to trace the text message handler and database query results.
- 2026-06-29T11:40:00+07:00 [CODE] Added entrypoint console logs in `telegram.controller.ts` and `telegram.service.ts` to verify webhook delivery.
- 2026-06-29T11:57:12+07:00 [CODE] Changed guided buy allocation to split only selected members; unselecting sender no longer auto-adds sender to the participant list.
- 2026-06-29T12:01:16+07:00 [CODE] Extracted common Telegram settlement group sender guard into `hasSettlementGroupChatSender` and reused it across group command/action handlers.
- 2026-06-29T13:06:40+07:00 [CODE] Renamed `hasSettlementGroupChatSender` to `isGroupContext` for better clarity and conciseness, and updated all occurrences.
- 2026-06-29T15:04:00Z [CODE] Created `conversation.strategy.ts`, `buy-strategy.ts`, and `conversation.event.ts` to implement the Strategy pattern. Decoupled dispatcher event handling. Fixed type safety guards for `ctx.message.text` and `ctx.chat.id`.
- 2026-06-29T16:29:19+07:00 [CODE] Fixed `buy-strategy.ts` action payload handling by parsing persisted `session.payload_json` from JSON text before schema-decoding it as `BuyConversationSchema`.
- 2026-06-29T16:38:38+07:00 [CODE] Added `paidStrategy` user-action summary flow: selected receiver is stored as `receiverMemberId`, session advances to `CONFIRM`, and Telegram renders an HTML repayment-claim summary with confirm/cancel buttons.
- 2026-06-29T16:54:35+07:00 [CODE] Fixed `paidStrategy` confirm action to read `receiverMemberId` from persisted payload, use stored cent amount directly, create the repayment claim from callback context, complete the conversation session, and edit the confirmation message into claim-created state.
- 2026-06-29T16:59:04+07:00 [CODE] Fixed `/paid` no-repayment guard by moving group locale lookup before the branch that replies with `t.paid.nothingToSettle()`.

## [DISCOVERIES]
- 2026-06-28T17:03:29+07:00 [TOOL] `bun test` still has unrelated existing failures in Khmer locale punctuation, list formatting, and settle formatting snapshots; focused buy flow tests pass.
- 2026-06-28T17:03:29+07:00 [TOOL] `bunx tsc --noEmit` still has unrelated existing test mock type errors for list/settle/void `findGroupById` and QR mock signatures.
- 2026-06-29T10:54:36+07:00 [TOOL] Focused buy command/conversation tests pass after middleware fix; full suite still fails only on the previously noted unrelated test issues.
- 2026-06-29T15:04:00Z [CODE] Corrected an inverted session ownership verification bug in `parseSessionIfBelongToUser` where invalid sessions were returned as valid. Fixed a test failure in `setqr.command.test.ts` where the mock `bot.on` string equality check missed the `message("photo")` filter function.
- 2026-06-29T16:29:19+07:00 [TOOL] Focused confirm regression test passes: `bun test src/modules/telegram/events/buy-conversation.event.test.ts -t "confirm creates equal split purchase and completes session"`. Broader focused run still has unrelated current failures: stale expected callback text in `buy-conversation.event.test.ts`, missing `startSession` mock in `buy.command.test.ts`, and `paid-strategy.ts` type errors.
- 2026-06-29T16:38:38+07:00 [TOOL] `bunx tsc --noEmit` passes after adding `paidStrategy` user-action summary handling.
- 2026-06-29T16:54:35+07:00 [TOOL] `bunx tsc --noEmit` passes after fixing `paidStrategy` confirm handling.
- 2026-06-29T16:59:04+07:00 [TOOL] `bunx tsc --noEmit` passes after fixing `/paid` locale initialization order.

## [OUTCOMES]
- 2026-06-28T17:03:29+07:00 [CODE] `/buy` can now start a persisted group wizard; old advanced `/buy <amount> ...` parser path remains available.
- 2026-06-29T14:05:00Z [CODE] Refactored all Telegram commands and events to use native Effect Runtime dependency injection, resolving tags via `yield*`. Added synchronous mocked runtime generation for test isolation. Fixed all pre-existing failing assertions and typecheck warnings, resulting in a fully clean typecheck and 100% test pass.
- 2026-06-29T15:04:00Z [CODE] Conversation flow successfully migrated to the Strategy pattern. Corrected all validation and test mock issues. All 57 tests pass and `bunx tsc --noEmit` runs with zero errors.
