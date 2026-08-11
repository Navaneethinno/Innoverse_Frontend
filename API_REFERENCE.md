# Innoverse Backend — API Reference

**Base URL:** `http://localhost:8000`  
**Auth:** All endpoints except `/auth/login` require a Bearer token in the `Authorization` header.  
**Response envelope:** Every response follows this shape:

```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

---

## Authentication

### POST `/auth/login`
Login with username and password. Returns a JWT token and user context.

**Permission required:** None (public)

**Request body:**
```json
{
  "username": "platform_admin",
  "password": "admin123"
}
```

**Response `data`:**
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "platform_admin",
    "institution": {
      "id": 1,
      "name": "Platform Owner",
      "type": "PLATFORM_OWNER"
    },
    "profile": {
      "id": 1,
      "name": "Super Admin"
    }
  }
}
```

> Store `access_token` and send it as `Authorization: Bearer <token>` on every subsequent request.  
> `institution.type` will be either `PLATFORM_OWNER` or `PLATFORM_USER` — use this to conditionally show admin-only UI sections.

---

## Users

### GET `/users`
List all users belonging to the logged-in user's institution.

**Permission required:** `USERS / VIEW`

**Response `data`:** array of user objects
```json
[
  {
    "id": 1,
    "username": "platform_admin",
    "institution": { "id": 1, "name": "Platform Owner" },
    "profile": { "id": 1, "name": "Super Admin" },
    "status": "ACTIVE"
  }
]
```

---

### POST `/users`
Create a new user under the logged-in user's institution.

**Permission required:** `USERS / ADD`

**Request body:**
```json
{
  "username": "new_user",
  "password": "secret123",
  "profile_id": 1
}
```

> `profile_id` must belong to the same institution as the logged-in user.

**Response `data`:** the created user object (same shape as list item above)

---

## Profiles

### GET `/profiles`
List all profiles for the logged-in user's institution.

**Permission required:** `PROFILES / VIEW`

**Response `data`:** array of profile objects
```json
[
  {
    "id": 1,
    "code": "SUPER_ADMIN",
    "name": "Super Admin",
    "institution": { "id": 1, "name": "Platform Owner" },
    "status": "ACTIVE"
  }
]
```

---

### GET `/profiles/{profile_id}`
Get a single profile by ID, including its institution.

**Permission required:** `PROFILES / VIEW`

**Path param:** `profile_id` — integer

**Response `data`:** single profile object (same shape as list item above)

---

### POST `/profiles`
Create a new profile for an institution.

**Permission required:** `PROFILES / ADD`

**Request body:**
```json
{
  "code": "OPS",
  "name": "Operations",
  "institution_id": 1
}
```

> `PLATFORM_USER` institutions can only create profiles for their own `institution_id`.  
> `code` must be unique per institution.

**Response `data`:** the created profile object

---

### POST `/profiles/{profile_id}/permissions`
Replace all permissions for a profile. This is a full replace — send the complete desired permission set every time.

**Permission required:** `PROFILES / ADD`

**Path param:** `profile_id` — integer

**Request body:**
```json
{
  "permissions": [
    { "menu_code": "USERS",        "action_code": "VIEW" },
    { "menu_code": "USERS",        "action_code": "ADD" },
    { "menu_code": "PROFILES",     "action_code": "VIEW" },
    { "menu_code": "PROFILES",     "action_code": "ADD" },
    { "menu_code": "INSTITUTIONS", "action_code": "VIEW" },
    { "menu_code": "INSTITUTIONS", "action_code": "ADD" },
    { "menu_code": "INSTITUTIONS", "action_code": "AUTHORIZE" },
    { "menu_code": "APPLICATIONS", "action_code": "VIEW" },
    { "menu_code": "APPLICATIONS", "action_code": "ADD" },
    { "menu_code": "KYC",          "action_code": "VIEW" },
    { "menu_code": "KYC",          "action_code": "ADD" }
  ]
}
```

