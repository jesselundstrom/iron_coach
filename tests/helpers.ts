import type { Page } from '@playwright/test';

export async function openApp(page: Page) {
  await page.goto('/');
}

export async function openAppShell(page: Page) {
  await openApp(page);
  await page.waitForFunction(() => typeof window.showPage === 'function');

  await page.evaluate(() => {
    const suppressLoginUi = () => {
      document.body.classList.remove('login-active');
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.style.display = 'none';
    };

    window.showLoginScreen = suppressLoginUi;
    window.hideLoginScreen = suppressLoginUi;
    window.maybeOpenOnboarding = () => {};

    suppressLoginUi();
    document.getElementById('onboarding-modal')?.classList.remove('active');
  });
}
