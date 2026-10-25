import { describe, it, expect, vi, afterEach } from "vitest";

// These modules are server-only; stub the guard so they can be imported in tests.
vi.mock("server-only", () => ({}));

import { safeNextPath } from "./safe-redirect";
import { escapeHtml } from "./email/templates/layout";
import { welcomeEmail, loanRejectedEmail } from "./email/templates";
import { getKycProvider } from "./kyc";

describe("safeNextPath (open-redirect protection)", () => {
  const origin = "https://sanrit.example";

  it("allows normal same-site paths", () => {
    expect(safeNextPath("/reset-password", origin)).toBe("/reset-password");
    expect(safeNextPath("/dashboard/loans?x=1", origin)).toBe("/dashboard/loans?x=1");
    expect(safeNextPath(null, origin)).toBe("/dashboard");
  });

  it.each(["@evil.com", ".evil.com", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/ok\r\nSet-Cookie:x=1"])(
    "refuses %j",
    (attack) => {
      expect(safeNextPath(attack, origin)).toBe("/dashboard");
    }
  );
});

describe("email HTML escaping", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;");
  });

  it("neutralises HTML smuggled in through a user's name", () => {
    const body = JSON.stringify(welcomeEmail(`<a href="https://evil.example">Verify your account</a>`));
    expect(body).not.toContain('<a href=\\"https://evil.example\\">');
    expect(body).toContain("&lt;a href=");
  });

  it("neutralises HTML in a rejection reason", () => {
    const body = JSON.stringify(loanRejectedEmail("Ada", `<img src=x onerror=alert(1)>`));
    expect(body).not.toContain("<img src=x");
  });
});

describe("KYC provider selection fails closed in production", () => {
  afterEach(() => vi.unstubAllEnvs());

  const setEnv = (env: Record<string, string>) => {
    for (const k of ["NODE_ENV", "DOJAH_APP_ID", "DOJAH_SECRET_KEY", "DOJAH_ENV", "KYC_ALLOW_TEST_MODE"]) vi.stubEnv(k, "");
    for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  };
  const verifies = async () => (await getKycProvider().verifyNin("12345678901", { fullName: "A B", dateOfBirth: null })).valid;

  it("production with no keys must NOT fall back to the mock that approves anything", async () => {
    setEnv({ NODE_ENV: "production" });
    expect(await verifies()).toBe(false);
  });

  it("production with Dojah SANDBOX keys must refuse (sandbox answers public test values)", async () => {
    setEnv({ NODE_ENV: "production", DOJAH_APP_ID: "id", DOJAH_SECRET_KEY: "key", DOJAH_ENV: "sandbox" });
    expect(await verifies()).toBe(false);
  });

  it("production with LIVE keys uses real Dojah", () => {
    setEnv({ NODE_ENV: "production", DOJAH_APP_ID: "id", DOJAH_SECRET_KEY: "key", DOJAH_ENV: "live" });
    expect(getKycProvider().constructor.name).toBe("DojahKycProvider");
  });

  it("test mode can be enabled deliberately in production", async () => {
    setEnv({ NODE_ENV: "production", KYC_ALLOW_TEST_MODE: "true" });
    expect(await verifies()).toBe(true);
  });

  it("development still works out of the box with the mock", async () => {
    setEnv({ NODE_ENV: "development" });
    expect(await verifies()).toBe(true);
  });
});
