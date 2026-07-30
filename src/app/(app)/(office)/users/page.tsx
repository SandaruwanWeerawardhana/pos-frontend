"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import {
  createRole,
  createStaffUser,
  deleteRole,
  deleteStaffUser,
  listRoles,
  listStaffUsers,
  updateRole,
  updateStaffUser,
} from "@/lib/db";
import { PERMISSIONS, type Permission, type Role, type StaffUser } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Card, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

// Groups the flat permission strings by their resource prefix so the editor
// reads as a matrix rather than a wall of fifteen checkboxes.
function groupPermissions(): Record<string, Permission[]> {
  const groups: Record<string, Permission[]> = {};
  for (const permission of PERMISSIONS) {
    const resource = permission.split(".")[0];
    groups[resource] = [...(groups[resource] ?? []), permission];
  }
  return groups;
}

const PERMISSION_GROUPS = groupPermissions();

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRoleId, setUserRoleId] = useState("");
  const [userPin, setUserPin] = useState("");
  const [userError, setUserError] = useState("");

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  const [pendingDelete, setPendingDelete] = useState<StaffUser | null>(null);

  async function refresh() {
    const [staff, roleList] = await Promise.all([listStaffUsers(), listRoles()]);
    setUsers(staff);
    setRoles(roleList);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreateUser() {
    setUserError("");
    if (!userName.trim() || !userEmail.trim() || !userRoleId) {
      setUserError("Name, email, and role are all required.");
      return;
    }
    try {
      await createStaffUser({
        name: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        role_id: userRoleId,
        pin: userPin.trim() || undefined,
        active: true,
      });
      setUserName("");
      setUserEmail("");
      setUserRoleId("");
      setUserPin("");
      setUserModalOpen(false);
      await refresh();
      showToast("User added", "success");
    } catch (caught) {
      setUserError(
        caught instanceof Error ? caught.message : "Failed to add user",
      );
    }
  }

  function openRoleEditor(role: Role | null) {
    setEditingRole(role);
    setRoleName(role?.name ?? "");
    setRolePermissions(role?.permissions ?? []);
    setRoleModalOpen(true);
  }

  async function handleSaveRole() {
    if (!roleName.trim()) return;
    if (editingRole) {
      await updateRole(editingRole.id, {
        name: roleName.trim(),
        permissions: rolePermissions,
      });
    } else {
      await createRole({ name: roleName.trim(), permissions: rolePermissions });
    }
    setRoleModalOpen(false);
    await refresh();
    showToast("Role saved", "success");
  }

  async function handleDeleteRole(role: Role) {
    try {
      await deleteRole(role.id);
      await refresh();
      showToast("Role deleted", "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Failed to delete role",
        "error",
      );
    }
  }

  async function handleToggleActive(user: StaffUser) {
    await updateStaffUser(user.id, { active: !user.active });
    await refresh();
  }

  async function handleDeleteUser() {
    if (!pendingDelete) return;
    await deleteStaffUser(pendingDelete.id);
    setPendingDelete(null);
    await refresh();
    showToast("User removed", "success");
  }

  const userColumns: DataColumn<StaffUser>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (user) => user.name,
      render: (user) => (
        <span className="font-medium">
          {user.name}
          <span className="block text-xs font-normal text-on-surface-variant dark:text-zinc-400">
            {user.email}
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (user) => user.role_id,
      render: (user) => (
        <Select
          aria-label={`Role for ${user.name}`}
          value={user.role_id}
          onChange={async (event) => {
            await updateStaffUser(user.id, { role_id: event.target.value });
            await refresh();
          }}
          options={roles.map((role) => ({ value: role.id, label: role.name }))}
          className="min-w-32"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (user) => (
        <button type="button" onClick={() => handleToggleActive(user)}>
          <Badge variant={user.active ? "success" : "neutral"}>
            {user.active ? "Active" : "Disabled"}
          </Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (user) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPendingDelete(user)}
        >
          <Trash2 size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        description="Who can use this workspace, and what each role is allowed to do."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Users & roles" },
        ]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openRoleEditor(null)}
            >
              <ShieldCheck size={15} />
              New role
            </Button>
            <Button type="button" size="sm" onClick={() => setUserModalOpen(true)}>
              <UserPlus size={15} />
              Add user
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3">
        <SectionHeader title="Staff" />
        <DataTable
          columns={userColumns}
          rows={users}
          rowKey={(user) => user.id}
          emptyMessage="No staff users yet. Add one to assign till permissions."
          caption="Staff users"
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader title="Roles" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-on-surface dark:text-zinc-50">
                    {role.name}
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                    {role.permissions.length} of {PERMISSIONS.length} permissions
                  </p>
                </div>
                {role.is_system && <Badge variant="neutral">System</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.permissions.slice(0, 6).map((permission) => (
                  <Badge key={permission} variant="neutral">
                    {permission}
                  </Badge>
                ))}
                {role.permissions.length > 6 && (
                  <Badge variant="neutral">
                    +{role.permissions.length - 6} more
                  </Badge>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openRoleEditor(role)}
                >
                  Edit
                </Button>
                {!role.is_system && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(role)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Add user"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Full name"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={userEmail}
            onChange={(event) => setUserEmail(event.target.value)}
          />
          <Select
            label="Role"
            value={userRoleId}
            onChange={(event) => setUserRoleId(event.target.value)}
            placeholder="Choose a role"
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
          />
          <Input
            label="Till PIN (optional)"
            inputMode="numeric"
            maxLength={6}
            value={userPin}
            onChange={(event) => setUserPin(event.target.value)}
            error={userError}
          />
          <Button type="button" onClick={handleCreateUser}>
            Add user
          </Button>
        </div>
      </Modal>

      <Modal
        open={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title={editingRole ? `Edit ${editingRole.name}` : "New role"}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Role name"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            autoFocus
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(PERMISSION_GROUPS).map(([resource, permissions]) => (
              <fieldset
                key={resource}
                className="rounded-xl border border-outline-variant p-3 dark:border-zinc-800"
              >
                <legend className="px-1 text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
                  {resource}
                </legend>
                <div className="flex flex-col gap-2">
                  {permissions.map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100"
                    >
                      <input
                        type="checkbox"
                        checked={rolePermissions.includes(permission)}
                        onChange={(event) =>
                          setRolePermissions((current) =>
                            event.target.checked
                              ? [...current, permission]
                              : current.filter((item) => item !== permission),
                          )
                        }
                        className="h-4 w-4 rounded border-outline-variant"
                      />
                      {permission.split(".")[1]}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <Button type="button" onClick={handleSaveRole} disabled={!roleName.trim()}>
            Save role
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove user?"
        message={`${pendingDelete?.name ?? "This user"} will lose access to the workspace.`}
        confirmLabel="Remove user"
        destructive
        onConfirm={handleDeleteUser}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
