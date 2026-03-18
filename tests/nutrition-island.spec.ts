import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openAppShell, reloadAppShell } from './helpers';

function buildAnthropicSseResponse(text: string) {
  return [
    `data: ${JSON.stringify({
      type: 'content_block_delta',
      delta: { text },
    })}`,
    'data: [DONE]',
    '',
  ].join('\n');
}

async function seedNutritionHistory(page: Page, entries: unknown[]) {
  await page.evaluate((entries) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const key = `ic_nutrition_day::e2e-user::${stamp}`;
    localStorage.removeItem('ic_nutrition_history::e2e-user');
    localStorage.setItem(key, JSON.stringify(entries));
  }, entries);
}

async function clearTodayNutrition(page: Page) {
  await page.evaluate(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    const key = `ic_nutrition_day::e2e-user::${stamp}`;
    localStorage.removeItem('ic_nutrition_key');
    localStorage.removeItem('ic_nutrition_history::e2e-user');
    localStorage.removeItem(key);
  });
}

async function seedYesterdayOnly(page: Page) {
  await page.evaluate(() => {
    const todayStamp = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStamp = yesterday.toISOString().slice(0, 10);
    const todayKey = `ic_nutrition_day::e2e-user::${todayStamp}`;
    const yesterdayKey = `ic_nutrition_day::e2e-user::${yesterdayStamp}`;

    localStorage.setItem('ic_nutrition_key', 'sk-ant-test-key');
    localStorage.removeItem(todayKey);
    localStorage.removeItem('ic_nutrition_history::e2e-user');
    localStorage.setItem(
      yesterdayKey,
      JSON.stringify([
        {
          role: 'user',
          text: 'Yesterday note',
          timestamp: Date.now() - 86_400_000,
        },
      ])
    );
  });
}

async function openNutrition(page: Page) {
  await page.evaluate(() => {
    const navButton =
      document.querySelector('.nav-btn[data-page="nutrition"]') ||
      document.querySelectorAll('.nav-btn')[4];
    window.showPage('nutrition', navButton);
  });

  await expect(page.locator('#page-nutrition')).toHaveClass(/active/);
  await expect(
    page.locator('#app-shell-react-root .nav-btn[data-page="nutrition"]')
  ).toHaveClass(/active/);
  await expect
    .poll(() => page.locator('.content').getAttribute('class'), {
      timeout: 15000,
    })
    .toMatch(/nutrition-active/);
}

test('nutrition island renders the setup card when no API key is present', async ({
  page,
}) => {
  await openAppShell(page);

  await clearTodayNutrition(page);
  await openNutrition(page);

  await expect(page.locator('#nutrition-legacy-shell')).toHaveCount(0);
  await expect(
    page.locator('#nutrition-react-root .nutrition-setup-card')
  ).toBeVisible();
  await expect(
    page.locator('#nutrition-react-root #nutrition-setup-key-input')
  ).toBeVisible();
  await expect(page.locator('.header')).toBeHidden();
  await expect(
    page.locator('#nutrition-react-root .nutrition-composer')
  ).toBeHidden();
});

test('nutrition island renders today session, guided actions, and can clear the day', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    localStorage.setItem('ic_nutrition_key', 'sk-ant-test-key');
  });
  await seedNutritionHistory(page, [
    {
      role: 'user',
      text: 'Review today so far',
      promptText: 'Primary task: Review today so far',
      actionId: 'review_today',
      timestamp: Date.now() - 60_000,
    },
    {
      role: 'assistant',
      text: 'Protein: 40g\nCarbs: 55g\nFat: 18g\nCalories: 520',
      timestamp: Date.now() - 30_000,
      model: 'claude-haiku-4-5-20251001',
    },
  ]);
  await openNutrition(page);

  await expect(page.locator('#nutrition-react-root')).toContainText(
    /review today so far/i
  );
  await expect(page.locator('#nutrition-react-root')).toContainText(/protein/i);
  await expect(
    page.locator('#nutrition-react-root .nutrition-context-banner')
  ).toBeVisible();
  await expect(
    page.locator('#nutrition-react-root .nutrition-today-card')
  ).toBeVisible();
  await expect(
    page.locator('#nutrition-react-root .nutrition-composer')
  ).toBeVisible();
  await expect(
    page.locator('#nutrition-react-root .nutrition-action-grid')
  ).toBeVisible();

  await page.evaluate(() => {
    window.eval('clearNutritionHistory(); confirmOk();');
  });

  await expect(page.locator('#nutrition-react-root .nutrition-today-card')).toHaveCount(0);
});

