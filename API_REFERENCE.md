# API Reference

Definitive frontend contract for the current backend code in this repository.

This document is based on the actual routes, schemas, repositories, services, and response models in the backend. It does not invent endpoints or fields that are not present in code.

## Base URL

- Local development: `http://127.0.0.1:8000`

## Authentication

- All non-`/auth/login` routes require `Authorization: Bearer <access_token>`.
- The token must contain `user_id`, `institution_id`, `institution_type`, and `profile_id`.
- The backend validates that the token subject still exists and matches the current user/institution/profile relationship.
- A request is also rejected if there is no current request context or missing institution context.

## Common Response Envelope

All responses use:

```json
{
  "success": true,
  "message": "string",
  "data": null
}
```

## Shared Schemas and Fields

### `CheckerAssignmentIn`

Used in create payloads that support maker-checker assignment.

```json
{
  "user_id": 6,
  "sequence": 1
}
```

- `user_id` is required.
- `sequence` is optional for `ANY` and `ASSIGNED_PARALLEL`.
- `sequence` is required logically for `ASSIGNED_SEQUENTIAL`; if omitted, the backend assigns sequential positions in input order, but it still enforces that the final sequence set is exactly `1..N`.

### Checker modes

The backend supports these code values:

- `ANY`
- `ASSIGNED_PARALLEL`
- `ASSIGNED_SEQUENTIAL`

How they are represented and consumed:

- `ANY`
  - `checker_assignments` must be empty.
  - Any eligible checker can approve.
- `ASSIGNED_PARALLEL`
  - `checker_assignments` must contain assigned users.
  - Any assigned checker may approve in any order.
  - `required_checker_count` must be less than or equal to the number of assigned checkers.
- `ASSIGNED_SEQUENTIAL`
  - `checker_assignments` must contain assigned users.
  - `required_checker_count` must equal the number of assigned checkers.
  - Approvals must follow the exact assignment order by `sequence`.

### Status/action codes the frontend should display

Use these backend code values as the source of truth:

- Record status codes: `ACTIVE`, `INACTIVE`, `DELETED`
- Authorization status codes: `ADD_AUTH`, `EDIT_AUTH`, `DEL_AUTH`, `DEAUTH`, `EDIT_DEAUTH`
- KYC status codes: `PENDING`, `VERIFIED`, `REJECTED`
- Maker-checker action codes: `ADD`, `EDIT`, `DELETE`, `ACTIVATE`, `DEACTIVATE`
- Decision codes: `APPROVE`, `REJECT`
- Audit event codes: `REQUEST`, `CHECKER_DECISION`, `AUTHORIZED`, `DEAUTHORIZED`, `LIFECYCLE_COMPLETED`

### Maker / checker related fields

These fields appear in pending, audit, and lifecycle payloads:

- `audit_key`
- `request_id`
- `sequence_no`
- `entity_type`
- `entity_id`
- `action`
- `auth_status`
- `event_type`
- `maker`
- `checker`
- `decision`
- `checker_mode`
- `checker_assignments`
- `required_checker_count`
- `approval_count`
- `before_data`
- `after_data`
- `remark`
- `created_at`

Exact shapes:

- `maker`: `{ "id": number, "name": string } | null`
- `checker`: `{ "id": number, "name": string } | null`
- `decision`: string | null, typically `APPROVE` or `REJECT`
- `checker_mode`: one of `ANY`, `ASSIGNED_PARALLEL`, `ASSIGNED_SEQUENTIAL`
- `checker_assignments`: JSON array, usually a list of objects like `{ "checker_id": 6, "sequence": 1 }`
- `before_data` / `after_data`: arbitrary JSON object or null
- `remark`: string | null

### Audit key vs request id

- `audit_key` identifies the entire business lifecycle.
- `request_id` identifies one authorization stage within that lifecycle.
- A lifecycle may contain multiple audit rows.

### Maker visibility vs authorization

