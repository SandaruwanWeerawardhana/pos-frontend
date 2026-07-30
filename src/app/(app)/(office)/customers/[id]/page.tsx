"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Award, CreditCard, Save, Trash2 } from "lucide-react";
import {
  adjustCustomerCredit,
  adjustLoyaltyPoints,
  deleteCustomer,
  getCustomer,
  getCustomerOrders,
  listCustomerLedger,
  updateCustomer,
} from "@/lib/db";
import type {
  Customer,
  CustomerLedgerEntry,
  MembershipTier,
  PendingOrder,
} from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { formatDateTime, parseMoneyToCents } from "@/lib/format";
import { ROUTES } from "@/lib/types/routes";

const TIERS: { value: MembershipTier; label: string }[] = [
  { value: "none", label: "No membership" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
];

export default function CustomerDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const { money } = useSettings();

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [ledger, setLedger] = useState<CustomerLedgerEntry[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
    tier: "none" as MembershipTier,
    creditLimit: "",
  });

  const [pointsDelta, setPointsDelta] = useState("");
  const [creditDelta, setCreditDelta] = useState("");

  const refresh = useCallback(async () => {
    const [found, history, entries] = await Promise.all([
      getCustomer(id),
      getCustomerOrders(id),
      listCustomerLedger(id),
    ]);
    setCustomer(found ?? null);
    setOrders(history);
    setLedger(entries);
    if (found) {
      setForm({
        name: found.name,
        phone: found.phone ?? "",
        email: found.email ?? "",
        notes: found.notes ?? "",
        tier: found.membership_tier ?? "none",
        creditLimit: found.credit_limit_cents
          ? (found.credit_limit_cents / 100).toFixed(2)
          : "",
      });
    }
  }, [id]);

  // Dexie is the external system this effect subscribes to; state is set from
  // the promise callback, not synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getCustomer(id),
      getCustomerOrders(id),
      listCustomerLedger(id),
    ]).then(([found, history, entries]) => {
      if (cancelled) return;
      setCustomer(found ?? null);
      setOrders(history);
      setLedger(entries);
      if (found) {
        setForm({
          name: found.name,
          phone: found.phone ?? "",
          email: found.email ?? "",
          notes: found.notes ?? "",
          tier: found.membership_tier ?? "none",
          creditLimit: found.credit_limit_cents
            ? (found.credit_limit_cents / 100).toFixed(2)
            : "",
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCustomer(id, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        membership_tier: form.tier,
        credit_limit_cents: form.creditLimit
          ? (parseMoneyToCents(form.creditLimit) ?? 0)
          : undefined,
      });
      await refresh();
      showToast("Customer saved", "success");
    } catch {
      showToast("Failed to save customer", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePointsAdjust() {
    const delta = Number(pointsDelta);
    if (!Number.isFinite(delta) || delta === 0) return;
    try {
      await adjustLoyaltyPoints(
        id,
        delta,
        delta > 0 ? "Manual award" : "Redemption",
      );
      setPointsDelta("");
      await refresh();
      showToast("Loyalty points updated", "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Failed to adjust points",
        "error",
      );
    }
  }

  async function handleCreditAdjust() {
    const cents = parseMoneyToCents(creditDelta);
    if (cents === null || cents === 0) return;
    try {
      await adjustCustomerCredit(id, cents, cents > 0 ? "Credit sale" : "Repayment");
      setCreditDelta("");
      await refresh();
      showToast("Credit balance updated", "success");
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : "Failed to adjust credit",
        "error",
      );
    }
  }

  async function handleDelete() {
    await deleteCustomer(id);
    showToast("Customer deleted", "success");
    router.push(ROUTES.customers.root);
  }

  if (customer === undefined) {
    return (
      <output aria-label="Loading customer" className="flex flex-col gap-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </output>
    );
  }

  if (customer === null) {
    return (
      <EmptyState
        title="Customer not found"
        description="It may have been deleted, or the link is out of date."
        action={
          <Link
            href={ROUTES.customers.root}
            className="inline-flex min-h-11 items-center rounded-lg bg-secondary px-5 text-sm font-medium text-on-secondary dark:bg-white dark:text-zinc-900"
          >
            Back to customers
          </Link>
        }
      />
    );
  }

  const totalSpendCents = orders
    .filter((order) => !order.refunded)
    .reduce((sum, order) => sum + order.total_cents, 0);

  const orderColumns: DataColumn<PendingOrder>[] = [
    {
      key: "date",
      header: "When",
      sortValue: (order) => order.created_at,
      render: (order) => (
        <Link
          href={ROUTES.sales.detail(order.client_generated_id)}
          className="hover:underline"
        >
          {formatDateTime(order.created_at)}
        </Link>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      hideOnMobile: true,
      render: (order) => order.receipt_no ?? "—",
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      hideOnMobile: true,
      sortValue: (order) => order.items.length,
      render: (order) => String(order.items.length),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortValue: (order) => order.total_cents,
      render: (order) => money(order.total_cents),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="Customers"
        title={customer.name}
        description={customer.phone ?? customer.email ?? "No contact details"}
        breadcrumbs={[
          { label: "Customers", href: ROUTES.customers.root },
          { label: customer.name },
        ]}
        actions={
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 size={15} />
            Delete
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Lifetime spend"
          value={money(totalSpendCents)}
          accent="primary"
          sub={`${orders.length} orders`}
        />
        <StatCard
          label="Loyalty points"
          value={String(customer.loyalty_points ?? 0)}
          icon={<Award size={20} />}
          accent="success"
          sub="Earned on completed sales"
        />
        <StatCard
          label="Credit owed"
          value={money(customer.credit_balance_cents ?? 0)}
          icon={<CreditCard size={20} />}
          accent={(customer.credit_balance_cents ?? 0) > 0 ? "warning" : "secondary"}
          sub={`Limit ${money(customer.credit_limit_cents ?? 0)}`}
        />
        <StatCard
          label="Membership"
          value={(customer.membership_tier ?? "none").toUpperCase()}
          accent="secondary"
          sub="Tier on this account"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <SectionHeader title="Customer details" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <Select
              label="Membership tier"
              value={form.tier}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tier: event.target.value as MembershipTier,
                }))
              }
              options={TIERS}
            />
            <Input
              label="Credit limit"
              type="number"
              min="0"
              step="0.01"
              value={form.creditLimit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  creditLimit: event.target.value,
                }))
              }
            />
            <Input
              label="Notes"
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
            <div className="sm:col-span-2">
              <Button type="button" onClick={handleSave} disabled={saving}>
                <Save size={16} />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <SectionHeader title="Adjust loyalty" />
            <div className="mt-4 flex gap-2">
              <Input
                type="number"
                step="1"
                aria-label="Points adjustment"
                placeholder="e.g. -100 to redeem"
                value={pointsDelta}
                onChange={(event) => setPointsDelta(event.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handlePointsAdjust}>
                Apply
              </Button>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Adjust credit" />
            <div className="mt-4 flex gap-2">
              <Input
                type="number"
                step="0.01"
                aria-label="Credit adjustment"
                placeholder="Negative to record a repayment"
                value={creditDelta}
                onChange={(event) => setCreditDelta(event.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleCreditAdjust}>
                Apply
              </Button>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant dark:text-zinc-500">
              Charges are rejected if they would exceed the credit limit.
            </p>
          </Card>

          <Card>
            <SectionHeader title="Account ledger" />
            {ledger.length === 0 ? (
              <p className="mt-3 text-sm text-on-surface-variant dark:text-zinc-400">
                No loyalty or credit activity yet.
              </p>
            ) : (
              <ul className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto">
                {ledger.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-on-surface dark:text-zinc-100">
                        {entry.reason}
                      </span>
                      <span className="block text-xs text-on-surface-variant dark:text-zinc-400">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </span>
                    <Badge variant={entry.delta >= 0 ? "success" : "neutral"}>
                      {entry.kind === "credit"
                        ? money(entry.delta)
                        : `${entry.delta > 0 ? "+" : ""}${entry.delta} pts`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader title="Purchase history" />
        <DataTable
          columns={orderColumns}
          rows={orders}
          rowKey={(order) => order.client_generated_id}
          pageSize={10}
          emptyMessage="No purchases recorded for this customer yet."
          caption="Customer purchase history"
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete customer?"
        message={`"${customer.name}" and their loyalty ledger will be removed. Past sales stay in the sales history.`}
        confirmLabel="Delete customer"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
