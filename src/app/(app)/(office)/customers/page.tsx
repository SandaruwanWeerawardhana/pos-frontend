"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, UserPlus } from "lucide-react";
import { createCustomer, searchCustomers } from "@/lib/db";
import type { Customer, MembershipTier } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { exportCsv, type ExportColumn } from "@/lib/export";
import { parseMoneyToCents } from "@/lib/format";
import { ROUTES } from "@/lib/types/routes";

const TIERS: { value: MembershipTier; label: string }[] = [
  { value: "none", label: "No membership" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

export default function CustomersPage() {
  const { showToast } = useToast();
  const { money } = useSettings();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<MembershipTier>("none");
  const [creditLimit, setCreditLimit] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      searchCustomers(query).then(setCustomers);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [query]);

  async function refresh() {
    setCustomers(await searchCustomers(query));
  }

  async function handleCreate() {
    if (!name.trim()) return;
    await createCustomer({
      name: name.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      loyalty_points: 0,
      membership_tier: tier,
      credit_limit_cents: creditLimit
        ? (parseMoneyToCents(creditLimit) ?? 0)
        : undefined,
      credit_balance_cents: 0,
    });
    setName("");
    setPhone("");
    setEmail("");
    setTier("none");
    setCreditLimit("");
    setModalOpen(false);
    await refresh();
    showToast("Customer added", "success");
  }

  const exportColumns: ExportColumn<Customer>[] = [
    { key: "name", header: "Name", value: (c) => c.name },
    { key: "phone", header: "Phone", value: (c) => c.phone ?? "" },
    { key: "email", header: "Email", value: (c) => c.email ?? "" },
    { key: "tier", header: "Tier", value: (c) => c.membership_tier ?? "none" },
    { key: "points", header: "Loyalty points", value: (c) => c.loyalty_points ?? 0 },
    {
      key: "credit",
      header: "Credit owed",
      value: (c) => ((c.credit_balance_cents ?? 0) / 100).toFixed(2),
    },
  ];

  const columns: DataColumn<Customer>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (customer) => customer.name,
      render: (customer) => (
        <Link
          href={ROUTES.customers.detail(customer.id)}
          className="font-medium hover:underline"
        >
          {customer.name}
          <span className="block text-xs font-normal text-on-surface-variant dark:text-zinc-400">
            {customer.phone ?? customer.email ?? "No contact details"}
          </span>
        </Link>
      ),
    },
    {
      key: "tier",
      header: "Membership",
      hideOnMobile: true,
      sortValue: (customer) => customer.membership_tier ?? "none",
      render: (customer) =>
        customer.membership_tier && customer.membership_tier !== "none" ? (
          <Badge variant="success">{customer.membership_tier}</Badge>
        ) : (
          <span className="text-on-surface-variant">—</span>
        ),
    },
    {
      key: "points",
      header: "Points",
      align: "right",
      sortValue: (customer) => customer.loyalty_points ?? 0,
      render: (customer) => String(customer.loyalty_points ?? 0),
    },
    {
      key: "credit",
      header: "Credit owed",
      align: "right",
      hideOnMobile: true,
      sortValue: (customer) => customer.credit_balance_cents ?? 0,
      render: (customer) => (
        <span
          className={
            (customer.credit_balance_cents ?? 0) > 0
              ? "font-semibold text-amber-600 dark:text-amber-400"
              : ""
          }
        >
          {money(customer.credit_balance_cents ?? 0)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Customers"
        description="Loyalty balances, membership tiers, and store credit."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Customers" },
        ]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCsv("customers", customers, exportColumns)}
            >
              <Download size={15} />
              Export
            </Button>
            <Button type="button" size="sm" onClick={() => setModalOpen(true)}>
              <UserPlus size={15} />
              Add customer
            </Button>
          </>
        }
      />

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, phone, or email…"
        aria-label="Search customers"
      />

      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(customer) => customer.id}
        emptyMessage="No customers yet. Add one to start tracking loyalty."
        caption="Customer list"
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add customer"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoFocus
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Select
            label="Membership tier"
            value={tier}
            onChange={(event) => setTier(event.target.value as MembershipTier)}
            options={TIERS}
          />
          <Input
            label="Credit limit"
            type="number"
            min="0"
            step="0.01"
            value={creditLimit}
            onChange={(event) => setCreditLimit(event.target.value)}
            placeholder="0.00 — leave blank for no credit account"
          />
          <Button type="button" onClick={handleCreate} disabled={!name.trim()}>
            Save customer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
