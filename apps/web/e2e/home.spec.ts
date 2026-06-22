import { test, expect } from '@playwright/test';

// Requires the API and web dev servers running:
//   pnpm dev:api  (http://localhost:4000)  and  pnpm dev:web  (http://localhost:3000)
test('home renders the site title heading', async ({ page }) => {
  await page.goto('http://localhost:3000/sw');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Tume ya Utumishi/);
});

test('home shows latest news and vacancies sections', async ({ page }) => {
  await page.goto('http://localhost:3000/sw');
  await expect(page.getByRole('heading', { name: /Habari Mpya/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Tangazo la Nafasi za Kazi/ })).toBeVisible();
});