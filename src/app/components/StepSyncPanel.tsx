"use client";

import { useEffect, useMemo, useState } from "react";
import { type StepSyncProvider } from "@/server/contracts/stepSync";
import { useStepSync } from "@/app/hooks/useStepSync";

type Props = {
  enabled: boolean;
  onRefreshData: () => Promise<void>;
};

export function StepSyncPanel({ enabled, onRefreshData }: Props) {
  const { config, loading, actionLoading, error, latestToken, refresh, regenerate, disable, clearLatestToken } = useStepSync(enabled);
  const [origin, setOrigin] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [refreshingData, setRefreshingData] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const webhookUrl = useMemo(() => {
    if (!config) return "";
    return origin ? `${origin}${config.webhookPath}` : config.webhookPath;
  }, [config, origin]);

  if (!enabled) {
    return null;
  }

  async function copyText(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      setCopiedKey(null);
    }
  }

  async function handleRefresh() {
    setRefreshingData(true);
    try {
      await Promise.all([refresh(), onRefreshData()]);
    } finally {
      setRefreshingData(false);
    }
  }

  const connected = Boolean(config?.enabled);
  const activeProvider = config?.provider ?? null;

  return (
    <div className="card" style={{ padding: "var(--space-6)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 800, letterSpacing: "-0.02em" }}>👟 Phone step sync</h2>
            <StatusBadge connected={connected} provider={activeProvider} />
          </div>
          <p style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.5, maxWidth: 760 }}>
            Browsers cannot read Apple Health or Android Health Connect directly, so this uses a secure webhook flow.
            Start with iPhone: a Shortcut reads your Health steps and sends them into the app automatically.
          </p>
        </div>

        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => void handleRefresh()}
          disabled={loading || actionLoading || refreshingData}
          style={{ whiteSpace: "nowrap" }}
        >
          {loading || refreshingData ? "Refreshing…" : "Refresh sync status"}
        </button>
      </div>

      {error && (
        <div className="alert-error" style={{ marginTop: "var(--space-4)" }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
        <div className="card-inset" style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-primary)" }}>
                iPhone / Apple Health
              </div>
              <p style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.45 }}>
                Best current option: Apple Shortcuts reads today&apos;s Steps total from Health and posts it to your account.
              </p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={loading || actionLoading}
                onClick={() => void regenerate("ios-shortcuts")}
              >
                {connected && activeProvider === "ios-shortcuts" ? "Rotate iPhone token" : "Connect iPhone"}
              </button>
              {connected && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={actionLoading}
                  onClick={() => void disable()}
                >
                  Disable sync
                </button>
              )}
            </div>
          </div>

          <SyncFacts config={config} />

          {latestToken && config && (
            <div className="card-inset" style={{ padding: "var(--space-4)", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.22)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#f7c673" }}>
                    Save this token now
                  </div>
                  <p style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.45 }}>
                    For safety, the full token is only shown right after generation. If you lose it, rotate it and update your Shortcut.
                  </p>
                </div>
                <button type="button" className="btn-ghost btn-sm" onClick={clearLatestToken}>
                  Hide token
                </button>
              </div>

              <FieldBlock
                label="Webhook URL"
                value={webhookUrl}
                actionLabel={copiedKey === "webhook" ? "Copied" : "Copy"}
                onAction={() => void copyText("webhook", webhookUrl)}
              />
              <FieldBlock
                label="Bearer token"
                value={latestToken}
                actionLabel={copiedKey === "token" ? "Copied" : "Copy"}
                onAction={() => void copyText("token", latestToken)}
                monospace
              />
            </div>
          )}

          {config && (
            <InstructionsCard
              webhookUrl={webhookUrl}
              provider="ios-shortcuts"
              token={latestToken}
              copiedKey={copiedKey}
              onCopy={copyText}
            />
          )}
        </div>

        <div className="card-inset" style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-on-surface)" }}>
                Android / Health Connect
              </div>
              <p style={{ marginTop: 6, fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.45 }}>
                Server support is prepared, but the Android setup flow is not polished yet. iPhone sync is the first supported path.
              </p>
            </div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--md-on-surface-variant)" }}>
              Coming soon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ connected, provider }: { connected: boolean; provider: StepSyncProvider | null }) {
  const label = !connected
    ? "Not connected"
    : provider === "ios-shortcuts"
      ? "iPhone connected"
      : provider === "android-health-connect"
        ? "Android connected"
        : "Connected";

  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: "var(--radius-full)",
      fontSize: "0.6875rem",
      fontWeight: 800,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      background: connected ? "rgba(104, 185, 132, 0.12)" : "rgba(255,255,255,0.06)",
      color: connected ? "var(--md-primary)" : "var(--md-on-surface-variant)",
    }}>
      {label}
    </span>
  );
}

