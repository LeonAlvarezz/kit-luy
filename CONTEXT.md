# Kit Luy

Kit Luy tracks shared small purchases between people so the group can settle what each person owes without reconstructing payments from memory.

## Language

**Settlement Group**:
A collection of two or more Members who share purchases and periodically resolve what they owe each other.
_Avoid_: Chat, account, circle

**Member**:
A person who belongs to a Settlement Group and can participate in shared purchases, payments, and settlement.
_Avoid_: User, friend, participant

**Member Alias**:
A short group-unique name that can refer to a Member when a Telegram mention is not available, especially for Unregistered Members.
_Avoid_: Username, nickname, handle

**Member Mention**:
A Telegram mention that identifies a Member in Purchase Entries, Repayment Claims, and other bot commands.
_Avoid_: Tag, handle, username

**Unregistered Member**:
A placeholder Member identified only by a Member Alias until a Telegram identity claims it.
_Avoid_: Guest, unknown user, temporary user

**Inactive Member**:
A Member who is no longer included in new Purchases by default but remains in the Settlement Group's history and Balances.
_Avoid_: Removed user, deleted member, archived member

**Purchase**:
A shared expense recorded by a Member when one Payer covers a total amount for one or more Beneficiaries.
_Avoid_: Transaction, order, bill

**Payer**:
The Member who paid money upfront for a Purchase.
_Avoid_: Buyer, submitter

**Beneficiary**:
A Member whose coffee or item is included in a Purchase. A Beneficiary is not always the Member responsible for paying that share back.
_Avoid_: Consumer, participant

**Responsible Member**:
The Member who is expected to repay an Allocation to the Payer. In the first version, this is always the Beneficiary.
_Avoid_: Debtor, sponsor, covered by

**Allocation**:
The portion of a Purchase assigned to each Beneficiary. Allocations are equal by default, but may be explicit when the split is not equal.
_Avoid_: Split, share, price

**Inferred Allocation**:
An explicit Allocation left blank for one Beneficiary and calculated as the remaining Amount after the other explicit Allocations.
_Avoid_: Auto-fill, missing share

**Rounding Remainder**:
The leftover cents from an equal Allocation that cannot be divided evenly among Beneficiaries.
_Avoid_: Floating difference, rounding error

**Balance**:
The running amount a Member owes to, or is owed by, the Settlement Group based on Purchases that have not been cleared.
_Avoid_: Period total, tab

**Balance View**:
A read-only summary of each Member's net Balance in a Settlement Group.
_Avoid_: Settlement, statement, report

**History**:
The complete record of Purchases, Repayment Claims, Repayments, and Corrections in a Settlement Group.
_Avoid_: Archive, log, audit trail

**History View**:
A read-only summary of recent History for a Settlement Group.
_Avoid_: Report, export, audit view

**Settlement**:
A group-level clearing action that calculates repayments needed to bring current Balances back to zero.
_Avoid_: Payment request, invoice, checkout

**Settlement Proposal**:
A suggested set of repayments that would clear current Balances if completed. A Settlement Proposal does not clear Balances by itself.
_Avoid_: Settlement, payment, final settlement

**Netted Repayment**:
An optimized repayment in a Settlement Proposal that clears Balances across the Settlement Group without preserving every original Payer-to-Responsible-Member relationship.
_Avoid_: Direct debt, original debt

**Repayment**:
A confirmed transfer from one Member to another that clears all or part of a Balance.
_Avoid_: Payback, transfer, settlement

**Payment Proof**:
Evidence that a Member has sent money for a Repayment, such as a bank app receipt shared into the Settlement Group. The bot reads Payment Proof to extract payment details but does not keep the image as part of the Settlement Group's History.
_Avoid_: Invoice, bill, receipt request

**Repayment Claim**:
A Member's statement that they have sent money toward a Balance. A Repayment Claim becomes a Repayment only after it is confirmed.
_Avoid_: Paid command, payment notice

**Rejected Repayment Claim**:
A Repayment Claim that the Receiver marks as not received. It remains in History but does not affect Balances.
_Avoid_: Cancelled payment, failed payment

**Receiver**:
The Member who receives money in a Repayment Claim or Repayment and has authority to confirm it.
_Avoid_: Payee, recipient

**Expected Repayment**:
A repayment listed in the latest active Settlement Proposal that has not yet been confirmed.
_Avoid_: Suggested payment, pending transfer

