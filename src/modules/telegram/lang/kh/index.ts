import type { BaseTranslation } from "../i18n-types";

const kh = {
  bot: {
    welcome: "សូមស្វាគមន៍មកកាន់ប្រើប្រាស់គិតលុយBot",
    echo: "អ្នកបាននិយាយ៖ {text:string}",
    added:
      "អរគុណសម្រាប់ការអេដចូលគ្រុប ដោយ Telegram មិនអនុញ្ញាតឱ្យ bot នាំចូលបញ្ជីសមាជិកដែលមាននៅក្នុងគ្រុបស្រាប់ ដូច្នេះតម្រូវអោយសមាជិកផ្ញើសារ /join ដើម្បីចុះឈ្មោះប្រើប្រាស់",
    newMembersRegistered: "បានចុះឈ្មោះសមាជិកថ្មី",
  },
  help: {
    message:
      "ពាក្យបញ្ជា Kit Luy៖\n\n/start - បង្ហាញសារស្វាគមន៍\n/join - ចុះឈ្មោះអ្នកក្នុងគ្រុបទូទាត់នេះ\n/buy <amount> - កត់ត្រាការទិញដែលចែកជាមួយគ្រប់គ្នា\n/buy <amount> @user=amount|fraction ... - កត់ត្រាការទិញជាមួយការចែកច្បាស់លាស់\n/paid <amount> - ស្នើថាអ្នកបានបង់ការទូទាត់បន្ទាប់\n/paid @user=<amount> - អ្នកបានបង់ទៅសមាជិកជាក់លាក់\n/settle - បង្ហាញអ្នកណាគួរបង់ឱ្យអ្នកណា\n/list - បង្ហាញបញ្ជីជំបាក់ប្រាក់\n/void <purchase-id> - លុបចោលការទិញ\n/help - បង្ហាញបញ្ជីពាក្យបញ្ជានេះ",
  },
  lang: {
    current: "ភាសាបច្ចុប្បន្ន: {language:string}។",
    changed: "បានប្តូរភាសាទៅជា {language:string}",
    supported: "ភាសាដែលគាំទ្រ៖ en និង kh",
    usage: "សូមប្រើ /lang, /lang en, ឬ /lang kh",
    fallback: "មានបញ្ហាក្នុងមុខងារភាសា",
  },
  command: {
    useInGroup: "សូមប្រើ {command:string} នៅក្នុងគ្រុប",
    useInKitLuyGroup: "សូមប្រើ {command:string} នៅក្នុងគ្រុបរបស់អ្នក",
    failed: "ពាក្យបញ្ជាបរាជ័យ",
  },
  join: {
    registered: "អ្នកបានចុះឈ្មោះក្នុងគ្រុបទូទាត់នេះហើយ",
    fallback: "មិនអាចចុះឈ្មោះអ្នកក្នុងគ្រុបទូទាត់នេះបានទេ",
  },
  buy: {
    usage: "សូមប្រើ /buy 4.5 ឬ /buy 4.5 @userA=2 @userB=1/4",
    allocationUsage:
      "សូមប្រើការចែកដូចជា @userA=2 @userB=1/4 បន្ទាប់ពីចំនួនទឹកប្រាក់",
    noOtherActiveMembers: "មិនមានសមាជិកចុះឈ្មោះនៅក្នុងគ្រុបទូទាត់នេះទេ",
    duplicateBeneficiary:
      "@{username:string} មានច្រើនជាងម្តងក្នុងការប្រតិបត្តិការនេះ",
    beneficiaryNotFound: "រកមិនឃើញ @{username:string} ក្នុងគ្រុបទូទាត់ទេ",
    allocationTotalMismatch:
      "ប្រតិបត្តិការចែកលុយច្បាស់លាស់មិនអាចលើសចំនួនទឹកប្រាក់ទិញសរុបបានទេ",
    fallback: "មិនអាចកត់ត្រាការទិញនេះបានទេ",
    created:
      "ការទិញ #{purchaseId:number} បានបង្កើត៖ <code>${amount:string}</code> បង់ដោយ <b>{payer:string}</b>",
    beneficiaries: "អ្នកចូលរួម:",
    beneficiaryLine:
      "   - {member:string}\t\t\t\t\t<code>${amount:string}</code>",
  },
  paid: {
    usage: "សូមប្រើ /paid 2 ឬ /paid @userA=10",
    nothingToSettle: "អ្នកមិនមានអ្វីត្រូវទូទាត់ទេ",
    receiverNotFound: "រកមិនឃើញ @{username:string} ក្នុងគ្រុបនេះទេ",
    nothingToSettleWith: "អ្នកមិនមានអ្វីត្រូវទូទាត់ជាមួយ @{username:string} ទេ",
    claimTooMuch: "អ្នកមិនអាចបង់លើសពីចំនួនដែលអ្នកជំពាក់ទេ",
    claimCreated:
      "បានបង្កើតសំណើទូទាត់ #{claimId:number} សម្រាប់ ${amount:string} កំពុងរង់ចាំការបញ្ជាក់",
    accept: "ទទួលយក",
    reject: "បដិសេធ",
    fallback: "មិនអាចដំណើរការពាក្យបញ្ជា paid បានទេ",
  },
  settle: {
    allClear: "រួចរាល់ មិនត្រូវមានការទូទាត់ឡើយ",
    header: "តារាងទូទាត់ប្រាក់:",
    creditor: "ម្ចាស់បំណុល",
    repaymentLine:
      "   - {member:string}\t\t\t\t\t<code>${amount:string}</code>",
    fallback: "មិនអាចគណនាការទូទាត់បានទេ",
  },
  list: {
    empty: "មិនមានការជំពាក់ប្រាក់ឡើយ",
    header: "ការទិញថ្មីៗ:",
    purchaseLine:
      "   - #<code>{purchaseId:number}</code> <code>${amount:string}</code> បង់ដោយ {payer:string} នៅ {date:string}",
    unknownMember: "សមាជិក #{memberId:number}",
    fallback: "មិនអាចបង្ហាញបញ្ជីជំពាក់ប្រាក់បានទេ",
  },
  void: {
    usage: "សូមប្រើ /void <purchase-id>",
    wrongGroup: "ការទិញ #{purchaseId:number} មិនមែនជារបស់គ្រុបនេះទេ",
    onlyCreator:
      "មានតែសមាជិកដែលបានបង្កើតការទិញ #{purchaseId:number} ប៉ុណ្ណោះអាចលុបចោលវាបាន",
    alreadyVoided: "ការទិញ #{purchaseId:number} ត្រូវបានលុបចោលរួចហើយ",
    voided: "បានលុបចោលការទិញ #{purchaseId:number}",
    fallback: "មិនអាចលុបចោលការទិញនេះបានទេ",
  },
  repaymentClaim: {
    useInGroup: "សូមបញ្ជាសំណើទូទាត់នៅក្នុងគ្រុប",
    onlyReceiver: "មានតែអ្នកទទួលការទូទាត់ប៉ុណ្ណោះអាចទទួលយក ឬបដិសេធសំណើនេះបាន",
    accepted: "បានទទួលយកសំណើទូទាត់",
    rejected: "បានបដិសេធសំណើទូទាត់",
    status: "សំណើទូទាត់ #{claimId:number} {status:string}",
    fallback: "មិនអាចបង្ហាញសំណើទូទាត់បានទេ",
  },
} satisfies BaseTranslation;

export default kh;
