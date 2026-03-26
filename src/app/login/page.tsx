"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGitHubSignIn() {
    setLoading(true);
    await signIn("github", { callbackUrl: "/" });
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
      <div style={{
        background: "var(--md-surface-container-lowest)",
        border: "1px solid var(--md-outline-variant)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-10) var(--space-8)",
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ fontSize: "3.5rem", marginBottom: "var(--space-4)" }}>🥗</div>

        <h1 style={{
          fontSize: "1.625rem",
          fontWeight: 800,
          color: "var(--md-primary)",
          letterSpacing: "-0.03em",
          marginBottom: "var(--space-2)",
        }}>
          Nutrition Tracker
        </h1>

        <p style={{
          fontSize: "0.9375rem",
          color: "var(--md-on-surface-variant)",
          marginBottom: "var(--space-8)",
          lineHeight: 1.6,
        }}>
          Track your daily nutrition, macros and goals.
          <br />Sign in to access your data.
        </p>

        {/* GitHub sign-in button */}
        <button
          onClick={handleGitHubSignIn}
          disabled={loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-3)",
            background: "#24292e",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-3) var(--space-5)",
            fontSize: "0.9375rem",
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.2s, transform 0.1s",
            fontFamily: "inherit",
          }}
        >
          {/* GitHub icon */}
          <svg width="20" height="20" viewBox="0 0 98 96" fill="white">
            <path d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" />
          </svg>
          {loading ? "Signing in…" : "Sign in with GitHub"}
        </button>

        <p style={{
          fontSize: "0.75rem",
          color: "var(--md-on-surface-variant)",
          marginTop: "var(--space-5)",
          opacity: 0.7,
        }}>
          Your data is private to your account only.
        </p>
      </div>
    </div>
  );
}

