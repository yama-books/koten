import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, test } from 'vitest';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

test('restore: both restore choices are available', async () => { const port = { ...createMemoryPort(), loadLastSession: async () => ({ sessionId: 's', product: 'hyakunin' as const, from: 10, to: 20, entry: 'quick' as const, order: 'number' as const, startedOn: '2026-09-01', completed: false, questionCount: 2 }), saveLocalReport: async () => true }; const poems = [{ cardNo: 10, ku: ['a', 'b', 'c', 'd', 'e'], author: { canonical: '作者' }, reading: { status: 'confirmed', historical: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'a' }, modern: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'a' } } }] as never[]; const root = document.createElement('div'); document.body.append(root); await act(async () => { render(<Home port={port} poems={poems} questions={[]} onPickEntry={() => {}} />, root); await new Promise((resolve) => setTimeout(resolve, 0)); }); expect(Array.from(root.querySelectorAll('button')).some((item) => item.textContent === '復元する')).toBe(true); expect(Array.from(root.querySelectorAll('button')).some((item) => item.textContent === '復元しない')).toBe(true); root.remove(); });
