import type { UserSettings } from '@koten/shared/domain/event';

type Props = { value: UserSettings['writing']; onChange: (value: UserSettings['writing']) => void };

export function WritingModeToggle({ value, onChange }: Props) {
  return <fieldset class="writing-toggle"><legend>向き</legend>
    <label><input type="radio" name="writing" checked={value === 'vertical'} onChange={() => onChange('vertical')} /> 縦書き</label>
    <label><input type="radio" name="writing" checked={value === 'horizontal'} onChange={() => onChange('horizontal')} /> 横書きで表示</label>
  </fieldset>;
}
