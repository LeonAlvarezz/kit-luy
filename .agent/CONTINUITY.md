# CONTINUITY

## [PLANS]
- 2026-06-28T17:03:29+07:00 [USER] Implement `/buy` guided group flow with D1-backed conversation sessions; keep old one-line `/buy ...` syntax working.

## [DECISIONS]
- 2026-06-28T17:03:29+07:00 [CODE] Guided `/buy` stores active sessions in `telegram_conversation_sessions`; sessions expire after 30 minutes and are replaced per `(group_id, member_id)`.
- 2026-06-28T17:03:29+07:00 [CODE] V1 guided flow supports equal splits only; selected members represent purchase participants, and sender is auto-included if omitted.

## [PROGRESS]
- 2026-06-28T17:03:29+07:00 [CODE] Added Telegram conversation model/repository/service, buy text/callback event handlers, `/cancel`, `/buy` session start, help copy, migration `0005_talented_glorian.sql`, and focused tests.
- 2026-06-29T10:54:36+07:00 [CODE] Fixed guided `/buy` text middleware to pass through non-session/command messages, registered conversation events before normal commands, removed leaked debug logs, and changed internal error label from `buy_flow` to `/buy`.

## [DISCOVERIES]
- 2026-06-28T17:03:29+07:00 [TOOL] `bun test` still has unrelated existing failures in Khmer locale punctuation, list formatting, and settle formatting snapshots; focused buy flow tests pass.
- 2026-06-28T17:03:29+07:00 [TOOL] `bunx tsc --noEmit` still has unrelated existing test mock type errors for list/settle/void `findGroupById` and QR mock signatures.
- 2026-06-29T10:54:36+07:00 [TOOL] Focused buy command/conversation tests pass after middleware fix; full suite still fails only on the previously noted unrelated test issues.

## [OUTCOMES]
- 2026-06-28T17:03:29+07:00 [CODE] `/buy` can now start a persisted group wizard; old advanced `/buy <amount> ...` parser path remains available.