**Stale Settlement Proposal**:
A previous Settlement Proposal that is no longer active because a newer Settlement Proposal or confirmed ledger-changing event superseded it. Pending Repayment Claims do not make a Settlement Proposal stale.
_Avoid_: Old settlement, expired settlement

**Correction**:
A visible change that fixes a previously recorded Purchase, Allocation, Responsible Member, Repayment Claim, or Repayment.
_Avoid_: Silent edit, mutation, adjustment

**Voided Purchase**:
A Purchase that was visibly cancelled by a Correction and no longer contributes to Balances.
_Avoid_: Deleted purchase, removed purchase

**Purchase Entry**:
The Telegram message a Member sends to record a Purchase, including the total amount, Beneficiaries, and optional explicit Allocations.
_Avoid_: Form, input, command

**Canonical Command**:
A supported Telegram bot command with one official meaning in the first version.
_Avoid_: Alias, shortcut, synonym

**Purchase Summary**:
A bot message that confirms a Purchase was recorded and shows the Payer, Beneficiaries, and Allocations.
_Avoid_: Receipt, confirmation, log message

**Purchase Note**:
Optional descriptive text attached to a Purchase for human context, such as "coffee" or a shop name.
_Avoid_: Category, tag, label

**All Members**:
A Purchase Entry shortcut that selects every active current Member in the Settlement Group as a Beneficiary, including the Payer.
_Avoid_: Everyone, group default

**Amount**:
A USD money value used in Purchases, Allocations, Balances, Settlement Proposals, Repayment Claims, and Repayments.
_Avoid_: Price, cost, total

**Amount Entry**:
A Member-entered USD amount that may include an optional dollar sign and omit trailing cents, but is displayed as a normalized two-decimal Amount. Comma separators are not accepted in the first version.
_Avoid_: Raw amount, price input

## Example Dialogue

Dev: "Can a Settlement Group contain more than two Members?"
Domain expert: "Yes. The first version must support three or more Members, not just pairs."

Dev: "Can one Telegram group chat contain multiple Settlement Groups?"
Domain expert: "No. In the first version, one Telegram group chat is one Settlement Group."

Dev: "Can Members record Purchases in a private chat with the bot?"
Domain expert: "No. In the first version, Purchases are recorded inside the Telegram group chat for the Settlement Group."

Dev: "What name should the bot use in user-facing messages?"
Domain expert: "Kit Luy."

Dev: "Should typed names in Purchase Entries be treated as people directly?"
Domain expert: "No. In the first version, commands should prefer Member Mentions. A typed name is a Member Alias used when a Telegram identity is not available."

Dev: "Can a Purchase Entry include someone who has not joined the bot yet?"
Domain expert: "Yes. The bot creates an Unregistered Member for the alias, and a Telegram identity can claim that Member later."

Dev: "What happens when a Member leaves the Telegram group?"
Domain expert: "They become an Inactive Member. They are excluded from future All Members shortcuts but remain in history and Balances."

Dev: "Can someone who is not a current Telegram group member change or view the Settlement Group?"
Domain expert: "No. Only current Telegram group members can use ledger commands in the first version."

Dev: "If one Member pays $12 for three Beneficiaries, how should the Purchase be allocated?"
Domain expert: "Equally by default, but the Payer must be able to enter explicit Allocations when the amounts differ."

Dev: "How should the bot handle an equal Allocation that does not divide cleanly?"
Domain expert: "The total must stay exact. Any Rounding Remainder goes to the Payer if they are a Beneficiary; otherwise it goes to the first listed Beneficiary."

Dev: "Can explicit Allocations add up to a different Amount than the Purchase total?"
Domain expert: "They cannot exceed the Purchase Amount. If explicit Allocations are less than the Purchase Amount, the remaining Amount is inferred as the Payer's own share."

Dev: "Can the bot infer a missing explicit Allocation?"
Domain expert: "Yes, but only for one Beneficiary. The Inferred Allocation is the remaining Amount after other explicit Allocations."

Dev: "If several Beneficiaries are missing explicit Allocations, should they split the remaining Amount?"
Domain expert: "No. The first version allows at most one Inferred Allocation."

Dev: "Can a Purchase or Allocation have a zero or negative Amount?"
Domain expert: "No. Purchase Amounts and Allocation Amounts must be positive in the first version."

