"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createSupplier } from "@/lib/db";
import type { Supplier } from "@/lib/types";

interface SupplierQuickAddModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
}

// Adding a supplier mid-form is a common interruption ("this line is from a
// new wholesaler"). Doing it here rather than sending the user to /suppliers
// is what keeps the half-filled product form alive.
export function SupplierQuickAddModal({
  open,
  onClose,
  onCreated,
}: Readonly<SupplierQuickAddModalProps>) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: async (supplier) => {
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast(`${supplier.name} added`, "success");
      onCreated(supplier);
      reset();
    },
    onError: () => showToast("Could not add supplier", "error"),
  });

  function reset() {
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Supplier name is required");
      return;
    }
    setError("");
    mutation.mutate({
      name: trimmed,
      ...(contactName.trim() ? { contact_name: contactName.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add supplier"
      description="Saved locally and available everywhere in the app."
      size="md"
      glass
    >
      {/* Nested inside the product <form> would be invalid HTML, so this modal
          renders its own form — the portal-less Modal still sits in the same
          tree, hence the explicit stopPropagation on submit. */}
      <form
        onSubmit={(event) => {
          event.stopPropagation();
          handleSubmit(event);
        }}
        className="flex flex-col gap-4"
      >
        <Input
          label="Supplier name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error}
          autoComplete="organization"
          required
        />
        <Input
          label="Contact person"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          autoComplete="name"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
          />
          <Input
            label="Email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Add supplier"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
