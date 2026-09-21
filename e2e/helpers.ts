import { expect, type Page } from '@playwright/test';

export const PASSWORDS = {
  patient: process.env.E2E_PATIENT_PASSWORD ?? 'Patient123!ChangeMe',
  doctor: process.env.E2E_DOCTOR_PASSWORD ?? 'Doctor123!ChangeMe',
  admin: process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!ChangeMe',
};

export const USERS = {
  patient: process.env.E2E_PATIENT_EMAIL ?? 'patient1@example.test',
  doctor: process.env.E2E_DOCTOR_EMAIL ?? 'priya.kapoor@example.test',
  admin: process.env.E2E_ADMIN_EMAIL ?? 'admin@example.test',
};

/** Login via the UI (exercises the real auth flow incl. refresh cookie). */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /^login$/i }).click();
  // Redirect away from /login on success (home or role landing).
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}