**Available `menu_code` / `action_code` combinations:**

| menu_code | action_code | What it gates |
|---|---|---|
| `USERS` | `VIEW` | List users |
| `USERS` | `ADD` | Create user |
| `PROFILES` | `VIEW` | List / get profiles |
| `PROFILES` | `ADD` | Create profile, update permissions |
| `INSTITUTIONS` | `VIEW` | List / get institutions |
| `INSTITUTIONS` | `ADD` | Submit institution for review |
| `INSTITUTIONS` | `AUTHORIZE` | Approve / reject institutions, view pending |
| `APPLICATIONS` | `VIEW` | List applications |
| `APPLICATIONS` | `ADD` | Create application, assign to institution |
| `KYC` | `VIEW` | Get institution or user KYC |
| `KYC` | `ADD` | Save institution or user KYC |

**Response `data`:**
```json
{ "profile_id": 1, "permissions_count": 11 }
```

---

## Institutions

### GET `/institutions`
List all approved institutions.

**Permission required:** `INSTITUTIONS / VIEW`

**Response `data`:** array of institution objects
```json
[
  {
    "id": 1,
    "code": "PLATFORM",
    "name": "Platform Owner",
    "type": "PLATFORM_OWNER",
    "status": "ACTIVE",
    "auth_status": "APPROVED",
    "created_by": null,
    "approved_by": null
  }
]
```

---

### GET `/institutions/pending`
List pending institution onboarding requests that the current user is eligible to act on. Requests created by the current user are excluded — a maker cannot review their own submission.

**Permission required:** `INSTITUTIONS / AUTHORIZE`  
**Restriction:** Only accessible by `PLATFORM_OWNER` institution users.

**Response `data`:** array of pending institution objects the caller can approve or reject
```json
[
  {
    "id": 1,
    "code": "NEWBANK",
    "name": "New Bank Ltd",
    "type": "PLATFORM_USER",
    "auth_status": "PENDING",
    "created_by": { "id": 1, "name": "admin1" },
    "reviewed_by": null,
    "kyc": {
      "legal_name": "New Bank Limited",
      "registration_number": "REG-001",
      "tax_id": "TAX-001",
      "email": "admin@newbank.com",
      "phone": "+91-9000000001",
      "website": "https://newbank.com",
      "address_line1": "1 Finance St",
      "address_line2": null,
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "postal_code": "400001",
      "id": 0,
      "institution_id": 0,
      "kyc_status": null
    }
  }
]

> `kyc` is `null` if no KYC data was submitted with the request.

---

### GET `/institutions/{institution_id}`
Get a single approved institution by ID.

**Permission required:** `INSTITUTIONS / VIEW`

**Path param:** `institution_id` — integer

**Response `data`:** single institution object (same shape as list item above)

---

### POST `/institutions`
Submit a complete institution onboarding request including KYC. Creates a pending record — does **not** immediately approve.

**Permission required:** `INSTITUTIONS / ADD`  
**Restriction:** Only `PLATFORM_OWNER` users can submit institutions.

**Request body:**
```json
{
  "code": "NEWBANK",
  "name": "New Bank Ltd",
  "type": "PLATFORM_USER",
  "kyc": {
    "legal_name": "New Bank Limited",
    "registration_number": "REG-001",
    "tax_id": "TAX-001",
    "email": "admin@newbank.com",
    "phone": "+91-9000000001",
    "website": "https://newbank.com",
    "address_line1": "1 Finance St",
    "address_line2": null,
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postal_code": "400001"
  }
}
```

> `type` defaults to `PLATFORM_USER`. Institutions created via the API are always `PLATFORM_USER`. `PLATFORM_OWNER` is seeded manually and never created through this endpoint.  
> `code` must be globally unique — rejected if it already exists in approved or pending records.  
> All `kyc` fields are optional individually, but the `kyc` object itself is required.

**Response `data`:** the pending institution object including the submitted KYC
```json
{
  "id": 1,
  "code": "NEWBANK",
  "name": "New Bank Ltd",
  "type": "PLATFORM_USER",
  "auth_status": "PENDING",
  "created_by": { "id": 1, "name": "admin1" },
  "reviewed_by": null,
  "kyc": {
    "legal_name": "New Bank Limited",
    "registration_number": "REG-001",
    "tax_id": "TAX-001",
    "email": "admin@newbank.com",
    "phone": "+91-9000000001",
    "website": "https://newbank.com",
    "address_line1": "1 Finance St",
    "address_line2": null,
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postal_code": "400001",
    "id": 0,
    "institution_id": 0,
    "kyc_status": null
  }
}

