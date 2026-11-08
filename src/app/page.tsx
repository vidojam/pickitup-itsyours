import Link from "next/link";
import { ItemsFeed } from "@/components/ItemsFeed";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col justify-center space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-600">Curbside Gold</p>
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        You can pick it up for only $5.00.
      </h1>
      <div className="accent-text space-y-2 text-xl">
        <p>These are items being thrown out as garbage, but we know it&apos;s not garbage to some.</p>
        <p>Most items consist of unwanted furniture of all types.</p>
        <p>You aren&apos;t charged until you tap the &apos;I Picked It Up&apos; button.</p>
        <p>If the item is gone when you arrive, just tap &apos;Not Picked Up&apos; and you pay nothing.</p>
      </div>
      <section className="space-y-3" aria-label="Available curbside locations">
        <h2 className="text-2xl font-bold">Available Curbside Locations</h2>
        <ItemsFeed limit={3} />
      </section>
      <div>
        <Link href="/items" className="text-sm underline">
          See all available items
        </Link>
      </div>
    </main>
  );
}
