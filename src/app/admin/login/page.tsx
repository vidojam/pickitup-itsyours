"use client";

import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to login.");
      }

      window.location.href = "/admin";
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to login.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <form onSubmit={onLogin} className="w-full space-y-4 rounded-lg border border-gray-300 p-5">
        <h1 className="text-xl font-bold">Private Admin Login</h1>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input name="password" type="password" required className="w-full rounded-md border border-gray-300 p-2" />
        </div>
        <button type="submit" disabled={loading} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? "Logging in..." : "Login"}
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </main>
  );
}
