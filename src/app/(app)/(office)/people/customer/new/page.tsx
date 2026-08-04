"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createCustomer } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

export default function CreateCustomerPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
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
      const creditLimitCents = creditLimit.trim()
        ? Math.round(Number(creditLimit) * 100)
        : undefined;
      await createCustomer({
        name: name.trim(),
        ...(firstName.trim() ? { first_name: firstName.trim() } : {}),
        ...(lastName.trim() ? { last_name: lastName.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(creditLimitCents !== undefined ? { credit_limit_cents: creditLimitCents } : {}),
      });
      showToast(`${name.trim()} added`, "success");
      router.push(ROUTES.people.root);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save customer",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Create Customer"
        description="Add a new customer record."
        breadcrumbs={[
          { label: "People" },
          { label: "Customers", href: ROUTES.people.root },
          { label: "Create Customer" },
        ]}
      />

      <Card>
        <form
          className="mx-auto flex w-full max-w-lg flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Input
            label="Name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <Input
            label="Credit limit"
            type="number"
            step="0.01"
            min="0"
            placeholder="Leave blank for no limit"
            value={creditLimit}
            onChange={(event) => setCreditLimit(event.target.value)}
          />
          {error && <p className="text-xs text-error">{error}</p>}
          <Button type="submit" loading={saving} className="self-start">
            <Check size={16} />
            Save customer
          </Button>
        </form>
      </Card>
    </div>
  );
}
