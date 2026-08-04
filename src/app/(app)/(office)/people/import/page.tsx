import { PageHeader, Card } from "@/components/ui/PageHeader";
import { ROUTES } from "@/lib/types/routes";

export default function ImportCustomersPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Import Customers"
        description="Bulk import customer records from a file."
        breadcrumbs={[
          { label: "People" },
          { label: "Customers", href: ROUTES.people.root },
          { label: "Import Customers" },
        ]}
      />

      <Card>
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          Not implemented yet.
        </p>
      </Card>
    </div>
  );
}
