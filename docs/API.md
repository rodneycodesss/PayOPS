# Rodstar PayOps: API Reference (v1)

**Base URL:** `https://payops.rodstartechdevs.co.ke/api/v1`  
**Standard Authentication:** `Authorization: Bearer <access_token>`

All API responses follow consistent JSON formats. Financial amounts are exact decimals serialized as strings or fixed-precision numeric values paired with an ISO currency code (`KES`).

---

## 1. Authentication (`/api/v1/auth`)

### `POST /auth/register`
Onboards a new tenant business and creates the owner account. Automatically provisions the default Headquarters (`HQ`) branch, seeds system roles, standard Kenyan SME Chart of Accounts, and tax categories.
- **Request:**
  ```json
  {
    "business_name": "Rodstar Logistics Ltd",
    "trading_name": "Rodstar Freight",
    "kra_pin": "P051122334K",
    "full_name": "Rodney Gilbert",
    "email": "rodney@rodstar.co.ke",
    "password": "SecurePassword123!",
    "phone": "+254700123456"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1...",
    "refresh_token": "eyJhbGciOiJIUzI1...",
    "token_type": "Bearer",
    "expires_in": 1800,
    "mfa_required": false
  }
  ```

### `POST /auth/login`
Authenticates user using Argon2id password hashing. If TOTP MFA is enabled on the account, returns `mfa_required: true` and a temporary token until the 6-digit TOTP code is provided.
- **Request:**
  ```json
  {
    "email": "rodney@rodstar.co.ke",
    "password": "SecurePassword123!",
    "totp_code": "123456"
  }
  ```

### `POST /auth/refresh`
Rotates the refresh token and returns a new access token.
- **Security Invariant:** If an already-revoked refresh token is re-submitted, token reuse detection revokes the entire token family immediately and returns `401 Unauthorized`.
- **Request:**
  ```json
  {
    "refresh_token": "eyJhbGciOiJIUzI1..."
  }
  ```

### `POST /auth/logout`
Revokes the refresh token and records an audit trail event.

### `POST /auth/mfa/setup`
Generates a random base32 TOTP secret and returns an `otpauth://` provisioning URI for QR code generation in authenticator applications.

### `POST /auth/mfa/verify`
Validates a 6-digit TOTP code and activates MFA on the user account.

### `GET /auth/me`
Returns the authenticated user profile, organization ID, active roles, and granular permissions.

---

## 2. Tenancy & Organizations (`/api/v1/tenants`)

### `GET /tenants/me`
Retrieves legal organization profile, trading name, KRA PIN, base currency, and contact details.

### `PATCH /tenants/me`
Updates tenant business profile. Requires `tenant:manage` permission.

### `GET /tenants/branches`
Lists all physical branches / stations for the authenticated tenant.

### `POST /tenants/branches`
Creates a new branch. Code must be unique within the tenant organization. Requires `branch:manage` permission.

### `GET /tenants/users`
Lists organization staff with assigned roles. Requires `user:manage` permission.

### `POST /tenants/users/invite`
Invites a new staff member with a specific role (`finance_admin`, `accountant`, `cashier`, `auditor`, `viewer`).

---

## 3. Audit & Compliance (`/api/v1/audit-logs`)

### `GET /audit-logs`
Retrieves immutable audit trail entries filtered strictly by the authenticated tenant.
- **Query Parameters:** `action`, `resource_type`, `actor_email`, `skip`, `limit`.
- **Requires:** `audit:view` permission.

---

## 4. Diagnostics & Health (`/health`)

- `GET /health/live`: Liveness check (200 OK)
- `GET /health/ready`: Readiness check verifying database connectivity
- `GET /api/v1/health`: API versioned health endpoint
