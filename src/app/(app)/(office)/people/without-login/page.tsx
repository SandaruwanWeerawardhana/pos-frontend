import { PageHeader, Card } from "@/components/ui/PageHeader";
import { ROUTES } from "@/lib/types/routes";

export default function CustomersWithoutLoginPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Customers without Login"
        description="Customers who have not registered a client portal login."
        breadcrumbs={[
          { label: "People" },
          { label: "Customers", href: ROUTES.people.root },
          { label: "Without Login" },
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
