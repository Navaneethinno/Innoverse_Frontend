// Written help for the Guide, per page (keyed by the page's last path
// segment without dashes: /mms/terminals -> "terminals") and per control
// (keyed by its label, lower case). "about" introduces the page; "_common"
// covers controls many pages share. `master: true` marks a master-data
// list, explained by the guide:master* texts with the page's own heading.
// PAGE_HELP_TEXT[language] holds the translations, keyed the same way;
// a missing one falls back to English, then to the general explanation.
export const PAGE_HELP = {
  "_common": {
    "more": "More statuses that don't fit in the row of tabs, such as Rejected or Deleted. Pick one to see only those records.",
    "more filters": "Opens extra filters: dates, who made the change, institution and others. The number on the button shows how many are on.",
    "newest first": "The order of the list: most recently changed first, or oldest first. It sorts every record, not only this page.",
    "view all": "Opens the whole list in one large window you can search; more records load as you scroll down.",
    "search": "Type part of a name, code or number. The list narrows as you type.",
    "excel": "Downloads exactly what the list shows (with the filters on) as an Excel file.",
    "csv": "Downloads exactly what the list shows (with the filters on) as a CSV file, for other tools.",
    "pdf": "Downloads what the report shows as a PDF, ready to print or send.",
    "new onboarding": "Starts onboarding: the form for this type, step by step. You can save a draft and finish later; it goes to a checker when you submit it.",
    "any type": "Shows only one type of record. Leave it on Any to see them all.",
    "any channel": "Shows only what came through one channel (web, app, POS, agent and so on).",
    "any priority": "Shows only cases of one priority.",
    "any assigned": "Shows cases assigned to one person, to you, or to no one yet.",
    "any category": "Shows only cases of one category (account, transaction, card, complaint).",
    "any status": "Shows only records in one status.",
    "any kind": "Shows only one kind of record.",
    "settings": "This page's settings: how it works for your institution.",
    "edit": "Switches this page into editing. Your changes go to a checker; the approved settings stay in force until then.",
    "refresh": "Loads the latest figures again.",
    "run now": "Runs it straight away instead of waiting for its schedule.",
    "waiting for approval": "Changes waiting for a checker.",
    "waiting for me": "Only what waits for you to act.",
    "assigned to me": "Only what is assigned to you.",
    "import file": "Loads many entries at once from a file. A checker approves them.",
    "upload file": "Loads entries from a file. A checker approves them.",
    "any branch": "Shows only one branch's records.",
    "any loan officer": "Shows only one loan officer's records.",
    "any loan product": "Shows only one loan product.",
    "any card product": "Shows only one card product.",
    "any issuance group": "Shows only one issuance group.",
    "any currency": "Shows only one currency.",
    "any bin": "Shows only one BIN.",
    "any source": "Shows only one source.",
    "any report": "Shows only one kind of report.",
    "any deposit product": "Shows only one deposit product.",
    "any party": "Shows only customers, merchants or agents.",
    "any customer": "Shows only one kind of customer.",
    "any risk band": "Shows only one risk band.",
    "any trigger": "Shows only screenings started one way (onboarding, rescreening, by hand).",
    "my reports": "The reports you saved and the ones shared with you.",
    "history": "Every earlier version and who changed it.",
    "cancel": "Closes the window without saving anything you typed.",
    "save": "Saves it. Where a checker must approve, it goes to them; until then the approved version stays in use.",
    "save as draft": "Keeps your work without sending it for approval. Finish it later and submit it from the row.",
    "submit": "Saves and sends it to a checker for approval.",
    "save and submit": "Saves and sends it to a checker for approval."
  },
  "terminals": {
    "about": "Every POS terminal the bank has registered and handed to merchants. A merchant places each terminal in one of their stores; the status shows whether it can take payments.",
    "pos idle timeout": "How long a terminal session may sit idle before the cashier must sign in again, for this institution's merchants. A merchant can set a shorter time for their own stores, never a longer one.",
    "add terminal": "Registers a new terminal: its TID, serial number, type and model. It's assigned to a merchant here; the merchant then places it in a store. A checker approves it first.",
    "terminal id, store or merchant": "Search by the terminal's TID, the store it's in or the merchant who owns it.",
    "block requested": "Shows only terminals a merchant has asked to block (lost, stolen or broken). Open one to approve or refuse the block.",
    "last seen": "When the terminal last talked to the platform. A terminal not seen for days may be switched off or lost.",
    "tid": "The terminal ID the switch knows it by: 4 to 16 capital letters and digits, unique.",
    "serial number": "The serial number printed on the device, so it can be traced if lost or swapped.",
    "type": "What kind of terminal: a POS terminal or a mobile POS (a phone or handheld).",
    "make": "The manufacturer, e.g. PAX or Sunmi.",
    "model": "The device model, e.g. A920."
  },
  "stores": {
    "about": "The merchants' stores: where their terminals and cashiers work. Each store belongs to one merchant and is approved like any other record.",
    "store or merchant name": "Search by the store's name or its merchant's name."
  },
  "individualmerchants": {
    "about": "Merchants who are individuals (sole traders): their onboarding, KYC, AML result and status. A new one is reviewed by a checker before it can trade.",
    "aml": "The anti-money-laundering screening result. A match must be cleared in Onboarding Cases before the merchant is approved."
  },
  "corporatemerchants": {
    "about": "Merchants that are companies: the company, its directors and owners, documents and AML result. A checker approves each one before it can trade.",
    "aml": "The anti-money-laundering screening result for the company and its people. A match must be cleared before approval."
  },
  "agents": {
    "about": "Agents who do cash in and cash out for customers, and the super agents who manage them. Each agent's tier sets what it may do and its limits.",
    "waiting for approval": "Agents whose onboarding or change waits for a checker.",
    "agent name or number": "Search by the agent's name or agent number.",
    "any tier": "Shows only agents of one tier."
  },
  "users": {
    "about": "The admin portal's users: who can sign in, with which profile (what they may see and do) and for which institution. Every change is approved by a checker.",
    "users": "The list of users.",
    "transaction limits": "How much each user may move per transaction and per day (for staff transactions). Set per user or per profile.",
    "add user": "Creates a user: their name, username, email, profile and institution. They get their first password by email once a checker approves.",
    "profile": "What this user may do: the profile lists the menus they see and the actions (add, edit, approve...) allowed on each.",
    "username": "What the user types to sign in. Unique in the institution; it can't be changed later.",
    "password": "The first password. The user must change it at first sign-in; it must follow the institution's password policy.",
    "employee id": "The staff number from HR, to match the user to the employee.",
    "email": "Where sign-in codes and password resets are sent.",
    "mobile": "The user's phone number, with the country code."
  },
  "profiles": {
    "about": "Profiles are sets of permissions: which menus a user sees and which actions (add, edit, approve...) they may take on each. Users get one profile each.",
    "new profile": "Creates a profile: name it, pick its institution, then tick the menus and actions it allows. A checker approves it; the approve dialog shows every permission it will have.",
    "profile name": "A name people recognise, such as Branch teller or Head office checker.",
    "all modules": "Tick a module to see its menus, then tick the actions this profile may take on each menu."
  },
  "userkyc": {
    "about": "The identity details of the institution's staff users: employee ID, contact details and documents.",
    "add kyc": "Records a staff user's identity details. A checker approves them."
  },
  "approvalpolicies": {
    "about": "Who must approve what. A policy sets, for one menu and action (say, Users > Edit), how many approval levels a change needs and who may approve at each level. Without a policy, one checker approves.",
    "report": "Every menu and action and the policy that applies to it, so you can see which changes need more than one approval.",
    "add policy": "Creates a policy: the menu, the action, then each level's approvers (anyone, a profile or named users) and how many must approve.",
    "levels": "How many approval levels a change goes through, one after another.",
    "menu": "The screen whose changes this policy controls.",
    "action": "Which action on that screen (add, edit, delete…) needs these approvals.",
    "level name": "A name for this level, shown to approvers (e.g. Branch manager).",
    "approvals needed": "How many different people must approve at this level.",
    "approver must be": "Who may approve at this level: anyone with the right, a profile, named users or the maker's supervisor.",
    "from amount": "This level applies from this amount (for changes that carry an amount).",
    "up to amount": "This level applies up to this amount; leave empty for no upper limit.",
    "escalate after (hours)": "If nobody approves within this time, the next approvers are told.",
    "expires after (days)": "A change not approved within this time is cancelled.",
    "narration required on approve": "Approvers must write a reason when they approve.",
    "same user may approve at two levels": "Lets one person approve at more than one level of the same change."
  },
  "approvaldelegations": {
    "about": "Handing your approvals to someone else for a period (holiday, sick leave), and naming each user's supervisor.",
    "delegations": "Approvals handed from one user to another for a period.",
    "supervisors": "Each user's supervisor, who can approve when an approval level says \"the maker's supervisor\".",
    "add delegation": "Hands one user's approvals to another from a start to an end date, with a reason. A checker approves it.",
    "in force": "Whether the delegation applies right now (today is within its period and it's approved).",
    "approvals of": "The user whose approvals are handed over.",
    "handed to": "The user who approves in their place.",
    "first day": "The delegation applies from this day.",
    "last day": "The delegation ends after this day.",
    "reason": "Why (holiday, sick leave…), kept with the delegation."
  },
  "individualcustomers": {
    "about": "Customers who are individuals: their onboarding, KYC level, AML result and status. A new one is reviewed before the wallet opens.",
    "aml": "The anti-money-laundering screening result. A match goes to Onboarding Cases to be cleared.",
    "customer type": "The customer's type, which decides their onboarding form, KYC level and limits."
  },
  "corporatecustomers": {
    "about": "Customers that are companies: the company, its directors and owners, documents and AML result."
  },
  "transactions": {
    "about": "Every transaction posted on the platform (the Journal) and the transactions staff ask for (Requests), which post once a checker approves.",
    "journal": "Every posted transaction: transfers, payments, cash in and out, fees, reversals. Open one for its legs, receipt and reversal.",
    "requests": "Transactions staff have asked for. They post when a checker approves them.",
    "new transaction": "Asks for a staff transaction (for example a payment or a transfer between wallets). It shows the fee and the balance after before you send it to a checker. Corrections are made in Balance Adjustments instead.",
    "rrn, reference, account number or name": "Search by the transaction's RRN, its reference, an account number or a name."
  },
  "balanceadjustments": {
    "about": "Corrections of a transaction that happened: money given back to a customer (credit) or taken back (debit). Always against the transaction's RRN, never more than what is left of it.",
    "new adjustment": "Enter the transaction's RRN, choose a credit or debit adjustment, then the amount and the reason. A checker approves it; if the transaction is disputed, the adjustment settles the dispute.",
    "reference, account or reason": "Search by the request reference, the wallet number or words of the reason.",
    "original rrn": "The transaction this adjustment corrects. Click to open it.",
    "dispute": "The dispute this adjustment settles, if any. Click to open the case.",
    "transaction rrn": "The RRN of the transaction to correct. The wallet and the amount left come from it.",
    "reason": "Why the correction is made. The checker and the audit trail see it.",
    "reference (optional)": "A voucher or receipt number, if there is one."
  },
  "disputes": {
    "about": "Customer cases about one transaction (\"my airtime never arrived\"). Settle one with a balance adjustment, or close it as resolved or rejected.",
    "raise dispute": "Opens a dispute for a customer who called or came in: the transaction's RRN, a title and what happened.",
    "case number or customer": "Search by the case number, the customer's name, or a transaction's exact RRN.",
    "rrn": "The disputed transaction. Click to open it.",
    "priority": "How urgent it is. High-priority cases go to the top of the queue.",
    "title the customer sees": "A short title, shown to the customer in their app.",
    "what happened": "What the customer says happened. Staff see this, not the customer.",
    "message to the customer": "Optional first message the customer sees in their app.",
    "disputing account (optional)": "Only for a transfer between two customers when the one disputing is not the payer: their account number."
  },
  "customercases": {
    "about": "Questions and complaints customers open themselves in the app or web. Answer in the conversation and close the case when it's resolved.",
    "case number or customer": "Search by the case number or the customer's name."
  },
  "onboardingcases": {
    "about": "New customers and merchants whose risk or AML result needs a person to decide. Review the details, ask for more information if needed, then propose approve or reject; another user confirms.",
    "settings": "How onboarding cases work: who they're assigned to and how long they may wait before they're overdue.",
    "case number or customer": "Search by the case number or the customer's name.",
    "risk level": "The risk score's level from the institution's risk setup.",
    "aml band": "How strong the AML screening match is."
  },
  "accounts": {
    "about": "Every wallet and account: its owner, product, balance and status, with its statement.",
    "open account": "Opens an account for an existing customer or merchant, with the account product you choose. A checker approves it.",
    "opening requests": "Account openings waiting for a checker.",
    "money waiting for numbers": "Money received for an account number that doesn't exist yet. Match it to the right account here.",
    "account number, owner or reference": "Search by the account number, the owner's name or their reference.",
    "any party": "Shows only customers', merchants' or agents' accounts.",
    "any class": "Shows only one class of account (wallet, term deposit, loan).",
    "any account product": "Shows only accounts of one account product."
  },
  "teller": {
    "about": "The branch counter: open your till, take cash in and pay cash out, move cash between tills and the vault, and close the day.",
    "my desk": "Your own till: open it with a count, see its balance and what waits for you, and close it at the end of your shift.",
    "cash transfers": "Cash moving between tills and the vault. Nothing moves until the receiver accepts it.",
    "tills and vaults": "Every till and vault of every branch, with its balance and who has it open.",
    "end of day": "The branch's day: what must be done before it can close (tills closed, vault counted), then close it."
  },
  "treasury": {
    "about": "Bulk cash between branch vaults and the central bank or other banks, and the bank's position with each settlement bank.",
    "cash movements": "Bulk cash moved between a vault and a bank, or between branches. Requested, approved, sent, then counted in by the receiver.",
    "settlement positions": "What you hold with each settlement bank, what you owe through it and the room left above the required minimum.",
    "inter-branch position": "What each branch owes the others for cash and transactions between them.",
    "awaiting me": "Only the movements that wait for you to approve, send or receive.",
    "new cash movement": "Asks to move bulk cash: from where, to where, how much. Another user approves it before it's sent."
  },
  "glreports": {
    "about": "The books: one GL's statement, the trial balance, GL movement between two dates, the balance sheet, profit and loss, cash flow, and every customer's balance.",
    "statement": "One GL account's postings for a period, with its opening and closing balance.",
    "trial balance": "Every GL's balance on a date, by section and group. Total debits must equal total credits.",
    "gl movement": "Every GL's opening balance, debits, credits and closing balance between two dates, to check one trial balance against another.",
    "balance sheet": "What the institution owns and owes on a date, then income and expenditure and the profit or loss.",
    "profit and loss": "Income less expenses for a period: the summary, every entry (Detailed), or day by day.",
    "cash flow": "How cash in hand changed: cash received and paid by kind of transaction (Direct), or the classic statement (Indirect).",
    "customer balances": "Every customer's and merchant's account balance on a date; with a start date, also opening, credits and debits.",
    "pick a gl account": "The GL whose statement you want."
  },
  "financetransaction": {
    "about": "Manual journals: moving money between GL accounts (settlements with providers, corrections). A journal posts when a checker approves it. Customer accounts are corrected in Balance Adjustments.",
    "journals": "Every manual journal and its status.",
    "settlement": "Settling what you owe or are owed by a provider (mobile money, billers, banks).",
    "new journal": "A journal of GL lines: each line a GL, debit or credit, and an amount. Debits must equal credits. A checker approves it.",
    "journal reference or narration": "Search by the journal's reference or words of its narration.",
    "currency": "The journal's currency; every line is in it.",
    "reference": "Your own reference, such as the provider's settlement number.",
    "narration": "What the journal is for, shown on every line's statement."
  },
  "chartofaccounts": {
    "about": "The institution's GL accounts in their groups: assets, liabilities, equity, income and expenses.",
    "chart": "The tree of groups and GL accounts.",
    "waiting for approval": "GL changes waiting for a checker.",
    "uploads": "Charts of accounts uploaded from a file, and their result.",
    "template": "Downloads the file layout to fill in for an upload.",
    "upload": "Loads many GL accounts at once from a filled-in template. A checker approves them.",
    "add gl": "Adds one GL account or group under a parent. A checker approves it.",
    "search name, gl code or account number": "Search by the GL's name, its GL code or its account number.",
    "show inactive": "Also shows GL accounts that are switched off.",
    "expand all": "Opens every group so you see all GL accounts."
  },
  "notifications": {
    "about": "Who gets which alert: groups of recipients, and the alerts sent to them (by email, SMS or in the portal).",
    "groups": "Groups of people who receive alerts together.",
    "alerts": "Each alert: when it fires and which groups get it.",
    "add group": "Creates a group of recipients. A checker approves it."
  },
  "profile": {
    "about": "The institutions on the platform: banks, fintechs and the service provider. Each has its modules, currencies, channels, branding and legal details.",
    "new institution": "Starts a new institution: its details, then its modules, currencies, channels and branding. A checker approves it."
  },
  "modules": {
    "about": "Which modules (EPURSE, Finance, MMS, InnoAML…) each institution uses, and from when to when.",
    "add module": "Gives an institution a module for a period. A checker approves it.",
    "effective from": "The module works for the institution from this date."
  },
  "currencies": {
    "about": "The currencies each institution works in. One is its base currency, used for reports and limits.",
    "add currency": "Adds a currency to an institution. A checker approves it.",
    "base currency": "The institution's main currency: reports and limits are in it."
  },
  "channels": {
    "about": "The channels each institution offers (web, app, USSD, POS, agent).",
    "add channel": "Opens a channel for an institution. A checker approves it."
  },
  "phonecodes": {
    "about": "Countries whose phone numbers customers and merchants may use. One is the primary: a number typed without + is read as that country's.",
    "add phone code": "Allows another country's phone numbers. A checker approves it.",
    "primary": "Numbers typed without a country code are read as this country's."
  },
  "branding": {
    "about": "Each institution's look in each portal: name, logo and colours (white-label).",
    "add branding": "Sets an institution's name, logo and colours for one portal. A checker approves it."
  },
  "legal": {
    "about": "Each institution's legal and regulatory details: legal name, registration and licence.",
    "add legal profile": "Records an institution's legal name, registration and licence. A checker approves it."
  },
  "documents": {
    "about": "Terms, privacy and other documents customers and merchants see and accept. Each text is for a channel and a language.",
    "new document": "Adds a document: who sees it, its texts per language and whether they must accept it. A checker approves it.",
    "acceptance": "Whether customers must accept this document before going on."
  },
  "passwordpolicy": {
    "about": "Password rules for the portal's users: length, what a password must contain, how many wrong tries lock the account, and session rules.",
    "add policy": "Sets the password rules for an institution. A checker approves them.",
    "max retries": "Wrong passwords allowed before the account locks."
  },
  "formbuilder": {
    "about": "Your institution's library of onboarding questions. Place them in sections, then build each customer type's form from the sections.",
    "fields": "The questions themselves: type, wording, options and checks.",
    "sections": "Groups of questions that forms are built from.",
    "translations": "The questions' texts in each language, with any missing ones listed.",
    "add field": "Adds a question: its key, type (text, list, date…), wording and whether it's required."
  },
  "kycschemes": {
    "about": "A scheme is an ordered ladder of KYC levels (what a customer must prove at each level and what they may then do). Approve a scheme before pointing a customer type at it.",
    "add kyc scheme": "Creates a ladder of KYC levels. A checker approves it."
  },
  "riskactions": {
    "about": "What each risk level leads to, such as Onboard, Enhanced due diligence or Reject. Risk and AML setups point their levels at these actions.",
    "add risk action": "Adds an action and what it does to onboarding. A checker approves it.",
    "onboarding outcome": "What happens to a new customer whose risk lands on this action."
  },
  "bulkregistration": {
    "about": "Register many people as customers at once, for example a company's employees, from a file. A checker authorises each batch.",
    "new batch": "Uploads a file of people to register, with their customer type and, if wanted, a card for each. A checker approves the batch.",
    "file name": "Search by the uploaded file's name."
  },
  "riskassessment": {
    "about": "How risky a customer of each customer type is, scored from their onboarding answers. Each setup weighs criteria and splits the score into risk levels.",
    "add risk setup": "Builds a risk setup: the criteria, how much each counts and the risk levels. A checker approves it.",
    "criteria": "The onboarding answers that make up the score.",
    "risk levels": "The bands the score is split into, each with its action."
  },
  "onboardingconfiguration": {
    "about": "Each customer type is one record: its identity, its form, KYC scheme, limits and maker-checker settings.",
    "add onboarding configuration": "Creates a customer type and its onboarding setup. A checker approves it."
  },
  "termdeposits": {
    "about": "Term deposits opened for customers and merchants: approval, interest, maturity and early closure.",
    "open deposit": "Opens a deposit: the holder, the deposit product, amount and term. A checker approves it.",
    "deposit reference, account or holder": "Search by the deposit's reference, the account or the holder's name."
  },
  "loanapplications": {
    "about": "Loan applications: apply on a borrower's behalf, record their acceptance, credit checks and collateral, then approve.",
    "new application": "Starts a loan application: the borrower, product, amount and term. The quote shows the rate and schedule.",
    "application reference or applicant": "Search by the application's reference or the applicant's name."
  },
  "accountproducts": {
    "about": "The account products customers and merchants hold (wallets, savings, term deposit accounts) and their settings.",
    "add account product": "Creates an account product and its settings. A checker approves it."
  },
  "loanfacilities": {
    "about": "The loans themselves: payout, repayments, early settlement, restructuring, write-off and collections.",
    "loans": "Every loan and where it stands.",
    "portfolio quality": "How the loan book is doing: days past due, risk classes and provisions.",
    "move an officer's loans": "Hands all of one loan officer's loans to another.",
    "loan reference, account or borrower": "Search by the loan's reference, the account or the borrower.",
    "days past due": "How late the oldest unpaid instalment is.",
    "risk class": "The loan's class by days past due, which sets its provision."
  },
  "depositproducts": {
    "about": "The term-deposit setup of each term-deposit account product: its policy, tenors and rates.",
    "new deposit product": "Sets up a deposit product: tenors, rates and early-closure rules. A checker approves it."
  },
  "regulatorysubmissions": {
    "about": "Reports of the loan book as it stands today for the regulator and the credit bureau. Send them, then record the regulator's reference.",
    "regulator reports": "The reports for the regulator.",
    "credit bureau file": "The file for the credit bureau.",
    "generate report": "Makes a report of the loan book as it is now."
  },
  "lendingregulatoryprofile": {
    "about": "Your institution's lending settings: licence, reporting, credit checks, and the risk classes with their provisions.",
    "provision %": "How much of an outstanding loan in this class is set aside as a likely loss."
  },
  "borrowergroups": {
    "about": "Solidarity groups with a loan officer and a meeting rhythm. While any member is past due, the group can't get new loans.",
    "form a group": "Creates a group: its members, branch, loan officer and meetings.",
    "group code or name": "Search by the group's code or name."
  },
  "loanproducts": {
    "about": "Each loan product with its terms, rate bands, fees and policies. Changes take effect once a checker approves them.",
    "reference rates": "The reference rates variable-rate loans follow. A new rate reprices running loans from its date.",
    "new loan product": "Builds a loan product step by step: terms, rates, fees, eligibility and documents."
  },
  "glmapping": {
    "about": "Which GL each posting goes to. The most specific rule that fits wins; the fallback GL takes the rest.",
    "rules": "The mapping rules by kind of posting.",
    "test": "Try a posting and see which GL it would go to.",
    "unmapped": "Postings that found no rule and went to the fallback GL.",
    "search by provider, type, gl or note": "Search the rules."
  },
  "corebankingsetup": {
    "about": "Branches, staff, withholding tax, expected credit loss, the credit bureau and the fiscal year: the core banking settings.",
    "accounting": "The fiscal year and the cash GLs used by the cash flow statement.",
    "head office": "The head office branch."
  },
  "accountingperiods": {
    "about": "Close each month once it has ended, in order. Closing the fiscal year's last month also moves the year's profit to equity."
  },
  "bins": {
    "about": "The first digits of your card numbers on each card network. Card products are made on a BIN.",
    "new bin": "Adds a BIN on a network. A checker approves it."
  },
  "cardnumberlayout": {
    "about": "How card numbers are made on each BIN: the parts after the BIN, the serial and the check digit.",
    "new layout": "Defines how numbers are made on a BIN."
  },
  "cardorders": {
    "about": "Orders to the card bureau: blank stock or personalised cards, embossed, received and checked in.",
    "new order": "Orders cards from the bureau for an issuance group."
  },
  "cardproducts": {
    "about": "Prepaid and debit cards: the BIN and currency, the digital product they're sold under, and their fees and limits.",
    "new card product": "Creates a card product. A checker approves it."
  },
  "prefiles": {
    "about": "One emboss (PRE) file for the card bureau, made from cards picked across an issuance group's orders.",
    "make pre file (all waiting)": "Makes one emboss file of every card waiting.",
    "files made": "Emboss files already made."
  },
  "issuancegroups": {
    "about": "Physical card stock and orders: the defaults and the emboss file sent to the card bureau.",
    "new issuance group": "Creates a group with its card product and defaults."
  },
  "receivecards": {
    "about": "Orders whose emboss file went to the bureau: record the cards that came back, then a checker confirms them."
  },
  "cardstock": {
    "about": "Instant cards in the vault or held by staff, ready to hand to customers.",
    "card number or serial": "Search by card number or serial."
  },
  "cardrequests": {
    "about": "Requests for physical cards: made for a customer, ordered and delivered.",
    "new card request": "Asks for a physical card for a customer."
  },
  "cards": {
    "about": "Every card: who holds it, where it is in production and whether it can be used.",
    "issue virtual card": "Issues a virtual card to a customer straight away."
  },
  "atms": {
    "about": "The bank's ATMs: each listens on its own switch port. Their keys, commands and events.",
    "ports": "The switch ports ATMs connect on.",
    "downloads to all": "Sends the latest configuration to every ATM.",
    "add atm": "Registers an ATM and its port."
  },
  "internalwatchlists": {
    "about": "The institution's own lists, such as a central bank blacklist or its own fraud cases. Once approved, every screening checks them.",
    "add watchlist": "Adds a list from a file. A checker approves it."
  },
  "screenings": {
    "about": "Every AML screening of the institution's customers. Results are recorded only; nothing is blocked here.",
    "changes": "Screenings whose result changed since the last one.",
    "screened name": "Search by the name that was screened."
  },
  "blacklist": {
    "about": "The institution's own list of people and companies it won't deal with, screened with every check.",
    "entries": "The people and companies on the list.",
    "add entry": "Adds one person or company. A checker approves it."
  },
  "matchreview": {
    "about": "Decide each screening match as a false positive or a true match. A maker proposes; another user confirms.",
    "all reviews": "Every review, proposed and decided.",
    "news": "Adverse media matches."
  },
  "whitelist": {
    "about": "Approved false positives: one customer cleared against one listed record, so the same match doesn't stop them again until it expires.",
    "expiring within (days)": "Shows only entries that expire within this many days."
  },
  "amlsetup": {
    "about": "How a screening score reads: score bands mapped to risk actions, the minimum match score and ongoing rescreening.",
    "add aml setup": "Creates the AML setup. A checker approves it."
  },
  "flags": {
    "about": "Customers whose AML result got worse on rescreening. Raise a case or dismiss each one.",
    "blacklist match": "Only flags caused by a blacklist match."
  },
  "amlcases": {
    "about": "Active customers whose AML result needs a person: talk to them, then close as cleared, confirmed or no action. Another user confirms."
  },
  "namelookup": {
    "about": "Screen a name that isn't a customer, such as a payment beneficiary. Each lookup is kept with its reason.",
    "screen name": "Runs the screening for the name you entered.",
    "lists": "Sanctions and watchlists.",
    "adverse media": "News about the name."
  },
  "transactionmonitoring": {
    "about": "Rules that watch transactions as they're posted, and the alerts they raise.",
    "alerts": "Alerts raised by the rules. Open one to see the transactions behind it.",
    "rules": "The rules: what they watch and their thresholds.",
    "run scan now": "Checks the latest transactions against the rules now."
  },
  "regulatoryreports": {
    "about": "Suspicious transaction reports (STR) and currency transaction reports (CTR) for the regulator.",
    "suspicious transactions (str)": "Reports of activity you suspect. Another officer approves before filing.",
    "currency transactions (ctr)": "Cash at or above the threshold, prepared every night.",
    "new report": "Writes a suspicious transaction report."
  },
  "reconlayouts": {
    "about": "File formats for reconciliation, as JSON. Start from a built-in layout and edit it; a change waits for approval.",
    "add layout": "Creates a file layout."
  },
  "reconsources": {
    "about": "Where reconciliation files come from: each source's file layout, name pattern and SFTP pick-up.",
    "sources": "The sources.",
    "sftp profiles": "Connections used to pick up files.",
    "currency decimals": "How many decimals each currency has in the files.",
    "add source": "Adds a source of files."
  },
  "reconfiles": {
    "about": "Files received from each source (uploaded, collected by SFTP or generated from the ledger) and how they were read.",
    "generate switch file": "Makes a file from the ledger to reconcile against.",
    "upload file": "Uploads a file for a source."
  },
  "reconsets": {
    "about": "What is reconciled with what: the rules, their runs and results, and approvals for changes.",
    "sets": "The reconciliation sets.",
    "approvals": "Changes waiting for approval.",
    "add set": "Creates a reconciliation set."
  },
  "externalproviders": {
    "about": "Where customers send money: mobile wallets, banks, airtime operators, prepaid electricity and billers.",
    "set up providers": "Chooses the providers an institution offers and their settings."
  },
  "feeschedules": {
    "about": "One schedule per currency: the fee each transaction type pays, by channel, product and amount.",
    "new fee schedule": "Creates a schedule of fees. A checker approves it."
  },
  "limits": {
    "about": "Limit groups decide what customers and merchants may transact. Everyone is in one group.",
    "limits and usage": "A customer's limits and how much they've used.",
    "test a customer": "Checks whether a transaction would be allowed for a customer.",
    "add limit group": "Creates a group of limits. A checker approves it."
  },
  "digitalproducts": {
    "about": "Digital products bundle what a customer gets: account products, cards, channels and security.",
    "add digital product": "Creates a digital product. A checker approves it."
  },
  "scheduledjobs": {
    "about": "The platform's daily jobs for every institution (interest, fees, rescreening…). A run only does what isn't done yet, so running again is safe.",
    "switched on": "Whether the job runs on its schedule.",
    "runs": "Each run of the job and its result."
  },
  "transactionrouting": {
    "about": "Where each transaction goes: which connection delivers a service, and how other banks' cards are handled.",
    "setups": "Each institution's routing.",
    "health": "Whether each connection is up.",
    "simulator": "Try a transaction and see where it would go.",
    "decisions": "Recent routing decisions and why.",
    "set up routing": "Chooses the connections for an institution."
  },
  "expiryrules": {
    "about": "When to warn before a document or licence runs out, when to remind, how long the grace lasts after, and what happens then.",
    "hold money going out": "After the grace period, block payments out until it's renewed.",
    "tell the customer": "Send the customer reminders.",
    "email staff": "Email the institution's staff.",
    "stop the module": "Stop the module when the licence expires.",
    "messages only": "Only send reminders; block nothing."
  },
  "reportbuilder": {
    "about": "Build a report: pick its source, columns, filters, sorting and totals; preview it and save it for others to run.",
    "save report": "Saves the report so you and others can run it again.",
    "add a column…": "Adds a column to the report.",
    "add filter": "Limits the rows to those that match.",
    "add group": "Groups rows with subtotals.",
    "add sort": "Sorts the rows.",
    "run": "Shows the report with the current settings."
  },
  "savedreports": {
    "about": "The reports saved by you and shared with you. Open one to run and download it.",
    "report name": "Search by the report's name."
  },
  "kycreport": {
    "about": "Pick a customer or merchant to see everything about them on one page.",
    "search by name, phone or email": "Find the customer or merchant."
  },
  "riskscorebreakdown": {
    "about": "Customers' risk assessments and exactly how each score was reached.",
    "current assessment only": "Only each customer's latest assessment.",
    "all assessments": "Every assessment, including older ones."
  },
  "amlscorebreakdown": {
    "about": "Customers' AML screenings and exactly how each score was reached.",
    "current screening only": "Only each customer's latest screening.",
    "all screenings": "Every screening, including older ones."
  },
  "useractivity": {
    "about": "Everything one user did in the maker-checker flow over a period: as maker, as checker, or both.",
    "select a user": "The user whose activity you want."
  },
  "expiringdocuments": {
    "about": "Customers' and merchants' documents by how close they are to expiry, and what was done about each.",
    "expiring within (days)": "Only documents that expire within this many days."
  },
  "title": {
    "master": true
  },
  "addresstype": {
    "master": true
  },
  "documenttype": {
    "master": true
  },
  "occupation": {
    "master": true
  },
  "ownershipsubtype": {
    "master": true
  },
  "taxtype": {
    "master": true
  },
  "bank": {
    "master": true
  },
  "gender": {
    "master": true
  },
  "province": {
    "master": true
  },
  "identificationtype": {
    "master": true
  },
  "designation": {
    "master": true
  },
  "companytype": {
    "master": true
  },
  "taxclassification": {
    "master": true
  },
  "bankbranch": {
    "master": true
  },
  "maritalstatus": {
    "master": true
  },
  "district": {
    "master": true
  },
  "immigrationstatus": {
    "master": true
  },
  "employment": {
    "master": true
  },
  "businessnature": {
    "master": true
  },
  "taxstatus": {
    "master": true
  },
  "religion": {
    "master": true
  },
  "village": {
    "master": true
  },
  "visatype": {
    "master": true
  },
  "annualincomerange": {
    "master": true
  },
  "industrysector": {
    "master": true
  },
  "gstregistrationstatus": {
    "master": true
  },
  "disability": {
    "master": true
  },
  "verificationmethod": {
    "master": true
  },
  "monthlyincomerange": {
    "master": true
  },
  "taxexemptionstatus": {
    "master": true
  },
  "kinship": {
    "master": true
  },
  "verificationstatus": {
    "master": true
  },
  "networthrange": {
    "master": true
  },
  "pepcategory": {
    "master": true
  },
  "relationshiptype": {
    "master": true
  },
  "validationrule": {
    "master": true
  },
  "turnoverrange": {
    "master": true
  },
  "pepstatus": {
    "master": true
  },
  "qualification": {
    "master": true
  },
  "sourceoffund": {
    "master": true
  },
  "screeningtype": {
    "master": true
  },
  "accountpurpose": {
    "master": true
  },
  "merchantcategory": {
    "master": true
  },
  "merchantgroup": {
    "master": true
  }
};

