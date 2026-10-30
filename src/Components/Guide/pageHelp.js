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
    "settings": "This page's settings: how it works for your institution."
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
  }
};