- Pending lists may include the maker’s own requests.
- Visibility does not grant approval rights.
- The maker cannot approve or reject their own request.
- A checker must still satisfy maker-checker routing rules and assignment checks even if they can view the request.

### Institution visibility / isolation

- `PLATFORM_OWNER` can access platform-wide data and create/manage institutions, applications, modules, menus, and menu actions.
- Non-`PLATFORM_OWNER` users are institution-scoped for user and profile read/write operations.
- `GET /users` is institution-scoped to the current institution.
- `GET /users/{user_id}` is blocked if the user belongs to another institution and the caller is not `PLATFORM_OWNER`.
- `GET /profiles/{profile_id}` returns the profile only if it belongs to the caller’s institution, unless the caller is `PLATFORM_OWNER`.
- `create_profile` rejects creating a profile for another institution unless the caller is `PLATFORM_OWNER`.
- `create_institution`, `edit_institution`, `delete_institution`, `activate_institution`, and `deactivate_institution` require the caller’s institution type to be `PLATFORM_OWNER`, in addition to permission checks.
- For menu/module/application management, the services also require `PLATFORM_OWNER`.
- For maker-checker assignment, assigned checkers must belong to the maker’s institution.

### Eligible checker users and available checker modes

- The backend does not expose a dedicated API for listing eligible checker users.
- The backend does not expose a dedicated API for listing available checker modes.
- The frontend currently must infer modes from the static codes above and derive candidate users from normal user/profile endpoints.

### Missing frontend-required APIs

The following frontend capabilities are not provided by the backend as explicit APIs:

- List eligible checker users for a specific pending request
- List valid checker modes from the backend
- Filter pending requests by maker, checker, entity, or lifecycle state via query parameters
- Fetch lifecycle details for all entity types under `/audit` with dedicated endpoints for KYC and menu sub-entities
- Fetch audit history for institution KYC and user KYC via `/audit`

## Login

### `POST /auth/login`

Auth:

- Public

Request body:

```json
{
  "username": "admin1",
  "password": "123"
}
```

