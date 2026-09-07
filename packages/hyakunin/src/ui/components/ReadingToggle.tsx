import type { UserSettings } from '@koten/shared/domain/event';

type Props = { value: UserSettings['reading']; onChange: (value: UserSettings['reading']) => void; showState?: boolean };

/**
 * `showState` は**原文のときも状態行を出す**指定（発注076 §3）。行が消えると切替ボタンが
 * 上の罫線へ寄り、押す場所が表示ごとに動く。既定は false のままで、ホームの見え方は変えない。
 */
export function ReadingToggle({ value, onChange, showState = false }: Props) {
  const next = value === 'no-ruby' ? 'historical' : value === 'historical' ? 'modern' : 'no-ruby';
  const label = value === 'no-ruby' ? '読みを確認する' : value === 'historical' ? '現代仮名遣いで見る' : '原文に戻す';
  const current = value === 'historical' ? '歴史的仮名遣いを表示中' : value === 'modern' ? '現代仮名遣いを表示中' : showState ? '原文を表示中' : '';
  return <span class="reading-control">{current && <small class="reading-state" aria-live="polite">{current}</small>}<button class="reading-toggle" type="button" onClick={() => onChange(next)}>{label}</button></span>;
}
