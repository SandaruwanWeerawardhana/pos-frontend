"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteCustomer, getCustomer, updateCustomer } from "@/lib/db";
import type { Customer } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null | undefined>(
    undefined,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    getCustomer(id).then((found) => {
      setCustomer(found ?? null);
      if (found) {
        setName(found.name);
        setPhone(found.phone ?? "");
        setEmail(found.email ?? "");
        setNotes(found.notes ?? "");
      }
    });
  }, [id]);

  async function handleSave() {
    await updateCustomer(id, {
      name,
      phone: phone || undefined,
      email: email || undefined,
      notes: notes || undefined,
    });
    showToast("Customer saved", "success");
  }

  async function handleDelete() {
    await deleteCustomer(id);
    showToast("Customer deleted", "success");
    router.push(ROUTES.customers.root);
  }

  if (customer === undefined) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  if (customer === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Customer not found.
        </p>
        <Link href={ROUTES.customers.root} className="text-sm hover:underline">
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Edit customer
        </h1>
        <Link
          href={ROUTES.customers.root}
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back
        </Link>
      </div>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={handleSave}>
          Save
        </Button>
        <Button type="button" variant="danger" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}
