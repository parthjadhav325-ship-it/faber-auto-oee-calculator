
# Production-Ready Role-Based MES Transformation

Layer role-based access, a dedicated Operator Portal, a Supervisor live board, and a User Master sheet onto the existing app — without touching the visual theme, dashboards, KPI math, or Google Sheets backend structure beyond additive sheets.

## 1. Auth & Roles (Google Sheets-backed)

New sheet **`User_Master`** (auto-created via `ensureSheet`):
`Employee_ID | Name | Password | Role | Default_Machine_ID`

Roles: `operator | supervisor | manager | admin`.

- Server fn `login({employee_id, password})` reads `User_Master`, returns `{employee_id, name, role, default_machine_id}` on match. (Plain password for v1, matching current Sheets-only architecture — flagged for future hashing.)
- Client stores session in `localStorage` + React context (`AuthProvider`).
- `useAuth()` hook + `<RequireRole roles={...}>` guard wrapping route components.
- Logout clears session.

Redirect-after-login map:
- operator → `/operator/{default_machine_id}` (or `/operator` picker if none)
- supervisor → `/supervisor`
- manager → `/` (existing Daily Dashboard)
- admin → `/` + sees admin nav

## 2. Routes

New:
- `/login` — Employee ID + Password form
- `/operator` — machine picker (if no default)
- `/operator/$machineId` — single-machine operator console
- `/supervisor` — live status board
- `/admin/users` — User Master CRUD (admin only)

Existing routes get role-gated via `RequireRole`:
- `/`, `/monthly`, `/plant` → manager + admin
- `/production`, `/rejection`, `/machines`, `/control` → admin (manager read where applicable)

Sidebar (`app-sidebar.tsx`) filters nav items by role; operators see no sidebar (full-screen portal).

## 3. Operator Portal (`/operator/$machineId`)

Mobile-first, large-tap, industrial look (reuses existing tokens — no theme change):
- Header: Employee ID • Machine Name • Current Shift (derived from time)
- Big status pill: Running / Stopped
- Live timer (HH:MM:SS) — runtime when running, downtime when stopped, computed from latest `Machine_Events` timestamp + `setInterval`
- Escalation color on downtime: green <10m, yellow 10–30m, red 30m+
- **START** button (disabled if already running)
- **STOP** button → modal: Reason dropdown (11 categories) + Remarks textarea → submits event
- No KPIs, no charts

State source of truth: `listEvents()` filtered by `machine_id`, last event determines status. Page refresh re-derives timer from sheet timestamp.

`addEvent` extended to accept `remarks` and `employee_id`; `Machine_Events` headers become `Timestamp | Machine_ID | Event_Type | Reason | Employee_ID | Remarks` (backward-compatible read — extra cols ignored if absent in old rows).

## 4. Supervisor Portal (`/supervisor`)

Read-only live board:
- Grid of machine cards: name, Running/Stopped badge, current reason (if stopped), elapsed timer with escalation color
- Auto-refresh every 15s (react-query `refetchInterval`)
- No OEE / MTTR / financial metrics

## 5. Admin — User Management (`/admin/users`)

Table + add/edit/delete using same pattern as `/machines`. Fields: Employee_ID, Name, Password, Role, Default_Machine_ID (select from machines).

## 6. Machine-Specific URLs / QR-Ready

`/operator/$machineId` directly auto-selects; no dropdown. Future QR codes encode this URL. Invalid machineId → friendly error with link to `/operator`.

## 7. What stays untouched

- Color tokens, fonts, existing dashboard layouts, KPI formulas in `oee-data.ts`
- `Machine_Master`, `Production_Data`, `Downtime_Data`, `Rejection_Data` sheets
- Google Sheets connector wiring

## Technical notes

- `src/lib/auth.tsx` — context + provider + `useAuth` + `RequireRole`
- `src/lib/users.functions.ts` — `login`, `listUsers`, `saveUser`, `deleteUser` server fns
- `src/lib/sheets.functions.ts` — extend `addEvent` (remarks, employee_id); `listEvents` already returns rows
- `src/routes/login.tsx`, `src/routes/operator.tsx`, `src/routes/operator.$machineId.tsx`, `src/routes/supervisor.tsx`, `src/routes/admin.users.tsx`
- `__root.tsx` wraps `AuthProvider`; sidebar hidden for operator role and on `/login`
- Session persisted to `localStorage` so refresh keeps user logged in

## Out of scope (call out to user)

- Password hashing / real auth backend (Sheets stores plain text — acceptable for internal plant network per current architecture; recommend migrating to Lovable Cloud auth later)
- QR code generation (URL scheme is ready; printing QRs is a follow-up)