Dev: "Can one Member record a Purchase paid by another Member?"
Domain expert: "No. In the first version, the Member who sends the Purchase Entry is always the Payer."

Dev: "Is the Payer automatically a Beneficiary?"
Domain expert: "For explicit Allocations, only the unallocated remainder is automatically treated as the Payer's own share. Otherwise, Beneficiaries are explicit unless the Purchase Entry uses the All Members shortcut."

Dev: "If the Payer also benefited from a Purchase, must they be mentioned?"
Domain expert: "No. In explicit Allocation entries, any unallocated remainder is treated as the Payer's own share so the Payer does not need to mention themselves."

Dev: "If Dara says they will cover Bob's $3 share, who owes the Payer?"
Domain expert: "That is not supported in the first version. The Responsible Member is the Beneficiary."

Dev: "Should coffee purchases be grouped into fixed weekly or monthly periods?"
Domain expert: "No. The Settlement Group keeps running Balances, and a Settlement includes every Purchase that has not already been cleared."

Dev: "Can Members view Balances without creating a Settlement Proposal?"
Domain expert: "Yes. A Balance View shows where the Settlement Group currently stands."

Dev: "Should a Balance View show pairwise debts?"
Domain expert: "No. It shows each Member's net Balance; pairwise payment instructions belong in a Settlement Proposal."

Dev: "Should a Balance View mention pending Repayment Claims?"
Domain expert: "Yes. Pending Repayment Claims should be shown separately from confirmed Balances."

Dev: "Should the bot proactively remind Members to settle?"
Domain expert: "No. In the first version, Members ask for a Settlement Proposal when they want one."

Dev: "Should the bot keep settled Purchases and Repayments?"
Domain expert: "Yes. The Settlement Group keeps History so Members can explain how current or past Balances were reached."

Dev: "Can any current Member view the Settlement Group's History?"
Domain expert: "Yes. History is visible to current Members because the Settlement Group is a shared ledger."

Dev: "Should the first version include a way to view History?"
Domain expert: "Yes. A simple History View should show recent events without complex filtering."

Dev: "Should a History View include Repayment Claims that are not confirmed yet?"
Domain expert: "Yes. Pending Repayment Claims should be visible as pending, not shown as confirmed Repayments."

Dev: "Do pending Repayment Claims affect Balances or Settlement Proposals?"
Domain expert: "No. Only confirmed Repayments affect Balances and Settlement Proposals."

Dev: "Does asking the bot to settle clear the Balances immediately?"
Domain expert: "No. The bot creates a Settlement Proposal; Balances are cleared only by confirmed Repayments."

Dev: "Should a Settlement Proposal preserve every original debt edge?"
Domain expert: "No. It should use Netted Repayments to minimize the number of payments needed to clear Balances."

Dev: "What should a Settlement Proposal show?"
Domain expert: "Only the current Netted Repayments needed to clear Balances, or an all-clear message when no Repayments are needed."

Dev: "Should a Settlement Proposal mention pending Repayment Claims?"
Domain expert: "Yes. Pending Repayment Claims do not affect the math, but the Settlement Proposal should warn about them."

Dev: "Can a confirmed Repayment be smaller than an Expected Repayment?"
Domain expert: "Yes. A partial Repayment clears only that Amount and leaves the remaining Balance outstanding."

Dev: "Can a Member make a Repayment Claim before anyone asks for a Settlement Proposal?"
Domain expert: "Yes. A Repayment Claim can be made any time and does not require a current Settlement Proposal."

Dev: "What happens if a Repayment is larger than the current Balance between two Members?"
Domain expert: "The confirmed Repayment is recorded for the actual Amount sent, and the Balance may flip direction."

Dev: "Who can confirm a Repayment Claim?"
Domain expert: "Only the Receiver can confirm it in the first version."

Dev: "Where should a Receiver confirm a Repayment Claim?"
Domain expert: "In the Settlement Group chat, so the confirmed Repayment is visible to the group."

Dev: "How should a Receiver respond to a Repayment Claim?"
Domain expert: "The bot should show Telegram inline actions for received and reject. Received creates a Repayment; reject creates a Rejected Repayment Claim."

Dev: "Can any Member tap received or reject on a Repayment Claim?"
Domain expert: "No. The inline actions are visible in the Settlement Group, but only the named Receiver can use them."

Dev: "Can a rejected Repayment Claim be edited into a valid one?"
Domain expert: "No. The payer submits a new Repayment Claim if the rejected one was wrong."