Response `data`:

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin1",
    "institution": {
      "id": 1,
      "name": "Innovitegra Platform Owner",
      "type": "PLATFORM_OWNER"
    },
    "profile": {
      "id": 1,
      "name": "Super Administrator"
    }
  }
}
```

## Institution Endpoints

Base route: `/institutions`

Permission requirements:

- `GET` list/detail/pending/audit: `INSTITUTIONS:VIEW`
- `POST` create: `INSTITUTIONS:ADD`
- `PUT` update: `INSTITUTIONS:EDIT`
- `DELETE` delete: `INSTITUTIONS:DELETE`
- `POST /activate`, `POST /deactivate`: `INSTITUTIONS:EDIT`
- `POST /requests/{request_id}/approve|reject`: `INSTITUTIONS:AUTHORIZE`

Additional service rule:

- Only `PLATFORM_OWNER` may create, edit, delete, activate, or deactivate institutions.

### `GET /institutions`

Response `data`:

```json
[
  {
    "id": 1,
    "code": "INNOV",
    "name": "Innovitegra Platform Owner",
    "type": "PLATFORM_OWNER",
    "type_id": 1,
    "status": "ACTIVE",
    "status_id": 1,
    "required_checker_count": 1,
    "created_by": { "id": 1, "name": "admin1" },
    "updated_by": null,
    "created_at": "2026-08-12T00:00:00",
    "updated_at": null
  }
]
```

### `GET /institutions/pending`

Response `data`: `PendingRequestOut[]`

### `GET /institutions/{institution_id}`

Response `data`: `InstitutionOut`

### `GET /institutions/{institution_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /institutions`

Request body: `InstitutionCreate`

```json
{
  "code": "NEWBANK",
  "name": "New Bank",
  "type": "PLATFORM_USER",
  "remark": "optional",
  "kyc": {
    "legal_name": "New Bank Ltd",
    "registration_number": "REG123",
    "tax_id": null,
    "email": null,
    "phone": null,
    "website": null,
    "address_line1": null,
    "address_line2": null,
    "city": null,
    "state": null,
    "country": null,
    "postal_code": null
  },
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Notes:

- The `kyc` object contains only pure KYC data fields. Checker workflow fields (`checker_mode`, `checker_assignments`, `required_checker_count`) belong at the top level of the request, not inside `kyc`.
- All `kyc` fields are optional (`null` is accepted).
- On approval, the institution and its KYC record are created atomically in a single transaction.

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Institution ADD request submitted"
}
```

### `PUT /institutions/{institution_id}`

Combined Institution EDIT — supports institution fields, KYC fields, or both in a single request.

Request body: `InstitutionUpdate`

```json
{
  "name": "Updated Bank",
  "kyc": {
    "legal_name": "Updated Legal Name",
    "registration_number": null,
    "tax_id": null,
    "email": "ops@example.com",
    "phone": null,
    "website": null,
    "address_line1": null,
    "address_line2": null,
    "city": "Mumbai",
    "state": null,
    "country": null,
    "postal_code": null
  },
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": null
}
```

Notes:

- `name` is optional. Omit or set to `null` to leave the institution name unchanged.
- `kyc` is optional. Omit entirely to submit an institution-only EDIT. Include it to update KYC fields (all KYC sub-fields are individually optional).
- Both `name` and `kyc` may be provided together in a single request — this creates exactly **one** pending `EDIT_AUTH` request in `institution_audit`. No separate entry is created in `institution_kyc_audit`.
- On approval, institution and KYC changes are applied atomically in a single transaction. If either fails, both are rolled back.
- The `kyc` object contains only pure KYC data fields. Do not include `checker_mode`, `checker_assignments`, or `required_checker_count` inside `kyc`.
- This endpoint does **not** invoke `POST /institutions/{id}/kyc` internally. The two workflows are completely independent.
- `checker_mode` defaults to `ANY` if omitted.
- `audit_key` is reused from the previous rejected EDIT lifecycle for the same institution (if one exists and is not yet completed). A new `request_id` is always generated per stage.

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Institution EDIT request submitted"
}
```

Approve response `data` (via `POST /institutions/requests/{request_id}/approve`):

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 57
}
```

Partial approval response (when `approval_count < required_checker_count`):

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVAL_RECORDED",
  "approval_count": 1
}
```

### `DELETE /institutions/{institution_id}`

Request body: `CheckerDecisionRequest`

```json
{
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Institution DELETE request submitted"
}
```

### `POST /institutions/{institution_id}/activate`

Request body: `CheckerDecisionRequest`

```json
{
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Institution ACTIVATE request submitted"
}
```

### `POST /institutions/{institution_id}/deactivate`

Request body: `CheckerDecisionRequest`

```json
{
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Institution DEACTIVATE request submitted"
}
```

### `POST /institutions/requests/{request_id}/approve`

Request body: `CheckerDecisionRequest`

```json
{
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 1
}
```

### `POST /institutions/requests/{request_id}/reject`

Request body: `CheckerDecisionRequest`

```json
{
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

## User Endpoints

Base route: `/users`

Permission requirements:

- `GET` list/detail/pending/audit: `USERS:VIEW`
- `POST` create: `USERS:ADD`
- `PUT` update: `USERS:EDIT`
- `DELETE` delete: `USERS:DELETE`
- `POST /activate`, `POST /deactivate`: `USERS:EDIT`
- `POST /requests/{request_id}/approve|reject`: `USERS:AUTHORIZE`

### `GET /users`

Returns users for the current institution only.

Response `data`: `UserOut[]`

### `GET /users/pending`

Response `data`: `PendingRequestOut[]`

### `GET /users/{user_id}`

Returns one `UserOut`.

Access rule:

- Non-`PLATFORM_OWNER` callers receive `403` if the user belongs to a different institution.

### `GET /users/{user_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /users`

Request body: `UserCreate`

```json
{
  "username": "jane",
  "password": "secret",
  "profile_id": 2,
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "User ADD request submitted"
}
```

### `PUT /users/{user_id}`

Request body: `UserUpdate`

```json
{
  "profile_id": 2,
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "User EDIT request submitted"
}
```

### `DELETE /users/{user_id}`

Request body: `CheckerDecisionRequest`

```json
{
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "User DELETE request submitted"
}
```

### `POST /users/{user_id}/activate`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "User ACTIVATE request submitted"
}
```

### `POST /users/{user_id}/deactivate`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "User DEACTIVATE request submitted"
}
```

### `POST /users/requests/{request_id}/approve`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 123
}
```

