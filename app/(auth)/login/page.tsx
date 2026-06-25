"use client";

import { useState, type FormEvent } from "react";
import {
  signInWithEmail,
  sendPasswordReset,
  signInWithGoogle,
  signUpWithEmail,
} from "../../../lib/firebase";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function messageFor(err: unknown): string {
    return err instanceof Error ? err.message : "Something went wrong.";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(messageFor(err));
    }
  }

  async function handleGoogle() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(messageFor(err));
    }
  }

  async function handleReset() {
    setError(null);
    try {
      await sendPasswordReset(email);
    } catch (err) {
      setError(messageFor(err));
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <button type="button" onClick={handleGoogle}>
          Sign in with Google
        </button>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit">
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            className="self-start text-sm underline"
            onClick={handleReset}
          >
            Forgot password?
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup"
            ? "Have an account? Sign in"
            : "Need an account? Sign up"}
        </button>
      </div>
    </main>
  );
}
