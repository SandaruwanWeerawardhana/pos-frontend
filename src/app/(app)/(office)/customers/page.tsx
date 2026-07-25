"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCustomer, listCustomers } from "@/lib/db";
import type { Customer } from "@/lib/types";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/lib/types/routes";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    listCustomers().then(setCustomers);
  }, []);

  async function refresh() {
    setCustomers(await listCustomers());
  }

  async function handleCreate() {
    if (!name) return;
    await createCustomer({
      name,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
    });
    setName("");
    setPhone("");
    setEmail("");
    setModalOpen(false);
    refresh();
  }

  const columns: TableColumn<Customer>[] = [
    {
      key: "name",
      header: "Name",
      render: (customer) => (
        <Link
          href={ROUTES.customers.detail(customer.id)}
          className="hover:underline"
        >
          {customer.name}
        </Link>
      ),
    },
    { key: "phone", header: "Phone", render: (customer) => customer.phone ?? "—" },
    { key: "email", header: "Email", render: (customer) => customer.email ?? "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          Customers
        </h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add customer
        </Button>
      </div>
      <Table
        columns={columns}
        rows={customers}
        rowKey={(customer) => customer.id}
        emptyMessage="No customers yet."
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
          <Button type="button" onClick={handleCreate} disabled={!name}>
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