---

### POST `/institutions/{pending_id}/approve`
Approve a pending institution. Atomically moves it from `institution_pending` to `institution` and persists the associated KYC record.

**Permission required:** `INSTITUTIONS / AUTHORIZE`  
**Restriction:** Only `PLATFORM_OWNER` users. The user who submitted the request cannot approve it (maker-checker enforced server-side).

**Path param:** `pending_id` — the ID from the pending list

**No request body.**

**Response `data`:** the approved institution object
```json
{
  "id": 2,
  "code": "NEWBANK",
  "name": "New Bank Ltd",
  "type": "PLATFORM_USER",
  "status": "ACTIVE",
  "auth_status": "APPROVED",
  "created_by": { "id": 1, "name": "admin1" },
  "approved_by": { "id": 2, "name": "admin2" }
}
```

> After approval, `GET /institutions/{institution_id}/kyc` will return the KYC data that was submitted at creation time.

---

### POST `/institutions/{pending_id}/reject`
Reject a pending institution. Does not create an approved institution record.

**Permission required:** `INSTITUTIONS / AUTHORIZE`  
**Restriction:** Only `PLATFORM_OWNER` users. The user who submitted the request cannot reject it (same maker-checker rule as approve).

**Path param:** `pending_id` — the ID from the pending list

**No request body.**

**Response `data`:** the updated pending institution object with `auth_status: "REJECTED"`

---

## Applications

### GET `/applications`
List all applications.

**Permission required:** `APPLICATIONS / VIEW`

**Response `data`:** array of application objects
```json
[
  {
    "id": 1,
    "code": "INNOVERSE",
    "name": "Innoverse",
    "status": "ACTIVE"
  }
]
```

---

### POST `/applications`
Create a new application.

**Permission required:** `APPLICATIONS / ADD`

**Request body:**
```json
{
  "code": "RECON",
  "name": "Reconciliation System"
}
```

> `code` must be globally unique.

**Response `data`:** the created application object

---

### POST `/institutions/{institution_id}/assign-application`
Assign an existing application to an institution.

**Permission required:** `APPLICATIONS / ADD`

**Path param:** `institution_id` — integer

**Request body:**
```json
{
  "application_id": 1
}
```

**Response `data`:** confirmation object

---

## KYC

### GET `/institutions/{institution_id}/kyc`
Get KYC details for an institution.

**Permission required:** `KYC / VIEW`

**Path param:** `institution_id` — integer

**Response `data`:**
```json
{
  "id": 1,
  "institution_id": 1,
  "legal_name": "Platform Owner Pvt Ltd",
  "registration_number": "REG123",
  "tax_id": "TAX456",
  "email": "contact@platform.com",
  "phone": "+91-9999999999",
  "website": "https://platform.com",
  "address_line1": "123 Main St",
  "address_line2": null,
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "postal_code": "560001",
  "kyc_status": "PENDING"
}
```

> `kyc_status` values: `PENDING`, `VERIFIED`, `REJECTED`

---

### POST `/institutions/{institution_id}/kyc`
Update KYC for an already-approved institution (upsert). Not required for initial onboarding — KYC is submitted as part of `POST /institutions` and is automatically persisted on approval.

**Permission required:** `KYC / ADD`

