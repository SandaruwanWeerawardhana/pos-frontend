"use client";

import { useEffect, useState } from "react";
import { KeyRound, Trash2, UserPlus } from "lucide-react";
import {
  CASHIER_ROLE_ID,
  PIN_PATTERN,
  createStaffUser,
  deleteStaffUser,
  listRoles,
  listStaffUsers,
  setStaffPin,
  updateStaffUser,
} from "@/lib/db";
import { PERMISSIONS, type Role, type StaffUser } from "@/lib/types";
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

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRoleId, setUserRoleId] = useState(CASHIER_ROLE_ID);
  const [userPin, setUserPin] = useState("");
  const [userPinConfirm, setUserPinConfirm] = useState("");
  const [userError, setUserError] = useState("");

  const [pinTarget, setPinTarget] = useState<StaffUser | null>(null);
  const [newPin, setNewPin] = useState("");
  const [pinError, setPinError] = useState("");

  const [pendingDelete, setPendingDelete] = useState<StaffUser | null>(null);

  async function refresh() {
    const [staff, roleList] = await Promise.all([listStaffUsers(), listRoles()]);
    setUsers(staff);
    setRoles(roleList);
  }

  useEffect(() => {
    void refresh();
  }, []);

  function openCashierModal() {
    setUserName("");
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
    if (!userName.trim() || !userEmail.trim() || !userRoleId) {
      setUserError("Name, email, and role are all required.");
      return;
    }
    if (!PIN_PATTERN.test(userPin)) {
      setUserError("PIN must be 4 to 6 digits.");
      return;
    }
    if (userPin !== userPinConfirm) {
      setUserError("The two PINs do not match.");
      return;
    }
    try {
      await createStaffUser({
        name: userName.trim(),
        email: userEmail.trim().toLowerCase(),
        role_id: userRoleId,
        pin: userPin,
        active: true,
      });
      setUserModalOpen(false);
      await refresh();
      showToast("Cashier added", "success");
    } catch (caught) {
      setUserError(
        caught instanceof Error ? caught.message : "Failed to add cashier",
      );
    }
  }

  async function handleResetPin() {
    if (!pinTarget) return;
    setPinError("");
    if (!PIN_PATTERN.test(newPin)) {
      setPinError("PIN must be 4 to 6 digits.");
      return;
    }
    await setStaffPin(pinTarget.id, newPin);
    setPinTarget(null);
    setNewPin("");
    await refresh();
    showToast(`New PIN set for ${pinTarget.name}`, "success");
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
    showToast("Cashier removed", "success");
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
      key: "pin",
      header: "Till PIN",
      hideOnMobile: true,
      render: (user) => (
        <span className="flex items-center gap-2">
          <Badge variant={user.pin_hash ? "success" : "neutral"}>
            {user.pin_hash ? "Set" : "Not set"}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPinTarget(user);
              setNewPin("");
              setPinError("");
            }}
          >
            <KeyRound size={14} />
            {user.pin_hash ? "Reset" : "Set"}
          </Button>
        </span>
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
      key: "created_at",
      header: "Added",
      hideOnMobile: true,
      sortValue: (user) => user.created_at,
      render: (user) => (
        <span className="text-xs text-on-surface-variant dark:text-zinc-400">
          {new Date(user.created_at).toLocaleDateString()}
        </span>
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
          aria-label={`Remove ${user.name}`}
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
        title="Cashiers"
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Cashiers & roles" },
        ]}
        actions={
          <Button type="button" size="sm" onClick={openCashierModal}>
            <UserPlus size={15} />
            Add cashier
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <SectionHeader title="Cashiers" />
        <DataTable
          columns={userColumns}
          rows={users}
          rowKey={(user) => user.id}
          emptyMessage="No cashiers yet. Add one to hand out a till login."
          caption="Cashiers"
        />
      </div>

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Add cashier"
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
            hint="Used together with the PIN to sign in at the till."
          />
          <Input
            label="Till PIN"
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
            label="Confirm PIN"
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
            Add cashier
          </Button>
        </div>
      </Modal>

      <Modal
        open={pinTarget !== null}
        onClose={() => setPinTarget(null)}
        title={pinTarget ? `Till PIN for ${pinTarget.name}` : "Till PIN"}
      >
        <div className="flex flex-col gap-3">
          <Input
            label="New PIN"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={(event) =>
              setNewPin(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            error={pinError}
            hint="4 to 6 digits. The old PIN stops working immediately."
            autoFocus
          />
          <Button type="button" onClick={handleResetPin}>
            Save PIN
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove cashier?"
        message={`${pendingDelete?.name ?? "This cashier"} will lose their till login immediately.`}
        confirmLabel="Remove cashier"
        destructive
        onConfirm={handleDeleteUser}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
