import type { BaseTranslation } from "../i18n-types";

const en = {
  bot: {
    welcome: "Welcome to Kit Luy Bot!",
    echo: "You said: {text:string}",
    added:
      "Thanks for adding Kit Luy. Telegram does not let bots import the existing member list, so I will register members when they send a message here. Ask everyone to send /join once.",
    newMembersRegistered: "New group members registered.",
  },
  help: {
    message:
      "Kit Luy commands:\n\n/start - Show the welcome message.\n/join - Register yourself in this settlement group.\n/buy <amount> - Record a purchase split across everyone.\n/buy <amount> @user=amount ... - Record a purchase with explicit splits.\n/paid <amount> - Claim that you paid your next repayment.\n/paid @user=<amount> - Claim that you paid a specific member.\n/settle - Show who should pay whom.\n/list - Show recent active purchases.\n/void <purchase-id> - Void a purchase.\n/help - Show this command list.",
  },
  lang: {
    current: "Current language: {language:string}.",
    changed: "Language changed to {language:string}.",
    supported: "Supported languages are en and kh.",
    usage: "Use /lang, /lang en, or /lang kh.",
    fallback: "Error processing language",
  },
  command: {
    useInGroup: "Use {command:string} inside a group.",
    useInKitLuyGroup: "Use {command:string} inside your Kit Luy group.",
    failed: "Command failed.",
  },
  join: {
    registered: "You are registered in this settlement group.",
    fallback: "Could not register you in this settlement group.",
  },
  buy: {
    usage: "Use /buy 4.5 or /buy 4.5 @userA=2 @userB=2.5",
    allocationUsage:
      "Use allocations like @userA=2 @userB=2.5 after the amount.",
    noOtherActiveMembers:
      "There are no other active members in this settlement group.",
    duplicateBeneficiary: "@{username:string} appears more than once in this purchase.",
    beneficiaryNotFound:
      "Could not find @{username:string} in this settlement group.",
    allocationTotalMismatch:
      "Explicit allocations must add up to the purchase total.",
    fallback: "Could not record this purchase.",
    created:
      "Purchase #{purchaseId:number} created: <code>${amount:string}</code> paid by <b>{payer:string}</b>.",
    beneficiaries: "Beneficiaries:",
    beneficiaryLine: "   - {member:string}\t\t\t\t\t<code>${amount:string}</code>",
  },
  paid: {
    usage: "Use /paid 2 or /paid @userA=10",
    nothingToSettle: "You don't have anything to settle.",
    receiverNotFound: "Could not find @{username:string} in this group.",
    nothingToSettleWith:
      "You don't have anything to settle with @{username:string}.",
    claimTooMuch: "You cannot claim more than you owe.",
    claimCreated:
      "Repayment claim #{claimId:number} created for ${amount:string}. Waiting for confirmation.",
    accept: "Accept",
    reject: "Reject",
    fallback: "Could not process paid command",
  },
  settle: {
    allClear: "All clear. No repayments are needed.",
    header: "Repayments to settle:",
    creditor: "Creditor",
    repaymentLine: "   - {member:string}\t\t\t\t\t<code>${amount:string}</code>",
    fallback: "Could not calculate settlement.",
  },
  list: {
    empty: "No active purchases found.",
    header: "Recent purchases:",
    purchaseLine:
      "   - #<code>{purchaseId:number}</code> <code>${amount:string}</code> paid by {payer:string} on {date:string}",
    unknownMember: "member #{memberId:number}",
    fallback: "Could not list purchases.",
  },
  void: {
    usage: "Use /void <purchase-id>.",
    wrongGroup:
      "Purchase #{purchaseId:number} does not belong to this group.",
    onlyCreator:
      "Only the member who created purchase #{purchaseId:number} can void it.",
    alreadyVoided: "Purchase #{purchaseId:number} is already voided.",
    voided: "Purchase #{purchaseId:number} voided.",
    fallback: "Could not void this purchase.",
  },
  repaymentClaim: {
    useInGroup: "Use repayment claim actions inside a group.",
    onlyReceiver:
      "Only the repayment receiver can accept or reject this claim.",
    accepted: "Repayment claim accepted.",
    rejected: "Repayment claim rejected.",
    status: "Repayment claim #{claimId:number} {status:string}.",
    fallback: "Could not process repayment claim action.",
  },
} satisfies BaseTranslation;

export default en;
