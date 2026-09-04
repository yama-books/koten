import type { UserSettings } from '@koten/shared/domain/event';

type Props = { value: UserSettings['writing']; onChange: (value: UserSettings['writing']) => void };

export function WritingModeToggle({ value, onChange }: Props) {
  const next = value === 'vertical' ? 'horizontal' : 'vertical';
  return <button class="writing-toggle" type="button" onClick={() => onChange(next)}>{next === 'vertical' ? '縦書きにする' : '横書きにする'}</button>;
}
