import { Layer } from "effect";

import { HealthLive } from "@/modules/health/health.handler";
import { MemberLive } from "@/modules/member/member.controller";
import { TelegramLive } from "@/modules/telegram/telegram.controller";

export const RoutesLive = Layer.mergeAll(
  HealthLive,
  MemberLive,
  TelegramLive
);
