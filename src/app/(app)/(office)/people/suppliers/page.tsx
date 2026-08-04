"use client";

import { useEffect, useState } from "react";
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from "@/lib/db";
import type { Supplier } from "@/lib/types";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    listSuppliers().then(setSuppliers);
  }, []);

  async function refresh() {
    setSuppliers(await listSuppliers());
  }

  function openNew() {
    setEditing(null);
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setName(supplier.name);
    setContactName(supplier.contact_name ?? "");
    setPhone(supplier.phone ?? "");
    setEmail(supplier.email ?? "");
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name) return;
    const values = {
      name,
      ...(contactName ? { contact_name: contactName } : {}),
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    };
    if (editing) {
      await updateSupplier(editing.id, values);
    } else {
      await createSupplier(values);
    }
    setModalOpen(false);
    refresh();
    showToast("Supplier saved", "success");
  }

  const columns: TableColumn<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      render: (supplier) => (
        <button type="button" onClick={() => openEdit(supplier)} className="hover:underline">
          {supplier.name}
        </button>
      ),
    },
    { key: "contact", header: "Contact", render: (s) => s.contact_name ?? "—" },
    { key: "phone", header: "Phone", render: (s) => s.phone ?? "—" },
    {
      key: "actions",
      header: "",
      render: (supplier) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => deleteSupplier(supplier.id).then(refresh)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          Suppliers
        </h1>
        <Button size="sm" onClick={openNew}>
          Add supplier
        </Button>
      </div>
      <Table
        columns={columns}
        rows={suppliers}
        rowKey={(supplier) => supplier.id}
        emptyMessage="No suppliers yet."
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit supplier" : "Add supplier"}
      >
        <div className="flex flex-col gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="button" onClick={handleSave} disabled={!name}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
