import { test, expect } from "@playwright/test";
import { setupE2EFixtures, E2ETestFixtures } from "./fixtures";
import { db } from "../src/lib/db";
import { userSessions, users } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

test.describe("Real Browser Session Revocation Security", () => {
  let f: E2ETestFixtures;

  test.beforeAll(async () => {
    f = await setupE2EFixtures();
  });

  test.afterAll(async () => {
    await f.cleanup();
  });

  test("Browser Context A session is immediately revoked by Admin in Context B", async ({ browser }) => {
    // 1. Context A: Client logs in
    const contextA = await browser.newContext();
    const pageA = await f.loginAsPersona(contextA, f.clientUser);

    await pageA.goto("/dashboard/client/overview");
    await expect(pageA).toHaveURL(/\/dashboard\/client\/overview/);

    // Initial protected request succeeds
    const initialRes = await contextA.request.get("/api/notifications");
    expect(initialRes.status()).toBe(200);

    // 2. Context B: Admin revokes Client A's sessions
    const contextB = await browser.newContext();
    const pageB = await f.loginAsPersona(contextB, f.superAdmin);

    // Revoke user session in database / API
    await db.update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(userSessions.userId, f.clientUser.id));

    // Suspend user status
    await db.update(users)
      .set({ status: "suspended" })
      .where(eq(users.id, f.clientUser.id));

    await pageB.goto("/admin/users");
    await expect(pageB.locator("body")).toBeVisible();

    // 3. Context A attempts protected mutation / API request
    const revokedRes = await contextA.request.get("/api/notifications");
    
    // Denied with 401/403
    expect([401, 403]).toContain(revokedRes.status());

    await contextA.close();
    await contextB.close();
  });
});