test("nutrition ignores yesterday's history and starts fresh for today", async ({
  page,
}) => {
  await openAppShell(page);

  await seedYesterdayOnly(page);
  await openNutrition(page);

  await expect(page.locator('#nutrition-react-root')).not.toContainText(
    /yesterday note/i
  );
  await expect(page.locator('#nutrition-react-root')).toContainText(
    /daily nutrition coach|p\u00e4ivitt\u00e4inen ravintocoachisi/i
  );
});

test('nutrition layout keeps the action tray inside the shell when app viewport height shrinks', async ({
  page,
}) => {
  await openAppShell(page);

  await page.evaluate(() => {
    localStorage.setItem('ic_nutrition_key', 'sk-ant-test-key');
  });
  await seedNutritionHistory(page, [
    {
      role: 'user',
      text: 'Build my food plan for today',
      promptText: 'Primary task: Build my food plan for today',
      actionId: 'plan_today',
      timestamp: Date.now() - 60_000,
    },
    {
      role: 'assistant',
      text: 'Protein: 40g\nCarbs: 55g\nFat: 18g\nCalories: 520',
      timestamp: Date.now() - 30_000,
      model: 'claude-haiku-4-5-20251001',
    },
  ]);
  await openNutrition(page);

  const layout = await page.evaluate(() => {
    document.documentElement.style.setProperty('--app-vh', '430px');

    const pageRect = document
      .getElementById('page-nutrition')
      ?.getBoundingClientRect();
    const shellRect = document
      .getElementById('nutrition-shell')
      ?.getBoundingClientRect();
    const composerRect = document
      .querySelector('.nutrition-composer')
      ?.getBoundingClientRect();
    const messagesRect = document
      .getElementById('nutrition-messages')
      ?.getBoundingClientRect();

    return {
      shellFits:
        !!pageRect &&
        !!shellRect &&
        shellRect.top >= pageRect.top - 0.5 &&
        shellRect.bottom <= pageRect.bottom + 0.5,
      composerFits:
        !!shellRect &&
        !!composerRect &&
        composerRect.top >= shellRect.top - 0.5 &&
        composerRect.bottom <= shellRect.bottom + 0.5,
      messagesPositiveHeight: !!messagesRect && messagesRect.height > 10,
    };
  });

  expect(layout.shellFits).toBe(true);
  expect(layout.composerFits).toBe(true);
  expect(layout.messagesPositiveHeight).toBe(true);
});

