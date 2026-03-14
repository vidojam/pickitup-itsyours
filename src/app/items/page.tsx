import { ItemsFeed } from "@/components/ItemsFeed";

export default function ItemsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Available Curbside Items</h1>
        <p className="text-sm text-gray-700">
          Browse live listings. Once a card authorization succeeds, that item is locked and hidden from everyone else.
        </p>
      </header>
      <ItemsFeed />
    </main>
  );
}
