import { HttpApi } from "@effect/platform";

import { GroupRoute } from "@/modules/group/group.route";
import { HealthGroup } from "@/modules/health/health.route";
import { MemberRoute } from "@/modules/member/member.route";
import { TelegramRoute } from "@/modules/telegram/telegram.route";

export class AppApi extends HttpApi.make("app")
  .add(HealthGroup)
  .add(GroupRoute)
  .add(MemberRoute)
  .add(TelegramRoute) {}
