import { PageHeader, Card } from "@/components/ui/PageHeader";
import { ROUTES } from "@/lib/types/routes";

export default function CreateCustomerPage() {
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
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          Not implemented yet.
        </p>
      </Card>
    </div>
  );
}
