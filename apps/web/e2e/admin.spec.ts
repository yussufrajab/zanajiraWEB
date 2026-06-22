import { test, expect } from '@playwright/test';

test('admin login flow', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill('admin@zanajira.go.tz');
  await page.getByLabel('Password').fill('ChangeMe!123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
});
