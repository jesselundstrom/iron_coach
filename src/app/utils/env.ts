type TestWindow = Window & {
  __IRONFORGE_TEST_USER_ID__?: string;
};

export const E2E_TEST_USER_ID = 'e2e-user';

export function getTestUserId() {
  if (typeof window === 'undefined') return '';
  return String((window as TestWindow).__IRONFORGE_TEST_USER_ID__ || '').trim();
}

export function isE2eTestEnv() {
  if (typeof window === 'undefined') return false;
  return (
    getTestUserId() === E2E_TEST_USER_ID || window.navigator.webdriver === true
  );
}

export const IS_E2E_TEST_ENV = isE2eTestEnv();
