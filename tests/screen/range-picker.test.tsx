import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, test } from 'vitest';
import { RangePicker } from '../../packages/hyakunin/src/ui/screens/RangePicker.tsx';

test('range-picker: returns the chosen range and random order', async () => { let result: unknown; const root = document.createElement('div'); document.body.append(root); await act(() => { render(<RangePicker entry="quick" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(range, order) => { result = { range, order }; }} />, root); }); const radios = root.querySelectorAll('input[type="radio"]'); await act(() => { radios[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); root.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(result).toEqual({ range: { from: 10, to: 20 }, order: 'random' }); root.remove(); });
