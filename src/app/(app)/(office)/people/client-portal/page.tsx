import { PageHeader, Card } from "@/components/ui/PageHeader";
import { ROUTES } from "@/lib/types/routes";

export default function ClientPortalPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Client Portal"
        description="Manage client portal access and settings."
        breadcrumbs={[
          { label: "People" },
          { label: "Customers", href: ROUTES.people.root },
          { label: "Client Portal" },
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