test('nutrition sends coaching context, renders structured JSON responses, and persists them after reload', async ({
  page,
}) => {
  let capturedSystem = '';

  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    const body = route.request().postDataJSON();
    capturedSystem = String(body?.system || '');
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: buildAnthropicSseResponse(
        JSON.stringify({
          display_markdown:
            '## Next move\n- **Protein** is on pace.\n- Add fruit and oats around training.',
          estimated_macros: {
            calories: 640,
            protein_g: 42,
            carbs_g: 68,
            fat_g: 18,
          },
          remaining_today: {
            calories: 1800,
            protein_g: 118,
          },
          tags: ['sport_day', 'training_fuel'],
        })
      ),
    });
  });

  await openAppShell(page);
  await clearTodayNutrition(page);
  await page.evaluate(() => {
    localStorage.setItem('ic_nutrition_key', 'sk-ant-test-key');
    window.eval(`
      profile.bodyMetrics = {
        weight: 82,
        height: 180,
        age: 30,
        sex: 'male',
        activityLevel: 'moderate',
        bodyGoal: 'maintain'
      };
      profile.preferences = normalizeTrainingPreferences({
        ...profile,
        preferences: {
          ...profile.preferences,
          goal: 'sport_support',
          trainingDaysPerWeek: 4,
          sessionMinutes: 60,
          equipmentAccess: 'full_gym',
          notes: 'Avoid huge dinners before evening sport.'
        }
      });
      profile.coaching = normalizeCoachingProfile({
        ...profile,
        coaching: {
          ...profile.coaching,
          guidanceMode: 'guided',
          experienceLevel: 'returning',
          sportProfile: {
            ...profile.coaching.sportProfile,
            inSeason: true
          }
        }
      });
      schedule.sportName = 'Hockey';
      schedule.sportDays = [new Date().getDay()];
      workouts = [];
    `);
  });

  await openNutrition(page);
  await page.locator('#nutrition-react-root #nutrition-send-btn').click();

  await expect(page.locator('#nutrition-react-root')).toContainText('Next move');
  await expect(page.locator('#nutrition-react-root')).toContainText(
    'Protein is on pace.'
  );
  await expect(page.locator('#nutrition-react-root')).not.toContainText(
    '"display_markdown"'
  );
  await expect(page.locator('#nutrition-react-root .nutrition-macro-card')).toContainText(
    '640'
  );
  await expect(page.locator('#nutrition-react-root .nutrition-today-card')).toContainText(
    '42g'
  );
  expect(capturedSystem).toContain('Daily coaching snapshot:');
  expect(capturedSystem).toContain('"guidance_mode":"guided"');
  expect(capturedSystem).toContain('"in_season":true');
  expect(capturedSystem).toContain('"user_notes":"Avoid huge dinners before evening sport."');
  expect(capturedSystem).toContain('Scheduled sport today: yes');

  await reloadAppShell(page);
  await page.evaluate(() => {
    const navButton =
      document.querySelector('.nav-btn[data-page="nutrition"]') ||
      document.querySelectorAll('.nav-btn')[4];
    window.showPage('nutrition', navButton);
  });
  await expect(page.locator('#page-nutrition')).toHaveClass(/active/);
  await expect(
    page.locator('#app-shell-react-root .nav-btn[data-page="nutrition"]')
  ).toHaveClass(/active/);

  await expect(page.locator('#nutrition-react-root')).toContainText('Next move');
  await expect(page.locator('#nutrition-react-root')).not.toContainText(
    '"display_markdown"'
  );
  await expect(page.locator('#nutrition-react-root .nutrition-today-card')).toContainText(
    '42g'
  );
});

test('nutrition falls back to plain text when Claude returns malformed JSON and still extracts macros', async ({
  page,
}) => {
  await page.route('https://api.anthropic.com/v1/messages', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: buildAnthropicSseResponse(
        'Protein: 31g\nCarbs: 47g\nFat: 12g\nCalories: 410\n\nGood quick meal. Add vegetables later.'
      ),
    });
  });

  await openAppShell(page);
  await clearTodayNutrition(page);
  await page.evaluate(() => {
    localStorage.setItem('ic_nutrition_key', 'sk-ant-test-key');
  });
  await openNutrition(page);
  await page.locator('#nutrition-react-root #nutrition-send-btn').click();

  await expect(page.locator('#nutrition-react-root')).toContainText(
    'Good quick meal. Add vegetables later.'
  );
  await expect(page.locator('#nutrition-react-root .nutrition-macro-card')).toContainText(
    '31g'
  );
  await expect(page.locator('#nutrition-react-root .nutrition-today-card')).toContainText(
    '410'
  );
});
