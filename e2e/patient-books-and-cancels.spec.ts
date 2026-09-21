import { test, expect } from '@playwright/test';
import { USERS, PASSWORDS, loginAs } from './helpers';

/**
 * Patient books Dr. Priya Kapoor (Cardiology @ Apollo) and cancels.
 * Acceptance: find via specialty=Cardiology, slots within Mon–Fri IST,
 * book + console confirmation, then cancel from My Bookings.
 */
test('patient books and cancels a cardiology appointment', async ({ page }) => {
  await loginAs(page, USERS.patient, PASSWORDS.patient);

  // Find cardiologists at Apollo via filter UI (mirrors ?specialty=Cardiology&hospital=Apollo).
  await page.goto('/doctors?specialty=Cardiology&hospital=Apollo');
  await expect(page.getByRole('heading', { name: /doctors/i })).toBeVisible();
  const priya = page.getByText(/Priya Kapoor/);
  await expect(priya.first()).toBeVisible({ timeout: 20_000 });

  // Open profile → slot picker grouped by IST day.
  await priya.first().click();
  await expect(page.getByRole('heading', { name: /Priya Kapoor/ })).toBeVisible({ timeout: 15_000 });

  // Pick the first available slot button (SlotPicker renders time buttons).
  const slotButtons = page.locator('button').filter({ hasText: /am|pm/i });
  await expect(slotButtons.first()).toBeVisible({ timeout: 20_000 });
  await slotButtons.first().click();

  // Proceed to booking confirm.
  await page.getByRole('button', { name: /^book/i }).click();
  await expect(page).toHaveURL(/\/book\/confirm/);
  await expect(page.getByText(/slot \(IST\)/i)).toBeVisible();

  // Confirm booking (MEDICAL_CARE consent seeded for demo patients).
  await page.getByRole('button', { name: /confirm booking/i }).click();
  await expect(page.getByText(/appointment confirmed/i)).toBeVisible({ timeout: 20_000 });

  // My Bookings → cancel with cutoff messaging.
  await page.goto('/bookings');
  await expect(page.getByRole('heading', { name: /my bookings/i })).toBeVisible();
  const cancelBtn = page.getByRole('button', { name: /^cancel$/i }).first();
  await expect(cancelBtn).toBeVisible({ timeout: 15_000 });
  await cancelBtn.click();
  await page.getByRole('button', { name: /yes, cancel/i }).click();
  await expect(page.getByText(/appointment cancelled/i)).toBeVisible({ timeout: 15_000 });
});
