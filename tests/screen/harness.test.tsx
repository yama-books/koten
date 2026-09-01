import { render } from 'preact';
import { act } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { afterEach, expect, test } from 'vitest';

const harnessJsdom = (globalThis as typeof globalThis & { jsdom?: { window: Window } }).jsdom;
if (harnessJsdom) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: harnessJsdom.window.localStorage });

let container: HTMLDivElement | undefined;

afterEach(() => {
  if (container) {
    render(null, container);
    container.remove();
    container = undefined;
  }
  window.localStorage.clear();
});

function mount(component: preact.ComponentChildren) {
  container = document.createElement('div');
  document.body.append(container);
  render(component, container);
  return container;
}

test('harness: a jsdom document exists', () => {
  expect(document.body).toBeTruthy();
  expect(document.createElement('div')).toBeInstanceOf(HTMLDivElement);
});

test('harness: preact renders into the document', () => {
  mount(<p>rendered by preact</p>);
  expect(document.body.textContent).toContain('rendered by preact');
});

test('harness: act flushes a state update', () => {
  function Counter() {
    const [count, setCount] = useState(0);
    return <button type="button" onClick={() => setCount((value) => value + 1)}>{count}</button>;
  }

  const root = mount(<Counter />);
  const button = root.querySelector('button');
  if (!button) throw new Error('counter button was not rendered');

  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(button.textContent).toBe('1');
});

test('harness: localStorage is available', () => {
  window.localStorage.setItem('screen-harness', 'available');
  expect(window.localStorage.getItem('screen-harness')).toBe('available');
});