// The same help in other languages, keyed as PAGE_HELP.
export const PAGE_HELP_TEXT = {
 "pt": {
  "_common": {
   "more": "Mais estados que não cabem na linha de separadores, como Rejeitado ou Eliminado. Escolha um para ver só esses registos.",
   "more filters": "Abre filtros extra: datas, quem fez a alteração, instituição e outros. O número no botão mostra quantos estão ativos.",
   "newest first": "A ordem da lista: os alterados mais recentemente primeiro, ou os mais antigos. Ordena todos os registos, não só esta página.",
   "view all": "Abre a lista inteira numa janela grande que pode pesquisar; carrega mais registos à medida que desce.",
   "search": "Escreva parte de um nome, código ou número. A lista reduz enquanto escreve.",
   "excel": "Descarrega exatamente o que a lista mostra (com os filtros) num ficheiro Excel.",
   "csv": "Descarrega exatamente o que a lista mostra (com os filtros) num ficheiro CSV, para outras ferramentas.",
   "pdf": "Descarrega o relatório em PDF, pronto a imprimir ou enviar.",
   "new onboarding": "Inicia o registo: o formulário deste tipo, passo a passo. Pode guardar um rascunho e terminar depois; vai para um verificador quando o submete.",
   "any type": "Mostra só um tipo de registo. Deixe em Qualquer para ver todos.",
   "any channel": "Mostra só o que entrou por um canal (web, app, POS, agente, etc.).",
   "any priority": "Mostra só os casos de uma prioridade.",
   "any assigned": "Mostra os casos atribuídos a uma pessoa, a si, ou a ninguém.",
   "any category": "Mostra só os casos de uma categoria (conta, transação, cartão, reclamação).",
   "any status": "Mostra só os registos num estado.",
   "any kind": "Mostra só um tipo de registo.",
   "settings": "As definições desta página: como funciona para a sua instituição.",
   "edit": "Passa a página para edição. As alterações vão para um verificador; as definições aprovadas mantêm-se até lá.",
   "refresh": "Carrega de novo os valores mais recentes.",
   "run now": "Executa já, sem esperar pelo horário.",
   "waiting for approval": "Alterações à espera de um verificador.",
   "waiting for me": "Só o que espera por si.",
   "assigned to me": "Só o que está atribuído a si.",
   "import file": "Carrega muitas entradas de uma vez a partir de um ficheiro. Um verificador aprova-as.",
   "upload file": "Carrega entradas a partir de um ficheiro. Um verificador aprova-as.",
   "any branch": "Mostra só os registos de uma agência.",
   "any loan officer": "Mostra só os registos de um gestor de crédito.",
   "any loan product": "Mostra só um produto de crédito.",
   "any card product": "Mostra só um produto de cartão.",
   "any issuance group": "Mostra só um grupo de emissão.",
   "any currency": "Mostra só uma moeda.",
   "any bin": "Mostra só um BIN.",
   "any source": "Mostra só uma origem.",
   "any report": "Mostra só um tipo de relatório.",
   "any deposit product": "Mostra só um produto de depósito.",
   "any party": "Mostra só clientes, comerciantes ou agentes.",
   "any customer": "Mostra só um tipo de cliente.",
   "any risk band": "Mostra só uma faixa de risco.",
   "any trigger": "Mostra só as verificações iniciadas de uma forma (registo, nova verificação, manual).",
   "my reports": "Os relatórios que guardou e os partilhados consigo.",
   "history": "Todas as versões anteriores e quem as alterou.",
   "cancel": "Fecha a janela sem guardar o que escreveu.",
   "save": "Guarda. Quando um verificador tem de aprovar, vai para ele; até lá mantém-se a versão aprovada.",
   "save as draft": "Guarda o trabalho sem o enviar para aprovação. Termine depois e submeta a partir da linha.",
   "submit": "Guarda e envia a um verificador para aprovação.",
   "save and submit": "Guarda e envia a um verificador para aprovação."
  },
  "terminals": {
   "about": "Todos os terminais POS que o banco registou e entregou a comerciantes. O comerciante coloca cada terminal numa das suas lojas; o estado mostra se pode aceitar pagamentos.",
   "pos idle timeout": "Quanto tempo uma sessão do terminal pode ficar inativa antes de o caixa voltar a entrar, para os comerciantes desta instituição. Um comerciante pode definir um tempo menor para as suas lojas, nunca maior.",
   "add terminal": "Regista um terminal novo: o TID, número de série, tipo e modelo. É atribuído aqui a um comerciante, que depois o coloca numa loja. Um verificador aprova primeiro.",
   "terminal id, store or merchant": "Pesquise pelo TID do terminal, pela loja onde está ou pelo comerciante dono.",
   "block requested": "Mostra só os terminais que um comerciante pediu para bloquear (perdido, roubado ou avariado). Abra um para aprovar ou recusar o bloqueio.",
   "last seen": "Quando o terminal falou pela última vez com a plataforma. Um terminal sem contacto há dias pode estar desligado ou perdido.",
   "tid": "O ID do terminal conhecido pelo switch: 4 a 16 letras maiúsculas e dígitos, único.",
   "serial number": "O número de série impresso no aparelho, para o localizar se for perdido ou trocado.",
   "type": "Que tipo de terminal: POS ou POS móvel (telemóvel ou portátil).",
   "make": "O fabricante, por exemplo PAX ou Sunmi.",
   "model": "O modelo do aparelho, por exemplo A920."
  },
  "stores": {
   "about": "As lojas dos comerciantes: onde trabalham os seus terminais e caixas. Cada loja pertence a um comerciante e é aprovada como qualquer outro registo.",
   "store or merchant name": "Pesquise pelo nome da loja ou do seu comerciante."
  },
  "individualmerchants": {
   "about": "Comerciantes que são pessoas singulares: o registo, KYC, resultado AML e estado. Um novo é revisto por um verificador antes de poder vender.",
   "aml": "O resultado da verificação antibranqueamento. Uma correspondência tem de ser esclarecida em Casos de Registo antes da aprovação."
  },
  "corporatemerchants": {
   "about": "Comerciantes que são empresas: a empresa, os administradores e donos, documentos e resultado AML. Um verificador aprova cada um antes de poder vender.",
   "aml": "O resultado da verificação antibranqueamento da empresa e das suas pessoas. Uma correspondência tem de ser esclarecida antes da aprovação."
  },
  "agents": {
   "about": "Agentes que fazem depósitos e levantamentos para clientes, e os superagentes que os gerem. O nível de cada agente define o que pode fazer e os seus limites.",
   "waiting for approval": "Agentes cujo registo ou alteração espera por um verificador.",
   "agent name or number": "Pesquise pelo nome ou número do agente.",
   "any tier": "Mostra só os agentes de um nível."
  },
  "users": {
   "about": "Os utilizadores do portal: quem pode entrar, com que perfil (o que podem ver e fazer) e para que instituição. Cada alteração é aprovada por um verificador.",
   "users": "A lista de utilizadores.",
   "transaction limits": "Quanto cada utilizador pode movimentar por transação e por dia (transações de funcionários). Definido por utilizador ou por perfil.",
   "add user": "Cria um utilizador: nome, nome de utilizador, email, perfil e instituição. Recebe a primeira palavra-passe por email quando um verificador aprova.",
   "profile": "O que este utilizador pode fazer: o perfil lista os menus que vê e as ações (adicionar, editar, aprovar...) permitidas em cada um.",
   "username": "O que o utilizador escreve para entrar. Único na instituição; não pode ser alterado depois.",
   "password": "A primeira palavra-passe. O utilizador tem de a mudar na primeira entrada; deve seguir a política de palavras-passe.",
   "employee id": "O número de funcionário dos recursos humanos.",
   "email": "Para onde vão os códigos de entrada e a recuperação da palavra-passe.",
   "mobile": "O telefone do utilizador, com o indicativo do país."
  },
  "profiles": {
   "about": "Perfis são conjuntos de permissões: que menus um utilizador vê e que ações (adicionar, editar, aprovar...) pode fazer em cada um. Cada utilizador tem um perfil.",
   "new profile": "Cria um perfil: dê-lhe um nome, escolha a instituição e marque os menus e ações permitidos. Um verificador aprova; o diálogo de aprovação mostra todas as permissões que terá.",
   "profile name": "Um nome reconhecível, como Caixa de agência ou Verificador da sede.",
   "all modules": "Marque um módulo para ver os seus menus e depois as ações permitidas em cada menu."
  },
  "userkyc": {
   "about": "Os dados de identidade dos funcionários da instituição: número de funcionário, contactos e documentos.",
   "add kyc": "Regista os dados de identidade de um funcionário. Um verificador aprova-os."
  },
  "approvalpolicies": {
   "about": "Quem tem de aprovar o quê. Uma política define, para um menu e ação (por exemplo Utilizadores > Editar), quantos níveis de aprovação uma alteração precisa e quem aprova em cada nível. Sem política, aprova um verificador.",
   "report": "Todos os menus e ações e a política que se aplica, para ver que alterações precisam de mais de uma aprovação.",
   "add policy": "Cria uma política: o menu, a ação e os aprovadores de cada nível (qualquer um, um perfil ou utilizadores nomeados) e quantos têm de aprovar.",
   "levels": "Quantos níveis de aprovação uma alteração percorre, um após o outro.",
   "menu": "O ecrã cujas alterações esta política controla.",
   "action": "Que ação nesse ecrã (adicionar, editar, eliminar…) precisa destas aprovações.",
   "level name": "Um nome para este nível, mostrado aos aprovadores (ex.: Gerente de agência).",
   "approvals needed": "Quantas pessoas diferentes têm de aprovar neste nível.",
   "approver must be": "Quem pode aprovar neste nível: qualquer pessoa com permissão, um perfil, utilizadores nomeados ou o supervisor do criador.",
   "from amount": "Este nível aplica-se a partir deste valor (alterações com valor).",
   "up to amount": "Este nível aplica-se até este valor; vazio para sem limite.",
   "escalate after (hours)": "Se ninguém aprovar neste tempo, os aprovadores seguintes são avisados.",
   "expires after (days)": "Uma alteração não aprovada neste tempo é cancelada.",
   "narration required on approve": "Os aprovadores têm de escrever um motivo ao aprovar.",
   "same user may approve at two levels": "Permite que a mesma pessoa aprove em mais de um nível da mesma alteração."
  },
  "approvaldelegations": {
   "about": "Passar as suas aprovações a outra pessoa por um período (férias, doença), e indicar o supervisor de cada utilizador.",
   "delegations": "Aprovações passadas de um utilizador a outro por um período.",
   "supervisors": "O supervisor de cada utilizador, que aprova quando um nível diz \"o supervisor do criador\".",
   "add delegation": "Passa as aprovações de um utilizador a outro entre duas datas, com um motivo. Um verificador aprova.",
   "in force": "Se a delegação se aplica agora (hoje está dentro do período e está aprovada).",
   "approvals of": "O utilizador cujas aprovações são passadas.",
   "handed to": "O utilizador que aprova no seu lugar.",
   "first day": "A delegação aplica-se a partir deste dia.",
   "last day": "A delegação termina depois deste dia.",
   "reason": "Porquê (férias, doença…), guardado com a delegação."
  },
  "individualcustomers": {
   "about": "Clientes que são pessoas singulares: o registo, nível KYC, resultado AML e estado. Um novo é revisto antes de a carteira abrir.",
   "aml": "O resultado da verificação antibranqueamento. Uma correspondência vai para Casos de Registo para ser esclarecida.",
   "customer type": "O tipo de cliente, que decide o formulário de registo, o nível KYC e os limites."
  },
  "corporatecustomers": {
   "about": "Clientes que são empresas: a empresa, os administradores e donos, documentos e resultado AML."
  },
  "transactions": {
   "about": "Todas as transações lançadas na plataforma (o Diário) e as transações pedidas por funcionários (Pedidos), lançadas quando um verificador aprova.",
   "journal": "Todas as transações lançadas: transferências, pagamentos, depósitos e levantamentos, taxas, estornos. Abra uma para ver os lançamentos, o recibo e o estorno.",
   "requests": "Transações pedidas por funcionários. São lançadas quando um verificador aprova.",
   "new transaction": "Pede uma transação de funcionário (por exemplo um pagamento ou uma transferência entre carteiras). Mostra a taxa e o saldo depois antes de a enviar a um verificador. As correções fazem-se em Ajustes de Saldo.",
   "rrn, reference, account number or name": "Pesquise pelo RRN da transação, a referência, um número de conta ou um nome."
  },
  "balanceadjustments": {
   "about": "Correções de uma transação que aconteceu: dinheiro devolvido a um cliente (crédito) ou retirado (débito). Sempre contra o RRN da transação, nunca mais do que o que resta dela.",
   "new adjustment": "Indique o RRN da transação, escolha ajuste a crédito ou a débito, depois o valor e o motivo. Um verificador aprova; se a transação estiver em disputa, o ajuste resolve a disputa.",
   "reference, account or reason": "Pesquise pela referência do pedido, o número da carteira ou palavras do motivo.",
   "original rrn": "A transação que este ajuste corrige. Clique para a abrir.",
   "dispute": "A disputa que este ajuste resolve, se houver. Clique para abrir o caso.",
   "transaction rrn": "O RRN da transação a corrigir. A carteira e o valor restante vêm dela.",
   "reason": "Porque se faz a correção. O verificador e o histórico veem-no.",
   "reference (optional)": "Um número de comprovativo ou recibo, se houver."
  },
  "disputes": {
   "about": "Casos de clientes sobre uma transação (\"o meu crédito de telemóvel não chegou\"). Resolva com um ajuste de saldo, ou feche como resolvido ou rejeitado.",
   "raise dispute": "Abre uma disputa para um cliente que ligou ou veio ao balcão: o RRN da transação, um título e o que aconteceu.",
   "case number or customer": "Pesquise pelo número do caso, o nome do cliente ou o RRN exato de uma transação.",
   "rrn": "A transação em disputa. Clique para a abrir.",
   "priority": "A urgência. Os casos de prioridade alta ficam no topo da fila.",
   "title the customer sees": "Um título curto, mostrado ao cliente na app.",
   "what happened": "O que o cliente diz que aconteceu. Só os funcionários veem.",
   "message to the customer": "Primeira mensagem opcional que o cliente vê na app.",
   "disputing account (optional)": "Só numa transferência entre dois clientes quando quem contesta não é o pagador: o número de conta dele."
  },
  "customercases": {
   "about": "Perguntas e reclamações que os clientes abrem na app ou na web. Responda na conversa e feche o caso quando estiver resolvido.",
   "case number or customer": "Pesquise pelo número do caso ou o nome do cliente."
  },
  "onboardingcases": {
   "about": "Novos clientes e comerciantes cujo resultado de risco ou AML precisa de uma decisão humana. Reveja, peça mais informação se for preciso e proponha aprovar ou rejeitar; outro utilizador confirma.",
   "settings": "Como funcionam os casos de registo: a quem são atribuídos e quanto tempo podem esperar antes de ficarem em atraso.",
   "case number or customer": "Pesquise pelo número do caso ou o nome do cliente.",
   "risk level": "O nível da pontuação de risco, segundo a configuração de risco da instituição.",
   "aml band": "A força da correspondência na verificação AML."
  },
  "accounts": {
   "about": "Todas as carteiras e contas: o dono, o produto, o saldo e o estado, com o extrato.",
   "open account": "Abre uma conta para um cliente ou comerciante existente, com o produto de conta escolhido. Um verificador aprova.",
   "opening requests": "Aberturas de conta à espera de um verificador.",
   "money waiting for numbers": "Dinheiro recebido para um número de conta que ainda não existe. Associe-o aqui à conta certa.",
   "account number, owner or reference": "Pesquise pelo número de conta, o nome do dono ou a sua referência.",
   "any party": "Mostra só contas de clientes, comerciantes ou agentes.",
   "any class": "Mostra só uma classe de conta (carteira, depósito a prazo, crédito).",
   "any account product": "Mostra só contas de um produto."
  },
  "teller": {
   "about": "O balcão da agência: abra a sua caixa, receba e pague dinheiro, mova dinheiro entre caixas e o cofre e feche o dia.",
   "my desk": "A sua caixa: abra-a com uma contagem, veja o saldo e o que espera por si, e feche-a no fim do turno.",
   "cash transfers": "Dinheiro a mover entre caixas e o cofre. Nada se move até o recetor aceitar.",
   "tills and vaults": "Todas as caixas e cofres de todas as agências, com o saldo e quem os tem abertos.",
   "end of day": "O dia da agência: o que tem de estar feito antes de fechar (caixas fechadas, cofre contado), e depois fechar."
  },
  "treasury": {
   "about": "Dinheiro em grandes quantias entre cofres das agências e o banco central ou outros bancos, e a posição do banco com cada banco de liquidação.",
   "cash movements": "Dinheiro movido entre um cofre e um banco, ou entre agências. Pedido, aprovado, enviado e contado pelo recetor.",
   "settlement positions": "O que tem em cada banco de liquidação, o que deve através dele e a margem acima do mínimo exigido.",
   "inter-branch position": "O que cada agência deve às outras por dinheiro e transações entre elas.",
   "awaiting me": "Só os movimentos que esperam que aprove, envie ou receba.",
   "new cash movement": "Pede um movimento de dinheiro: de onde, para onde, quanto. Outro utilizador aprova antes do envio."
  },
  "glreports": {
   "about": "Os livros: o extrato de uma conta GL, o balancete, o movimento das GL entre datas, o balanço, a demonstração de resultados, os fluxos de caixa e o saldo de cada cliente.",
   "statement": "Os lançamentos de uma conta GL num período, com o saldo inicial e final.",
   "trial balance": "O saldo de cada GL numa data, por secção e grupo. O total a débito tem de igualar o total a crédito.",
   "gl movement": "Saldo inicial, débitos, créditos e saldo final de cada GL entre duas datas, para comparar dois balancetes.",
   "balance sheet": "O que a instituição tem e deve numa data, depois os proveitos e custos e o resultado.",
   "profit and loss": "Proveitos menos custos num período: o resumo, cada lançamento (Detalhado) ou dia a dia.",
   "cash flow": "Como mudou o dinheiro em caixa: recebido e pago por tipo de transação (Direto), ou a demonstração clássica (Indireto).",
   "customer balances": "O saldo de cada conta de cliente e comerciante numa data; com uma data inicial, também saldo inicial, créditos e débitos.",
   "pick a gl account": "A conta GL de que quer o extrato."
  },
  "financetransaction": {
   "about": "Lançamentos manuais: mover dinheiro entre contas GL (liquidações com fornecedores, correções). É lançado quando um verificador aprova. As contas de clientes corrigem-se em Ajustes de Saldo.",
   "journals": "Todos os lançamentos manuais e o seu estado.",
   "settlement": "Liquidar o que deve ou lhe devem os fornecedores (dinheiro móvel, faturadores, bancos).",
   "new journal": "Um lançamento de linhas GL: cada linha uma GL, débito ou crédito e um valor. Os débitos têm de igualar os créditos. Um verificador aprova.",
   "journal reference or narration": "Pesquise pela referência do lançamento ou palavras da descrição.",
   "currency": "A moeda do lançamento; todas as linhas estão nela.",
   "reference": "A sua referência, como o número de liquidação do fornecedor.",
   "narration": "Para que serve o lançamento, mostrado no extrato de cada linha."
  },
  "chartofaccounts": {
   "about": "As contas GL da instituição nos seus grupos: ativos, passivos, capital, proveitos e custos.",
   "chart": "A árvore de grupos e contas GL.",
   "waiting for approval": "Alterações de GL à espera de um verificador.",
   "uploads": "Planos de contas carregados de um ficheiro e o seu resultado.",
   "template": "Descarrega o modelo do ficheiro a preencher para carregar.",
   "upload": "Carrega muitas contas GL de uma vez a partir do modelo preenchido. Um verificador aprova-as.",
   "add gl": "Adiciona uma conta GL ou grupo sob um pai. Um verificador aprova.",
   "search name, gl code or account number": "Pesquise pelo nome da GL, o código GL ou o número de conta.",
   "show inactive": "Mostra também as contas GL desativadas.",
   "expand all": "Abre todos os grupos para ver todas as contas GL."
  },
  "notifications": {
   "about": "Quem recebe que alerta: grupos de destinatários e os alertas enviados (por email, SMS ou no portal).",
   "groups": "Grupos de pessoas que recebem alertas em conjunto.",
   "alerts": "Cada alerta: quando dispara e que grupos o recebem.",
   "add group": "Cria um grupo de destinatários. Um verificador aprova."
  },
  "profile": {
   "about": "As instituições da plataforma: bancos, fintechs e o prestador de serviços. Cada uma tem os seus módulos, moedas, canais, imagem e dados legais.",
   "new institution": "Inicia uma nova instituição: os seus dados, depois os módulos, moedas, canais e imagem. Um verificador aprova."
  },
  "modules": {
   "about": "Que módulos (EPURSE, Finanças, MMS, InnoAML…) cada instituição usa e de quando a quando.",
   "add module": "Dá um módulo a uma instituição por um período. Um verificador aprova.",
   "effective from": "O módulo funciona para a instituição a partir desta data."
  },
  "currencies": {
   "about": "As moedas com que cada instituição trabalha. Uma é a moeda base, usada nos relatórios e limites.",
   "add currency": "Adiciona uma moeda a uma instituição. Um verificador aprova.",
   "base currency": "A moeda principal da instituição: relatórios e limites são nela."
  },
  "channels": {
   "about": "Os canais que cada instituição oferece (web, app, USSD, POS, agente).",
   "add channel": "Abre um canal para uma instituição. Um verificador aprova."
  },
  "phonecodes": {
   "about": "Países cujos números de telefone os clientes e comerciantes podem usar. Um é o principal: um número escrito sem + é lido como desse país.",
   "add phone code": "Permite números de outro país. Um verificador aprova.",
   "primary": "Os números escritos sem código do país são lidos como deste país."
  },
  "branding": {
   "about": "A imagem de cada instituição em cada portal: nome, logótipo e cores.",
   "add branding": "Define o nome, logótipo e cores de uma instituição num portal. Um verificador aprova."
  },
  "legal": {
   "about": "Os dados legais e regulatórios de cada instituição: denominação, registo e licença.",
   "add legal profile": "Regista a denominação, o registo e a licença de uma instituição. Um verificador aprova."
  },
  "documents": {
   "about": "Termos, privacidade e outros documentos que clientes e comerciantes veem e aceitam. Cada texto é para um canal e uma língua.",
   "new document": "Adiciona um documento: quem o vê, os textos por língua e se têm de o aceitar. Um verificador aprova.",
   "acceptance": "Se os clientes têm de aceitar este documento para continuar."
  },
  "passwordpolicy": {
   "about": "Regras de palavra-passe dos utilizadores do portal: tamanho, o que deve conter, quantas tentativas erradas bloqueiam a conta e regras de sessão.",
   "add policy": "Define as regras de palavra-passe de uma instituição. Um verificador aprova.",
   "max retries": "Palavras-passe erradas permitidas antes de a conta bloquear."
  },
  "formbuilder": {
   "about": "A biblioteca de perguntas de registo da instituição. Coloque-as em secções e construa o formulário de cada tipo de cliente com as secções.",
   "fields": "As perguntas: tipo, texto, opções e validações.",
   "sections": "Grupos de perguntas a partir dos quais se constroem os formulários.",
   "translations": "Os textos das perguntas em cada língua, com os que faltam listados.",
   "add field": "Adiciona uma pergunta: a chave, o tipo (texto, lista, data…), o texto e se é obrigatória."
  },
  "kycschemes": {
   "about": "Um esquema é uma escada ordenada de níveis KYC (o que o cliente tem de provar em cada nível e o que pode fazer depois). Aprove um esquema antes de lhe associar um tipo de cliente.",
   "add kyc scheme": "Cria uma escada de níveis KYC. Um verificador aprova."
  },
  "riskactions": {
   "about": "O que cada nível de risco implica, como Registar, Diligência reforçada ou Rejeitar. As configurações de risco e AML apontam os seus níveis para estas ações.",
   "add risk action": "Adiciona uma ação e o efeito no registo. Um verificador aprova.",
   "onboarding outcome": "O que acontece a um cliente novo cujo risco cai nesta ação."
  },
  "bulkregistration": {
   "about": "Registe muitas pessoas como clientes de uma vez, por exemplo os funcionários de uma empresa, a partir de um ficheiro. Um verificador autoriza cada lote.",
   "new batch": "Carrega um ficheiro de pessoas a registar, com o tipo de cliente e, se quiser, um cartão para cada uma. Um verificador aprova o lote.",
   "file name": "Pesquise pelo nome do ficheiro carregado."
  },
  "riskassessment": {
   "about": "Quão arriscado é um cliente de cada tipo, pontuado a partir das respostas do registo. Cada configuração pesa critérios e divide a pontuação em níveis de risco.",
   "add risk setup": "Cria uma configuração de risco: os critérios, o peso de cada um e os níveis. Um verificador aprova.",
   "criteria": "As respostas do registo que formam a pontuação.",
   "risk levels": "As faixas em que a pontuação se divide, cada uma com a sua ação."
  },
  "onboardingconfiguration": {
   "about": "Cada tipo de cliente é um registo: a identidade, o formulário, o esquema KYC, os limites e o fluxo criador-verificador.",
   "add onboarding configuration": "Cria um tipo de cliente e a sua configuração de registo. Um verificador aprova."
  },
  "termdeposits": {
   "about": "Depósitos a prazo de clientes e comerciantes: aprovação, juros, vencimento e mobilização antecipada.",
   "open deposit": "Abre um depósito: o titular, o produto, o valor e o prazo. Um verificador aprova.",
   "deposit reference, account or holder": "Pesquise pela referência do depósito, a conta ou o nome do titular."
  },
  "loanapplications": {
   "about": "Pedidos de crédito: faça o pedido em nome do mutuário, registe a aceitação, consultas de crédito e garantias, e aprove.",
   "new application": "Inicia um pedido de crédito: o mutuário, o produto, o valor e o prazo. A cotação mostra a taxa e o plano.",
   "application reference or applicant": "Pesquise pela referência do pedido ou o nome do requerente."
  },
  "accountproducts": {
   "about": "Os produtos de conta que clientes e comerciantes têm (carteiras, poupança, contas de depósito a prazo) e as suas definições.",
   "add account product": "Cria um produto de conta e as suas definições. Um verificador aprova."
  },
  "loanfacilities": {
   "about": "Os créditos: desembolso, reembolsos, liquidação antecipada, reestruturação, abate e cobrança.",
   "loans": "Todos os créditos e a sua situação.",
   "portfolio quality": "Como está a carteira: dias em atraso, classes de risco e provisões.",
   "move an officer's loans": "Passa todos os créditos de um gestor para outro.",
   "loan reference, account or borrower": "Pesquise pela referência do crédito, a conta ou o mutuário.",
   "days past due": "Há quanto tempo a prestação mais antiga está por pagar.",
   "risk class": "A classe do crédito pelos dias de atraso, que define a sua provisão."
  },
  "depositproducts": {
   "about": "A configuração de depósito a prazo de cada produto de conta: política, prazos e taxas.",
   "new deposit product": "Configura um produto de depósito: prazos, taxas e regras de mobilização antecipada. Um verificador aprova."
  },
  "regulatorysubmissions": {
   "about": "Relatórios da carteira de crédito tal como está hoje, para o regulador e a central de crédito. Envie-os e registe a referência do regulador.",
   "regulator reports": "Os relatórios para o regulador.",
   "credit bureau file": "O ficheiro para a central de crédito.",
   "generate report": "Faz um relatório da carteira de crédito como está agora."
  },
  "lendingregulatoryprofile": {
   "about": "As definições de crédito da instituição: licença, reporte, consultas de crédito e as classes de risco com as provisões.",
   "provision %": "Quanto de um crédito em dívida nesta classe se reserva como perda provável."
  },
  "borrowergroups": {
   "about": "Grupos solidários com um gestor de crédito e um ritmo de reuniões. Enquanto um membro estiver em atraso, o grupo não recebe novos créditos.",
   "form a group": "Cria um grupo: membros, agência, gestor e reuniões.",
   "group code or name": "Pesquise pelo código ou nome do grupo."
  },
  "loanproducts": {
   "about": "Cada produto de crédito com prazos, faixas de taxa, comissões e políticas. As alterações entram em vigor quando um verificador aprova.",
   "reference rates": "As taxas de referência que os créditos de taxa variável seguem. Uma nova taxa reprecifica os créditos em curso a partir da sua data.",
   "new loan product": "Constrói um produto de crédito passo a passo: prazos, taxas, comissões, elegibilidade e documentos."
  },
  "glmapping": {
   "about": "Para que GL vai cada lançamento. A regra mais específica que se aplica ganha; a GL de recurso fica com o resto.",
   "rules": "As regras de mapeamento por tipo de lançamento.",
   "test": "Experimente um lançamento e veja para que GL iria.",
   "unmapped": "Lançamentos sem regra que foram para a GL de recurso.",
   "search by provider, type, gl or note": "Pesquise nas regras."
  },
  "corebankingsetup": {
   "about": "Agências, funcionários, retenção na fonte, perda de crédito esperada, central de crédito e ano fiscal: as definições bancárias centrais.",
   "accounting": "O ano fiscal e as GL de caixa usadas na demonstração de fluxos de caixa.",
   "head office": "A agência sede."
  },
  "accountingperiods": {
   "about": "Feche cada mês depois de terminar, por ordem. Fechar o último mês do ano fiscal também passa o resultado do ano para o capital."
  },
  "bins": {
   "about": "Os primeiros dígitos dos seus números de cartão em cada rede. Os produtos de cartão são criados sobre um BIN.",
   "new bin": "Adiciona um BIN numa rede. Um verificador aprova."
  },
  "cardnumberlayout": {
   "about": "Como se formam os números de cartão em cada BIN: as partes depois do BIN, o número de série e o dígito de controlo.",
   "new layout": "Define como se formam os números num BIN."
  },
  "cardorders": {
   "about": "Encomendas ao fornecedor de cartões: stock em branco ou cartões personalizados, gravados, recebidos e conferidos.",
   "new order": "Encomenda cartões ao fornecedor para um grupo de emissão."
  },
  "cardproducts": {
   "about": "Cartões pré-pagos e de débito: o BIN e a moeda, o produto digital com que são vendidos, e as suas comissões e limites.",
   "new card product": "Cria um produto de cartão. Um verificador aprova."
  },
  "prefiles": {
   "about": "Um ficheiro de gravação (PRE) para o fornecedor, feito com cartões escolhidos das encomendas de um grupo de emissão.",
   "make pre file (all waiting)": "Faz um ficheiro de gravação com todos os cartões em espera.",
   "files made": "Ficheiros de gravação já feitos."
  },
  "issuancegroups": {
   "about": "Stock e encomendas de cartões físicos: as predefinições e o ficheiro de gravação enviado ao fornecedor.",
   "new issuance group": "Cria um grupo com o produto de cartão e as predefinições."
  },
  "receivecards": {
   "about": "Encomendas cujo ficheiro de gravação foi para o fornecedor: registe os cartões que voltaram; depois um verificador confirma."
  },
  "cardstock": {
   "about": "Cartões instantâneos no cofre ou com funcionários, prontos a entregar a clientes.",
   "card number or serial": "Pesquise pelo número do cartão ou de série."
  },
  "cardrequests": {
   "about": "Pedidos de cartões físicos: feitos para um cliente, encomendados e entregues.",
   "new card request": "Pede um cartão físico para um cliente."
  },
  "cards": {
   "about": "Todos os cartões: quem os tem, em que fase de produção estão e se podem ser usados.",
   "issue virtual card": "Emite já um cartão virtual a um cliente."
  },
  "atms": {
   "about": "Os ATM do banco: cada um escuta na sua porta do switch. As chaves, comandos e eventos.",
   "ports": "As portas do switch a que os ATM se ligam.",
   "downloads to all": "Envia a configuração mais recente a todos os ATM.",
   "add atm": "Regista um ATM e a sua porta."
  },
  "internalwatchlists": {
   "about": "As listas próprias da instituição, como uma lista negra do banco central ou os seus casos de fraude. Depois de aprovadas, todas as verificações as consultam.",
   "add watchlist": "Adiciona uma lista a partir de um ficheiro. Um verificador aprova."
  },
  "screenings": {
   "about": "Todas as verificações AML dos clientes da instituição. Os resultados são só registados; aqui nada é bloqueado.",
   "changes": "Verificações cujo resultado mudou desde a anterior.",
   "screened name": "Pesquise pelo nome verificado."
  },
  "blacklist": {
   "about": "A lista própria da instituição de pessoas e empresas com quem não trabalha, consultada em cada verificação.",
   "entries": "As pessoas e empresas na lista.",
   "add entry": "Adiciona uma pessoa ou empresa. Um verificador aprova."
  },
  "matchreview": {
   "about": "Decida cada correspondência como falso positivo ou correspondência verdadeira. Um criador propõe; outro utilizador confirma.",
   "all reviews": "Todas as revisões, propostas e decididas.",
   "news": "Correspondências em notícias adversas."
  },
  "whitelist": {
   "about": "Falsos positivos aprovados: um cliente esclarecido contra um registo listado, para que a mesma correspondência não o bloqueie de novo até expirar.",
   "expiring within (days)": "Mostra só as entradas que expiram dentro deste número de dias."
  },
  "amlsetup": {
   "about": "Como se lê uma pontuação de verificação: faixas de pontuação ligadas a ações de risco, a pontuação mínima de correspondência e a nova verificação contínua.",
   "add aml setup": "Cria a configuração AML. Um verificador aprova."
  },
  "flags": {
   "about": "Clientes cujo resultado AML piorou numa nova verificação. Abra um caso ou dispense cada um.",
   "blacklist match": "Só os alertas causados por uma correspondência na lista negra."
  },
  "amlcases": {
   "about": "Clientes ativos cujo resultado AML precisa de uma pessoa: fale com eles e feche como esclarecido, confirmado ou sem ação. Outro utilizador confirma."
  },
  "namelookup": {
   "about": "Verifique um nome que não é cliente, como o beneficiário de um pagamento. Cada consulta fica guardada com o motivo.",
   "screen name": "Faz a verificação do nome indicado.",
   "lists": "Listas de sanções e de vigilância.",
   "adverse media": "Notícias sobre o nome."
  },
  "transactionmonitoring": {
   "about": "Regras que vigiam as transações quando são lançadas, e os alertas que geram.",
   "alerts": "Alertas gerados pelas regras. Abra um para ver as transações por trás.",
   "rules": "As regras: o que vigiam e os seus limites.",
   "run scan now": "Verifica já as transações mais recentes contra as regras."
  },
  "regulatoryreports": {
   "about": "Relatórios de transações suspeitas (STR) e de transações em numerário (CTR) para o regulador.",
   "suspicious transactions (str)": "Relatórios de atividade suspeita. Outro responsável aprova antes de submeter.",
   "currency transactions (ctr)": "Numerário igual ou acima do limite, preparado todas as noites.",
   "new report": "Escreve um relatório de transação suspeita."
  },
  "reconlayouts": {
   "about": "Formatos de ficheiro para reconciliação, em JSON. Parta de um formato incluído e edite-o; uma alteração espera aprovação.",
   "add layout": "Cria um formato de ficheiro."
  },
  "reconsources": {
   "about": "De onde vêm os ficheiros de reconciliação: o formato de cada origem, o padrão do nome e a recolha por SFTP.",
   "sources": "As origens.",
   "sftp profiles": "Ligações usadas para recolher ficheiros.",
   "currency decimals": "Quantas casas decimais cada moeda tem nos ficheiros.",
   "add source": "Adiciona uma origem de ficheiros."
  },
  "reconfiles": {
   "about": "Ficheiros recebidos de cada origem (carregados, recolhidos por SFTP ou gerados a partir do razão) e como foram lidos.",
   "generate switch file": "Faz um ficheiro a partir do razão para reconciliar.",
   "upload file": "Carrega um ficheiro para uma origem."
  },
  "reconsets": {
   "about": "O que se reconcilia com o quê: as regras, as execuções e resultados, e as aprovações de alterações.",
   "sets": "Os conjuntos de reconciliação.",
   "approvals": "Alterações à espera de aprovação.",
   "add set": "Cria um conjunto de reconciliação."
  },
  "externalproviders": {
   "about": "Para onde os clientes enviam dinheiro: carteiras móveis, bancos, operadoras de recargas, eletricidade pré-paga e faturadores.",
   "set up providers": "Escolhe os fornecedores que uma instituição oferece e as suas definições."
  },
  "feeschedules": {
   "about": "Uma tabela por moeda: a comissão que cada tipo de transação paga, por canal, produto e valor.",
   "new fee schedule": "Cria uma tabela de comissões. Um verificador aprova."
  },
  "limits": {
   "about": "Os grupos de limites decidem o que clientes e comerciantes podem transacionar. Cada pessoa está num grupo.",
   "limits and usage": "Os limites de um cliente e quanto já usou.",
   "test a customer": "Verifica se uma transação seria permitida para um cliente.",
   "add limit group": "Cria um grupo de limites. Um verificador aprova."
  },
  "digitalproducts": {
   "about": "Os produtos digitais reúnem o que um cliente recebe: produtos de conta, cartões, canais e segurança.",
   "add digital product": "Cria um produto digital. Um verificador aprova."
  },
  "scheduledjobs": {
   "about": "As tarefas diárias da plataforma para todas as instituições (juros, comissões, novas verificações…). Uma execução só faz o que ainda não está feito, por isso repetir é seguro.",
   "switched on": "Se a tarefa corre no seu horário.",
   "runs": "Cada execução da tarefa e o resultado."
  },
  "transactionrouting": {
   "about": "Para onde vai cada transação: que ligação presta um serviço e como se tratam os cartões de outros bancos.",
   "setups": "O encaminhamento de cada instituição.",
   "health": "Se cada ligação está ativa.",
   "simulator": "Experimente uma transação e veja para onde iria.",
   "decisions": "Decisões de encaminhamento recentes e porquê.",
   "set up routing": "Escolhe as ligações de uma instituição."
  },
  "expiryrules": {
   "about": "Quando avisar antes de um documento ou licença expirar, quando lembrar, quanto dura a tolerância depois e o que acontece então.",
   "hold money going out": "Depois da tolerância, bloqueia pagamentos de saída até ser renovado.",
   "tell the customer": "Envia lembretes ao cliente.",
   "email staff": "Envia email aos funcionários da instituição.",
   "stop the module": "Para o módulo quando a licença expira.",
   "messages only": "Só envia lembretes; não bloqueia nada."
  },
  "reportbuilder": {
   "about": "Construa um relatório: escolha a origem, colunas, filtros, ordem e totais; pré-visualize e guarde-o para outros executarem.",
   "save report": "Guarda o relatório para si e outros o executarem de novo.",
   "add a column…": "Adiciona uma coluna ao relatório.",
   "add filter": "Limita as linhas às que correspondem.",
   "add group": "Agrupa linhas com subtotais.",
   "add sort": "Ordena as linhas.",
   "run": "Mostra o relatório com as definições atuais."
  },
  "savedreports": {
   "about": "Os relatórios guardados por si e partilhados consigo. Abra um para o executar e descarregar.",
   "report name": "Pesquise pelo nome do relatório."
  },
  "kycreport": {
   "about": "Escolha um cliente ou comerciante para ver tudo sobre ele numa página.",
   "search by name, phone or email": "Encontre o cliente ou comerciante."
  },
  "riskscorebreakdown": {
   "about": "As avaliações de risco dos clientes e exatamente como se chegou a cada pontuação.",
   "current assessment only": "Só a avaliação mais recente de cada cliente.",
   "all assessments": "Todas as avaliações, incluindo as antigas."
  },
  "amlscorebreakdown": {
   "about": "As verificações AML dos clientes e exatamente como se chegou a cada pontuação.",
   "current screening only": "Só a verificação mais recente de cada cliente.",
   "all screenings": "Todas as verificações, incluindo as antigas."
  },
  "useractivity": {
   "about": "Tudo o que um utilizador fez no fluxo criador-verificador num período: como criador, como verificador, ou ambos.",
   "select a user": "O utilizador cuja atividade quer ver."
  },
  "expiringdocuments": {
   "about": "Documentos de clientes e comerciantes por proximidade da data de validade, e o que foi feito em cada um.",
   "expiring within (days)": "Só os documentos que expiram dentro deste número de dias."
  }
 },
 "ar": {
  "_common": {
   "more": "حالات أخرى لا تتسع لها علامات التبويب، مثل مرفوض أو محذوف. اختر واحدة لعرض تلك السجلات فقط.",
   "more filters": "يفتح عوامل تصفية إضافية: التواريخ ومن أجرى التغيير والمؤسسة وغيرها. يُظهر الرقم على الزر عدد المفعّل منها.",
   "newest first": "ترتيب القائمة: الأحدث تغييراً أولاً أو الأقدم أولاً. يرتّب كل السجلات وليس هذه الصفحة فقط.",
   "view all": "يفتح القائمة كاملة في نافذة كبيرة يمكن البحث فيها، وتُحمَّل سجلات أكثر كلما مررت للأسفل.",
   "search": "اكتب جزءاً من اسم أو رمز أو رقم. تضيق القائمة أثناء الكتابة.",
   "excel": "ينزّل ما تعرضه القائمة تماماً (مع عوامل التصفية) كملف Excel.",
   "csv": "ينزّل ما تعرضه القائمة تماماً (مع عوامل التصفية) كملف CSV لأدوات أخرى.",
   "pdf": "ينزّل التقرير كملف PDF جاهز للطباعة أو الإرسال.",
   "new onboarding": "يبدأ التسجيل: نموذج هذا النوع خطوة بخطوة. يمكنك حفظ مسودة وإكماله لاحقاً، ويذهب إلى مدقّق عند إرساله.",
   "any type": "يعرض نوعاً واحداً من السجلات فقط. اتركه على «أي» لعرض الكل.",
   "any channel": "يعرض فقط ما جاء عبر قناة واحدة (الويب، التطبيق، نقاط البيع، الوكيل وغيرها).",
   "any priority": "يعرض الحالات ذات أولوية واحدة فقط.",
   "any assigned": "يعرض الحالات المسندة إلى شخص معيّن أو إليك أو غير المسندة.",
   "any category": "يعرض الحالات من فئة واحدة فقط (حساب، معاملة، بطاقة، شكوى).",
   "any status": "يعرض السجلات في حالة واحدة فقط.",
   "any kind": "يعرض نوعاً واحداً من السجلات فقط.",
   "settings": "إعدادات هذه الصفحة: كيف تعمل لمؤسستك.",
   "edit": "يحوّل الصفحة إلى وضع التعديل. تذهب تغييراتك إلى مدقّق، وتبقى الإعدادات المعتمدة سارية حتى ذلك الحين.",
   "refresh": "يحمّل أحدث الأرقام من جديد.",
   "run now": "يشغّله فوراً بدلاً من انتظار موعده.",
   "waiting for approval": "تغييرات بانتظار مدقّق.",
   "waiting for me": "فقط ما ينتظر إجراءك.",
   "assigned to me": "فقط ما هو مسند إليك.",
   "import file": "يحمّل إدخالات كثيرة دفعة واحدة من ملف. يوافق عليها مدقّق.",
   "upload file": "يحمّل إدخالات من ملف. يوافق عليها مدقّق.",
   "any branch": "يعرض سجلات فرع واحد فقط.",
   "any loan officer": "يعرض سجلات موظف ائتمان واحد فقط.",
   "any loan product": "يعرض منتج قرض واحداً فقط.",
   "any card product": "يعرض منتج بطاقة واحداً فقط.",
   "any issuance group": "يعرض مجموعة إصدار واحدة فقط.",
   "any currency": "يعرض عملة واحدة فقط.",
   "any bin": "يعرض BIN واحداً فقط.",
   "any source": "يعرض مصدراً واحداً فقط.",
   "any report": "يعرض نوعاً واحداً من التقارير فقط.",
   "any deposit product": "يعرض منتج وديعة واحداً فقط.",
   "any party": "يعرض العملاء أو التجار أو الوكلاء فقط.",
   "any customer": "يعرض نوعاً واحداً من العملاء فقط.",
   "any risk band": "يعرض نطاق مخاطر واحداً فقط.",
   "any trigger": "يعرض الفحوصات التي بدأت بطريقة واحدة فقط (التسجيل، إعادة الفحص، يدوياً).",
   "my reports": "التقارير التي حفظتها وتلك المشاركة معك.",
   "history": "كل الإصدارات السابقة ومن غيّرها.",
   "cancel": "يغلق النافذة دون حفظ ما كتبته.",
   "save": "يحفظه. إذا كان على مدقّق الموافقة فيذهب إليه، وحتى ذلك الحين تبقى النسخة المعتمدة.",
   "save as draft": "يحفظ عملك دون إرساله للموافقة. أكمله لاحقاً وأرسله من الصف.",
   "submit": "يحفظه ويرسله إلى مدقّق للموافقة.",
   "save and submit": "يحفظه ويرسله إلى مدقّق للموافقة."
  },
  "terminals": {
   "about": "كل أجهزة نقاط البيع التي سجّلها البنك وسلّمها للتجار. يضع التاجر كل جهاز في أحد متاجره، وتُظهر الحالة إن كان يستطيع قبول المدفوعات.",
   "pos idle timeout": "المدة التي يمكن أن تبقى فيها جلسة الجهاز خاملة قبل أن يسجّل أمين الصندوق الدخول مجدداً، لتجار هذه المؤسسة. يمكن للتاجر تحديد مدة أقصر لمتاجره، لا أطول.",
   "add terminal": "يسجّل جهازاً جديداً: رقم TID والرقم التسلسلي والنوع والطراز. يُسند هنا إلى تاجر ثم يضعه التاجر في متجر. يوافق مدقّق أولاً.",
   "terminal id, store or merchant": "ابحث برقم TID للجهاز أو بالمتجر الموجود فيه أو بالتاجر المالك.",
   "block requested": "يعرض فقط الأجهزة التي طلب التاجر حظرها (مفقودة أو مسروقة أو معطلة). افتح واحداً لقبول الحظر أو رفضه.",
   "last seen": "آخر مرة تواصل فيها الجهاز مع المنصة. الجهاز الذي لم يظهر منذ أيام قد يكون مطفأً أو مفقوداً.",
   "tid": "معرّف الجهاز الذي يعرفه به المحوّل: من 4 إلى 16 حرفاً كبيراً ورقماً، فريد.",
   "serial number": "الرقم التسلسلي المطبوع على الجهاز لتتبعه إن فُقد أو استُبدل.",
   "type": "نوع الجهاز: نقطة بيع أو نقطة بيع متنقلة (هاتف أو جهاز محمول).",
   "make": "الشركة المصنّعة، مثل PAX أو Sunmi.",
   "model": "طراز الجهاز، مثل A920."
  },
  "stores": {
   "about": "متاجر التجار: حيث تعمل أجهزتهم وأمناء صناديقهم. كل متجر يتبع تاجراً واحداً ويُعتمد كأي سجل آخر.",
   "store or merchant name": "ابحث باسم المتجر أو اسم التاجر."
  },
  "individualmerchants": {
   "about": "تجار أفراد: تسجيلهم واعرف عميلك ونتيجة مكافحة غسل الأموال وحالتهم. يراجع مدقّق كل تاجر جديد قبل أن يتمكن من البيع.",
   "aml": "نتيجة فحص مكافحة غسل الأموال. يجب حسم أي تطابق في حالات التسجيل قبل الموافقة."
  },
  "corporatemerchants": {
   "about": "تجار هم شركات: الشركة ومديروها ومالكوها والمستندات ونتيجة مكافحة غسل الأموال. يوافق مدقّق على كل منها قبل أن تتمكن من البيع.",
   "aml": "نتيجة فحص مكافحة غسل الأموال للشركة والأشخاص فيها. يجب حسم أي تطابق قبل الموافقة."
  },
  "agents": {
   "about": "وكلاء يقومون بالإيداع والسحب النقدي للعملاء، والوكلاء الرئيسيون الذين يديرونهم. تحدد فئة كل وكيل ما يمكنه فعله وحدوده.",
   "waiting for approval": "وكلاء ينتظر تسجيلهم أو تغييرهم مدقّقاً.",
   "agent name or number": "ابحث باسم الوكيل أو رقمه.",
   "any tier": "يعرض وكلاء فئة واحدة فقط."
  },
  "users": {
   "about": "مستخدمو البوابة: من يمكنه الدخول، وبأي ملف صلاحيات (ما يرونه ويفعلونه)، ولأي مؤسسة. يوافق مدقّق على كل تغيير.",
   "users": "قائمة المستخدمين.",
   "transaction limits": "المبلغ الذي يمكن لكل مستخدم تحريكه في المعاملة الواحدة وفي اليوم (معاملات الموظفين). يُحدد لكل مستخدم أو لكل ملف.",
   "add user": "ينشئ مستخدماً: الاسم واسم المستخدم والبريد وملف الصلاحيات والمؤسسة. يتلقى كلمة المرور الأولى بالبريد بعد موافقة المدقّق.",
   "profile": "ما يمكن لهذا المستخدم فعله: يسرد الملف القوائم التي يراها والإجراءات (إضافة، تعديل، موافقة...) المسموحة في كل منها.",
   "username": "ما يكتبه المستخدم لتسجيل الدخول. فريد في المؤسسة ولا يمكن تغييره لاحقاً.",
   "password": "كلمة المرور الأولى. يجب على المستخدم تغييرها عند أول دخول، ويجب أن تتبع سياسة كلمات المرور.",
   "employee id": "الرقم الوظيفي من الموارد البشرية.",
   "email": "حيث تُرسل رموز الدخول واستعادة كلمة المرور.",
   "mobile": "هاتف المستخدم مع رمز الدولة."
  },
  "profiles": {
   "about": "ملفات الصلاحيات هي مجموعات أذونات: القوائم التي يراها المستخدم والإجراءات (إضافة، تعديل، موافقة...) المسموحة له في كل منها. لكل مستخدم ملف واحد.",
   "new profile": "ينشئ ملفاً: سمّه واختر مؤسسته ثم حدّد القوائم والإجراءات المسموحة. يوافق مدقّق، وتعرض نافذة الموافقة كل الأذونات التي سيحصل عليها.",
   "profile name": "اسم يعرفه الناس، مثل أمين صندوق الفرع أو مدقّق المقر.",
   "all modules": "حدّد وحدة لرؤية قوائمها ثم حدّد الإجراءات المسموحة في كل قائمة."
  },
  "userkyc": {
   "about": "بيانات هوية موظفي المؤسسة: الرقم الوظيفي وبيانات الاتصال والمستندات.",
   "add kyc": "يسجّل بيانات هوية موظف. يوافق عليها مدقّق."
  },
  "approvalpolicies": {
   "about": "من يجب أن يوافق على ماذا. تحدد السياسة، لقائمة وإجراء (مثل المستخدمون > تعديل)، عدد مستويات الموافقة ومن يوافق في كل مستوى. من دون سياسة يوافق مدقّق واحد.",
   "report": "كل القوائم والإجراءات والسياسة المطبقة عليها، لترى أي التغييرات تحتاج أكثر من موافقة.",
   "add policy": "ينشئ سياسة: القائمة والإجراء ثم الموافقين في كل مستوى (أي شخص أو ملف أو مستخدمون محددون) وعدد من يجب أن يوافق.",
   "levels": "عدد مستويات الموافقة التي يمر بها التغيير، واحداً تلو الآخر.",
   "menu": "الشاشة التي تتحكم هذه السياسة في تغييراتها.",
   "action": "أي إجراء في تلك الشاشة (إضافة، تعديل، حذف…) يحتاج هذه الموافقات.",
   "level name": "اسم لهذا المستوى يظهر للموافقين (مثل مدير الفرع).",
   "approvals needed": "عدد الأشخاص المختلفين الذين يجب أن يوافقوا في هذا المستوى.",
   "approver must be": "من يمكنه الموافقة في هذا المستوى: أي شخص لديه الصلاحية أو ملف أو مستخدمون محددون أو مشرف المُنشئ.",
   "from amount": "ينطبق هذا المستوى ابتداءً من هذا المبلغ (للتغييرات ذات المبلغ).",
   "up to amount": "ينطبق هذا المستوى حتى هذا المبلغ؛ اتركه فارغاً بلا حد أعلى.",
   "escalate after (hours)": "إن لم يوافق أحد خلال هذه المدة يُبلَّغ الموافقون التالون.",
   "expires after (days)": "يُلغى التغيير غير المعتمد خلال هذه المدة.",
   "narration required on approve": "يجب على الموافقين كتابة سبب عند الموافقة.",
   "same user may approve at two levels": "يسمح لشخص واحد بالموافقة في أكثر من مستوى للتغيير نفسه."
  },
  "approvaldelegations": {
   "about": "تسليم موافقاتك لشخص آخر لفترة (إجازة أو مرض)، وتحديد المشرف لكل مستخدم.",
   "delegations": "موافقات سُلّمت من مستخدم لآخر لفترة.",
   "supervisors": "مشرف كل مستخدم، ويوافق عندما يقول مستوى الموافقة «مشرف المُنشئ».",
   "add delegation": "يسلّم موافقات مستخدم لآخر بين تاريخين مع سبب. يوافق مدقّق.",
   "in force": "ما إذا كان التفويض سارياً الآن (اليوم ضمن الفترة وهو معتمد).",
   "approvals of": "المستخدم الذي تُسلَّم موافقاته.",
   "handed to": "المستخدم الذي يوافق نيابة عنه.",
   "first day": "يسري التفويض من هذا اليوم.",
   "last day": "ينتهي التفويض بعد هذا اليوم.",
   "reason": "السبب (إجازة، مرض…)، ويُحفظ مع التفويض."
  },
  "individualcustomers": {
   "about": "عملاء أفراد: تسجيلهم ومستوى اعرف عميلك ونتيجة مكافحة غسل الأموال وحالتهم. يُراجع كل عميل جديد قبل فتح المحفظة.",
   "aml": "نتيجة فحص مكافحة غسل الأموال. يذهب أي تطابق إلى حالات التسجيل لحسمه.",
   "customer type": "نوع العميل، ويحدد نموذج التسجيل ومستوى اعرف عميلك والحدود."
  },
  "corporatecustomers": {
   "about": "عملاء هم شركات: الشركة ومديروها ومالكوها والمستندات ونتيجة مكافحة غسل الأموال."
  },
  "transactions": {
   "about": "كل المعاملات المرحّلة على المنصة (اليومية) والمعاملات التي يطلبها الموظفون (الطلبات) وتُرحّل بعد موافقة المدقّق.",
   "journal": "كل المعاملة المرحّلة: تحويلات ومدفوعات وإيداع وسحب نقدي ورسوم وعكوس. افتح واحدة لترى قيودها وإيصالها وعكسها.",
   "requests": "معاملات طلبها الموظفون. تُرحّل عند موافقة المدقّق.",
   "new transaction": "يطلب معاملة موظف (مثل دفعة أو تحويل بين محافظ). يعرض الرسوم والرصيد بعدها قبل إرسالها إلى مدقّق. التصحيحات تتم في تسويات الرصيد.",
   "rrn, reference, account number or name": "ابحث برقم RRN للمعاملة أو مرجعها أو رقم حساب أو اسم."
  },
  "balanceadjustments": {
   "about": "تصحيحات لمعاملة حدثت: مال يُعاد إلى عميل (دائن) أو يُسترد منه (مدين). دائماً مقابل رقم RRN للمعاملة، ولا يتجاوز ما تبقى منها.",
   "new adjustment": "أدخل رقم RRN للمعاملة، واختر تسوية دائنة أو مدينة، ثم المبلغ والسبب. يوافق مدقّق؛ وإذا كانت المعاملة محل نزاع فإن التسوية تحسم النزاع.",
   "reference, account or reason": "ابحث بمرجع الطلب أو رقم المحفظة أو كلمات من السبب.",
   "original rrn": "المعاملة التي تصححها هذه التسوية. انقر لفتحها.",
   "dispute": "النزاع الذي تحسمه هذه التسوية إن وُجد. انقر لفتح الحالة.",
   "transaction rrn": "رقم RRN للمعاملة المراد تصحيحها. المحفظة والمبلغ المتبقي يأتيان منها.",
   "reason": "سبب التصحيح. يراه المدقّق وسجل التدقيق.",
   "reference (optional)": "رقم سند أو إيصال إن وُجد."
  },
  "disputes": {
   "about": "حالات عملاء حول معاملة واحدة («لم يصل رصيد الهاتف»). احسمها بتسوية رصيد أو أغلقها كمحلولة أو مرفوضة.",
   "raise dispute": "يفتح نزاعاً لعميل اتصل أو حضر: رقم RRN للمعاملة وعنوان وما حدث.",
   "case number or customer": "ابحث برقم الحالة أو اسم العميل أو رقم RRN الدقيق لمعاملة.",
   "rrn": "المعاملة محل النزاع. انقر لفتحها.",
   "priority": "مدى الإلحاح. الحالات عالية الأولوية في أعلى القائمة.",
   "title the customer sees": "عنوان قصير يظهر للعميل في تطبيقه.",
   "what happened": "ما يقول العميل إنه حدث. يراه الموظفون فقط.",
   "message to the customer": "رسالة أولى اختيارية يراها العميل في تطبيقه.",
   "disputing account (optional)": "فقط لتحويل بين عميلين عندما لا يكون المعترض هو الدافع: رقم حسابه."
  },
  "customercases": {
   "about": "أسئلة وشكاوى يفتحها العملاء بأنفسهم في التطبيق أو الويب. أجب في المحادثة وأغلق الحالة عند حلها.",
   "case number or customer": "ابحث برقم الحالة أو اسم العميل."
  },
  "onboardingcases": {
   "about": "عملاء وتجار جدد تحتاج نتيجة المخاطر أو مكافحة غسل الأموال لديهم إلى قرار بشري. راجع، واطلب معلومات إضافية إن لزم، ثم اقترح الموافقة أو الرفض؛ ويؤكد مستخدم آخر.",
   "settings": "كيف تعمل حالات التسجيل: لمن تُسند وكم يمكن أن تنتظر قبل أن تتأخر.",
   "case number or customer": "ابحث برقم الحالة أو اسم العميل.",
   "risk level": "مستوى درجة المخاطر وفق إعداد المخاطر في المؤسسة.",
   "aml band": "قوة التطابق في فحص مكافحة غسل الأموال."
  },
  "accounts": {
   "about": "كل المحافظ والحسابات: المالك والمنتج والرصيد والحالة، مع كشف الحساب.",
   "open account": "يفتح حساباً لعميل أو تاجر موجود بمنتج الحساب الذي تختاره. يوافق مدقّق.",
   "opening requests": "طلبات فتح حسابات بانتظار مدقّق.",
   "money waiting for numbers": "أموال وصلت لرقم حساب غير موجود بعد. طابقها هنا مع الحساب الصحيح.",
   "account number, owner or reference": "ابحث برقم الحساب أو اسم المالك أو مرجعه.",
   "any party": "يعرض حسابات العملاء أو التجار أو الوكلاء فقط.",
   "any class": "يعرض فئة حسابات واحدة فقط (محفظة، وديعة لأجل، قرض).",
   "any account product": "يعرض حسابات منتج واحد فقط."
  },
  "teller": {
   "about": "شبّاك الفرع: افتح صندوقك، واستلم النقد وادفعه، وانقل النقد بين الصناديق والخزنة، وأغلق اليوم.",
   "my desk": "صندوقك: افتحه بعدّ النقد، واطّلع على رصيده وما ينتظرك، وأغلقه في نهاية نوبتك.",
   "cash transfers": "نقد ينتقل بين الصناديق والخزنة. لا شيء ينتقل حتى يقبله المستلم.",
   "tills and vaults": "كل الصناديق والخزائن في كل الفروع، مع أرصدتها ومن يفتحها.",
   "end of day": "يوم الفرع: ما يجب إنجازه قبل الإغلاق (إغلاق الصناديق وعدّ الخزنة) ثم الإغلاق."
  },
  "treasury": {
   "about": "النقد بالجملة بين خزائن الفروع والبنك المركزي أو بنوك أخرى، ومركز البنك مع كل بنك تسوية.",
   "cash movements": "نقد يُنقل بين خزنة وبنك أو بين الفروع. يُطلب ويُعتمد ويُرسل ثم يعدّه المستلم.",
   "settlement positions": "ما لديك لدى كل بنك تسوية، وما تدين به عبره، والهامش فوق الحد الأدنى المطلوب.",
   "inter-branch position": "ما يدين به كل فرع للفروع الأخرى من نقد ومعاملات بينها.",
   "awaiting me": "فقط التحركات التي تنتظر موافقتك أو إرسالك أو استلامك.",
   "new cash movement": "يطلب نقل نقد: من أين وإلى أين وكم. يوافق مستخدم آخر قبل الإرسال."
  },
  "glreports": {
   "about": "الدفاتر: كشف حساب أستاذ عام، وميزان المراجعة، وحركة الحسابات بين تاريخين، والميزانية، والأرباح والخسائر، والتدفقات النقدية، ورصيد كل عميل.",
   "statement": "قيود حساب أستاذ عام واحد لفترة، مع الرصيد الافتتاحي والختامي.",
   "trial balance": "رصيد كل حساب في تاريخ، حسب القسم والمجموعة. يجب أن يساوي مجموع المدين مجموع الدائن.",
   "gl movement": "الرصيد الافتتاحي والمدين والدائن والرصيد الختامي لكل حساب بين تاريخين، لمقارنة ميزاني مراجعة.",
   "balance sheet": "ما تملكه المؤسسة وما عليها في تاريخ، ثم الإيرادات والمصروفات والربح أو الخسارة.",
   "profit and loss": "الإيرادات ناقص المصروفات لفترة: الملخص أو كل قيد (تفصيلي) أو يوماً بيوم.",
   "cash flow": "كيف تغيّر النقد في الصندوق: المقبوض والمدفوع حسب نوع المعاملة (مباشر) أو القائمة التقليدية (غير مباشر).",
   "customer balances": "رصيد كل حساب عميل وتاجر في تاريخ؛ ومع تاريخ بداية أيضاً الرصيد الافتتاحي والدائن والمدين.",
   "pick a gl account": "الحساب الذي تريد كشفه."
  },
  "financetransaction": {
   "about": "القيود اليدوية: نقل الأموال بين حسابات الأستاذ العام (تسويات مع المزودين وتصحيحات). يُرحّل القيد عند موافقة المدقّق. حسابات العملاء تُصحَّح في تسويات الرصيد.",
   "journals": "كل القيود اليدوية وحالتها.",
   "settlement": "تسوية ما تدين به للمزودين أو يدينون به لك (الأموال المتنقلة، جهات الفواتير، البنوك).",
   "new journal": "قيد من سطور حسابات: كل سطر حساب ومدين أو دائن ومبلغ. يجب أن يساوي المدين الدائن. يوافق مدقّق.",
   "journal reference or narration": "ابحث بمرجع القيد أو كلمات من بيانه.",
   "currency": "عملة القيد؛ كل السطور بها.",
   "reference": "مرجعك، مثل رقم تسوية المزود.",
   "narration": "الغرض من القيد، ويظهر في كشف كل سطر."
  },
  "chartofaccounts": {
   "about": "حسابات الأستاذ العام للمؤسسة في مجموعاتها: الأصول والخصوم وحقوق الملكية والإيرادات والمصروفات.",
   "chart": "شجرة المجموعات والحسابات.",
   "waiting for approval": "تغييرات حسابات بانتظار مدقّق.",
   "uploads": "أدلة حسابات حُمّلت من ملف ونتيجتها.",
   "template": "ينزّل نموذج الملف لتعبئته قبل التحميل.",
   "upload": "يحمّل حسابات كثيرة دفعة واحدة من النموذج المعبأ. يوافق عليها مدقّق.",
   "add gl": "يضيف حساباً أو مجموعة تحت أصل. يوافق مدقّق.",
   "search name, gl code or account number": "ابحث باسم الحساب أو رمزه أو رقمه.",
   "show inactive": "يعرض أيضاً الحسابات الموقوفة.",
   "expand all": "يفتح كل المجموعات لترى كل الحسابات."
  },
  "notifications": {
   "about": "من يتلقى أي تنبيه: مجموعات المستلمين والتنبيهات المرسلة إليهم (بالبريد أو الرسائل القصيرة أو في البوابة).",
   "groups": "مجموعات أشخاص يتلقون التنبيهات معاً.",
   "alerts": "كل تنبيه: متى ينطلق وأي المجموعات تتلقاه.",
   "add group": "ينشئ مجموعة مستلمين. يوافق مدقّق."
  },
  "profile": {
   "about": "المؤسسات على المنصة: البنوك وشركات التقنية المالية ومزود الخدمة. لكل منها وحداتها وعملاتها وقنواتها وهويتها وبياناتها القانونية.",
   "new institution": "يبدأ مؤسسة جديدة: بياناتها ثم وحداتها وعملاتها وقنواتها وهويتها. يوافق مدقّق."
  },
  "modules": {
   "about": "الوحدات (EPURSE، المالية، MMS، InnoAML…) التي تستخدمها كل مؤسسة ومن متى إلى متى.",
   "add module": "يمنح مؤسسة وحدة لفترة. يوافق مدقّق.",
   "effective from": "تعمل الوحدة للمؤسسة اعتباراً من هذا التاريخ."
  },
  "currencies": {
   "about": "العملات التي تعمل بها كل مؤسسة. إحداها العملة الأساسية المستخدمة في التقارير والحدود.",
   "add currency": "يضيف عملة إلى مؤسسة. يوافق مدقّق.",
   "base currency": "العملة الرئيسية للمؤسسة: التقارير والحدود بها."
  },
  "channels": {
   "about": "القنوات التي تقدمها كل مؤسسة (الويب، التطبيق، USSD، نقاط البيع، الوكيل).",
   "add channel": "يفتح قناة لمؤسسة. يوافق مدقّق."
  },
  "phonecodes": {
   "about": "الدول التي يمكن للعملاء والتجار استخدام أرقام هواتفها. إحداها رئيسية: الرقم المكتوب بدون + يُقرأ كرقم منها.",
   "add phone code": "يسمح بأرقام دولة أخرى. يوافق مدقّق.",
   "primary": "الأرقام المكتوبة بدون رمز الدولة تُقرأ كأرقام من هذه الدولة."
  },
  "branding": {
   "about": "مظهر كل مؤسسة في كل بوابة: الاسم والشعار والألوان.",
   "add branding": "يحدد اسم مؤسسة وشعارها وألوانها لبوابة. يوافق مدقّق."
  },
  "legal": {
   "about": "البيانات القانونية والتنظيمية لكل مؤسسة: الاسم القانوني والتسجيل والترخيص.",
   "add legal profile": "يسجّل الاسم القانوني والتسجيل والترخيص لمؤسسة. يوافق مدقّق."
  },
  "documents": {
   "about": "الشروط والخصوصية ومستندات أخرى يراها العملاء والتجار ويقبلونها. كل نص لقناة ولغة.",
   "new document": "يضيف مستنداً: من يراه ونصوصه لكل لغة وهل يجب قبوله. يوافق مدقّق.",
   "acceptance": "ما إذا كان على العملاء قبول هذا المستند للمتابعة."
  },
  "passwordpolicy": {
   "about": "قواعد كلمات المرور لمستخدمي البوابة: الطول وما يجب أن تحتويه وعدد المحاولات الخاطئة قبل القفل وقواعد الجلسة.",
   "add policy": "يحدد قواعد كلمات المرور لمؤسسة. يوافق مدقّق.",
   "max retries": "عدد كلمات المرور الخاطئة المسموح قبل قفل الحساب."
  },
  "formbuilder": {
   "about": "مكتبة أسئلة التسجيل في مؤسستك. ضعها في أقسام ثم ابنِ نموذج كل نوع عميل من الأقسام.",
   "fields": "الأسئلة نفسها: النوع والصياغة والخيارات والتحقق.",
   "sections": "مجموعات أسئلة تُبنى منها النماذج.",
   "translations": "نصوص الأسئلة بكل لغة، مع قائمة بالناقص منها.",
   "add field": "يضيف سؤالاً: مفتاحه ونوعه (نص، قائمة، تاريخ…) وصياغته وهل هو إلزامي."
  },
  "kycschemes": {
   "about": "المخطط سلّم مرتب من مستويات اعرف عميلك (ما يجب أن يثبته العميل في كل مستوى وما يمكنه فعله بعدها). اعتمد المخطط قبل ربط نوع عميل به.",
   "add kyc scheme": "ينشئ سلّماً من مستويات اعرف عميلك. يوافق مدقّق."
  },
  "riskactions": {
   "about": "ما يؤدي إليه كل مستوى مخاطر، مثل التسجيل أو العناية الواجبة المعززة أو الرفض. تشير إعدادات المخاطر ومكافحة غسل الأموال بمستوياتها إلى هذه الإجراءات.",
   "add risk action": "يضيف إجراءً وأثره على التسجيل. يوافق مدقّق.",
   "onboarding outcome": "ما يحدث لعميل جديد تقع مخاطره على هذا الإجراء."
  },
  "bulkregistration": {
   "about": "سجّل أشخاصاً كثيرين كعملاء دفعة واحدة من ملف، مثل موظفي شركة. يعتمد مدقّق كل دفعة.",
   "new batch": "يحمّل ملف الأشخاص المراد تسجيلهم مع نوع العميل وبطاقة لكل منهم إن أردت. يوافق مدقّق على الدفعة.",
   "file name": "ابحث باسم الملف المحمّل."
  },
  "riskassessment": {
   "about": "مدى خطورة عميل من كل نوع، محسوبة من إجابات التسجيل. يزن كل إعداد معايير ويقسم الدرجة إلى مستويات مخاطر.",
   "add risk setup": "ينشئ إعداد مخاطر: المعايير ووزن كل منها والمستويات. يوافق مدقّق.",
   "criteria": "إجابات التسجيل التي تشكّل الدرجة.",
   "risk levels": "النطاقات التي تُقسم إليها الدرجة، ولكل منها إجراؤه."
  },
  "onboardingconfiguration": {
   "about": "كل نوع عميل سجل واحد: هويته ونموذجه ومخطط اعرف عميلك وحدوده وإعدادات المُنشئ والمدقّق.",
   "add onboarding configuration": "ينشئ نوع عميل وإعداد تسجيله. يوافق مدقّق."
  },
  "termdeposits": {
   "about": "الودائع لأجل المفتوحة للعملاء والتجار: الموافقة والفائدة والاستحقاق والكسر المبكر.",
   "open deposit": "يفتح وديعة: صاحبها ومنتجها ومبلغها ومدتها. يوافق مدقّق.",
   "deposit reference, account or holder": "ابحث بمرجع الوديعة أو الحساب أو اسم صاحبها."
  },
  "loanapplications": {
   "about": "طلبات القروض: قدّم الطلب نيابة عن المقترض، وسجّل قبوله والاستعلامات الائتمانية والضمانات، ثم وافق.",
   "new application": "يبدأ طلب قرض: المقترض والمنتج والمبلغ والمدة. يعرض العرض السعر وجدول السداد.",
   "application reference or applicant": "ابحث بمرجع الطلب أو اسم مقدّمه."
  },
  "accountproducts": {
   "about": "منتجات الحسابات التي يملكها العملاء والتجار (محافظ، ادخار، حسابات ودائع لأجل) وإعداداتها.",
   "add account product": "ينشئ منتج حساب وإعداداته. يوافق مدقّق."
  },
  "loanfacilities": {
   "about": "القروض نفسها: الصرف والسداد والتسوية المبكرة وإعادة الجدولة والشطب والتحصيل.",
   "loans": "كل القروض وأين تقف.",
   "portfolio quality": "وضع محفظة القروض: أيام التأخر وفئات المخاطر والمخصصات.",
   "move an officer's loans": "ينقل كل قروض موظف ائتمان إلى آخر.",
   "loan reference, account or borrower": "ابحث بمرجع القرض أو الحساب أو المقترض.",
   "days past due": "مدة تأخر أقدم قسط غير مدفوع.",
   "risk class": "فئة القرض حسب أيام التأخر، وتحدد مخصصه."
  },
  "depositproducts": {
   "about": "إعداد الوديعة لأجل لكل منتج حساب: السياسة والمدد والأسعار.",
   "new deposit product": "يُعدّ منتج وديعة: المدد والأسعار وقواعد الكسر المبكر. يوافق مدقّق."
  },
  "regulatorysubmissions": {
   "about": "تقارير محفظة القروض كما هي اليوم للجهة الرقابية ومكتب الائتمان. أرسلها ثم سجّل مرجع الجهة الرقابية.",
   "regulator reports": "التقارير للجهة الرقابية.",
   "credit bureau file": "الملف لمكتب الائتمان.",
   "generate report": "يعدّ تقريراً عن محفظة القروض كما هي الآن."
  },
  "lendingregulatoryprofile": {
   "about": "إعدادات الإقراض في مؤسستك: الترخيص والتقارير والاستعلامات الائتمانية وفئات المخاطر ومخصصاتها.",
   "provision %": "النسبة التي تُجنّب من القرض القائم في هذه الفئة كخسارة محتملة."
  },
  "borrowergroups": {
   "about": "مجموعات تضامنية مع موظف ائتمان وإيقاع اجتماعات. ما دام أي عضو متأخراً لا تحصل المجموعة على قروض جديدة.",
   "form a group": "ينشئ مجموعة: أعضاؤها وفرعها وموظف الائتمان والاجتماعات.",
   "group code or name": "ابحث برمز المجموعة أو اسمها."
  },
  "loanproducts": {
   "about": "كل منتج قرض بشروطه ونطاقات أسعاره ورسومه وسياساته. تسري التغييرات عند موافقة المدقّق.",
   "reference rates": "الأسعار المرجعية التي تتبعها القروض بسعر متغير. يعيد السعر الجديد تسعير القروض القائمة من تاريخه.",
   "new loan product": "يبني منتج قرض خطوة بخطوة: الشروط والأسعار والرسوم والأهلية والمستندات."
  },
  "glmapping": {
   "about": "إلى أي حساب يذهب كل قيد. تفوز القاعدة الأكثر تحديداً، ويأخذ الحساب الاحتياطي الباقي.",
   "rules": "قواعد الربط حسب نوع القيد.",
   "test": "جرّب قيداً وانظر إلى أي حساب سيذهب.",
   "unmapped": "قيود لم تجد قاعدة فذهبت إلى الحساب الاحتياطي.",
   "search by provider, type, gl or note": "ابحث في القواعد."
  },
  "corebankingsetup": {
   "about": "الفروع والموظفون وضريبة الاستقطاع والخسارة الائتمانية المتوقعة ومكتب الائتمان والسنة المالية: إعدادات الصيرفة الأساسية.",
   "accounting": "السنة المالية وحسابات النقد المستخدمة في قائمة التدفقات النقدية.",
   "head office": "فرع المقر الرئيسي."
  },
  "accountingperiods": {
   "about": "أغلق كل شهر بعد انتهائه وبالترتيب. إغلاق آخر شهر في السنة المالية ينقل أيضاً ربح السنة إلى حقوق الملكية."
  },
  "bins": {
   "about": "الأرقام الأولى من أرقام بطاقاتك على كل شبكة. تُنشأ منتجات البطاقات على BIN.",
   "new bin": "يضيف BIN على شبكة. يوافق مدقّق."
  },
  "cardnumberlayout": {
   "about": "كيف تُكوَّن أرقام البطاقات على كل BIN: الأجزاء بعد BIN والرقم التسلسلي ورقم التحقق.",
   "new layout": "يحدد كيف تُكوَّن الأرقام على BIN."
  },
  "cardorders": {
   "about": "طلبات إلى مكتب البطاقات: مخزون فارغ أو بطاقات مخصصة، تُطبع وتُستلم وتُفحص.",
   "new order": "يطلب بطاقات من المكتب لمجموعة إصدار."
  },
  "cardproducts": {
   "about": "بطاقات مسبقة الدفع وبطاقات خصم: BIN والعملة والمنتج الرقمي الذي تُباع ضمنه ورسومها وحدودها.",
   "new card product": "ينشئ منتج بطاقة. يوافق مدقّق."
  },
  "prefiles": {
   "about": "ملف طباعة (PRE) واحد لمكتب البطاقات من بطاقات مختارة عبر طلبات مجموعة إصدار.",
   "make pre file (all waiting)": "ينشئ ملف طباعة واحداً بكل البطاقات المنتظرة.",
   "files made": "ملفات الطباعة المنشأة."
  },
  "issuancegroups": {
   "about": "مخزون البطاقات المادية وطلباتها: الإعدادات الافتراضية وملف الطباعة المرسل إلى المكتب.",
   "new issuance group": "ينشئ مجموعة بمنتج البطاقة وإعداداتها الافتراضية."
  },
  "receivecards": {
   "about": "طلبات ذهب ملف طباعتها إلى المكتب: سجّل البطاقات التي عادت ثم يؤكدها مدقّق."
  },
  "cardstock": {
   "about": "بطاقات فورية في الخزنة أو لدى الموظفين، جاهزة لتسليمها للعملاء.",
   "card number or serial": "ابحث برقم البطاقة أو الرقم التسلسلي."
  },
  "cardrequests": {
   "about": "طلبات بطاقات مادية: تُقدّم لعميل وتُطلب وتُسلَّم.",
   "new card request": "يطلب بطاقة مادية لعميل."
  },
  "cards": {
   "about": "كل البطاقات: من يحملها وأين هي في الإنتاج وهل يمكن استخدامها.",
   "issue virtual card": "يصدر بطاقة افتراضية لعميل فوراً."
  },
  "atms": {
   "about": "أجهزة الصراف الآلي للبنك: كل منها يستمع على منفذه في المحوّل. مفاتيحها وأوامرها وأحداثها.",
   "ports": "منافذ المحوّل التي تتصل بها الأجهزة.",
   "downloads to all": "يرسل أحدث إعداد إلى كل الأجهزة.",
   "add atm": "يسجّل جهاز صراف ومنفذه."
  },
  "internalwatchlists": {
   "about": "قوائم المؤسسة الخاصة، مثل قائمة سوداء للبنك المركزي أو حالات احتيال لديها. بعد اعتمادها تفحصها كل عملية فحص.",
   "add watchlist": "يضيف قائمة من ملف. يوافق مدقّق."
  },
  "screenings": {
   "about": "كل فحوصات مكافحة غسل الأموال لعملاء المؤسسة. تُسجّل النتائج فقط ولا يُحظر شيء هنا.",
   "changes": "فحوصات تغيّرت نتيجتها منذ الفحص السابق.",
   "screened name": "ابحث بالاسم المفحوص."
  },
  "blacklist": {
   "about": "قائمة المؤسسة الخاصة بالأشخاص والشركات التي لا تتعامل معها، وتُفحص مع كل فحص.",
   "entries": "الأشخاص والشركات في القائمة.",
   "add entry": "يضيف شخصاً أو شركة. يوافق مدقّق."
  },
  "matchreview": {
   "about": "قرّر لكل تطابق إن كان إيجابياً كاذباً أو تطابقاً حقيقياً. يقترح المُنشئ ويؤكد مستخدم آخر.",
   "all reviews": "كل المراجعات المقترحة والمقررة.",
   "news": "تطابقات الأخبار السلبية."
  },
  "whitelist": {
   "about": "إيجابيات كاذبة معتمدة: عميل تمت تبرئته مقابل سجل مدرج، حتى لا يوقفه التطابق نفسه مجدداً حتى انتهاء الصلاحية.",
   "expiring within (days)": "يعرض فقط الإدخالات التي تنتهي خلال هذا العدد من الأيام."
  },
  "amlsetup": {
   "about": "كيف تُقرأ درجة الفحص: نطاقات الدرجات المرتبطة بإجراءات المخاطر والحد الأدنى لدرجة التطابق وإعادة الفحص المستمرة.",
   "add aml setup": "ينشئ إعداد مكافحة غسل الأموال. يوافق مدقّق."
  },
  "flags": {
   "about": "عملاء ساءت نتيجة مكافحة غسل الأموال لديهم عند إعادة الفحص. افتح حالة أو تجاهل كل منهم.",
   "blacklist match": "فقط التنبيهات الناتجة عن تطابق في القائمة السوداء."
  },
  "amlcases": {
   "about": "عملاء نشطون تحتاج نتيجة مكافحة غسل الأموال لديهم إلى شخص: تواصل معهم ثم أغلق كمبرأ أو مؤكد أو بلا إجراء. يؤكد مستخدم آخر."
  },
  "namelookup": {
   "about": "افحص اسماً ليس عميلاً، مثل مستفيد دفعة. يُحفظ كل استعلام مع سببه.",
   "screen name": "يشغّل الفحص للاسم المدخل.",
   "lists": "قوائم العقوبات والمراقبة.",
   "adverse media": "أخبار عن الاسم."
  },
  "transactionmonitoring": {
   "about": "قواعد تراقب المعاملات عند ترحيلها، والتنبيهات التي تطلقها.",
   "alerts": "تنبيهات أطلقتها القواعد. افتح واحداً لترى المعاملات وراءه.",
   "rules": "القواعد: ما تراقبه وحدودها.",
   "run scan now": "يفحص أحدث المعاملات مقابل القواعد الآن."
  },
  "regulatoryreports": {
   "about": "تقارير المعاملات المشبوهة (STR) وتقارير المعاملات النقدية (CTR) للجهة الرقابية.",
   "suspicious transactions (str)": "تقارير نشاط مشتبه به. يوافق مسؤول آخر قبل الإيداع.",
   "currency transactions (ctr)": "نقد عند الحد أو فوقه، يُعد كل ليلة.",
   "new report": "يكتب تقرير معاملة مشبوهة."
  },
  "reconlayouts": {
   "about": "تنسيقات ملفات المطابقة بصيغة JSON. ابدأ من تنسيق جاهز وعدّله؛ ينتظر التغيير الموافقة.",
   "add layout": "ينشئ تنسيق ملف."
  },
  "reconsources": {
   "about": "مصادر ملفات المطابقة: تنسيق ملف كل مصدر ونمط الاسم والاستلام عبر SFTP.",
   "sources": "المصادر.",
   "sftp profiles": "اتصالات تُستخدم لاستلام الملفات.",
   "currency decimals": "عدد الخانات العشرية لكل عملة في الملفات.",
   "add source": "يضيف مصدر ملفات."
  },
  "reconfiles": {
   "about": "ملفات وردت من كل مصدر (محمّلة أو مستلمة عبر SFTP أو مولّدة من الدفتر) وكيف قُرئت.",
   "generate switch file": "ينشئ ملفاً من الدفتر للمطابقة معه.",
   "upload file": "يحمّل ملفاً لمصدر."
  },
  "reconsets": {
   "about": "ما يُطابق مع ماذا: القواعد وتشغيلاتها ونتائجها والموافقات على التغييرات.",
   "sets": "مجموعات المطابقة.",
   "approvals": "تغييرات بانتظار الموافقة.",
   "add set": "ينشئ مجموعة مطابقة."
  },
  "externalproviders": {
   "about": "إلى أين يرسل العملاء الأموال: المحافظ المتنقلة والبنوك ومشغلو الشحن والكهرباء المسبقة الدفع وجهات الفواتير.",
   "set up providers": "يختار المزودين الذين تقدمهم المؤسسة وإعداداتهم."
  },
  "feeschedules": {
   "about": "جدول لكل عملة: الرسوم التي يدفعها كل نوع معاملة حسب القناة والمنتج والمبلغ.",
   "new fee schedule": "ينشئ جدول رسوم. يوافق مدقّق."
  },
  "limits": {
   "about": "تحدد مجموعات الحدود ما يمكن للعملاء والتجار التعامل به. كل شخص في مجموعة واحدة.",
   "limits and usage": "حدود العميل وما استخدمه منها.",
   "test a customer": "يتحقق مما إذا كانت معاملة مسموحة لعميل.",
   "add limit group": "ينشئ مجموعة حدود. يوافق مدقّق."
  },
  "digitalproducts": {
   "about": "تجمع المنتجات الرقمية ما يحصل عليه العميل: منتجات الحسابات والبطاقات والقنوات والأمان.",
   "add digital product": "ينشئ منتجاً رقمياً. يوافق مدقّق."
  },
  "scheduledjobs": {
   "about": "المهام اليومية للمنصة لكل المؤسسات (الفوائد والرسوم وإعادة الفحص…). لا ينفذ التشغيل إلا ما لم يُنجز بعد، لذا فإعادته آمنة.",
   "switched on": "ما إذا كانت المهمة تعمل في موعدها.",
   "runs": "كل تشغيل للمهمة ونتيجته."
  },
  "transactionrouting": {
   "about": "إلى أين تذهب كل معاملة: أي اتصال يقدم الخدمة وكيف تُعالج بطاقات البنوك الأخرى.",
   "setups": "توجيه كل مؤسسة.",
   "health": "ما إذا كان كل اتصال يعمل.",
   "simulator": "جرّب معاملة وانظر إلى أين ستذهب.",
   "decisions": "قرارات التوجيه الأخيرة وأسبابها.",
   "set up routing": "يختار اتصالات مؤسسة."
  },
  "expiryrules": {
   "about": "متى يُنبَّه قبل انتهاء مستند أو ترخيص، ومتى يُذكَّر، وكم تستمر المهلة بعده، وماذا يحدث حينها.",
   "hold money going out": "بعد المهلة، يحظر المدفوعات الصادرة حتى التجديد.",
   "tell the customer": "يرسل تذكيرات للعميل.",
   "email staff": "يرسل بريداً إلى موظفي المؤسسة.",
   "stop the module": "يوقف الوحدة عند انتهاء الترخيص.",
   "messages only": "يرسل تذكيرات فقط ولا يحظر شيئاً."
  },
  "reportbuilder": {
   "about": "ابنِ تقريراً: اختر مصدره وأعمدته وعوامل تصفيته وترتيبه ومجاميعه، ثم عاينه واحفظه ليشغّله الآخرون.",
   "save report": "يحفظ التقرير لتشغّله أنت والآخرون مجدداً.",
   "add a column…": "يضيف عموداً إلى التقرير.",
   "add filter": "يقصر الصفوف على المطابقة.",
   "add group": "يجمّع الصفوف مع مجاميع فرعية.",
   "add sort": "يرتّب الصفوف.",
   "run": "يعرض التقرير بالإعدادات الحالية."
  },
  "savedreports": {
   "about": "التقارير التي حفظتها والتي شوركت معك. افتح واحداً لتشغيله وتنزيله.",
   "report name": "ابحث باسم التقرير."
  },
  "kycreport": {
   "about": "اختر عميلاً أو تاجراً لترى كل ما يخصه في صفحة واحدة.",
   "search by name, phone or email": "ابحث عن العميل أو التاجر."
  },
  "riskscorebreakdown": {
   "about": "تقييمات مخاطر العملاء وكيف تم التوصل إلى كل درجة بالضبط.",
   "current assessment only": "أحدث تقييم لكل عميل فقط.",
   "all assessments": "كل التقييمات بما فيها القديمة."
  },
  "amlscorebreakdown": {
   "about": "فحوصات مكافحة غسل الأموال للعملاء وكيف تم التوصل إلى كل درجة بالضبط.",
   "current screening only": "أحدث فحص لكل عميل فقط.",
   "all screenings": "كل الفحوصات بما فيها القديمة."
  },
  "useractivity": {
   "about": "كل ما فعله مستخدم واحد في مسار المُنشئ والمدقّق خلال فترة: كمُنشئ أو كمدقّق أو كليهما.",
   "select a user": "المستخدم الذي تريد نشاطه."
  },
  "expiringdocuments": {
   "about": "مستندات العملاء والتجار حسب قربها من الانتهاء، وما اتُخذ بشأن كل منها.",
   "expiring within (days)": "فقط المستندات التي تنتهي خلال هذا العدد من الأيام."
  }
 }
};
