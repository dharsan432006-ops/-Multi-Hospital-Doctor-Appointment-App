import { test, expect } from '@playwright/test';
import { USERS, PASSWORDS, loginAs } from './helpers';

/** Doctor sets weekly availability (JSON editor) and adds a time-off block. */
test('doctor sets availability and time-off', async ({ page }) => {
  await loginAs(page, USERS.doctor, PASSWORDS.doctor);

  await page.goto('/doctor');
  await expect(page.getByRole('heading', { name: /doctor portal/i })).toBeVisible();

  // --- Availability editor tab ---
  await page.getByRole('tab', { name: /availability/i }).click();
  // Hospital select (MUI): click the Hospital textbox then pick the first option.
  await page.getByLabel(/hospital/i).click();
  await page.getByRole('option').first().click();
  // Rules JSON editor should be prefilled from the affiliation.
  const rules = page.getByLabel(/rules \(json array\)/i);
  await expect(rules).not.toBeEmpty({ timeout: 15_000 });
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByText(/availability saved/i)).toBeVisible({ timeout: 15_000 });

  // --- Time-off tab ---
  await page.getByRole('tab', { name: /time off/i }).click();
  const from = page.getByLabel(/from \(iso\)/i);
  const to = page.getByLabel(/to \(iso\)/i);
  // A far-future block so it never interferes with seeded appointments.
  await from.fill('2030-01-05T04:30:00Z');
  await to.fill('2030-01-05T10:30:00Z');
  await page.getByRole('button', { name: /^add$/i }).click();
  await expect(page.getByText(/time-off added/i)).toBeVisible({ timeout: 15_000 });
});
