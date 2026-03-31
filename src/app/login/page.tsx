"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { DEMO_COOKIE } from "@/lib/demo";

export default function LoginPage() {
  const [loading, setLoading]     = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleGitHubSignIn() {
    setLoading(true);
    await signIn("github", { callbackUrl: "/" });
  }

  async function handleDemo() {
    setDemoLoading(true);
    // Set the demo cookie (30-day expiry)
    document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    try {
      // Seed / reset the demo user data so there's always something to see
      await fetch("/api/demo/reset", { method: "POST" });
    } catch {
      // Non-fatal — demo data may already exist
    }
    window.location.href = "/";
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--md-background)",
      padding: "var(--space-4)",
    }}>
      {/* Ambient glow behind card */}
      <div style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,254,102,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        background: "var(--md-surface-container-high)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-glow)",
        padding: "var(--space-10) var(--space-8)",
        maxWidth: 420,
        width: "100%",
        textAlign: "center",
        position: "relative",
      }}>
        {/* Logo */}
        <div style={{ fontSize: "3.5rem", marginBottom: "var(--space-5)" }}>🥗</div>

        <h1 style={{
          fontSize: "1.75rem",
          fontWeight: 900,
          color: "var(--md-primary-container)",
          letterSpacing: "-0.04em",
          marginBottom: "var(--space-3)",
        }}>
          Nutrition Tracker
        </h1>

        <p style={{
          fontSize: "0.9375rem",
          color: "var(--md-on-surface-variant)",
          marginBottom: "var(--space-8)",
          lineHeight: 1.7,
        }}>
          Track your daily nutrition, macros and goals.
        </p>

        {/* GitHub sign-in button */}
        <button
          onClick={handleGitHubSignIn}
          disabled={loading || demoLoading}
          className="btn-tonal"
          style={{
            width: "100%",
            padding: "var(--space-4) var(--space-6)",
            fontSize: "0.9375rem",
            fontWeight: 700,
            gap: "var(--space-3)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 98 96" fill="currentColor">
            <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
          </svg>
          {loading ? "Signing in…" : "Sign in with GitHub"}
        </button>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
          margin: "var(--space-5) 0",
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--md-on-surface-variant)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Try Demo button */}
        <button
          onClick={handleDemo}
          disabled={loading || demoLoading}
          style={{
            width: "100%",
            padding: "var(--space-4) var(--space-6)",
            fontSize: "0.9375rem",
            fontWeight: 700,
            borderRadius: "var(--radius-full)",
            border: "1px solid rgba(104, 185, 132, 0.35)",
            background: "rgba(104, 185, 132, 0.08)",
            color: "var(--md-primary)",
            cursor: "pointer",
            transition: "all var(--transition)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-3)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🚀</span>
          {demoLoading ? "Setting up demo…" : "Try Demo — no sign-in needed"}
        </button>

        {/* Footer note */}
        <p style={{
          fontSize: "0.75rem",
          color: "var(--md-on-surface-variant)",
          marginTop: "var(--space-6)",
          opacity: 0.6,
        }}>
          Demo loads 12 days of sample data you can explore and edit.
        </p>
      </div>
    </div>
  );
}
