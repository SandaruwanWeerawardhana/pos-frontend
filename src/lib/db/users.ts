import { db } from "./index";
import { PERMISSIONS, type Permission, type Role, type StaffUser } from "@/lib/types";

// Local-only tables, no server sync yet (no backend endpoint exists).

// Seeded roles. Owner intentionally carries every permission so a fresh
// install always has one account that can reach the users screen.
const SYSTEM_ROLES: Omit<Role, "created_at">[] = [
  {
    id: "role_owner",
    name: "Owner",
    permissions: [...PERMISSIONS],
    is_system: true,
  },
  {
    id: "role_manager",
    name: "Manager",
    permissions: [
      "pos.sell",
      "pos.refund",
      "pos.discount",
      "products.view",
      "products.manage",
      "inventory.view",
      "inventory.adjust",
      "purchases.view",
      "purchases.manage",
      "customers.view",
      "customers.manage",
      "reports.view",
    ],
    is_system: true,
  },
  {
    id: "role_cashier",
    name: "Cashier",
    permissions: ["pos.sell", "products.view", "inventory.view", "customers.view"],
    is_system: true,
  },
];

export async function ensureSystemRoles(): Promise<void> {
  const existing = await db.roles.count();
  if (existing > 0) return;
  await db.roles.bulkAdd(
    SYSTEM_ROLES.map((role) => ({ ...role, created_at: Date.now() })),
  );
}

export async function listRoles(): Promise<Role[]> {
  return db.roles.orderBy("name").toArray();
}

export async function getRole(id: string): Promise<Role | undefined> {
  return db.roles.get(id);
}

export async function createRole(
  input: Omit<Role, "id" | "created_at">,
): Promise<Role> {
  const role: Role = { ...input, id: crypto.randomUUID(), created_at: Date.now() };
  await db.roles.add(role);
  return role;
}

export async function updateRole(
  id: string,
  changes: Partial<Omit<Role, "id" | "created_at">>,
): Promise<void> {
  await db.roles.update(id, changes);
}

// System roles are the app's safety net — deleting Owner would strand the
// install with no account able to manage users, so it is refused.
export async function deleteRole(id: string): Promise<void> {
  const role = await db.roles.get(id);
  if (role?.is_system) throw new Error("System roles cannot be deleted");
  await db.roles.delete(id);
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  return db.staffUsers.orderBy("email").toArray();
}

export async function createStaffUser(
  input: Omit<StaffUser, "id" | "created_at">,
): Promise<StaffUser> {
  const existing = await db.staffUsers.where("email").equals(input.email).first();
  if (existing) throw new Error("A user with that email already exists");
  const user: StaffUser = {
    ...input,
    id: crypto.randomUUID(),
    created_at: Date.now(),
  };
  await db.staffUsers.add(user);
  return user;
}

export async function updateStaffUser(
  id: string,
  changes: Partial<Omit<StaffUser, "id" | "created_at">>,
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
