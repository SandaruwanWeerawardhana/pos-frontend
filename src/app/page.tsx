import Link from "next/link";
import { LandingHeader } from "@/components/shell/landing-header";
import { ROUTES } from "@/lib/types/routes";

const features = [
  {
    title: "Offline-first",
    description:
      "IndexedDB is the source of truth. Sales, cart, and product lookups keep working with no connection at all.",
  },
  {
    title: "Background sync",
    description:
      "Pending orders reconcile with the server automatically in the background, no manual refresh required.",
  },
  {
    title: "Fast local search",
    description:
      "Product search runs against the local cache, so checkout stays instant even on a slow network.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <LandingHeader />
      <main className="flex flex-1 flex-col items-center px-6">
        <section className="flex w-full max-w-3xl flex-col items-center gap-6 py-24 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Point of sale that works with or without the internet.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            A local-first POS built for busy counters. Every sale is saved
            instantly on the device and synced to the server the moment
            connectivity comes back.
          </p>
          <Link
            href={ROUTES.login}
            className="mt-2 rounded-full bg-zinc-900 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Login
          </Link>
        </section>

        <section className="grid w-full max-w-4xl grid-cols-1 gap-6 pb-24 sm:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
