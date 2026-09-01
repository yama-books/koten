import type { UserSettings } from '@koten/shared/domain/event';

type Props = { value: UserSettings['reading']; onChange: (value: UserSettings['reading']) => void };

export function ReadingToggle({ value, onChange }: Props) {
  return <fieldset class="reading-toggle"><legend>読み</legend>
    <label><input type="radio" name="reading" checked={value === 'no-ruby'} onChange={() => onChange('no-ruby')} /> ルビなし</label>
    <label><input type="radio" name="reading" checked={value === 'historical'} onChange={() => onChange('historical')} /> 歴史的仮名遣い</label>
    <label><input type="radio" name="reading" checked={value === 'modern'} onChange={() => onChange('modern')} /> 現代仮名遣い</label>
  </fieldset>;
}
