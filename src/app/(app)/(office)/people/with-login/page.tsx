import { PageHeader, Card } from "@/components/ui/PageHeader";
import { ROUTES } from "@/lib/types/routes";

export default function CustomersWithLoginPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Customers with Login"
        description="Customers who have a registered client portal login."
        breadcrumbs={[
          { label: "People" },
          { label: "Customers", href: ROUTES.people.root },
          { label: "With Login" },
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
