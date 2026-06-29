import { Runtime, Context } from "effect";
import { MemberService } from "@/modules/member/member.service";
import { GroupService } from "@/modules/group/group.service";
import { PurchaseService } from "@/modules/purchase/purchase.service";
import { TelegramUserService } from "@/modules/telegram-user/telegram-user.service";
import { TelegramConversationService } from "@/modules/telegram-conversation/telegram-conversation.service";
import { RepaymentClaimService } from "@/modules/repayment/repayment-claim.service";
import { RepaymentService } from "@/modules/repayment/repayment.service";
import type { TelegramDeps } from "./telegram.types";

export const createMockRuntime = (mocks: {
  memberService?: any;
  groupService?: any;
  purchaseService?: any;
  telegramUserService?: any;
  telegramConversationService?: any;
  repaymentClaimService?: any;
  repaymentService?: any;
}): Runtime.Runtime<TelegramDeps> => {
  const context = Context.empty().pipe(
    Context.add(MemberService, mocks.memberService ?? {}),
    Context.add(GroupService, mocks.groupService ?? {}),
    Context.add(PurchaseService, mocks.purchaseService ?? {}),
    Context.add(TelegramUserService, mocks.telegramUserService ?? {}),
    Context.add(
      TelegramConversationService,
      mocks.telegramConversationService ?? {},
    ),
    Context.add(RepaymentClaimService, mocks.repaymentClaimService ?? {}),
    Context.add(RepaymentService, mocks.repaymentService ?? {}),
  ) as any;

  return Runtime.make({
    context,
    fiberRefs: Runtime.defaultRuntime.fiberRefs,
    runtimeFlags: Runtime.defaultRuntime.runtimeFlags,
  });
};