**Path param:** `institution_id` — the ID of an **approved** institution

**Request body:** all fields optional
```json
{
  "legal_name": "Platform Owner Pvt Ltd",
  "registration_number": "REG123",
  "tax_id": "TAX456",
  "email": "contact@platform.com",
  "phone": "+91-9999999999",
  "website": "https://platform.com",
  "address_line1": "123 Main St",
  "address_line2": null,
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "postal_code": "560001"
}
```

**Response `data`:** the saved KYC object

---

### GET `/users/{user_id}/kyc`
Get KYC details for a user.

**Permission required:** `KYC / VIEW`

**Path param:** `user_id` — integer

**Response `data`:**
```json
{
  "id": 1,
  "user_id": 1,
  "full_name": "John Doe",
  "date_of_birth": "1990-01-15",
  "email": "john@example.com",
  "phone": "+91-9999999999",
  "id_type": "Aadhaar",
  "id_number": "1234-5678-9012",
  "address_line1": "123 Main St",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "postal_code": "560001",
  "kyc_status": "PENDING"
}
```

---

### POST `/users/{user_id}/kyc`
Create or update KYC for a user (upsert).

**Permission required:** `KYC / ADD`

**Path param:** `user_id` — integer

**Request body:** all fields optional
```json
{
  "full_name": "John Doe",
  "date_of_birth": "1990-01-15",
  "email": "john@example.com",
  "phone": "+91-9999999999",
  "id_type": "Aadhaar",
  "id_number": "1234-5678-9012",
  "address_line1": "123 Main St",
  "city": "Bangalore",
  "state": "Karnataka",
  "country": "India",
  "postal_code": "560001"
}
```

**Response `data`:** the saved KYC object

---

## Error Responses

| HTTP Status | When |
|---|---|
| `401 Unauthorized` | Missing/invalid/expired token, wrong credentials |
| `403 Forbidden` | Valid token but missing permission, or wrong institution type |
| `404 Not Found` | Resource does not exist |
| `400 Bad Request` | Validation error, duplicate code, business rule violation |

**Error body shape:**
```json
{
  "success": false,
  "message": "Permission denied",
  "data": null
}
```

---

## Notes for Frontend

- **Token storage:** Store the JWT in memory or `httpOnly` cookie. Avoid `localStorage` for sensitive apps.
- **Institution type gating:** After login, check `user.institution.type`. Hide institution approval UI for `PLATFORM_USER` accounts.
- **Permission-based UI:** The backend enforces permissions on every request. Mirror this on the frontend by checking which menu/action combinations the user's profile has before rendering buttons/routes.
- **Pending vs approved institutions:** `POST /institutions` creates a *pending* record. The approved list (`GET /institutions`) only shows fully approved ones. Use `GET /institutions/pending` to build the approval queue UI.
- **KYC upsert:** `POST /institutions/{institution_id}/kyc` and `POST /users/{user_id}/kyc` are both upserts — safe to call for both create and update.
- **Institution KYC on creation:** KYC is submitted as part of `POST /institutions` inside the `kyc` object. A separate KYC call is not needed for initial onboarding. `POST /institutions/{institution_id}/kyc` is only needed for subsequent KYC updates after approval.
- **Maker-checker:** The user who submits `POST /institutions` cannot approve or reject it. A different `PLATFORM_OWNER` user must call approve/reject. `GET /institutions/pending` already filters out the caller's own submissions server-side — the frontend does not need to hide them manually.
- **Sequence for onboarding a new institution:**
  1. `POST /institutions` (with nested `kyc`) → creates pending record with KYC attached
  2. `GET /institutions/pending` → reviewer sees the request including KYC details
  3. `POST /institutions/{pending_id}/approve` → different user approves; institution + KYC created atomically
  4. `POST /profiles` → create a profile for the new institution
  5. `POST /profiles/{profile_id}/permissions` → assign permissions to the profile
  6. `POST /users` → create users under that institution