### `POST /users/requests/{request_id}/reject`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

## Profile Endpoints

Base route: `/profiles`

Permission requirements:

- `GET` list/detail/pending/audit: `PROFILES:VIEW`
- `POST` create: `PROFILES:ADD`
- `PUT` update: `PROFILES:EDIT`
- `DELETE` delete: `PROFILES:DELETE`
- `POST /activate`, `POST /deactivate`, `POST /permissions`: `PROFILES:EDIT`
- `POST /requests/{request_id}/approve|reject`: `PROFILES:AUTHORIZE`

### `GET /profiles`

Response `data`: `ProfileOut[]`

### `GET /profiles/pending`

Response `data`: `PendingRequestOut[]`

### `GET /profiles/{profile_id}`

Access rule:

- `PLATFORM_OWNER` can retrieve any profile.
- Non-`PLATFORM_OWNER` callers only retrieve profiles for their own institution.

Response `data`: `ProfileOut`

### `GET /profiles/{profile_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /profiles`

Request body: `ProfileCreate`

```json
{
  "code": "ADMIN",
  "name": "Administrator",
  "institution_id": 1,
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Profile ADD request submitted"
}
```

### `PUT /profiles/{profile_id}`

Request body: `ProfileUpdate`

```json
{
  "name": "New Name",
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Profile EDIT request submitted"
}
```

### `DELETE /profiles/{profile_id}`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Profile DELETE request submitted"
}
```

### `POST /profiles/{profile_id}/activate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Profile ACTIVATE request submitted"
}
```

### `POST /profiles/{profile_id}/deactivate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Profile DEACTIVATE request submitted"
}
```

### `POST /profiles/{profile_id}/permissions`

Request body: `ProfilePermissionsUpdate`

```json
{
  "permissions": [
    { "menu_code": "USERS", "action_code": "VIEW" },
    { "menu_code": "USERS", "action_code": "ADD" }
  ],
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Permissions updated"
}
```

### `POST /profiles/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 10
}
```

### `POST /profiles/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

## Application Endpoints

Base routes:

- `/applications`
- `/institutions/{institution_id}/applications/pending`
- `/institutions/{institution_id}/assign-application`
- `/institution-applications/requests/{request_id}/approve`
- `/institution-applications/requests/{request_id}/reject`

Permission requirements:

- Application CRUD/pending/audit/approve/reject: `APPLICATIONS:VIEW|ADD|EDIT|DELETE|AUTHORIZE` as appropriate
- Institution application assignment: `APPLICATIONS:ADD`

Additional service rules:

- Creating, editing, deleting, activating, deactivating applications requires `PLATFORM_OWNER`.
- Assigning applications to an institution requires the institution to exist and be `ACTIVE`.

### `GET /applications`

Response `data`: `ApplicationOut[]`

### `GET /applications/pending`

Response `data`: `PendingRequestOut[]`

### `GET /applications/{application_id}`

Response `data`: `ApplicationOut`

### `GET /applications/{application_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /applications`

Request body: `ApplicationCreate`

```json
{
  "code": "CRM",
  "name": "CRM Application",
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Application ADD request submitted"
}
```

### `PUT /applications/{application_id}`

Request body: `ApplicationUpdate`

```json
{
  "name": "New App Name",
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Application EDIT request submitted"
}
```

