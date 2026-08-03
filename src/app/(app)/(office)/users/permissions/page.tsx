"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, X } from "lucide-react";
import {
  ADMIN_ROLE_ID,
  createRole,
  deleteRole,
  listRoles,
  listStaffUsers,
  updateRole,
} from "@/lib/db";
import { PERMISSIONS, type Permission, type Role } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

// Permission strings are `resource.action`; the editor groups by resource so
// twelve checkboxes stay readable on a till-sized display.
const RESOURCE_LABELS: Record<string, string> = {
  pos: "Point of sale",
  products: "Products",
  inventory: "Inventory",
  purchases: "Purchasing",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
};

function resourceOf(permission: string): string {
  return permission.split(".")[0];
}

const RESOURCES = Array.from(new Set(PERMISSIONS.map(resourceOf)));

export default function GroupPermissionsPage() {
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<Permission[]>([]);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  async function refresh() {
    const [roleList, staff] = await Promise.all([listRoles(), listStaffUsers()]);
    const counts: Record<string, number> = {};
    for (const user of staff) {
      counts[user.role_id] = (counts[user.role_id] ?? 0) + 1;
    }
    setRoles(roleList);
    setMemberCounts(counts);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const visibleRoles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((role) =>
      `${role.name} ${role.description ?? ""}`.toLowerCase().includes(term),
    );
  }, [roles, search]);

  function openCreate() {
    setEditTarget(null);
    setFormName("");
    setFormDescription("");
    setFormPermissions([]);
    setFormError("");
    setEditorOpen(true);
  }

  function openEdit(role: Role) {
    setEditTarget(role);
    setFormName(role.name);
    setFormDescription(role.description ?? "");
    setFormPermissions([...role.permissions]);
    setFormError("");
    setEditorOpen(true);
  }

  function togglePermission(permission: Permission) {
    setFormPermissions((current) =>
      current.includes(permission)
        ? current.filter((entry) => entry !== permission)
        : [...current, permission],
    );
  }

  async function handleSave() {
    setFormError("");
    if (!formName.trim()) {
      setFormError("Role name is required.");
      return;
    }
    if (formPermissions.length === 0) {
      setFormError("Pick at least one permission.");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await updateRole(editTarget.id, {
          name: formName,
          description: formDescription,
          permissions: formPermissions,
        });
        showToast("Role updated", "success");
      } else {
        await createRole({
          name: formName,
          description: formDescription,
          permissions: formPermissions,
        });
        showToast("Role created", "success");
      }
      setEditorOpen(false);
      await refresh();
    } catch (error_) {
      setFormError(
        error_ instanceof Error ? error_.message : "Failed to save role",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await deleteRole(pendingDelete.id);
      showToast("Role deleted", "success");
      await refresh();
    } catch (error_) {
      showToast(
        error_ instanceof Error ? error_.message : "Failed to delete role",
        "error",
      );
    } finally {
      setPendingDelete(null);
    }
  }

  // Admin is fixed at every permission so an install cannot lock itself out of
  // this screen; its name and checkboxes are shown read-only.
  const adminLocked = editTarget?.id === ADMIN_ROLE_ID;
  const nameLocked = Boolean(editTarget?.is_system);

  const roleColumns: DataColumn<Role>[] = [
    {
      key: "name",
      header: "Role",
      sortValue: (role) => role.name,
      render: (role) => (
        <span className="font-medium text-on-surface dark:text-zinc-100">
          {role.name}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortValue: (role) => role.description ?? "",
      render: (role) => (
        <span className="text-primary dark:text-blue-400">
          {role.description || `${role.name} Permissions`}
        </span>
      ),
    },
    {
      key: "members",
      header: "Members",
      hideOnMobile: true,
      align: "right",
      sortValue: (role) => memberCounts[role.id] ?? 0,
      render: (role) => memberCounts[role.id] ?? 0,
    },
    {
      key: "actions",
      header: "Action",
      render: (role) => (
        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Edit ${role.name}`}
            onClick={() => openEdit(role)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/30 text-emerald-600 transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-emerald-50 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <Pencil size={14} />
          </button>
          {/* Built-in roles have no delete control at all, matching how the
              rest of the app hides actions it would only refuse. */}
          {!role.is_system && (
            <button
              type="button"
              aria-label={`Delete ${role.name}`}
              onClick={() => setPendingDelete(role)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-error/40 text-error transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-error/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X size={14} />
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Group Permissions"
        breadcrumbs={[
          { label: "Users", href: ROUTES.users.root },
          { label: "Group Permissions" },
        ]}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full max-w-xs">
            <Search
              size={15}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-zinc-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search this table"
              aria-label="Search roles"
              className="min-h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus size={15} />
            Create
          </Button>
        </div>

        <DataTable
          columns={roleColumns}
          rows={visibleRoles}
          rowKey={(role) => role.id}
          emptyMessage="No roles match this search."
          caption="Roles"
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editTarget ? `Edit ${editTarget.name}` : "Create role"}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Role"
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            disabled={nameLocked}
            hint={nameLocked ? "Built-in roles keep their name." : undefined}
            autoFocus
          />
          <Input
            label="Description"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
            placeholder={`${formName || "Role"} Permissions`}
          />

          <fieldset className="flex flex-col gap-3" disabled={adminLocked}>
            <legend className="text-sm font-medium text-on-surface-variant dark:text-zinc-300">
              Permissions
            </legend>
            {adminLocked && (
              <p className="text-xs text-on-surface-variant dark:text-zinc-500">
                Admin always holds every permission, so an install cannot lock
                itself out of this screen.
              </p>
            )}
            {RESOURCES.map((resource) => (
              <div key={resource} className="flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant/70 dark:text-zinc-500">
                  {RESOURCE_LABELS[resource] ?? resource}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {PERMISSIONS.filter(
                    (permission) => resourceOf(permission) === resource,
                  ).map((permission) => (
                    <label
                      key={permission}
                      className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100"
                    >
                      <input
                        type="checkbox"
                        checked={formPermissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                      <code className="text-xs">{permission}</code>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          {formError && (
            <p className="text-sm text-error" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleSave} loading={saving}>
              {editTarget ? "Save changes" : "Create role"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete role?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be removed. Users still holding it must be moved first.`
            : ""
        }
        confirmLabel="Delete role"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
