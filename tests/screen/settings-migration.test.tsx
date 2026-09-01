import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

const poems = [{ cardNo: 10, ku: ['a', 'b', 'c', 'd', 'e'], author: { canonical: '作者' }, reading: { status: 'confirmed', historical: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'a' }, modern: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'a' } } }] as never[];
let root: HTMLDivElement | undefined;
let originalStore: Storage | undefined;

function installStore() {
  const store = new Map<string, string>();
  originalStore = window.localStorage;
  (window as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
    clear: () => store.clear(), key: () => null, get length() { return store.size; },
  } as Storage;
  return store;
}

async function mount(port: ReturnType<typeof createMemoryPort>) {
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => {
    render(<Home port={{ ...port, saveLocalReport: async () => true }} poems={poems} questions={[]} />, root!);
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
    root = undefined;
  }
  (window as unknown as { localStorage: Storage | undefined }).localStorage = originalStore;
  originalStore = undefined;
});

test('settings-migration: a stored orientation becomes the writing mode', async () => {
  installStore().set('hyakunin:orientation', 'horizontal');
  const port = createMemoryPort();
  await mount(port);
  expect((await port.loadSettings())?.writing).toBe('horizontal');
});

test('settings-migration: the legacy key is removed after migrating', async () => {
  const store = installStore();
  store.set('hyakunin:orientation', 'horizontal');
  await mount(createMemoryPort());
  expect(store.get('hyakunin:orientation')).toBeUndefined();
});

test('settings-migration: saved settings win over the legacy key', async () => {
  const store = installStore();
  store.set('hyakunin:orientation', 'horizontal');
  const port = createMemoryPort();
  await port.saveSettings({ key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false });
  await mount(port);
  expect((await port.loadSettings())?.writing).toBe('vertical');
  expect(store.get('hyakunin:orientation')).toBe('horizontal');
});
