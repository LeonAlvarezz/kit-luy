# CONTINUITY

## [PLANS]
- 2026-06-28T17:03:29+07:00 [USER] Implement `/buy` guided group flow with D1-backed conversation sessions; keep old one-line `/buy ...` syntax working.

## [DECISIONS]
- 2026-06-28T17:03:29+07:00 [CODE] Guided `/buy` stores active sessions in `telegram_conversation_sessions`; sessions expire after 30 minutes and are replaced per `(group_id, member_id)`.
- 2026-06-28T17:03:29+07:00 [CODE] V1 guided flow supports equal splits only; selected members represent purchase participants, and sender is auto-included if omitted.

## [PROGRESS]
- 2026-06-28T17:03:29+07:00 [CODE] Added Telegram conversation model/repository/service, buy text/callback event handlers, `/cancel`, `/buy` session start, help copy, migration `0005_talented_glorian.sql`, and focused tests.
- 2026-06-29T10:54:36+07:00 [CODE] Fixed guided `/buy` text middleware to pass through non-session/command messages, registered conversation events before normal commands, removed leaked debug logs, and changed internal error label from `buy_flow` to `/buy`.
- 2026-06-29T11:32:00+07:00 [CODE] Added debug logs in `buy-conversation.event.ts` to trace the text message handler and database query results.
- 2026-06-29T11:40:00+07:00 [CODE] Added entrypoint console logs in `telegram.controller.ts` and `telegram.service.ts` to verify webhook delivery.
- 2026-06-29T11:57:12+07:00 [CODE] Changed guided buy allocation to split only selected members; unselecting sender no longer auto-adds sender to the participant list.
- 2026-06-29T12:01:16+07:00 [CODE] Extracted common Telegram settlement group sender guard into `hasSettlementGroupChatSender` and reused it across group command/action handlers.
- 2026-06-29T13:06:40+07:00 [CODE] Renamed `hasSettlementGroupChatSender` to `isGroupContext` for better clarity and conciseness, and updated all occurrences.

## [DISCOVERIES]
- 2026-06-28T17:03:29+07:00 [TOOL] `bun test` still has unrelated existing failures in Khmer locale punctuation, list formatting, and settle formatting snapshots; focused buy flow tests pass.
- 2026-06-28T17:03:29+07:00 [TOOL] `bunx tsc --noEmit` still has unrelated existing test mock type errors for list/settle/void `findGroupById` and QR mock signatures.
- 2026-06-29T10:54:36+07:00 [TOOL] Focused buy command/conversation tests pass after middleware fix; full suite still fails only on the previously noted unrelated test issues.

## [OUTCOMES]
- 2026-06-28T17:03:29+07:00 [CODE] `/buy` can now start a persisted group wizard; old advanced `/buy <amount> ...` parser path remains available.
