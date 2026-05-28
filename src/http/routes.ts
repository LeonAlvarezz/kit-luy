import { Layer } from "effect";

import { HealthLive } from "@/modules/health/health.handler";
import { UserLive } from "@/modules/user/user.controller";

export const RoutesLive = Layer.mergeAll(HealthLive, UserLive);
