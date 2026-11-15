import { test, expect } from './fixtures';
import type { Page, TestInfo } from '@playwright/test';

async function audit(page: Page, info: TestInfo, name: string) {
  for (const image of await page.locator('img').all()) {
    if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
  }
  if (await page.locator('footer').count()) await page.locator('footer').scrollIntoViewIfNeeded();
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(i => i.complete ? Promise.resolve() : new Promise(resolve => {
      i.onload = resolve; i.onerror = resolve; setTimeout(resolve, 3000);
    })));
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow').toBe(true);
  expect(await page.evaluate(() => [...document.images].filter(i => i.getClientRects().length > 0 && (!i.complete || i.naturalWidth === 0)).map(i => i.src)), 'broken images').toEqual([]);
  expect(await page.locator('button:visible, a:visible, input:visible, select:visible').evaluateAll(nodes => nodes.filter(n => {
    const r = n.getBoundingClientRect();
    return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
  }).map(n => n.textContent)), 'offscreen controls').toEqual([]);
  // Hit-test centers of visible controls to detect overlays and misplaced controls.
  expect(await page.locator('header a:visible, header button:visible').evaluateAll(nodes => nodes.filter(n => {
    const r = n.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !top || !(n.contains(top) || top.contains(n));
  }).map(n => n.textContent)), 'covered navigation').toEqual([]);
}

for (const [path, heading] of [['/', ''], ['/gallery', 'Gallery'], ['/about', ''], ['/commissions', ''], ['/contact', ''], ['/cart', 'Collection'], ['/checkout', ''], ['/admin', 'Admin Access']] as const) {
  test(`page and responsive layout ${path}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto(path);
    await expect(page).toHaveTitle(/Fine Arc/);
    await expect(page.locator('#root')).not.toBeEmpty();
    if (heading) await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText('Something went wrong.', { exact: true })).toHaveCount(0);
    await audit(page, info, path.replaceAll('/', '') || 'home');
    expect(errors).toEqual([]);
  });
}

test('navigation, gallery filter, artwork, persisted cart, removal', async ({ page }, info) => {
  await page.goto('/');
  if (info.project.name === 'mobile') await page.locator('header button').click();
  await page.getByRole('link', { name: 'Gallery', exact: true }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/gallery$/);
  await page.getByRole('button', { name: 'Drawing', exact: true }).click();
  await expect(page).toHaveURL(/section=drawing/);
  await expect(page.getByText('Pale Geometry', { exact: true })).toBeVisible();
  await expect(page.getByText('Whisper of the Tide', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.locator('a[href="/artwork/1"]').first().click();
  await expect(page.getByRole('heading', { name: 'Whisper of the Tide' })).toBeVisible();
  await audit(page, info, 'artwork');
  await page.getByRole('button', { name: /Add .*Collection/ }).click();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Whisper of the Tide' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Whisper of the Tide' })).toBeVisible();
  await audit(page, info, 'cart-filled');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('Your collection is empty.')).toBeVisible();
});

test('checkout reports API failure and retains cart', async ({ page }, info) => {
  await page.goto('/artwork/1');
  await page.getByRole('button', { name: /Add .*Collection/ }).click();
  await page.goto('/checkout');
  await audit(page, info, 'checkout');
  await page.getByRole('button', { name: /Continue to payment/ }).click();
  await expect(page.getByText('Test service unavailable', { exact: true })).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Whisper of the Tide' })).toBeVisible();
});

test('unknown routes and unknown artworks are handled', async ({ page }) => {
  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
  await page.goto('/artwork/does-not-exist');
  await expect(page.getByText(/not found/i).first()).toBeVisible();
});

test('success redirect must not claim an unverified payment', async ({ page }) => {
  test.fail(true, 'Known defect: success route trusts navigation and clears cart without server verification');
  await page.goto('/checkout/success?session_id=cs_test_forged');
  await expect(page.getByRole('heading', { name: 'Order confirmed.' })).not.toBeVisible();
});

test('cart quantity controls obey stock and recalculate totals', async ({ page }) => {
  await page.goto('/artwork/1');
  await page.getByRole('button', { name: /Add .*Collection/ }).click();
  // Demo originals have one item; use a local persisted fixture to exercise existing multi-stock UI.
  await page.evaluate(() => {
    const cart = JSON.parse(localStorage.getItem('thefinearc-cart')!);
    cart.state.items[0].artwork.quantity = 3;
    localStorage.setItem('thefinearc-cart', JSON.stringify(cart));
  });
  await page.goto('/cart');
  const plus = page.getByRole('button', { name: 'Increase quantity' });
  await plus.click(); await plus.click();
  await expect(plus).toBeDisabled();
  await expect(page.getByText('$7,200', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Decrease quantity' }).click();
  await expect(page.getByText('$4,800', { exact: true }).first()).toBeVisible();
});

test('sold artwork cannot be added', async ({ page }) => {
  await page.goto('/artwork/3');
  await expect(page.getByRole('heading', { name: 'Dusk Atlas' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add .*Collection/ })).toHaveCount(0);
});

test('checkout summary title and price must not overlap', async ({ page }, info) => {
  test.fail(info.project.name === 'tablet', 'Known layout defect: title overlaps price at 768px');
  await page.goto('/artwork/1');
  await page.getByRole('button', { name: /Add .*Collection/ }).click();
  await page.goto('/checkout');
  const title = page.locator('p').filter({ hasText: /^Whisper of the Tide$/ });
  await expect(title).toBeVisible();
  const overlap = await title.evaluate(el => {
    const price = el.parentElement!.nextElementSibling!.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(el);
    return [...range.getClientRects()].some(r => r.left < price.right && r.right > price.left && r.top < price.bottom && r.bottom > price.top);
  });
  await page.screenshot({ path: info.outputPath('checkout-summary.png'), fullPage: true, animations: 'disabled' });
  expect(overlap, 'summary title overlaps item price').toBe(false);
});
