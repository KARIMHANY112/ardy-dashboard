"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, ApiError } from "@/lib/api";
import { saveSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = await login(email, password);
      if (token.user.role !== "owner") {
        setError("This account isn't an owner account.");
        return;
      }
      saveSession(token.access_token, token.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <form className="card" onSubmit={handleSubmit}>
        <h1 style={{ marginTop: 0, marginBottom: 24, fontSize: 22 }}>Owner Login</h1>
        {error && <div className="error-text">{error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Log In"}
        </button>
      </form>
    </div>
  );
}
