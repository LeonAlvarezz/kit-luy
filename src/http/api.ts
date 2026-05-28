import { HttpApi } from "@effect/platform";

import { HealthGroup } from "@/modules/health/health.route";
import { UsersGroup } from "@/modules/user/user.route";

export class AppApi extends HttpApi.make("app")
  .add(HealthGroup)
  .add(UsersGroup) {}
