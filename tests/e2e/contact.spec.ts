import { test, expect } from './fixtures';

test('unified contact page replaces commissions and accepts general messages', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/commissions');
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page).toHaveTitle(/Fine Arc/);
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeVisible();
  await expect(page.locator('form input, form textarea')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Commissions', exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/commissions"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'thefinearc@gmail.com', exact: true })).toHaveAttribute('href', 'mailto:thefinearc@gmail.com');
  await page.getByRole('button', { name: 'Send Message' }).click();
  await expect(page.locator('input[name="name"]:invalid')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Test Visitor');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('visitor@example.com');
  // Subject is optional, and no artwork details are required.
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Hello! I have a general question.');
  await page.getByRole('button', { name: 'Send Message' }).click();
  // The isolated server has no database configured: never claim a message was sent.
  await expect(page.getByText('Please email thefinearc@gmail.com to get in touch.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Thank you.' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue('Hello! I have a general question.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('heading', { name: 'Let’s connect.' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('unified-contact.png'), fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('navigation exposes one contact destination', async ({ page }, info) => {
  await page.goto('/');
  if (info.project.name === 'mobile') await page.locator('header button').click();
  await page.getByRole('link', { name: 'Contact', exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { name: 'Let’s connect.' })).toBeVisible();
});
