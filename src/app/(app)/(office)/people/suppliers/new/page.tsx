"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupplier } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

function RequiredMark() {
  return (
    <span className="ml-1 text-error" aria-hidden>
      *
    </span>
  );
}

export default function CreateSupplierPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
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
      await createSupplier({
        name: name.trim(),
        contact_name: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        tax_number: taxNumber.trim() || undefined,
        payment_terms: paymentTerms.trim() || undefined,
      });
      showToast(`${name.trim()} added`, "success");
      router.push(ROUTES.suppliers);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not save supplier",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Create"
        breadcrumbs={[
          { label: "Suppliers", href: ROUTES.suppliers },
          { label: "Create" },
        ]}
      />

      <Card>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={
                <>
                  Name
                  <RequiredMark />
                </>
              }
              placeholder="Name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label="Contact Name"
              placeholder="Contact Name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              placeholder="Phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Input
              label="Email"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="City"
              placeholder="City"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <Input
              label="Tax Number"
              placeholder="Tax Number"
              value={taxNumber}
              onChange={(event) => setTaxNumber(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Payment Terms"
              placeholder="e.g. Net 30"
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
            />
            <Input
              label="Address"
              placeholder="Address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}

          <div className="flex items-center gap-2">
            <Button type="submit" loading={saving}>
              Submit
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(ROUTES.suppliers)}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
