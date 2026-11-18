// 화면 확인: 크기 2종 × 테마 3종, 주요 동작
import { type Page, expect, test } from '@playwright/test';

const THEMES = ['library', 'pastel', 'mono'] as const;
const SIZES = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;

/** 2026-11-18(수) 19:05 서울, 저장값 지정, OSM 타일은 내려받지 않음 (타일 정책) */
async function open(
  page: Page,
  settings: Record<string, unknown> = {},
  extra: Record<string, string> = {},
) {
  await page.route('**/tile.openstreetmap.org/**', (route) => route.abort());
  await page.clock.install({ time: new Date('2026-11-18T19:05:00+09:00') });
  await page.addInitScript(
    ([s, e]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.clear();
      localStorage.setItem('ln.settings', JSON.stringify({ version: 1, ...s }));
      for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
    },
    [settings, extra] as const,
  );
  await page.goto('./');
  await expect(page.locator('.ln-mk')).toHaveCount(34);
}

async function noHorizontalScroll(page: Page) {
  const { sw, w } = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    w: window.innerWidth,
  }));
  expect(sw).toBeLessThanOrEqual(w);
}

for (const size of SIZES) {
  for (const theme of THEMES) {
    test(`${size.name} ${size.width}×${size.height} · ${theme}`, async ({ page }, info) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await open(page, { theme });

      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('.ln-card').first()).toBeVisible();
      await expect(page.locator('.leaflet-control-attribution')).toContainText(
        '© OpenStreetMap contributors',
      );
      await noHorizontalScroll(page);

      if (size.name === 'desktop') {
        // 3단: 목록 · 지도 · 오른쪽 패널이 한 화면에 (PRD 8.1)
        await expect(page.getByRole('region', { name: '도서관 목록' })).toBeVisible();
        await expect(page.getByRole('region', { name: '도서관 지도' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '휴관 달력' })).toBeVisible();
      } else {
        await expect(page.getByRole('navigation', { name: '화면 전환' })).toBeVisible();
      }

      await page.locator('.ln-card h3 button').first().click();
      await expect(page.getByRole('link', { name: /카카오맵으로 길찾기/ })).toBeVisible();
      await noHorizontalScroll(page);

      await info.attach('screen', { body: await page.screenshot(), contentType: 'image/png' });
    });
  }
}

test('모드 전환과 상세: 공부하기는 열람실 기준', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.getByRole('button', { name: '공부하기' }).click();
  await expect(page.getByText(/열람실 기준/).first()).toBeVisible();
  await page.getByRole('button', { name: '꿈마을도서관', exact: true }).click();
  const panel = page.getByRole('tabpanel');
  await expect(panel.getByRole('heading', { name: '꿈마을도서관' })).toBeVisible();
  await expect(panel.getByRole('table')).toContainText('09:00–22:00');
  await expect(panel.locator('p', { hasText: '정기 휴관' })).toContainText('매주 월요일');
});

test('즐겨찾기는 새로고침 후에도 남고 달력에 표시', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.getByRole('button', { name: '꿈마을도서관 즐겨찾기 추가' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '꿈마을도서관 즐겨찾기 해제' })).toBeVisible();

  await page.getByRole('tab', { name: '휴관 달력' }).click();
  await expect(page.getByRole('list', { name: '즐겨찾기 도서관 색' })).toContainText(
    '꿈마을도서관',
  );
  // 2026-11-23(월)은 꿈마을도서관 휴관
  await page.getByRole('button', { name: /^11월 23일\(월\)/ }).click();
  await expect(page.getByText('즐겨찾기 중 휴관: 꿈마을도서관')).toBeVisible();
});

test('설정에서 테마를 바꾸면 저장되고 글꼴을 불러옴', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.getByRole('radio', { name: /모노/ }).check({ force: true });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'mono');
  await expect(page.locator('#font-mono')).toHaveCount(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ln.settings')!).theme);
  expect(saved).toBe('mono');
});

test('스마트폰: 탭 바로 지도·목록·달력 전환', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const sheet = page.locator('.ln-sheet');
  await page.getByRole('button', { name: '지도', exact: true }).click();
  await expect(sheet).toHaveAttribute('data-snap', 'low');
  await page.getByRole('button', { name: '달력', exact: true }).click();
  await expect(sheet).toHaveAttribute('data-snap', 'full');
  await expect(page.getByRole('region', { name: '휴관일 달력' })).toBeVisible();
  await page.getByRole('button', { name: '목록', exact: true }).click();
  await expect(page.locator('.ln-card').first()).toBeVisible();
});
