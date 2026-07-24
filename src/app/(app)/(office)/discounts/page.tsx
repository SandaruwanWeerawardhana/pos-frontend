"use client";

import { useEffect, useState } from "react";
import {
  createDiscount,
  deleteDiscount,
  listDiscounts,
  updateDiscount,
} from "@/lib/db";
import type { Discount, DiscountType } from "@/lib/types";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountType>("percentage");
  const [value, setValue] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    listDiscounts().then(setDiscounts);
  }, []);

  async function refresh() {
    setDiscounts(await listDiscounts());
  }

  async function handleCreate() {
    const numericValue = Number(value);
    if (!name || !Number.isFinite(numericValue)) return;

    await createDiscount({
      name,
      type,
      value: type === "fixed_cents" ? Math.round(numericValue * 100) : numericValue,
      active: true,
    });
    setName("");
    setValue("");
    setModalOpen(false);
    refresh();
    showToast("Discount created", "success");
  }

  async function toggleActive(discount: Discount) {
    await updateDiscount(discount.id, { active: !discount.active });
    refresh();
  }

  const columns: TableColumn<Discount>[] = [
    { key: "name", header: "Name", render: (d) => d.name },
    {
      key: "value",
      header: "Value",
      render: (d) =>
        d.type === "percentage" ? `${d.value}%` : `$${(d.value / 100).toFixed(2)}`,
    },
    {
      key: "active",
      header: "Status",
      render: (d) => (
        <button type="button" onClick={() => toggleActive(d)}>
          <Badge variant={d.active ? "success" : "neutral"}>
            {d.active ? "Active" : "Inactive"}
          </Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => deleteDiscount(d.id).then(refresh)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Discounts
        </h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add discount
        </Button>
      </div>
      <Table
        columns={columns}
        rows={discounts}
        rowKey={(discount) => discount.id}
        emptyMessage="No discounts yet."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add discount">
        <div className="flex flex-col gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DiscountType)}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed_cents">Fixed amount</option>
            </select>
          </label>
          <Input
            label={type === "percentage" ? "Percentage (0-100)" : "Amount"}
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
          <Button type="button" onClick={handleCreate} disabled={!name || !value}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
