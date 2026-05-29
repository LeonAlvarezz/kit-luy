import { Layer } from "effect";

import { GroupLive } from "@/modules/group/group.controller";
import { HealthLive } from "@/modules/health/health.handler";
import { MemberLive } from "@/modules/member/member.controller";
import { TelegramLive } from "@/modules/telegram/telegram.controller";

export const RoutesLive = Layer.mergeAll(
  HealthLive,
  GroupLive,
  MemberLive,
  TelegramLive,
);
