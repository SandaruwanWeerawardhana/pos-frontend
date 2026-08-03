"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, HelpCircle, X } from "lucide-react";
import {
  PIN_PATTERN,
  createStaffUser,
  listRoles,
  listWarehouses,
} from "@/lib/db";
import type { Role, Warehouse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// Label plus the "?" affordance the mock puts next to each permission toggle.
function HelpHint({ text }: Readonly<{ text: string }>) {
  return (
    <span
      title={text}
      className="inline-flex cursor-help text-primary dark:text-blue-400"
    >
      <HelpCircle size={14} aria-label={text} />
    </span>
  );
}

function PermissionPanel({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="rounded-t-xl bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface dark:bg-zinc-800/60 dark:text-zinc-100">
        {title}
      </h2>
      <div className="flex flex-col gap-2 p-4">{children}</div>
    </section>
  );
}

export default function CreateUserPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarName, setAvatarName] = useState("");

  const [viewAllRecords, setViewAllRecords] = useState(false);
  const [allWarehouses, setAllWarehouses] = useState(true);
  const [warehouseIds, setWarehouseIds] = useState<string[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [roleList, warehouseList] = await Promise.all([
        listRoles(),
        listWarehouses(),
      ]);
      setRoles(roleList);
      setWarehouses(warehouseList);
    })();
  }, []);

  async function handleAvatarChange(file: File | undefined) {
    if (!file) {
      setAvatar("");
      setAvatarName("");
      return;
    }
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        avatar: "Use a JPG, PNG or WebP image.",
      }));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setErrors((current) => ({ ...current, avatar: "Image must be under 2 MB." }));
      return;
    }
    setErrors((current) => ({ ...current, avatar: "" }));
    setAvatar(await readAsDataUrl(file));
    setAvatarName(file.name);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = "First name is required.";
    if (!lastName.trim()) next.lastName = "Last name is required.";
    if (!username.trim()) next.username = "Username is required.";
    if (!phone.trim()) next.phone = "Phone is required.";
    if (!email.trim()) next.email = "Email is required.";
    // The password doubles as the till PIN, so it has to satisfy the same
    // 4-6 digit rule the PIN keypad can enter.
    if (!PIN_PATTERN.test(password)) next.password = "Use 4 to 6 digits.";
    if (!roleId) next.role = "Pick a role.";
    if (!allWarehouses && warehouseIds.length === 0) {
      next.warehouses = "Pick at least one warehouse, or allow all.";
    }
    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await createStaffUser({
        name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        role_id: roleId,
        pin: password,
        avatar: avatar || undefined,
        view_all_records: viewAllRecords,
        // Undefined means "every warehouse, including ones added later", which
        // is not the same as listing today's warehouses one by one.
        warehouse_ids: allWarehouses ? undefined : warehouseIds,
        active: true,
      });
      showToast("User created", "success");
      router.push(ROUTES.users.root);
    } catch (caught) {
      setErrors({
        submit:
          caught instanceof Error ? caught.message : "Failed to create user",
      });
      setSaving(false);
    }
  }

  function toggleWarehouse(id: string) {
    setWarehouseIds((current) =>
      current.includes(id)
        ? current.filter((warehouseId) => warehouseId !== id)
        : [...current, id],
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Create"
        breadcrumbs={[
          { label: "Users", href: ROUTES.users.root },
          { label: "Create" },
        ]}
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="firstName"
            label={<>First Name <span className="text-error">*</span></>}
            placeholder="First Name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            error={errors.firstName}
            autoFocus
          />
          <Input
            name="lastName"
            label={<>Last Name <span className="text-error">*</span></>}
            placeholder="Last Name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            error={errors.lastName}
          />
          <Input
            name="username"
            label={<>Username <span className="text-error">*</span></>}
            placeholder="Username"
            autoComplete="off"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={errors.username}
          />
          <Input
            name="phone"
            label={<>Phone <span className="text-error">*</span></>}
            placeholder="Phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={errors.phone}
          />
          <Input
            name="email"
            label={<>Email <span className="text-error">*</span></>}
            placeholder="Email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
          <Input
            name="password"
            label={<>Password <span className="text-error">*</span></>}
            placeholder="Password"
            type="password"
            inputMode="numeric"
            maxLength={6}
            revealToggle
            autoComplete="new-password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            error={errors.password}
            hint="4 to 6 digits — this is the till sign-in PIN."
          />
          <Select
            name="role"
            label={<>Role <span className="text-error">*</span></>}
            placeholder="Please Select"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            options={roles.map((role) => ({ value: role.id, label: role.name }))}
            error={errors.role}
          />

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-on-surface-variant dark:text-zinc-300">
              User Image
            </span>
            <div className="flex items-center gap-3">
              {avatar && (
                <Image
                  src={avatar}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              )}
              <input
                ref={avatarInputRef}
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(",")}
                aria-label="User image"
                onChange={(event) =>
                  void handleAvatarChange(event.target.files?.[0])
                }
                className="min-h-10 w-full cursor-pointer rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface-variant outline-none file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-surface-container file:px-3 file:py-1.5 file:text-sm file:text-on-surface hover:border-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:file:bg-zinc-800 dark:file:text-zinc-100"
              />
              {avatar && (
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => {
                    setAvatar("");
                    setAvatarName("");
                    if (avatarInputRef.current) avatarInputRef.current.value = "";
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-error/40 text-error transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-error/10 active:scale-90"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {errors.avatar ? (
              <span className="animate-fade-in text-xs text-error">
                {errors.avatar}
              </span>
            ) : (
              <span className="text-xs text-on-surface-variant dark:text-zinc-500">
                {avatarName || "No file chosen"} · JPG, PNG or WebP, under 2 MB.
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <PermissionPanel title="View all records of all Users">
            <label className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100">
              <input
                type="checkbox"
                checked={viewAllRecords}
                onChange={(event) => setViewAllRecords(event.target.checked)}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              View all records of all Users
              <HelpHint text="Allow user to view all records, not just their own" />
            </label>
            <p className="text-xs text-on-surface-variant dark:text-zinc-500">
              Allow user to view all records, not just their own
            </p>
          </PermissionPanel>

          <PermissionPanel title="Access warehouses">
            <label className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100">
              <input
                type="checkbox"
                checked={allWarehouses}
                onChange={(event) => {
                  setAllWarehouses(event.target.checked);
                  if (event.target.checked) setWarehouseIds([]);
                }}
                className="h-4 w-4 cursor-pointer accent-primary"
              />
              All Warehouses
              <HelpHint text="Grants access to every warehouse, including ones added later" />
            </label>

            {!allWarehouses && (
              <div className="animate-fade-in flex flex-col gap-2 pl-1">
                {warehouses.length === 0 ? (
                  <p className="text-xs text-on-surface-variant dark:text-zinc-500">
                    No warehouses yet. Leave &ldquo;All Warehouses&rdquo; ticked.
                  </p>
                ) : (
                  warehouses.map((warehouse) => (
                    <label
                      key={warehouse.id}
                      className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100"
                    >
                      <input
                        type="checkbox"
                        checked={warehouseIds.includes(warehouse.id)}
                        onChange={() => toggleWarehouse(warehouse.id)}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                      {warehouse.name}
                    </label>
                  ))
                )}
                {errors.warehouses && (
                  <span className="animate-fade-in text-xs text-error">
                    {errors.warehouses}
                  </span>
                )}
              </div>
            )}
          </PermissionPanel>
        </div>

        {errors.submit && (
          <p className="text-sm text-error" role="alert">
            {errors.submit}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={saving}>
            <Check size={16} />
            Submit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(ROUTES.users.root)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
