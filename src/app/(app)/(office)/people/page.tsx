import { PageHeader, Card } from "@/components/ui/PageHeader";

export default function CustomersPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Customers"
        description="Customer records will appear here."
        breadcrumbs={[{ label: "People" }, { label: "Customers" }]}
      />

      <Card>
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          Not implemented yet.
        </p>
      </Card>
    </div>
  );
}
