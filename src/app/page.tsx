import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col justify-center space-y-6 px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-medium uppercase tracking-wide text-gray-600">Curbside Gold</p>
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        You can pick it up for only $5.00.
      </h1>
      <div className="space-y-2 text-base text-gray-700">
        <p>These are items being thrown out as garbage, but we know it&apos;s not garbage to some.</p>
        <p>Most items consist of unwanted furniture of all types.</p>
        <p>You aren&apos;t charged until you check the &apos;I Picked It Up&apos; box.</p>
        <p>If the item is gone when you arrive, just check the box and you pay nothing.</p>
      </div>
      <div>
        <Link
          href="/items"
          className="inline-flex rounded-md bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          This garbage is located at this location. Address provided only after paying $5.00.
        </Link>
      </div>
    </main>
  );
}
