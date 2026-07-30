import { db } from "./index";
import { PERMISSIONS, type Permission, type Role, type StaffUser } from "@/lib/types";

// Local-only tables, no server sync yet (no backend endpoint exists).

export const ADMIN_ROLE_ID = "role_admin";
export const CASHIER_ROLE_ID = "role_cashier";

// The only two roles the app has. Admin carries every permission so an install
// always has an account that can reach this screen; Cashier is till-only.
// Custom roles are deliberately not supported — see `ensureSystemRoles`.
const SYSTEM_ROLES: Omit<Role, "created_at">[] = [
  {
    id: ADMIN_ROLE_ID,
    name: "Admin",
    permissions: [...PERMISSIONS],
    is_system: true,
  },
  {
    id: CASHIER_ROLE_ID,
    name: "Cashier",
    permissions: ["pos.sell", "products.view", "inventory.view"],
    is_system: true,
  },
];

// Permissions that only make sense in the back office. A role holding none of
// them is a till-only role, which is what pins its holder to the POS screen.
const OFFICE_PERMISSIONS: Permission[] = [
  "products.manage",
  "inventory.adjust",
  "purchases.view",
  "purchases.manage",
  "reports.view",
  "settings.manage",
  "users.manage",
];

export function isPosOnly(permissions: Permission[]): boolean {
  return !permissions.some((permission) =>
    OFFICE_PERMISSIONS.includes(permission),
  );
}

// Reconciles the roles table down to Admin and Cashier. Installs seeded before
// the app dropped custom roles still hold Owner/Manager rows (and possibly
// hand-made ones); those are removed and anyone assigned to them is moved to
// Admin, which is the closest match and never strands an account without a way
// back into the users screen.
export async function ensureSystemRoles(): Promise<void> {
  const keep = new Set(SYSTEM_ROLES.map((role) => role.id));
  await db.transaction("rw", db.roles, db.staffUsers, async () => {
    const existing = await db.roles.toArray();
    const stale = existing.filter((role) => !keep.has(role.id));

    await db.roles.bulkPut(
      SYSTEM_ROLES.map((role) => ({
        ...role,
        created_at:
          existing.find((row) => row.id === role.id)?.created_at ?? Date.now(),
      })),
    );

    if (stale.length === 0) return;
    await db.roles.bulkDelete(stale.map((role) => role.id));
    const staleIds = new Set(stale.map((role) => role.id));
    const orphans = await db.staffUsers
      .filter((user) => staleIds.has(user.role_id))
      .toArray();
    await db.staffUsers.bulkPut(
      orphans.map((user) => ({ ...user, role_id: ADMIN_ROLE_ID })),
    );
  });
}

export async function listRoles(): Promise<Role[]> {
  return db.roles.orderBy("name").toArray();
}

export async function getRole(id: string): Promise<Role | undefined> {
  return db.roles.get(id);
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  return db.staffUsers.orderBy("email").toArray();
}

export const PIN_PATTERN = /^\d{4,6}$/;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// A 4-6 digit PIN has too little entropy for the hash to withstand an attacker
// who has already taken the device and can read IndexedDB — brute forcing ten
// thousand candidates is trivial. Hashing is here so a PIN is not readable at a
// glance (over a shoulder, in devtools, in an exported backup) and so PINs are
// not reused verbatim elsewhere. Real protection stays with device custody.
async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

async function pinFields(pin: string): Promise<Pick<StaffUser, "pin_hash" | "pin_salt">> {
  if (!PIN_PATTERN.test(pin)) throw new Error("PIN must be 4 to 6 digits");
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  return { pin_salt: salt, pin_hash: await hashPin(pin, salt) };
}

export async function createStaffUser(
  input: Omit<StaffUser, "id" | "created_at" | "pin_hash" | "pin_salt"> & {
    pin?: string;
  },
): Promise<StaffUser> {
  const { pin, ...rest } = input;
  const existing = await db.staffUsers.where("email").equals(rest.email).first();
  if (existing) throw new Error("A user with that email already exists");
  const user: StaffUser = {
    ...rest,
    ...(pin ? await pinFields(pin) : {}),
    id: crypto.randomUUID(),
    created_at: Date.now(),
  };
  await db.staffUsers.add(user);
  return user;
}

export async function setStaffPin(id: string, pin: string): Promise<void> {
  await db.staffUsers.update(id, await pinFields(pin));
}

export interface StaffAuthResult {
  user: StaffUser;
  role: Role;
}

// Till sign-in: email plus PIN, resolved entirely against the local tables so
// a cashier can start a shift with the network down. Returns null for every
// failure mode (unknown email, disabled account, no PIN set, wrong PIN) so the
// caller cannot use the result to probe which staff emails exist.
export async function authenticateStaff(
  email: string,
  pin: string,
): Promise<StaffAuthResult | null> {
  const user = await db.staffUsers
    .where("email")
    .equals(email.trim().toLowerCase())
    .first();
  if (!user?.active || !user.pin_hash || !user.pin_salt) return null;
  if ((await hashPin(pin, user.pin_salt)) !== user.pin_hash) return null;
  const role = await db.roles.get(user.role_id);
  if (!role) return null;
  return { user, role };
}

export async function updateStaffUser(
  id: string,
  // PIN changes go through `setStaffPin`, which does the salting and hashing.
  changes: Partial<Pick<StaffUser, "name" | "email" | "role_id" | "active">>,
): Promise<void> {
  await db.staffUsers.update(id, changes);
}

export async function deleteStaffUser(id: string): Promise<void> {
  await db.staffUsers.delete(id);
}

export function hasPermission(
  role: Role | null | undefined,
  permission: Permission,
): boolean {
  return Boolean(role?.permissions.includes(permission));
}
