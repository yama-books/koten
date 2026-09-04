import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import { appConfig } from '@koten/shared/app-config';

const homeJsdom = (globalThis as typeof globalThis & { jsdom?: { window: Window } }).jsdom;
if (homeJsdom) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: homeJsdom.window.localStorage });

vi.mock('@koten/shared/data/load', () => ({
  loadJson: vi.fn().mockResolvedValue([]),
}));

import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

let container: HTMLDivElement | undefined;

afterEach(() => {
  if (container) {
    render(null, container);
    container.remove();
    container = undefined;
  }
  window.localStorage.clear();
});

async function renderHome() {
  container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    render(<Home />, container!);
    await Promise.resolve();
  });
  return container;
}

test('home: renders the product display name', async () => {
  const root = await renderHome();
  expect(root.textContent).toContain(appConfig.products.hyakunin.displayName);
});

test('home: shows the range inputs', async () => {
  const root = await renderHome();
  expect(root.querySelectorAll('input[type="number"]')).toHaveLength(2);
});
