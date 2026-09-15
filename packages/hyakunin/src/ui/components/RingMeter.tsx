import type { MasteryColor } from '@koten/shared/domain/mastery/color';

type Props = {
  percent: number;
  color: MasteryColor;
  /** 何の割合かを読み上げへ渡す語（例「1〜10番」）。 */
  label: string;
};

/**
 * まとまりの割合を輪で出す（依頼者・2026-09-16）。**帯のメーターとは用途が違う。**
 *
 * 帯（`MasteryMeter`）は 1 首の習熟度、輪はその 10 首をまとめた割合である。同じ見た目にすると、
 * **どちらが 1 首でどちらが 10 首なのか区別できなくなる。**
 *
 * **色は 5 色の裁定をそのまま使う**（灰・赤・黄・青・緑）。輪のために新しい色を作らない。
 * 数値も添える——色だけでは、色の見え方が違う人に何も伝わらない。
 */
export function RingMeter({ percent, color, label }: Props) {
  // 半径 16 の円周。`stroke-dasharray` の実線ぶんを割合で切る。
  const circumference = 2 * Math.PI * 16;
  return (
    <span
      class={`ring-meter ring-meter--${color}`}
      role="meter"
      aria-label={`${label}の習熟度`}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <circle class="ring-meter__track" cx="20" cy="20" r="16" />
        <circle
          class="ring-meter__fill"
          cx="20"
          cy="20"
          r="16"
          stroke-dasharray={`${(circumference * percent) / 100} ${circumference}`}
        />
      </svg>
      <span class="ring-meter__value">{percent}%</span>
    </span>
  );
}
