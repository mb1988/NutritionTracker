import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { isSignInAllowed } from "@/lib/auth";

describe("isSignInAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("only lets the allowlisted GitHub username in", () => {
    vi.stubEnv("ALLOWED_GITHUB_USERNAME", "owner");
    expect(isSignInAllowed("github", { login: "owner" })).toBe(true);
    expect(isSignInAllowed("github", { login: "someone-else" })).toBe(false);
  });

  it("matches the allowlisted Google email case-insensitively", () => {
    vi.stubEnv("ALLOWED_GOOGLE_EMAIL", "Owner@Example.com");
    expect(isSignInAllowed("google", { email: "owner@example.com", email_verified: true })).toBe(true);
    expect(isSignInAllowed("google", { email: "other@example.com", email_verified: true })).toBe(false);
  });

  it("rejects unverified Google emails", () => {
    vi.stubEnv("ALLOWED_GOOGLE_EMAIL", "owner@example.com");
    expect(isSignInAllowed("google", { email: "owner@example.com", email_verified: false })).toBe(false);
  });

  it("does not apply the GitHub allowlist to Google sign-ins", () => {
    vi.stubEnv("ALLOWED_GITHUB_USERNAME", "owner");
    vi.stubEnv("ALLOWED_GOOGLE_EMAIL", "owner@example.com");
    expect(isSignInAllowed("google", { email: "owner@example.com", email_verified: true })).toBe(true);
  });

  it("rejects unknown providers", () => {
    expect(isSignInAllowed("twitter", { email: "owner@example.com" })).toBe(false);
  });
});
