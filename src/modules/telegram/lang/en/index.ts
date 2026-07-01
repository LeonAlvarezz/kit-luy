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
      "Kit Luy commands:\n\n/start - Show the welcome message.\n/join - Register yourself in this settlement group.\n/buy - Record a purchase step by step.\n/buy <amount> - Record a purchase split across everyone.\n/buy <amount> @user=amount|fraction ... - Record a purchase with explicit splits.\n/cancel - Cancel your active step-by-step flow.\n/paid <amount> - Claim that you paid your next repayment.\n/paid @user=<amount> - Claim that you paid a specific member.\n/settle - Show who should pay whom.\n/list - Show recent active purchases.\n/void <purchase-id> - Void a purchase.\n/setqr - Set your payment QR code (DM only).\n/qr - Show your payment QR code.\n/qr @user - Show a member's payment QR code.\n/help - Show this command list.",
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
    confirm: "Confirm",
    cancel: "Cancel",
  },
  join: {
    registered: "You are registered in this settlement group.",
    fallback: "Could not register you in this settlement group.",
  },
  buy: {
    usage: "Use /buy to record a purchase step by step.",
    allocationUsage:
      "Use allocations like @userA=2 @userB=1/4 after the amount.",
    noOtherActiveMembers:
      "There are no other active members in this settlement group.",
    duplicateBeneficiary:
      "@{username:string} appears more than once in this purchase.",
    beneficiaryNotFound:
      "Could not find @{username:string} in this settlement group.",
    allocationTotalMismatch:
      "Explicit allocations cannot exceed the purchase total.",
    fallback: "Could not record this purchase.",
    created:
      "Purchase #{purchaseId:number} created: <code>${amount:string}</code> paid by <b>{payer:string}</b>.",
    beneficiaries: "Beneficiaries:",
    beneficiaryLine:
      "   - {member:string}\t\t\t\t\t<code>${amount:string}</code>",
    validAmount: "Please send a valid amount greater than 0.",
    askAmount: "How much did you pay? (e.g. 5 or 20000R)",
    askMembers: "Who shared this purchase?",
    memberPickerEveryone: "Everyone",
    memberPickerDone: "Done",
    memberPickerCancel: "Cancel",
    memberPickerMyself: "Myself 👤",
    cancelled: "Cancelled.",
    everyoneSelected: "Everyone selected.",
    selectAtLeastOneOther: "Select at least one person besides yourself.",
    incompleteFlow: "This buy flow is incomplete.",
    purchaseRecorded: "Purchase recorded.",
    summaryHeader: "Record purchase?",
    summaryTotal: "Total",
    summaryPaidBy: "Paid by",
  },
  paid: {
    usage: "Use /paid 2 or /paid @userA=10",
    validAmount: "Please send a valid amount greater than 0.",
    noOtherActiveMembers:
      "There are no other active members in this settlement group.",
    askAmount: "How much did you pay? (e.g. 5 or 20000R)",
    askReceiver: "Who do you want to pay to?",
    nothingToSettle: "You don't have anything to settle.",
    receiverNotFound: "Could not find @{username:string} in this group.",
    nothingToSettleWith:
      "You don't have anything to settle with @{username:string}.",
    claimTooMuch: "You cannot claim more than you owe.",
    summaryHeader: "Create repayment claim?",
    summaryAmount: "Amount",
    summaryFrom: "From",
    summaryTo: "To",
    summaryPurchase: "Purchase",
    summaryNoPurchase: "None (General Repayment)",
    askPurchase: "Is this payment for a specific purchase?",
    generalPayment: "General Payment / Not listed",
    cancel: "Cancel",
    confirm: "Confirm",
    cancelled: "Cancelled.",
    incompleteFlow: "This paid flow is incomplete.",
    claimCreatedToast: "Repayment claim created.",
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
    repaymentLine:
      "   - {member:string}\t\t\t\t\t<code>${amount:string}</code>",
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
    wrongGroup: "Purchase #{purchaseId:number} does not belong to this group.",
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
    success: "#{claimId:number} Repayment succeeded ✅",
    failed: "#{claimId:number} Repayment rejected 🚫",
    fallback: "Could not process repayment claim action.",
  },
  setqr: {
    usagePrivate:
      "Please send or forward your QR code photo directly to this private chat to set it.",
    useInPrivate: "Please use /setqr in a private chat with the bot.",
    success:
      "Your payment QR code has been saved successfully! You can now use it in settlement groups.",
    fallback: "Could not save your QR code.",
  },
  qr: {
    usage: "Use /qr to show your QR, or /qr @user to show a member's QR.",
    selectMember: "Select a user to view their QR code:",
    memberPickerMyself: "Myself 👤",
    notSetSelf:
      "You haven't set your payment QR yet. Please DM me and send your QR photo to set it.",
    notSetOther:
      "<b>{name:string}</b> hasn't set their payment QR yet. Ask them to DM me and send their QR photo.",
    captionSelf: "Your payment QR code.",
    captionOther: "Payment QR code for <b>{name:string}</b>.",
    cancelled: "Cancelled.",
    fallback: "Could not retrieve QR code.",
  },
} satisfies BaseTranslation;

export default en;
