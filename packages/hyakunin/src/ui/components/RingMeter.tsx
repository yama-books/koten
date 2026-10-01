import type { MasteryColor } from '@koten/shared/domain/mastery/color';

type Props = {
  percent: number;
  color: MasteryColor;
  /** 何の割合かを読み上げへ渡す語（例「1〜10番」）。 */
  label: string;
  /** まとまりの歌が 1 首も解かれていない。 */
  untouched?: boolean;
};

/**
 * まとまりの割合を輪で出す（依頼者・2026-09-16）。**帯のメーターとは用途が違う。**
 *
 * 帯（`MasteryMeter`）は 1 首の習熟度、輪はその 10 首をまとめた割合である。同じ見た目にすると、
 * **どちらが 1 首でどちらが 10 首なのか区別できなくなる。**
 *
 * **色は 5 色の裁定をそのまま使う**（灰・赤・黄・青・緑）。輪のために新しい色を作らない。
 * 数値も添える——色だけでは、色の見え方が違う人に何も伝わらない。
 *
 * **未着手のまとまりは破線の空の輪に「未」**（依頼者・2026-10-01、比較モックで裁定）。
 * 0% と「まだ解いていない」を見分けるため。読み上げにも「未着手」を渡す。
 */
export function RingMeter({ percent, color, label, untouched = false }: Props) {
  // 半径 16 の円周。`stroke-dasharray` の実線ぶんを割合で切る。
  const circumference = 2 * Math.PI * 16;
  const length = (circumference * percent) / 100;
  return (
    <span
      class={`ring-meter ring-meter--${color}${untouched ? ' ring-meter--untouched' : ''}`}
      role="meter"
      aria-label={`${label}の習熟度`}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={untouched ? '未着手' : undefined}
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <circle class="ring-meter__track" cx="20" cy="20" r="16" />
        {/*
          実線の長さを `--ring-len` でも渡す。CSS はこれに `--history-draw`（既定 1）を掛けて、
          開いた時に時計回りへ伸ばす。属性の `stroke-dasharray` は、CSS が効かない環境での完成形。
        */}
        <circle
          class="ring-meter__fill"
          cx="20"
          cy="20"
          r="16"
          style={{ '--ring-len': length.toFixed(2) }}
          stroke-dasharray={`${length} ${circumference}`}
        />
      </svg>
      <span class="ring-meter__value">{untouched ? '未' : `${percent}%`}</span>
    </span>
  );
}