Dev: "Do pending Repayment Claims expire automatically?"
Domain expert: "No. They remain pending until the Receiver marks them received or rejected."

Dev: "What should the group call a bank app image showing money was sent?"
Domain expert: "Payment Proof, not invoice, because it proves payment rather than requests payment."

Dev: "Should the bot keep bank receipt images?"
Domain expert: "No. The bot only processes Payment Proof to extract payment details such as Amount."

Dev: "Does extracted Payment Proof immediately become a Repayment Claim?"
Domain expert: "No. The sender must confirm the extracted Amount before the bot creates a Repayment Claim."

Dev: "Which payment details should the bot extract from Payment Proof?"
Domain expert: "Only the Amount in the first version. Receiver matching comes from Balances, Expected Repayments, or clarification."

Dev: "If a Member sends `/paid 6`, how should the bot know who received the money?"
Domain expert: "The bot should match the Repayment Claim to an Expected Repayment when the payer and amount make the receiver unambiguous; otherwise it should ask for clarification."

Dev: "Can a `/paid` Repayment Claim omit the Receiver?"
Domain expert: "Yes, but only when the Receiver can be inferred from exactly one matching Expected Repayment."

Dev: "Can `/paid` omit the Receiver when there is no matching Expected Repayment?"
Domain expert: "No. The bot rejects the command and asks the Member to mention the Receiver."

Dev: "Can older Settlement Proposals still provide Expected Repayments?"
Domain expert: "No. Only the latest active Settlement Proposal provides Expected Repayments; older ones become Stale Settlement Proposals."

Dev: "How many Receivers can a `/paid` Repayment Claim name?"
Domain expert: "Exactly one Receiver in the first version. The sender is the Member claiming they sent the money."

Dev: "Should a Member be able to silently edit a Purchase after recording it?"
Domain expert: "No. Changes should be visible Corrections so the Settlement Group can see why Balances changed."

Dev: "How should the bot handle a duplicate Purchase?"
Domain expert: "The duplicate should become a Voided Purchase through a visible Correction, not disappear from history."

Dev: "Who can correct or void a Purchase?"
Domain expert: "Only the original Payer can correct or void their Purchase in the first version."

Dev: "Who can correct a confirmed Repayment?"
Domain expert: "Only the Receiver can correct it in the first version, because the Receiver confirmed the money arrived."

Dev: "What is the first interface for recording a Purchase?"
Domain expert: "A command-style Purchase Entry for total amount, Beneficiaries, and optional explicit Allocations. The first version focuses on entering totals, splitting, paying, and settling."

Dev: "Should the first version support multiple command aliases?"
Domain expert: "No. It should use Canonical Commands only: `/buy`, `/paid`, `/settle`, `/balance`, `/history`, and `/help`."

Dev: "Should Members need to complete onboarding before recording Purchases?"
Domain expert: "No. Member Mentions in normal command use can create or recognize Members; `/help` explains the Canonical Commands."

Dev: "Is splitting a separate ledger event from recording a Purchase?"
Domain expert: "No. Splitting is how a Purchase creates Allocations."

Dev: "What do Member Mentions in a Purchase Entry mean?"
Domain expert: "They identify Beneficiaries. The sender of the Purchase Entry is the Payer."

Dev: "Should a Purchase Entry be silently recorded?"
Domain expert: "No. The bot should post a Purchase Summary after every recorded Purchase."

Dev: "Do Beneficiaries need to confirm a Purchase before it affects Balances?"
Domain expert: "No. A Purchase affects Balances when the Payer records it."

Dev: "Should words like coffee or lunch be formal categories?"
Domain expert: "No. In the first version, they are Purchase Notes for human context only."

Dev: "If a Purchase Entry omits Beneficiaries, should the bot charge everyone?"
Domain expert: "No. Beneficiaries must be explicit unless the Purchase Entry uses the All Members shortcut."

Dev: "What currency should a Settlement Group use?"
Domain expert: "Amounts are recorded and settled in USD."

Dev: "Can a Member record a Purchase in a currency other than USD?"
Domain expert: "No. In the first version, Members convert non-USD purchases to USD before recording them."

Dev: "Can a Member enter `$4.5` instead of `$4.50`?"
Domain expert: "Yes. Amount Entry can omit trailing cents, but bot messages display normalized two-decimal Amounts."
