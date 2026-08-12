# Innoverse Backend API Reference

**Base URL:** `http://localhost:8000`

**Authentication:** all routes except `/auth/login` require `Authorization: Bearer <token>`.

**Response envelope:**

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

## Auth

### `POST /auth/login`
Request:
```json
{
  "username": "admin1",
  "password": "123"
}
```

Response `data`:
```json
{
  "access_token": "<jwt>",
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

## Common shapes

### `CheckerDecisionRequest`
```json
{
  "remark": "Approved"
}
```

### `PendingRequestOut`
```json
{
  "request_id": "uuid",
  "entity_type": "INSTITUTION",
  "entity_id": 1,
  "action": "ADD",
  "auth_status": "ADD_AUTH",
  "maker": { "id": 1, "name": "admin1" },
  "required_checker_count": 1,
  "approval_count": 0,
  "after_data": {},
  "before_data": null,
  "remark": null,
  "created_at": "2026-08-11T12:00:00"
}
```

### `AuditEntryOut`
```json
{
  "id": 1,
  "request_id": "uuid",
  "entity_id": 1,
  "entity_type": "INSTITUTION",
  "action": "ADD",
  "auth_status": "ACTIVE",
  "event_type": "REQUEST",
  "maker": { "id": 1, "name": "admin1" },
  "checker": { "id": 2, "name": "admin2" },
  "decision": "APPROVE",
  "required_checker_count": 1,
  "approval_count": 1,
  "before_data": {},
  "after_data": {},
  "remark": "ok",
  "created_at": "2026-08-11T12:00:00"
}
```

## Users

### `GET /users`
Permission: `USERS / VIEW`

### `POST /users`
Permission: `USERS / ADD`

Request:
```json
{
  "username": "new_user",
  "password": "secret123",
  "profile_id": 1,
  "remark": null
}
```

Response `data`:
```json
{ "request_id": "uuid", "message": "User ADD request submitted" }
```

### `GET /users/pending`
Permission: `USERS / AUTHORIZE`

### `GET /users/{user_id}`
Permission: `USERS / VIEW`

### `GET /users/{user_id}/audit`
Permission: `USERS / VIEW`

### `PUT /users/{user_id}`
Permission: `USERS / EDIT`

Request:
```json
{
  "profile_id": 1,
  "remark": "update profile"
}
```

Response `data`:
```json
{ "request_id": "uuid", "message": "User EDIT request submitted" }
```

### `DELETE /users/{user_id}`
Permission: `USERS / DELETE`

Request:
```json
{ "remark": "delete" }
```

### `POST /users/{user_id}/activate`
Permission: `USERS / EDIT`

Request:
```json
{ "remark": "activate" }
```

### `POST /users/{user_id}/deactivate`
Permission: `USERS / EDIT`

Request:
```json
{ "remark": "deactivate" }
```

### `POST /users/requests/{request_id}/approve`
Permission: `USERS / AUTHORIZE`

Request:
```json
{ "remark": "ok" }
```

### `POST /users/requests/{request_id}/reject`
Permission: `USERS / AUTHORIZE`

Request:
```json
{ "remark": "no" }
```

## Profiles

### `GET /profiles`
Permission: `PROFILES / VIEW`

### `POST /profiles`
Permission: `PROFILES / ADD`

Request:
```json
{
  "code": "OPS",
  "name": "Operations",
  "institution_id": 1,
  "remark": null
}
```

Response `data`:
```json
{ "request_id": "uuid", "message": "Profile ADD request submitted" }
```

### `GET /profiles/pending`
Permission: `PROFILES / AUTHORIZE`

### `GET /profiles/{profile_id}`
Permission: `PROFILES / VIEW`

### `GET /profiles/{profile_id}/audit`
Permission: `PROFILES / VIEW`

### `PUT /profiles/{profile_id}`
Permission: `PROFILES / EDIT`

Request:
```json
{
  "name": "New Name",
  "remark": "update"
}
```

### `DELETE /profiles/{profile_id}`
Permission: `PROFILES / DELETE`

Request:
```json
{ "remark": "delete" }
```

### `POST /profiles/{profile_id}/activate`
Permission: `PROFILES / EDIT`

### `POST /profiles/{profile_id}/deactivate`
Permission: `PROFILES / EDIT`

### `POST /profiles/{profile_id}/permissions`
Permission: `PROFILES / EDIT`

Request:
```json
{
  "permissions": [
    { "menu_code": "USERS", "action_code": "USERS_VIEW" },
    { "menu_code": "USERS", "action_code": "USERS_ADD" },
    { "menu_code": "PROFILES", "action_code": "PROFILES_VIEW" }
  ],
  "remark": "refresh permissions"
}
```

Response `data`:
```json
{ "request_id": "uuid", "message": "Profile permissions EDIT request submitted" }
```

### `POST /profiles/requests/{request_id}/approve`
Permission: `PROFILES / AUTHORIZE`

### `POST /profiles/requests/{request_id}/reject`
Permission: `PROFILES / AUTHORIZE`

## Institutions

### `GET /institutions`
Permission: `INSTITUTIONS / VIEW`

### `POST /institutions`
Permission: `INSTITUTIONS / ADD`

Request:
```json
{
  "code": "NEWBANK",
  "name": "New Bank Ltd",
  "type": "PLATFORM_USER",
  "remark": "onboard",
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

Response `data`:
```json
{ "request_id": "uuid", "message": "Institution ADD request submitted" }
```

### `GET /institutions/pending`
Permission: `INSTITUTIONS / AUTHORIZE`

### `GET /institutions/{institution_id}`
Permission: `INSTITUTIONS / VIEW`

### `GET /institutions/{institution_id}/audit`
Permission: `INSTITUTIONS / VIEW`

### `PUT /institutions/{institution_id}`
Permission: `INSTITUTIONS / EDIT`

Request:
```json
{
  "name": "Updated Name",
  "remark": "rename"
}
```

### `DELETE /institutions/{institution_id}`
Permission: `INSTITUTIONS / DELETE`

Request:
```json
{ "remark": "delete" }
```

### `POST /institutions/{institution_id}/activate`
Permission: `INSTITUTIONS / EDIT`

### `POST /institutions/{institution_id}/deactivate`
Permission: `INSTITUTIONS / EDIT`

### `POST /institutions/requests/{request_id}/approve`
Permission: `INSTITUTIONS / AUTHORIZE`

### `POST /institutions/requests/{request_id}/reject`
Permission: `INSTITUTIONS / AUTHORIZE`

## Applications

### `GET /applications`
Permission: `APPLICATIONS / VIEW`

### `POST /applications`
Permission: `APPLICATIONS / ADD`

Request:
```json
{
  "code": "APPX1",
  "name": "App X1",
  "remark": "create"
}
```

Response `data`:
```json
{ "request_id": "uuid", "message": "Application ADD request submitted" }
```

### `GET /applications/pending`
Permission: `APPLICATIONS / AUTHORIZE`

### `GET /applications/{application_id}`
Permission: `APPLICATIONS / VIEW`

### `GET /applications/{application_id}/audit`
Permission: `APPLICATIONS / VIEW`

### `PUT /applications/{application_id}`
Permission: `APPLICATIONS / EDIT`

### `DELETE /applications/{application_id}`
Permission: `APPLICATIONS / DELETE`

### `POST /applications/{application_id}/activate`
Permission: `APPLICATIONS / EDIT`

### `POST /applications/{application_id}/deactivate`
Permission: `APPLICATIONS / EDIT`

### `POST /applications/requests/{request_id}/approve`
Permission: `APPLICATIONS / AUTHORIZE`

### `POST /applications/requests/{request_id}/reject`
Permission: `APPLICATIONS / AUTHORIZE`

### `GET /institutions/{institution_id}/applications/pending`
Permission: `APPLICATIONS / AUTHORIZE`

### `POST /institutions/{institution_id}/assign-application`
Permission: `APPLICATIONS / ADD`

Request:
```json
{
  "application_id": 1,
  "remark": "assign"
}
```

Response `data`:
```json
{ "request_id": "uuid", "message": "Application assignment ADD request submitted" }
```

### `POST /institution-applications/requests/{request_id}/approve`
Permission: `APPLICATIONS / AUTHORIZE`

### `POST /institution-applications/requests/{request_id}/reject`
Permission: `APPLICATIONS / AUTHORIZE`

## KYC

### `POST /institutions/{institution_id}/kyc`
Permission: `INSTITUTION_KYC / ADD`

Request:
```json
{
  "legal_name": "Updated Legal Name",
  "registration_number": "REG-001",
  "tax_id": "TAX-001",
  "email": "admin@example.com",
  "phone": "+91-9000000001",
  "website": "https://example.com",
  "address_line1": "1 Finance St",
  "address_line2": null,
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "postal_code": "400001"
}
```

### `GET /institutions/{institution_id}/kyc`
Permission: `INSTITUTION_KYC / VIEW`

### `GET /institution-kyc/pending`
Permission: `INSTITUTION_KYC / AUTHORIZE`

### `POST /institution-kyc/requests/{request_id}/approve`
Permission: `INSTITUTION_KYC / AUTHORIZE`

### `POST /institution-kyc/requests/{request_id}/reject`
Permission: `INSTITUTION_KYC / AUTHORIZE`

### `POST /users/{user_id}/kyc`
Permission: `USER_KYC / ADD`

Request:
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

### `GET /users/{user_id}/kyc`
Permission: `USER_KYC / VIEW`

### `GET /user-kyc/pending`
Permission: `USER_KYC / AUTHORIZE`

### `POST /user-kyc/requests/{request_id}/approve`
Permission: `USER_KYC / AUTHORIZE`

### `POST /user-kyc/requests/{request_id}/reject`
Permission: `USER_KYC / AUTHORIZE`

## Menu / module management

All of these routes require the `MENUS` menu permissions:

- `MENUS / VIEW`
- `MENUS / ADD`
- `MENUS / EDIT`
- `MENUS / DELETE`
- `MENUS / AUTHORIZE`

### `GET /modules`
Permission: `MENUS / VIEW`

Query params:
- `application_id` optional integer

### `GET /modules/pending`
Permission: `MENUS / AUTHORIZE`

### `GET /modules/{module_id}/audit`
Permission: `MENUS / VIEW`

### `POST /modules`
Permission: `MENUS / ADD`
Request:
```json
{
  "application_id": 1,
  "code": "MODX1",
  "name": "Module X1",
  "remark": "create"
}
```

### `PUT /modules/{module_id}`
Permission: `MENUS / EDIT`

### `DELETE /modules/{module_id}`
Permission: `MENUS / DELETE`

### `POST /modules/{module_id}/activate`
Permission: `MENUS / EDIT`

### `POST /modules/{module_id}/deactivate`
Permission: `MENUS / EDIT`

### `POST /modules/requests/{request_id}/approve`
Permission: `MENUS / AUTHORIZE`

### `POST /modules/requests/{request_id}/reject`
Permission: `MENUS / AUTHORIZE`

### `GET /menus`
Permission: `MENUS / VIEW`

Query params:
- `module_id` optional integer

### `GET /menus/pending`
Permission: `MENUS / AUTHORIZE`

### `GET /menus/{menu_id}/audit`
Permission: `MENUS / VIEW`

### `POST /menus`
Permission: `MENUS / ADD`
Request:
```json
{
  "module_id": 1,
  "code": "MENX1",
  "name": "Menu X1",
  "remark": "create"
}
```

### `PUT /menus/{menu_id}`
Permission: `MENUS / EDIT`

### `DELETE /menus/{menu_id}`
Permission: `MENUS / DELETE`

### `POST /menus/{menu_id}/activate`
Permission: `MENUS / EDIT`

### `POST /menus/{menu_id}/deactivate`
Permission: `MENUS / EDIT`

### `POST /menus/requests/{request_id}/approve`
Permission: `MENUS / AUTHORIZE`

### `POST /menus/requests/{request_id}/reject`
Permission: `MENUS / AUTHORIZE`

### `GET /menu-actions`
Permission: `MENUS / VIEW`

### `GET /menu-actions/pending`
Permission: `MENUS / AUTHORIZE`

### `GET /menu-actions/{menu_action_id}/audit`
Permission: `MENUS / VIEW`

### `POST /menu-actions`
Permission: `MENUS / ADD`
Request:
```json
{
  "menu_id": 1,
  "code": "ACTX1",
  "name": "Action X1",
  "remark": "create"
}
```

### `PUT /menu-actions/{menu_action_id}`
Permission: `MENUS / EDIT`

### `DELETE /menu-actions/{menu_action_id}`
Permission: `MENUS / DELETE`

### `POST /menu-actions/{menu_action_id}/activate`
Permission: `MENUS / EDIT`

### `POST /menu-actions/{menu_action_id}/deactivate`
Permission: `MENUS / EDIT`

### `POST /menu-actions/requests/{request_id}/approve`
Permission: `MENUS / AUTHORIZE`

### `POST /menu-actions/requests/{request_id}/reject`
Permission: `MENUS / AUTHORIZE`

## Audit

### `GET /audit/institutions/{institution_id}`
Permission: `INSTITUTIONS / INSTITUTIONS_VIEW`

### `GET /audit/users/{user_id}`
Permission: `USERS / USERS_VIEW`

### `GET /audit/profiles/{profile_id}`
Permission: `PROFILES / PROFILES_VIEW`

### `GET /audit/applications/{application_id}`
Permission: `APPLICATIONS / APPLICATIONS_VIEW`

## Pending dashboard

### `GET /pending/all`
Returns the combined pending request list the current user can authorize.

### `GET /pending/institutions`
Permission: `INSTITUTIONS / INSTITUTIONS_AUTHORIZE`

### `GET /pending/users`
Permission: `USERS / USERS_AUTHORIZE`

### `GET /pending/profiles`
Permission: `PROFILES / PROFILES_AUTHORIZE`

### `GET /pending/applications`
Permission: `APPLICATIONS / APPLICATIONS_AUTHORIZE`

## Error responses

```json
{
  "success": false,
  "message": "Permission denied",
  "data": null
}
```

Common HTTP statuses:
- `400` validation or business-rule failure
- `401` missing or invalid token
- `403` permission denied or institution restriction
- `404` record not found

## Supported payload notes

- `POST /institutions` requires a nested `kyc` object.
- `POST /users/{user_id}/kyc` and `POST /institutions/{institution_id}/kyc` are upserts.
- `DELETE` and `activate`/`deactivate` routes accept an optional JSON body with `remark`.
- Maker-checker request ids are UUIDs and approval/rejection endpoints use those UUIDs.