### `DELETE /applications/{application_id}`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Application DELETE request submitted"
}
```

### `POST /applications/{application_id}/activate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Application ACTIVATE request submitted"
}
```

### `POST /applications/{application_id}/deactivate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Application DEACTIVATE request submitted"
}
```

### `POST /applications/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 55
}
```

### `POST /applications/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

### `GET /institutions/{institution_id}/applications/pending`

The `institution_id` path parameter is accepted by the route but not used by the service implementation.

Response `data`: `PendingRequestOut[]`

### `POST /institutions/{institution_id}/assign-application`

Request body: `AssignApplicationRequest`

```json
{
  "application_id": 55,
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Application assignment ADD request submitted"
}
```

### `POST /institution-applications/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 900
}
```

### `POST /institution-applications/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

## KYC Endpoints

Base routes:

- `/institutions/{institution_id}/kyc`
- `/institution-kyc/pending`
- `/institution-kyc/requests/{request_id}/approve`
- `/institution-kyc/requests/{request_id}/reject`
- `/users/{user_id}/kyc`
- `/user-kyc/pending`
- `/user-kyc/requests/{request_id}/approve`
- `/user-kyc/requests/{request_id}/reject`

Permission requirements:

- Institution KYC: `INSTITUTION_KYC:VIEW|ADD|AUTHORIZE`
- User KYC: `USER_KYC:VIEW|ADD|AUTHORIZE`

### `POST /institutions/{institution_id}/kyc`

Standalone Institution KYC submission. This is a separate workflow from the combined Institution EDIT.

- Creates a request in `institution_kyc_audit` (not `institution_audit`).
- Has its own `audit_key` and `request_id` independent of any institution EDIT lifecycle.
- Approved via `POST /institution-kyc/requests/{request_id}/approve`.
- The combined `PUT /institutions/{institution_id}` does **not** invoke this endpoint internally.

Request body: `InstitutionKYCCreate`

```json
{
  "legal_name": "New Bank Ltd",
  "registration_number": "REG123",
  "tax_id": null,
  "email": "ops@example.com",
  "phone": null,
  "website": null,
  "address_line1": "Line 1",
  "address_line2": null,
  "city": "Mumbai",
  "state": "MH",
  "country": "IN",
  "postal_code": "400001",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Institution KYC EDIT request submitted"
}
```

### `GET /institutions/{institution_id}/kyc`

Response `data`: `InstitutionKYCOut`

### `GET /institution-kyc/pending`

Response `data`: `PendingRequestOut[]`

### `POST /institution-kyc/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 17
}
```

### `POST /institution-kyc/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

### `POST /users/{user_id}/kyc`

Request body: `UserKYCCreate`

```json
{
  "full_name": "Jane Doe",
  "date_of_birth": "1990-01-01",
  "email": "jane@example.com",
  "phone": "9999999999",
  "id_type": "PAN",
  "id_number": "ABCDE1234F",
  "address_line1": "Address line",
  "city": "Mumbai",
  "state": "MH",
  "country": "IN",
  "postal_code": "400001",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "User KYC ADD request submitted"
}
```

### `GET /users/{user_id}/kyc`

Response `data`: `UserKYCOut`

### `GET /user-kyc/pending`

Response `data`: `PendingRequestOut[]`

### `POST /user-kyc/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 27
}
```

### `POST /user-kyc/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

## Menu Hierarchy Endpoints

Base route: `/` or `/menu`-style routes included directly on the app router.

### Modules

Permission requirements:

- `GET` list/pending/audit: `MENUS:VIEW`
- `POST` create: `MENUS:ADD`
- `PUT` edit: `MENUS:EDIT`
- `DELETE` delete: `MENUS:DELETE`
- `POST /activate`, `POST /deactivate`: `MENUS:EDIT`
- `POST /requests/{request_id}/approve|reject`: `MENUS:AUTHORIZE`

Additional service rule:

- All module management requires `PLATFORM_OWNER`.

