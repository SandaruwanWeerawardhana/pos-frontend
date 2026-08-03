"use client";

import { Fragment, useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { isPosOnly, listRoles, listStaffUsers } from "@/lib/db";
import { PERMISSIONS, type Role, type StaffUser } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { ROUTES } from "@/lib/types/routes";

// Permission strings are `resource.action`; the screen groups by resource so a
// twelve-row matrix stays readable on a till-sized display.
function resourceOf(permission: string): string {
  return permission.split(".")[0];
}

const RESOURCE_LABELS: Record<string, string> = {
  pos: "Point of sale",
  products: "Products",
  inventory: "Inventory",
  purchases: "Purchasing",
  reports: "Reports",
  settings: "Settings",
  users: "Users",
};

export default function GroupPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);

  useEffect(() => {
    void (async () => {
      const [roleList, staff] = await Promise.all([
        listRoles(),
        listStaffUsers(),
      ]);
      setRoles(roleList);
      setUsers(staff);
    })();
  }, []);

  const resources = Array.from(new Set(PERMISSIONS.map(resourceOf)));

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Group Permissions"
        description="What each group can do. Groups are built in and their permissions are fixed — change a person's access by moving them to another group on the Users screen."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Users", href: ROUTES.users.root },
          { label: "Group Permissions" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-on-surface dark:text-zinc-100">
                  {role.name}
                </p>
                <p className="mt-0.5 text-xs text-on-surface-variant dark:text-zinc-400">
                  {users.filter((user) => user.role_id === role.id).length} member(s)
                  · {role.permissions.length} of {PERMISSIONS.length} permissions
                </p>
              </div>
              <Badge variant={isPosOnly(role.permissions) ? "neutral" : "success"}>
                {isPosOnly(role.permissions) ? "Till only" : "Back office"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader title="Permission matrix" />
        <div className="overflow-x-auto rounded-xl border border-outline-variant dark:border-zinc-800">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <caption className="sr-only">Permissions granted to each group</caption>
            <thead>
              <tr className="border-b border-outline-variant dark:border-zinc-800">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500"
                >
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    scope="col"
                    className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <Fragment key={resource}>
                  <tr className="bg-surface-container-low dark:bg-zinc-900">
                    <th
                      scope="colgroup"
                      colSpan={roles.length + 1}
                      className="px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500"
                    >
                      {RESOURCE_LABELS[resource] ?? resource}
                    </th>
                  </tr>
                  {PERMISSIONS.filter(
                    (permission) => resourceOf(permission) === resource,
                  ).map((permission) => (
                    <tr
                      key={permission}
                      className="border-t border-outline-variant/60 dark:border-zinc-800/60"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 text-left font-normal text-on-surface dark:text-zinc-200"
                      >
                        <code className="text-xs">{permission}</code>
                      </th>
                      {roles.map((role) => {
                        const granted = role.permissions.includes(permission);
                        return (
                          <td key={role.id} className="px-3 py-2 text-center">
                            <span className="sr-only">
                              {granted ? "Granted" : "Not granted"}
                            </span>
                            {granted ? (
                              <Check
                                size={16}
                                aria-hidden
                                className="mx-auto text-primary dark:text-blue-400"
                              />
                            ) : (
                              <Minus
                                size={16}
                                aria-hidden
                                className="mx-auto text-on-surface-variant/40 dark:text-zinc-700"
                              />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
