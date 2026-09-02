import type { MasteryColor } from '../../domain/mastery/color.ts';

type Props = { percent: number; color: MasteryColor; label: string };

export function MasteryMeter({ percent, color, label }: Props) {
  return <span class={`mastery-meter mastery-meter--${color}`}><span>{`習熟度 ${percent}%`}</span><span role="meter" aria-label={`${label}の習熟度`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span class="mastery-meter__fill" style={{ width: `${percent}%` }} /></span></span>;
}