### `GET /modules`

Query params:

- `application_id` optional integer

Response `data`: `ModuleOut[]`

### `GET /modules/pending`

Response `data`: `PendingRequestOut[]`

### `GET /modules/{module_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /modules`

Request body: `ModuleCreate`

```json
{
  "application_id": 1,
  "code": "SECURITY",
  "name": "Security",
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Module ADD request submitted"
}
```

### `PUT /modules/{module_id}`

Request body: `ModuleUpdate`

```json
{
  "name": "Security Updated",
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Module EDIT request submitted"
}
```

### `DELETE /modules/{module_id}`

Request body: `CheckerDecisionRequest`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Module DELETE request submitted"
}
```

### `POST /modules/{module_id}/activate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Module ACTIVATE request submitted"
}
```

### `POST /modules/{module_id}/deactivate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Module DEACTIVATE request submitted"
}
```

### `POST /modules/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 88
}
```

### `POST /modules/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

### Menus

Permission requirements:

- `GET` list/pending/audit: `MENUS:VIEW`
- `POST` create: `MENUS:ADD`
- `PUT` edit: `MENUS:EDIT`
- `DELETE` delete: `MENUS:DELETE`
- `POST /activate`, `POST /deactivate`: `MENUS:EDIT`
- `POST /requests/{request_id}/approve|reject`: `MENUS:AUTHORIZE`

Additional service rule:

- All menu management requires `PLATFORM_OWNER`.

### `GET /menus`

Query params:

- `module_id` optional integer

Response `data`: `MenuOut[]`

### `GET /menus/pending`

Response `data`: `PendingRequestOut[]`

### `GET /menus/{menu_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /menus`

Request body: `MenuCreate`

```json
{
  "module_id": 1,
  "code": "USERS",
  "name": "Users",
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu ADD request submitted"
}
```

### `PUT /menus/{menu_id}`

Request body: `MenuUpdate`

```json
{
  "name": "Users Updated",
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu EDIT request submitted"
}
```

### `DELETE /menus/{menu_id}`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu DELETE request submitted"
}
```

### `POST /menus/{menu_id}/activate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu ACTIVATE request submitted"
}
```

### `POST /menus/{menu_id}/deactivate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu DEACTIVATE request submitted"
}
```

### `POST /menus/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 91
}
```

### `POST /menus/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

### Menu actions

Permission requirements:

- `GET` list/pending/audit: `MENUS:VIEW`
- `POST` create: `MENUS:ADD`
- `PUT` edit: `MENUS:EDIT`
- `DELETE` delete: `MENUS:DELETE`
- `POST /activate`, `POST /deactivate`: `MENUS:EDIT`
- `POST /requests/{request_id}/approve|reject`: `MENUS:AUTHORIZE`

Additional service rule:

- All menu action management requires `PLATFORM_OWNER`.

### `GET /menu-actions`

Query params:

- `menu_id` optional integer

Response `data`: `MenuActionOut[]`

### `GET /menu-actions/pending`

Response `data`: `PendingRequestOut[]`

### `GET /menu-actions/{menu_action_id}/audit`

Response `data`: `AuditEntryOut[]`

### `POST /menu-actions`

Request body: `MenuActionCreate`

```json
{
  "menu_id": 1,
  "code": "CREATE",
  "name": "Create",
  "remark": "optional",
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu action ADD request submitted"
}
```

### `PUT /menu-actions/{menu_action_id}`

Request body: `MenuActionUpdate`

```json
{
  "name": "Create Updated",
  "remark": "optional"
}
```

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu action EDIT request submitted"
}
```

### `DELETE /menu-actions/{menu_action_id}`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu action DELETE request submitted"
}
```

### `POST /menu-actions/{menu_action_id}/activate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu action ACTIVATE request submitted"
}
```

### `POST /menu-actions/{menu_action_id}/deactivate`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Menu action DEACTIVATE request submitted"
}
```

