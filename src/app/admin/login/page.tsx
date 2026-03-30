import { AdminLoginForm } from "@/components/AdminLoginForm";
import { getAdminUsername } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const defaultUsername = getAdminUsername();
  const params = await searchParams;
  const errorMessage = params.error === "mobile-link"
    ? "That phone access link is invalid or expired. Generate a new one from the admin page."
    : null;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <div className="w-full space-y-3">
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        <AdminLoginForm defaultUsername={defaultUsername} />
      </div>
    </main>
  );
}
