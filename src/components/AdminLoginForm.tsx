"use client";

import { FormEvent, useState } from "react";

export function AdminLoginForm({ defaultUsername }: { defaultUsername: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
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
    <form onSubmit={onLogin} className="w-full space-y-4 rounded-lg border border-gray-300 p-5">
      <h1 className="text-xl font-bold">Private Admin Login</h1>
      <p className="text-sm text-gray-600">Default username: {defaultUsername}</p>
      <div>
        <label className="mb-1 block text-sm font-medium">Username</label>
        <input name="username" type="text" required defaultValue={defaultUsername} className="w-full rounded-md border border-gray-300 p-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Password</label>
        <input name="password" type="password" required className="w-full rounded-md border border-gray-300 p-2" />
      </div>
      <button type="submit" disabled={loading} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading ? "Logging in..." : "Login"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}