### `POST /menu-actions/requests/{request_id}/approve`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "APPROVED",
  "entity_id": 101
}
```

### `POST /menu-actions/requests/{request_id}/reject`

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "result": "REJECTED"
}
```

## Pending Endpoints

These are the global pending endpoints under `/pending`:

- `GET /pending/all`
- `GET /pending/institutions`
- `GET /pending/users`
- `GET /pending/profiles`
- `GET /pending/applications`
- `GET /pending/institution-applications`
- `GET /pending/institution-kyc`
- `GET /pending/user-kyc`
- `GET /pending/modules`
- `GET /pending/menus`
- `GET /pending/menu-actions`

Permission requirements:

- `GET /pending/all`: authenticated only, no per-menu permission guard in the route
- All entity-specific pending routes require the corresponding `VIEW` permission

Response `data`: `PendingRequestOut[]`

Behavior:

- The aggregate endpoint concatenates all pending lists and sorts by `sequence_no` descending.
- The entity-specific endpoints only return the relevant entity type.

## Approve / Reject Endpoints

The backend exposes approve/reject endpoints for:

- Institutions
- Users
- Profiles
- Applications
- Institution application mappings
- Institution KYC
- User KYC
- Modules
- Menus
- Menu actions

There is no separate approve/reject endpoint for audit-history or lifecycle resources.

All approve/reject endpoints accept `CheckerDecisionRequest`:

```json
{
  "remark": "optional"
}
```

## Rejected-ADD Continuation Endpoints

Base route: `/pending/adds/{entity_key}/{request_id}`

Supported `entity_key` values:

- `institutions`
- `users`
- `profiles`
- `applications`
- `institution-applications`
- `institution-kyc`
- `user-kyc`
- `modules`
- `menus`
- `menu-actions`
- `profile-permissions`

### `POST /pending/adds/{entity_key}/{request_id}/edit`

Purpose:

- Continue a previously rejected `ADD` request as an `EDIT` stage.

Request body:

```json
{
  "after_data": {
    "any": "json"
  },
  "remark": "optional"
}
```

Notes:

- `after_data` is optional.
- Extra JSON fields are forbidden.
- The backend reuses the original `audit_key` and copies the original checker mode, checker assignments, and required checker count.

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Rejected ADD EDIT request submitted"
}
```

### `POST /pending/adds/{entity_key}/{request_id}/delete`

Purpose:

- Continue a previously rejected `ADD` request as a `DELETE` stage.

Request body:

```json
{
  "after_data": null,
  "remark": "optional"
}
```

Notes:

- The route signature allows an omitted body, and the backend treats it as an empty payload.
- If provided, the body must still conform to the same schema.

Response `data`:

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "message": "Rejected ADD DELETE request submitted"
}
```

## Audit and Lifecycle Endpoints

### `/audit/institutions/{institution_id}`

Response `data`: `AuditEntryOut[]`

### `/audit/institutions/lifecycle/{audit_key}`

Response `data`: `LifecycleOut`

### `/audit/users/{user_id}`

Response `data`: `AuditEntryOut[]`

### `/audit/users/lifecycle/{audit_key}`

Response `data`: `LifecycleOut`

### `/audit/profiles/{profile_id}`

Response `data`: `AuditEntryOut[]`

### `/audit/profiles/lifecycle/{audit_key}`

Response `data`: `LifecycleOut`

### `/audit/applications/{application_id}`

Response `data`: `AuditEntryOut[]`

### `/audit/applications/lifecycle/{audit_key}`

Response `data`: `LifecycleOut`

## AuditEntryOut

```json
{
  "id": 1,
  "audit_key": "uuid",
  "request_id": "uuid",
  "sequence_no": 1,
  "entity_id": 10,
  "entity_type": "USER",
  "action": "ADD",
  "auth_status": "ADD_AUTH",
  "event_type": "REQUEST",
  "maker": { "id": 1, "name": "admin1" },
  "checker": null,
  "decision": null,
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1,
  "approval_count": 0,
  "before_data": null,
  "after_data": {
    "username": "jane",
    "password": "secret",
    "institution_id": 1,
    "profile_id": 2
  },
  "remark": "optional",
  "created_at": "2026-08-12T00:00:00+00:00"
}
```

