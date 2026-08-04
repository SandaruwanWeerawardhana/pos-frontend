"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Filter,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { deleteCustomer, listCustomers, updateCustomer } from "@/lib/db";
import type { Customer } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Card, PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { exportExcel, exportPdf, type ExportColumn } from "@/lib/export";
import { ROUTES } from "@/lib/types/routes";

const ACTION_BUTTON_CLASSES =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-outline-variant transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700";

type CreditFilter = "" | "limit" | "no-limit";

function filterCustomers(
  customers: Customer[],
  query: string,
  creditFilter: CreditFilter,
): Customer[] {
  const needle = query.trim().toLowerCase();
  return customers.filter((customer) => {
    if (creditFilter === "limit" && customer.credit_limit_cents === undefined) return false;
    if (creditFilter === "no-limit" && customer.credit_limit_cents !== undefined) return false;
    if (!needle) return true;
    return (
      customer.code.toLowerCase().includes(needle) ||
      customer.name.toLowerCase().includes(needle) ||
      (customer.first_name?.toLowerCase().includes(needle) ?? false) ||
      (customer.last_name?.toLowerCase().includes(needle) ?? false) ||
      (customer.phone?.toLowerCase().includes(needle) ?? false) ||
      (customer.email?.toLowerCase().includes(needle) ?? false)
    );
  });
}

interface EditCustomerFormProps {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}

function EditCustomerForm({ customer, onClose, onSaved }: Readonly<EditCustomerFormProps>) {
  const { showToast } = useToast();
  const [name, setName] = useState(customer.name);
  const [firstName, setFirstName] = useState(customer.first_name ?? "");
  const [lastName, setLastName] = useState(customer.last_name ?? "");
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [creditLimit, setCreditLimit] = useState(
    customer.credit_limit_cents !== undefined
      ? (customer.credit_limit_cents / 100).toString()
      : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCustomer(customer.id, {
        name: name.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        credit_limit_cents: creditLimit.trim()
          ? Math.round(Number(creditLimit) * 100)
          : undefined,
      });
      showToast(`${name.trim()} updated`, "success");
      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save customer",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <Input label="Name" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <Input
        label="Credit limit"
        type="number"
        step="0.01"
        min="0"
        placeholder="Leave blank for no limit"
        value={creditLimit}
        onChange={(e) => setCreditLimit(e.target.value)}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      <Button type="submit" loading={saving} className="self-start">
        <Check size={16} />
        Save changes
      </Button>
    </form>
  );
}

