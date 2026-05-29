import { HttpApi } from "@effect/platform";

import { HealthGroup } from "@/modules/health/health.route";
import { MemberRoute } from "@/modules/member/member.route";
import { TelegramRoute } from "@/modules/telegram/telegram.route";

export class AppApi extends HttpApi.make("app")
  .add(HealthGroup)
  .add(MemberRoute)
  .add(TelegramRoute) {}
