"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  FileText,
  KeyRound,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CASHIER_ROLE_ID,
  PIN_PATTERN,
  createStaffUser,
  deleteStaffUser,
  displayUsername,
  listRoles,
  listStaffUsers,
  nameParts,
  setStaffPin,
  updateStaffUser,
} from "@/lib/db";
import { type Role, type StaffUser } from "@/lib/types";
import { exportExcel, exportPdf, type ExportColumn } from "@/lib/export";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

type StatusFilter = "all" | "active" | "disabled";

// Both exports render the same seven columns the table shows, so a printed or
// spreadsheet copy matches what the manager was looking at.
const EXPORT_COLUMNS: ExportColumn<StaffUser>[] = [
  { key: "first", header: "First Name", value: (user) => nameParts(user).first },
  { key: "last", header: "Last Name", value: (user) => nameParts(user).last },
  { key: "username", header: "Username", value: (user) => displayUsername(user) },
  { key: "email", header: "Email", value: (user) => user.email },
  { key: "phone", header: "Phone", value: (user) => user.phone ?? "" },
  {
    key: "status",
    header: "Status",
    value: (user) => (user.active ? "Active" : "Disabled"),
  },
];

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRoleId, setUserRoleId] = useState(CASHIER_ROLE_ID);
  const [userPin, setUserPin] = useState("");
  const [userPinConfirm, setUserPinConfirm] = useState("");
  const [userError, setUserError] = useState("");

  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleId, setEditRoleId] = useState(CASHIER_ROLE_ID);
  const [editError, setEditError] = useState("");

  const [pinTarget, setPinTarget] = useState<StaffUser | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [pendingDelete, setPendingDelete] = useState<StaffUser | null>(null);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role_id !== roleFilter) return false;
      if (statusFilter === "active" && !user.active) return false;
      if (statusFilter === "disabled" && user.active) return false;
      if (!term) return true;
      const { first, last } = nameParts(user);
      return [first, last, displayUsername(user), user.email, user.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [users, search, roleFilter, statusFilter]);

  const activeFilterCount =
    (roleFilter === "all" ? 0 : 1) + (statusFilter === "all" ? 0 : 1);

  async function refresh() {
    const [staff, roleList] = await Promise.all([listStaffUsers(), listRoles()]);
    setUsers(staff);
    setRoles(roleList);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCreateModal() {
    setUserFirstName("");
    setUserLastName("");
    setUserUsername("");
    setUserPhone("");
    setUserEmail("");
    setUserRoleId(CASHIER_ROLE_ID);
    setUserPin("");
    setUserPinConfirm("");
    setUserError("");
    setUserModalOpen(true);
  }

  // The PIN is mandatory here: it is the only credential a cashier has, so an
  // account created without one could never sign in at the till.
  async function handleCreateUser() {
    setUserError("");
    const first = userFirstName.trim();
    const last = userLastName.trim();
    if (!first || !userEmail.trim() || !userRoleId) {
      setUserError("First name, email, and role are all required.");
      return;
    }
    if (!PIN_PATTERN.test(userPin)) {
      setUserError("Password must be 4 to 6 digits.");
      return;
    }
    if (userPin !== userPinConfirm) {
      setUserError("The two passwords do not match.");
      return;
    }
    const fullName = [first, last].filter(Boolean).join(" ");
    try {
      await createStaffUser({
        name: fullName,
        first_name: first,
        last_name: last,
        username: userUsername.trim() || fullName,
        phone: userPhone.trim(),
        email: userEmail.trim().toLowerCase(),
        role_id: userRoleId,
        pin: userPin,
        active: true,
      });
      setUserModalOpen(false);
      await refresh();
      showToast("User added", "success");
    } catch (caught) {
      setUserError(
        caught instanceof Error ? caught.message : "Failed to add user",
      );
    }
  }

  function openEditModal(user: StaffUser) {
    const { first, last } = nameParts(user);
    setEditTarget(user);
    setEditFirstName(first);
    setEditLastName(last);
    setEditUsername(displayUsername(user));
    setEditPhone(user.phone ?? "");
    setEditEmail(user.email);
    setEditRoleId(user.role_id);
    setEditError("");
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    const first = editFirstName.trim();
    const last = editLastName.trim();
    if (!first || !editEmail.trim()) {
      setEditError("First name and email are both required.");
      return;
    }
    const fullName = [first, last].filter(Boolean).join(" ");
    await updateStaffUser(editTarget.id, {
      name: fullName,
      first_name: first,
      last_name: last,
      username: editUsername.trim() || fullName,
      phone: editPhone.trim(),
      email: editEmail.trim().toLowerCase(),
      role_id: editRoleId,
    });
    setEditTarget(null);
    await refresh();
    showToast("User updated", "success");
  }

  async function handleResetPin() {
    if (!pinTarget) return;
    setPinError("");
    if (!PIN_PATTERN.test(newPin)) {
      setPinError("Password must be 4 to 6 digits.");
      return;
    }
    await setStaffPin(pinTarget.id, newPin);
    setPinTarget(null);
    setNewPin("");
    await refresh();
    showToast(`New password set for ${pinTarget.name}`, "success");
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
      key: "first_name",
      header: "First Name",
      sortValue: (user) => nameParts(user).first,
      render: (user) => (
        <span className="font-medium">{nameParts(user).first}</span>
      ),
    },
    {
      key: "last_name",
      header: "Last Name",
      hideOnMobile: true,
      sortValue: (user) => nameParts(user).last,
      render: (user) => nameParts(user).last || "—",
    },
    {
      key: "username",
      header: "Username",
      hideOnMobile: true,
      sortValue: (user) => displayUsername(user),
      render: (user) => (
        <span className="text-primary dark:text-blue-400">
          {displayUsername(user)}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (user) => user.email,
      render: (user) => (
        <a
          href={`mailto:${user.email}`}
          className="text-primary hover:underline dark:text-blue-400"
        >
          {user.email}
        </a>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      hideOnMobile: true,
      sortValue: (user) => user.phone ?? "",
      render: (user) => (
        <span className="tabular-nums">{user.phone || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOnMobile: true,
      render: (user) => (
        <label className="relative inline-flex shrink-0 cursor-pointer items-center">
          <span className="sr-only">
            {user.active ? `Disable ${user.name}` : `Enable ${user.name}`}
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={user.active}
            onChange={() => handleToggleActive(user)}
            className="peer h-6 w-11 cursor-pointer appearance-none rounded-full bg-surface-container-highest outline-none transition-colors duration-[var(--duration-base)] ease-[var(--ease-standard)] checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:bg-zinc-700 dark:checked:bg-primary"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-[var(--duration-base)] ease-[var(--ease-spring)] peer-checked:translate-x-5"
          />
        </label>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (user) => (
        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Edit ${user.name}`}
            onClick={() => openEditModal(user)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-600/30 text-emerald-600 transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-emerald-50 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label={`Reset password for ${user.name}`}
            onClick={() => {
              setPinTarget(user);
              setNewPin("");
              setPinError("");
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-surface-container active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <KeyRound size={14} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${user.name}`}
            onClick={() => setPendingDelete(user)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-error/40 text-error transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-error/10 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X size={14} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Users management"
        breadcrumbs={[
          { label: "Users", href: ROUTES.users.root },
          { label: "Users management" },
        ]}
      />

      <div className="flex flex-col gap-4">
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
              aria-label="Search users"
              className="min-h-10 w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-3 text-sm text-on-surface outline-none transition-colors duration-[var(--duration-fast)] placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={15} />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportPdf("Users management", visibleUsers, EXPORT_COLUMNS)
              }
            >
              <FileText size={15} />
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportExcel(
                  "users",
                  "Users management",
                  visibleUsers,
                  EXPORT_COLUMNS,
                )
              }
            >
              <FileSpreadsheet size={15} />
              EXCEL
            </Button>
            <Button type="button" size="sm" onClick={openCreateModal}>
              <Plus size={15} />
              Create
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <div className="animate-fade-in flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Select
              label="Role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              options={[
                { value: "all", label: "All roles" },
                ...roles.map((role) => ({ value: role.id, label: role.name })),
              ]}
              className="min-w-40"
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "disabled", label: "Disabled" },
              ]}
              className="min-w-40"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setRoleFilter("all");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}

        <DataTable
          columns={userColumns}
          rows={visibleUsers}
          rowKey={(user) => user.id}
          emptyMessage="No users match this search. Create one to hand out a till login."
          caption="Users"
          pageSizeOptions={[10, 25, 50]}
        />
      </div>

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Create user"
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              value={userFirstName}
              onChange={(event) => setUserFirstName(event.target.value)}
              autoFocus
            />
            <Input
              label="Last name"
              value={userLastName}
              onChange={(event) => setUserLastName(event.target.value)}
            />
          </div>
          <Input
            label="Username"
            value={userUsername}
            onChange={(event) => setUserUsername(event.target.value)}
            hint="Optional. Defaults to the full name."
          />
          <Input
            label="Email"
            type="email"
            value={userEmail}
            onChange={(event) => setUserEmail(event.target.value)}
            hint="Used together with the password to sign in at the till."
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={userPhone}
            onChange={(event) => setUserPhone(event.target.value)}
          />
          <Select
            label="Role"
            value={userRoleId}
            onChange={(event) => setUserRoleId(event.target.value)}
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
          />
          <Input
            label="Password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={userPin}
            onChange={(event) =>
              setUserPin(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            hint="4 to 6 digits."
          />
          <Input
            label="Confirm password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={userPinConfirm}
            onChange={(event) =>
              setUserPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            error={userError}
          />
          <Button type="button" onClick={handleCreateUser}>
            Create user
          </Button>
        </div>
      </Modal>

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit ${editTarget.name}` : "Edit user"}
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="First name"
              value={editFirstName}
              onChange={(event) => setEditFirstName(event.target.value)}
              autoFocus
            />
            <Input
              label="Last name"
              value={editLastName}
              onChange={(event) => setEditLastName(event.target.value)}
            />
          </div>
          <Input
            label="Username"
            value={editUsername}
            onChange={(event) => setEditUsername(event.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={editEmail}
            onChange={(event) => setEditEmail(event.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={editPhone}
            onChange={(event) => setEditPhone(event.target.value)}
          />
          <Select
            label="Role"
            value={editRoleId}
            onChange={(event) => setEditRoleId(event.target.value)}
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
          />
          {editError && (
            <p className="text-sm text-error" role="alert">
              {editError}
            </p>
          )}
          <Button type="button" onClick={handleSaveEdit}>
            Save changes
          </Button>
        </div>
      </Modal>

      <Modal
        open={pinTarget !== null}
        onClose={() => setPinTarget(null)}
        title={pinTarget ? `Password for ${pinTarget.name}` : "Password"}
      >
        <div className="flex flex-col gap-3">
          <Input
            label="New password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(event) =>
              setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            error={pinError}
            hint="4 to 6 digits. The old password stops working immediately."
            autoFocus
          />
          <Button type="button" onClick={handleResetPin}>
            Save password
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove user?"
        message={`${pendingDelete?.name ?? "This user"} will lose their till login immediately.`}
        confirmLabel="Remove user"
        destructive
        onConfirm={handleDeleteUser}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
