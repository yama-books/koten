import type { JSX } from 'preact';
import { useState } from 'preact/hooks';

type Props = { value?: string; onChange: (grade: string | undefined) => void };

export const PRIMARY_GRADES: readonly string[] = ['中一', '中二', '中三', 'その他'];
export const SECONDARY_GRADES: readonly string[] = ['小学生', '高一', '高二', '高三', '大人'];
export const OTHER_GRADE: string = 'その他';

export function GradePicker({ value, onChange }: Props): JSX.Element {
  const [showSecondary, setShowSecondary] = useState(value === OTHER_GRADE || SECONDARY_GRADES.includes(value ?? ''));
  function pickPrimary(grade: string) {
    const isOther = grade === OTHER_GRADE;
    setShowSecondary(isOther);
    onChange(isOther ? undefined : grade);
  }
  return <section class="grade-picker" aria-labelledby="grade-picker-title"><h2 id="grade-picker-title">学年（任意）</h2><div class="grade-picker__options" role="group" aria-label="学年を選ぶ">{PRIMARY_GRADES.map((grade) => <button key={grade} type="button" aria-pressed={grade === OTHER_GRADE ? showSecondary : value === grade} onClick={() => pickPrimary(grade)}>{grade}</button>)}</div>{showSecondary && <div class="grade-picker__secondary"><p>あてはまるものを選んでください。</p><div class="grade-picker__options" role="group" aria-label="その他の区分を選ぶ">{SECONDARY_GRADES.map((grade) => <button key={grade} type="button" aria-pressed={value === grade} onClick={() => onChange(grade)}>{grade}</button>)}</div></div>}</section>;
}
