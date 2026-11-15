import { test, expect } from './fixtures';

// Exercises our Checkout Form SDK adapter, never Stripe's real SDK or card networks.
for (const outcome of ['paid', 'declined', 'authentication'] as const) {
  test(`Checkout SDK contract: ${outcome} (simulated)`, async ({ page }) => {
    await page.route('https://js.stripe.com/**', route => route.fulfill({ contentType: 'application/javascript', body: `
      window.Stripe = key => {
        if (key !== 'pk_test_local_fixture') throw new Error('Only fixture test key allowed');
        let confirm;
        return { initCheckoutFormSdk: () => ({
          createForm: () => ({
            mount: selector => {
              const button = document.createElement('button');
              button.textContent = 'Simulated test payment';
              button.onclick = () => confirm({});
              document.querySelector(selector).append(button);
            },
            on: (name, callback) => { confirm = callback; },
            unmount: () => document.querySelector('#checkout-form')?.replaceChildren(),
          }),
          loadActions: async () => ({ type: 'success', actions: { confirm: async () => {
            if ('${outcome}' === 'declined') throw new Error('Simulated declined card');
            if ('${outcome}' === 'authentication') {
              await new Promise(resolve => {
                const button = document.createElement('button'); button.textContent = 'Simulated authentication challenge';
                button.onclick = () => { button.remove(); resolve(); }; document.querySelector('#checkout-form').append(button);
              });
            }
            location.href = '/checkout/success?session_id=cs_test_simulated';
          } } }),
        }) };
      };` }));
    await page.route('**/api/create-checkout-session', route => route.fulfill({ json: {
      client_secret: 'cs_test_simulated_secret_fixture', items_total: 240000,
    } }));
    await page.goto('/artwork/1');
    await page.getByRole('button', { name: /Add .*Collection/ }).click();
    await page.goto('/checkout');
    await page.getByRole('button', { name: /Continue to payment/ }).click();
    await page.getByRole('button', { name: 'Simulated test payment' }).click();
    if (outcome === 'declined') {
      await expect(page.getByText('Your payment could not be completed. Please check your details and try again.')).toBeVisible();
      await expect(page).toHaveURL(/\/checkout$/);
    } else {
      if (outcome === 'authentication') await page.getByRole('button', { name: 'Simulated authentication challenge' }).click();
      await expect(page).toHaveURL(/checkout\/success\?session_id=cs_test_simulated/);
      await expect(page.getByRole('heading', { name: 'Order confirmed.' })).toBeVisible();
    }
  });
}
