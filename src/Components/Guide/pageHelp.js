// Written help for the Guide, per page (keyed by the page's last path
// segment without dashes: /mms/terminals -> "terminals") and per control
// (keyed by its label, lower case). "about" introduces the page; "_common"
// covers controls many pages share. English for now; a page or control
// without an entry falls back to the general explanation.
export const PAGE_HELP = {
  "_common": {
    "more": "More statuses that don't fit in the row of tabs, such as Rejected or Deleted. Pick one to see only those records.",
    "more filters": "Opens extra filters: dates, who made the change, institution and others. The number on the button shows how many are on.",
    "newest first": "The order of the list: most recently changed first, or oldest first. It sorts every record, not only this page.",
    "view all": "Opens the whole list in one large window you can search, without paging.",
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
    "history": "Every earlier version and who changed it."
  },
  "terminals": {
    "about": "Every POS terminal the bank has registered and handed to merchants. A merchant places each terminal in one of their stores; the status shows whether it can take payments.",
    "pos idle timeout": "How long a terminal session may sit idle before the cashier must sign in again, for this institution's merchants. A merchant can set a shorter time for their own stores, never a longer one.",
    "add terminal": "Registers a new terminal: its TID, serial number, type and model. It's assigned to a merchant here; the merchant then places it in a store. A checker approves it first.",
    "terminal id, store or merchant": "Search by the terminal's TID, the store it's in or the merchant who owns it.",
    "block requested": "Shows only terminals a merchant has asked to block (lost, stolen or broken). Open one to approve or refuse the block.",
    "last seen": "When the terminal last talked to the platform. A terminal not seen for days may be switched off or lost."
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
    "profile": "What this user may do: the profile lists the menus they see and the actions (add, edit, approve...) allowed on each."
  },
  "profiles": {
    "about": "Profiles are sets of permissions: which menus a user sees and which actions (add, edit, approve...) they may take on each. Users get one profile each.",
    "new profile": "Creates a profile: name it, pick its institution, then tick the menus and actions it allows. A checker approves it; the approve dialog shows every permission it will have."
  },
  "userkyc": {
    "about": "The identity details of the institution's staff users: employee ID, contact details and documents.",
    "add kyc": "Records a staff user's identity details. A checker approves them."
  },
  "approvalpolicies": {
    "about": "Who must approve what. A policy sets, for one menu and action (say, Users > Edit), how many approval levels a change needs and who may approve at each level. Without a policy, one checker approves.",
    "report": "Every menu and action and the policy that applies to it, so you can see which changes need more than one approval.",
    "add policy": "Creates a policy: the menu, the action, then each level's approvers (anyone, a profile or named users) and how many must approve.",
    "levels": "How many approval levels a change goes through, one after another."
  },
  "approvaldelegations": {
    "about": "Handing your approvals to someone else for a period (holiday, sick leave), and naming each user's supervisor.",
    "delegations": "Approvals handed from one user to another for a period.",
    "supervisors": "Each user's supervisor, who can approve when an approval level says \"the maker's supervisor\".",
    "add delegation": "Hands one user's approvals to another from a start to an end date, with a reason. A checker approves it.",
    "in force": "Whether the delegation applies right now (today is within its period and it's approved)."
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
    "dispute": "The dispute this adjustment settles, if any. Click to open the case."
  },
  "disputes": {
    "about": "Customer cases about one transaction (\"my airtime never arrived\"). Settle one with a balance adjustment, or close it as resolved or rejected.",
    "raise dispute": "Opens a dispute for a customer who called or came in: the transaction's RRN, a title and what happened.",
    "case number or customer": "Search by the case number, the customer's name, or a transaction's exact RRN.",
    "rrn": "The disputed transaction. Click to open it."
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
    "journal reference or narration": "Search by the journal's reference or words of its narration."
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
    "about": "Title: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add title": "Adds an entry to the Title list: its code and name. A checker approves it before forms offer it."
  },
  "addresstype": {
    "about": "Address Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add address type": "Adds an entry to the Address Type list: its code and name. A checker approves it before forms offer it.",
    "individual": "The entries used for individual customers and merchants.",
    "corporate": "The entries used for companies."
  },
  "documenttype": {
    "about": "Document Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add document type": "Adds an entry to the Document Type list: its code and name. A checker approves it before forms offer it.",
    "individual": "The entries used for individual customers and merchants.",
    "corporate": "The entries used for companies."
  },
  "occupation": {
    "about": "Occupation: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add occupation": "Adds an entry to the Occupation list: its code and name. A checker approves it before forms offer it."
  },
  "ownershipsubtype": {
    "about": "Ownership Sub Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add ownership sub type": "Adds an entry to the Ownership Sub Type list: its code and name. A checker approves it before forms offer it."
  },
  "taxtype": {
    "about": "Tax Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add tax type": "Adds an entry to the Tax Type list: its code and name. A checker approves it before forms offer it."
  },
  "bank": {
    "about": "Bank: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add bank": "Adds an entry to the Bank list: its code and name. A checker approves it before forms offer it."
  },
  "gender": {
    "about": "Gender: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add gender": "Adds an entry to the Gender list: its code and name. A checker approves it before forms offer it."
  },
  "province": {
    "about": "Province: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add province": "Adds an entry to the Province list: its code and name. A checker approves it before forms offer it."
  },
  "identificationtype": {
    "about": "Identification Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add identification type": "Adds an entry to the Identification Type list: its code and name. A checker approves it before forms offer it."
  },
  "designation": {
    "about": "Designation: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add designation": "Adds an entry to the Designation list: its code and name. A checker approves it before forms offer it."
  },
  "companytype": {
    "about": "Company Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add company type": "Adds an entry to the Company Type list: its code and name. A checker approves it before forms offer it."
  },
  "taxclassification": {
    "about": "Tax Classification: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add tax classification": "Adds an entry to the Tax Classification list: its code and name. A checker approves it before forms offer it."
  },
  "bankbranch": {
    "about": "Bank Branch: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add bank branch": "Adds an entry to the Bank Branch list: its code and name. A checker approves it before forms offer it."
  },
  "maritalstatus": {
    "about": "Marital Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add marital status": "Adds an entry to the Marital Status list: its code and name. A checker approves it before forms offer it."
  },
  "district": {
    "about": "District: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add district": "Adds an entry to the District list: its code and name. A checker approves it before forms offer it."
  },
  "immigrationstatus": {
    "about": "Immigration Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add immigration status": "Adds an entry to the Immigration Status list: its code and name. A checker approves it before forms offer it."
  },
  "employment": {
    "about": "Employment: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add employment": "Adds an entry to the Employment list: its code and name. A checker approves it before forms offer it."
  },
  "businessnature": {
    "about": "Business Nature: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add business nature": "Adds an entry to the Business Nature list: its code and name. A checker approves it before forms offer it.",
    "individual": "The entries used for individual customers and merchants.",
    "corporate": "The entries used for companies."
  },
  "taxstatus": {
    "about": "Tax Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add tax status": "Adds an entry to the Tax Status list: its code and name. A checker approves it before forms offer it."
  },
  "religion": {
    "about": "Religion: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add religion": "Adds an entry to the Religion list: its code and name. A checker approves it before forms offer it."
  },
  "village": {
    "about": "Village: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add village": "Adds an entry to the Village list: its code and name. A checker approves it before forms offer it."
  },
  "visatype": {
    "about": "Visa Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add visa type": "Adds an entry to the Visa Type list: its code and name. A checker approves it before forms offer it."
  },
  "annualincomerange": {
    "about": "Annual Income Range: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add annual income range": "Adds an entry to the Annual Income Range list: its code and name. A checker approves it before forms offer it."
  },
  "industrysector": {
    "about": "Industry Sector: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add industry sector": "Adds an entry to the Industry Sector list: its code and name. A checker approves it before forms offer it."
  },
  "gstregistrationstatus": {
    "about": "GST Registration Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add gst registration status": "Adds an entry to the GST Registration Status list: its code and name. A checker approves it before forms offer it."
  },
  "disability": {
    "about": "Disability: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add disability": "Adds an entry to the Disability list: its code and name. A checker approves it before forms offer it."
  },
  "verificationmethod": {
    "about": "Verification Method: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add verification method": "Adds an entry to the Verification Method list: its code and name. A checker approves it before forms offer it."
  },
  "monthlyincomerange": {
    "about": "Monthly Income Range: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add monthly income range": "Adds an entry to the Monthly Income Range list: its code and name. A checker approves it before forms offer it."
  },
  "taxexemptionstatus": {
    "about": "Tax Exemption Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add tax exemption status": "Adds an entry to the Tax Exemption Status list: its code and name. A checker approves it before forms offer it."
  },
  "kinship": {
    "about": "Kinship: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add kinship": "Adds an entry to the Kinship list: its code and name. A checker approves it before forms offer it."
  },
  "verificationstatus": {
    "about": "Verification Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add verification status": "Adds an entry to the Verification Status list: its code and name. A checker approves it before forms offer it."
  },
  "networthrange": {
    "about": "Net Worth Range: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add net worth range": "Adds an entry to the Net Worth Range list: its code and name. A checker approves it before forms offer it."
  },
  "pepcategory": {
    "about": "PEP Category: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add pep category": "Adds an entry to the PEP Category list: its code and name. A checker approves it before forms offer it."
  },
  "relationshiptype": {
    "about": "Relationship Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add relationship type": "Adds an entry to the Relationship Type list: its code and name. A checker approves it before forms offer it.",
    "individual": "The entries used for individual customers and merchants.",
    "corporate": "The entries used for companies."
  },
  "validationrule": {
    "about": "Validation Rule: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add validation rule": "Adds an entry to the Validation Rule list: its code and name. A checker approves it before forms offer it."
  },
  "turnoverrange": {
    "about": "Turnover Range: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add turnover range": "Adds an entry to the Turnover Range list: its code and name. A checker approves it before forms offer it."
  },
  "pepstatus": {
    "about": "PEP Status: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add pep status": "Adds an entry to the PEP Status list: its code and name. A checker approves it before forms offer it."
  },
  "qualification": {
    "about": "Qualification: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add qualification": "Adds an entry to the Qualification list: its code and name. A checker approves it before forms offer it."
  },
  "sourceoffund": {
    "about": "Source of Fund: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add source": "Adds an entry to the Source of Fund list: its code and name. A checker approves it before forms offer it."
  },
  "screeningtype": {
    "about": "Screening Type: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add screening type": "Adds an entry to the Screening Type list: its code and name. A checker approves it before forms offer it."
  },
  "accountpurpose": {
    "about": "Account Purpose: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add purpose": "Adds an entry to the Account Purpose list: its code and name. A checker approves it before forms offer it."
  },
  "merchantcategory": {
    "about": "Merchant Category: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add merchant category": "Adds an entry to the Merchant Category list: its code and name. A checker approves it before forms offer it."
  },
  "merchantgroup": {
    "about": "Merchant Group: one of the lists the onboarding forms and records choose from. Each institution keeps its own entries; a new or changed entry is offered once a checker approves it.",
    "add merchant group": "Adds an entry to the Merchant Group list: its code and name. A checker approves it before forms offer it."
  }
};
