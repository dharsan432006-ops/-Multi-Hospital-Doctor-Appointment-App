import { test, expect } from '@playwright/test';
import { USERS, PASSWORDS, loginAs } from './helpers';

/** Admin adds a hospital, sees the unverified badge, and finds the audit trail. */
test('admin adds a hospital and sees audit trail', async ({ page }) => {
  await loginAs(page, USERS.admin, PASSWORDS.admin);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();

  const name = `E2E Test Hospital ${Date.now()}`;
  await page.getByLabel(/new hospital name/i).fill(name);
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByText(/hospital created/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  // New hospitals are unverified by default → pending-verification badge.
  await expect(page.getByText(/details pending verification/i).first()).toBeVisible();

  // Audit log tab shows admin actions.
  await page.getByRole('tab', { name: /audit log/i }).click();
  await expect(page.getByText(/HOSPITAL|CREATE|hospital/i).first()).toBeVisible({ timeout: 15_000 });
});