function SyncFacts({ config }: { config: { enabled: boolean; provider: StepSyncProvider | null; tokenHint: string | null; lastSyncedAt: string | null } | null }) {
  if (!config) {
    return null;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
      <FactPill label="Provider" value={config.provider === "ios-shortcuts" ? "iPhone Shortcut" : config.provider === "android-health-connect" ? "Android bridge" : "Not set"} />
      <FactPill label="Token" value={config.tokenHint ?? "Not generated yet"} monospace />
      <FactPill label="Last synced" value={formatDateTime(config.lastSyncedAt)} />
    </div>
  );
}

function InstructionsCard({ webhookUrl, provider, token, copiedKey, onCopy }: {
  webhookUrl: string;
  provider: StepSyncProvider;
  token: string | null;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
}) {
  const examplePayload = JSON.stringify({
    date: "2026-04-01",
    steps: 10432,
    provider,
  }, null, 2);

  const exampleCurl = [
    `curl -X POST "${webhookUrl || "https://your-app.example.com/api/steps/sync"}"`,
    `  -H "Authorization: Bearer ${token ?? "YOUR_TOKEN"}"`,
    '  -H "Content-Type: application/json"',
    `  -d '${JSON.stringify({ date: "2026-04-01", steps: 10432, provider })}'`,
  ].join("\n");

  return (
    <div className="card-inset" style={{ padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-primary)" }}>
          iPhone setup
        </div>
        <ol style={{ margin: "10px 0 0", paddingLeft: "1.1rem", fontSize: "0.8125rem", color: "var(--md-on-surface-variant)", lineHeight: 1.55 }}>
          <li>Open <strong>Shortcuts</strong> on your iPhone and create a shortcut or personal automation.</li>
          <li>Add the Health action that returns <strong>today&apos;s Steps total</strong>.</li>
          <li>Add a web request action that POSTs JSON to the webhook URL below.</li>
          <li>Set the <strong>Authorization</strong> header to <code>Bearer YOUR_TOKEN</code>.</li>
          <li>Send JSON with <code>date</code>, <code>steps</code>, and <code>provider</code> = <code>ios-shortcuts</code>.</li>
        </ol>
      </div>

      <FieldBlock
        label="Example JSON body"
        value={examplePayload}
        actionLabel={copiedKey === "payload" ? "Copied" : "Copy"}
        onAction={() => void onCopy("payload", examplePayload)}
        monospace
      />

      <FieldBlock
        label="Quick test from a terminal"
        value={exampleCurl}
        actionLabel={copiedKey === "curl" ? "Copied" : "Copy"}
        onAction={() => void onCopy("curl", exampleCurl)}
        monospace
      />
    </div>
  );
}

function FieldBlock({ label, value, actionLabel, onAction, monospace = false }: {
  label: string;
  value: string;
  actionLabel: string;
  onAction: () => void;
  monospace?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-on-surface-variant)" }}>
          {label}
        </span>
        <button type="button" className="btn-ghost btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: "12px 14px",
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.04)",
        color: "var(--md-on-surface)",
        fontSize: "0.75rem",
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: monospace ? "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" : undefined,
      }}>{value || "Generate a token to see this value."}</pre>
    </div>
  );
}

function FactPill({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div style={{
      borderRadius: "var(--radius-md)",
      background: "rgba(255,255,255,0.04)",
      padding: "10px 12px",
      display: "grid",
      gap: 4,
    }}>
      <span style={{ fontSize: "0.625rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--md-on-surface-variant)" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.8125rem", fontWeight: 700, fontFamily: monospace ? "var(--font-geist-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

