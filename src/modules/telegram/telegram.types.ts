import type { WorkerEnv } from "@/http/worker-env";
import type { GroupService } from "@/modules/group/group.service";
import type { MemberService } from "@/modules/member/member.service";
import type { PurchaseService } from "@/modules/purchase/purchase.service";
import type { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import type { RepaymentService } from "@/modules/repayment/repayment.service";
import type { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import type { TelegramUserService } from "@/modules/telegram-user/telegram-user.service";

export type TelegramDeps =
  | WorkerEnv
  | GroupService
  | MemberService
  | PurchaseService
  | TelegramConversationService
  | RepaymentClaimService
  | RepaymentService
  | TelegramUserService;