export default function CustomerManagementPage() {
  const { money } = useSettings();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [creditFilter, setCreditFilter] = useState<CreditFilter>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    listCustomers().then(setCustomers);
  }

  useEffect(reload, []);

  const visible = useMemo(
    () => filterCustomers(customers, query, creditFilter),
    [customers, query, creditFilter],
  );

  const exportColumns: ExportColumn<Customer>[] = [
    { key: "code", header: "Code", value: (c) => c.code },
    { key: "name", header: "Name", value: (c) => c.name },
    { key: "first_name", header: "First Name", value: (c) => c.first_name ?? "" },
    { key: "last_name", header: "Last Name", value: (c) => c.last_name ?? "" },
    { key: "phone", header: "Phone", value: (c) => c.phone ?? "" },
    { key: "email", header: "Email", value: (c) => c.email ?? "" },
    { key: "points", header: "Points", value: (c) => c.points },
    {
      key: "credit_limit",
      header: "Credit Limit",
      value: (c) => (c.credit_limit_cents !== undefined ? (c.credit_limit_cents / 100).toFixed(2) : "No limit"),
    },
    { key: "opening_balance", header: "Opening Balance", value: (c) => (c.opening_balance_cents / 100).toFixed(2) },
    { key: "total_sale_due", header: "Total Sale Due", value: (c) => (c.total_sale_due_cents / 100).toFixed(2) },
    {
      key: "total_sell_return_due",
      header: "Total Sell Return Due",
      value: (c) => (c.total_sell_return_due_cents / 100).toFixed(2),
    },
  ];

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCustomer(pendingDelete.id);
      showToast(`Deleted ${pendingDelete.name}`, "success");
      setSelectedIds((current) => current.filter((id) => id !== pendingDelete.id));
      setPendingDelete(null);
      reload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not delete customer",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataColumn<Customer>[] = [
    {
      key: "action",
      header: "Action",
      render: (customer) => (
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setEditing(customer)}
            aria-label={`Edit ${customer.name}`}
            title="Edit"
            className={`${ACTION_BUTTON_CLASSES} text-emerald-600 hover:bg-surface-container dark:text-emerald-400 dark:hover:bg-zinc-800`}
          >
            <Pencil size={15} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(customer)}
            aria-label={`Delete ${customer.name}`}
            title="Delete"
            className={`${ACTION_BUTTON_CLASSES} text-error hover:bg-surface-container dark:text-red-400 dark:hover:bg-zinc-800`}
          >
            <X size={15} aria-hidden />
          </button>
        </span>
      ),
    },
    {
      key: "code",
      header: "Code",
      sortValue: (customer) => customer.code,
      render: (customer) => customer.code,
    },
    {
      key: "name",
      header: "Name",
      sortValue: (customer) => customer.name,
      render: (customer) => (
        <span className="font-medium text-secondary dark:text-blue-400">{customer.name}</span>
      ),
    },
    {
      key: "first_name",
      header: "First Name",
      hideOnMobile: true,
      render: (customer) => customer.first_name ?? "—",
    },
    {
      key: "last_name",
      header: "Last Name",
      hideOnMobile: true,
      render: (customer) => customer.last_name ?? "—",
    },
    { key: "phone", header: "Phone", render: (customer) => customer.phone ?? "—" },
    {
      key: "email",
      header: "Email",
      hideOnMobile: true,
      render: (customer) => (
        <span className="text-secondary dark:text-blue-400">{customer.email ?? "—"}</span>
      ),
    },
    {
      key: "points",
      header: "Points",
      align: "right",
      sortValue: (customer) => customer.points,
      render: (customer) => customer.points,
    },
    {
      key: "credit_limit",
      header: "Credit Limit",
      hideOnMobile: true,
      render: (customer) =>
        customer.credit_limit_cents !== undefined ? (
          money(customer.credit_limit_cents)
        ) : (
          <span className="font-medium text-secondary dark:text-blue-400">No limit</span>
        ),
    },
    {
      key: "opening_balance",
      header: "Opening Balance",
      align: "right",
      sortValue: (customer) => customer.opening_balance_cents,
      render: (customer) => money(customer.opening_balance_cents),
    },
    {
      key: "total_sale_due",
      header: "Total Sale Due",
      align: "right",
      hideOnMobile: true,
      sortValue: (customer) => customer.total_sale_due_cents,
      render: (customer) => money(customer.total_sale_due_cents),
    },
    {
      key: "total_sell_return_due",
      header: "Total Sell Return Due",
      align: "right",
      hideOnMobile: true,
      sortValue: (customer) => customer.total_sell_return_due_cents,
      render: (customer) => money(customer.total_sell_return_due_cents),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Customer Management"
        breadcrumbs={[
          { label: "Customers", href: ROUTES.people.root },
          { label: "Customer Management" },
        ]}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-zinc-500"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this table"
              aria-label="Search customers"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFilter((open) => !open)}
              aria-expanded={showFilter}
            >
              <Filter size={15} />
              Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportPdf("Customer Management", visible, exportColumns)}
            >
              <FileText size={15} />
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportExcel("customers", "Customer Management", visible, exportColumns)}
            >
              <FileSpreadsheet size={15} />
              EXCEL
            </Button>
            <Link
              href={ROUTES.people.import}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-xs font-medium text-on-secondary transition-colors hover:bg-secondary/90 dark:bg-white dark:text-zinc-900"
            >
              <Upload size={15} />
              Import Customers
            </Link>
            <Link
              href={ROUTES.people.new}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-medium text-on-primary transition-colors hover:bg-primary/90"
            >
              <Plus size={15} />
              Create
            </Link>
          </div>
        </div>

        {showFilter && (
          <div className="animate-fade-in mt-4 max-w-xs">
            <Select
              label="Credit limit"
              value={creditFilter}
              onChange={(event) => setCreditFilter(event.target.value as CreditFilter)}
              placeholder="All customers"
              options={[
                { value: "limit", label: "Credit limit set" },
                { value: "no-limit", label: "No limit" },
              ]}
            />
          </div>
        )}

        <div className="-mx-5 mt-4">
          <DataTable
            columns={columns}
            rows={visible}
            rowKey={(customer) => customer.id}
            emptyMessage="No customers yet."
            caption="Customers"
            textSizeClassName="text-xs"
            pageSizeOptions={[10, 25, 50]}
            selection={{ selectedIds, onChange: setSelectedIds }}
          />
        </div>
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit customer"
        size="sm"
      >
        {editing && (
          <EditCustomerForm
            key={editing.id}
            customer={editing}
            onClose={() => setEditing(null)}
            onSaved={reload}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete customer"
        message={`Delete ${pendingDelete?.name ?? "this customer"}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
