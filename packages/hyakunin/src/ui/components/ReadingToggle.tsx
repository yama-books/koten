import type { UserSettings } from '@koten/shared/domain/event';

type Props = { value: UserSettings['reading']; onChange: (value: UserSettings['reading']) => void };

export function ReadingToggle({ value, onChange }: Props) {
  const next = value === 'no-ruby' ? 'historical' : value === 'historical' ? 'modern' : 'no-ruby';
  const label = value === 'no-ruby' ? '読みを確認する' : value === 'historical' ? '現代仮名遣いで見る' : '読みを閉じる';
  return <button class="reading-toggle" type="button" onClick={() => onChange(next)}>{label}</button>;
}