## PendingRequestOut

`PendingRequestOut` contains the same top-level fields as the request row portion of audit entries, but without `id`, `checker`, `decision`, and with the same maker/checker/audit fields relevant to the pending stage.

```json
{
  "audit_key": "uuid",
  "request_id": "uuid",
  "sequence_no": 1,
  "entity_type": "USER",
  "entity_id": 10,
  "action": "ADD",
  "auth_status": "ADD_AUTH",
  "maker": { "id": 1, "name": "admin1" },
  "checker_mode": "ANY",
  "checker_assignments": [],
  "required_checker_count": 1,
  "approval_count": 0,
  "before_data": null,
  "after_data": { "username": "jane" },
  "remark": "optional",
  "created_at": "2026-08-12T00:00:00+00:00"
}
```

## LifecycleOut

```json
{
  "audit_key": "uuid",
  "events": [
    { "id": 1, "sequence_no": 1, "event_type": "REQUEST" },
    { "id": 2, "sequence_no": 2, "event_type": "CHECKER_DECISION" },
    { "id": 3, "sequence_no": 3, "event_type": "AUTHORIZED" },
    { "id": 4, "sequence_no": 4, "event_type": "LIFECYCLE_COMPLETED" }
  ]
}
```

## Exact backend decision/lifecycle behavior

- `REQUEST` rows are the stage records that pending endpoints return.
- `CHECKER_DECISION` rows are written for every approve/reject decision.
- On rejection, the backend also writes `DEAUTHORIZED`.
- On final approval, the backend writes `AUTHORIZED` and `LIFECYCLE_COMPLETED`.
- `request_id` remains the same for all rows belonging to a stage.
- `audit_key` remains the same for all stages in a lifecycle.
- `sequence_no` increments per lifecycle across all rows.
- `approval_count` increments on each approval in a stage.
- `required_checker_count` determines how many approvals are needed before final authorization.

## Exact frontend rules for approver UX

- Do not show a self-approve/self-reject action for the maker’s own request.
- For `ANY`, show all eligible authorized checkers as candidates conceptually, but the backend does not provide a dedicated eligibility endpoint.
- For `ASSIGNED_PARALLEL`, the frontend should display the assigned checker list from `checker_assignments`.
- For `ASSIGNED_SEQUENTIAL`, the frontend should display the assigned checker list ordered by `sequence`.
- The backend enforces that the same checker cannot decide twice on the same stage.

## Discrepancies found in the previous API reference

- It implied the backend exposed checker mode and checker-user lookup APIs. It does not.
- It implied the frontend could rely on a generic `StatusRef`/`UserRef` contract for pending responses. The actual routes return `PendingRequestOut`, `AuditEntryOut`, and entity-specific output models.
- It suggested `InstitutionCreate` carried a nested `kyc` object and checker fields as part of a broader “documented” contract. That part was correct, but the prior document did not distinguish which values are simply accepted versus enforced.
- It did not document the full route inventory for modules, menus, menu actions, KYC, or rejected-ADD continuation routes.
- It did not clearly state that `/pending/all` is the only aggregate pending endpoint and that it is not permission-filtered by route-level guards.
- It did not clearly state that `profile-permissions` is supported by the rejected-ADD continuation router map, even though there is no dedicated pending list endpoint for it.
- It did not state that `GET /institutions/{institution_id}/applications/pending` accepts `institution_id` but currently ignores it in service logic.
- It did not make clear that the approve/reject responses are raw dicts with `result`/`entity_id` rather than a dedicated response schema.

## Confirmation

This document matches the current backend code in this repository as of the current inspection. It reflects the actual route handlers, response models, service-level rules, and the maker-checker engine behavior without inventing undocumented functionality.
