import type { MasteryColor } from '../../domain/mastery/color.ts';

type Props = {
  percent: number;
  color: MasteryColor;
  label: string;
  text?: string;
  meterLabel?: string;
};

export function MasteryMeter({ percent, color, label, text, meterLabel }: Props) {
  return <span class={`mastery-meter mastery-meter--${color}`}><span>{text ?? `習熟度 ${percent}%`}</span><span role="meter" aria-label={meterLabel ?? `${label}の習熟度`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span class="mastery-meter__fill" style={{ width: `${percent}%` }} /></span></span>;
}
