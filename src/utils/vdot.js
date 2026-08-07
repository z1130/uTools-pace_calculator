// Jack Daniels VDOT 模型
// 参考：Daniels' Running Formula
//   VO2  = -4.60 + 0.182258·v + 0.000104·v²        v: 米/分钟
//   %max = 0.8 + 0.1894393·e^(−0.012778·t)
//             + 0.2989558·e^(−0.1932605·t)          t: 分钟
//   VDOT = VO2(比赛) ÷ %max

const vo2Cost = (v) => -4.6 + 0.182258 * v + 0.000104 * v * v

const percentMax = (t) =>
  0.8 +
  0.1894393 * Math.exp(-0.012778 * t) +
  0.2989558 * Math.exp(-0.1932605 * t)

// 由比赛成绩求 VDOT
const vdotFromRace = (distKm, timeSec) => {
  const t = timeSec / 60
  const v = (distKm * 1000) / t
  return vo2Cost(v) / percentMax(t)
}

// 由 VDOT 反推某距离的等价成绩（二分求解，返回秒）
const predictTime = (vdot, distKm) => {
  let lo = 30
  let hi = 36000
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    // estVdot 随 mid 单调递减：估高了说明跑太快，放慢
    vdotFromRace(distKm, mid) > vdot ? (lo = mid) : (hi = mid)
  }
  return Math.round((lo + hi) / 2)
}

// 给定 VDOT 百分比求配速（秒/公里），解二次方程取正根
const paceAtFraction = (vdot, fraction) => {
  const target = vdot * fraction
  const v =
    (-0.182258 +
      Math.sqrt(0.182258 ** 2 + 4 * 0.000104 * (4.6 + target))) /
    (2 * 0.000104)
  return 60000 / v
}

// 训练区间（fractions 为 %VO2max，已按实际计算输出校准）
// M 档不按固定百分比，取等价全马配速
const TRAINING_ZONES = [
  { key: 'E', label: 'E 轻松跑', fractions: [0.62, 0.7] },
  { key: 'M', label: 'M 马拉松配速', fractions: null },
  { key: 'T', label: 'T 乳酸阈', fractions: [0.88] },
  { key: 'I', label: 'I 间歇', fractions: [0.97] },
  { key: 'R', label: 'R 重复跑', fractions: [1.09] },
]

// 等价成绩的标准距离（面向中国跑者：1500米 起为国际正式场地项目）
const EQUIVALENT_DISTANCES = [
  { label: '全马', km: 42.195 },
  { label: '半马', km: 21.0975 },
  { label: '15K', km: 15 },
  { label: '10K', km: 10 },
  { label: '5K', km: 5 },
  { label: '3K', km: 3 },
  { label: '1500m', km: 1.5 },
]

// 展示格式化
const pad2 = (n) => String(n ?? 0).padStart(2, '0')

// 秒 → h:mm:ss / m:ss
const formatTime = (totalSec) => {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.round(totalSec % 60)
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}

// 秒 → m:ss.d（分段用，带一位小数，如 8:02.8）
const formatSplit = (sec) => {
  const m = Math.floor(sec / 60)
  const s = (sec % 60).toFixed(1)
  return `${m}:${s.padStart(4, '0')}`
}

// 秒/公里 → m'ss"
const formatPace = (secPerKm) => {
  const total = Math.round(secPerKm)
  return `${Math.floor(total / 60)}'${pad2(total % 60)}"`
}

// 比赛配速页签的累计检查点（每 5K 一个，外加半马节点），降序
const CHECKPOINTS = [
  { label: '40K', km: 40 },
  { label: '35K', km: 35 },
  { label: '30K', km: 30 },
  { label: '25K', km: 25 },
  { label: '半马', km: 21.0975 },
  { label: '20K', km: 20 },
  { label: '15K', km: 15 },
  { label: '10K', km: 10 },
  { label: '5K', km: 5 },
]

// 比赛配速页签的单段距离（操场配速参考），降序
const RACE_SPLITS = [
  { label: '1K', km: 1 },
  { label: '800m', km: 0.8 },
  { label: '400m', km: 0.4 },
]

// 比赛配速页签数据：比赛成绩 + 累计检查点 + 单段配速，整体按距离降序
// 纯算术（配速 × 距离），不依赖 VDOT 模型，对任意距离有效（含 1500m 以下）
// 检查点是累计用时（对应手表表显，h:mm:ss）；单段是单圈用时（m:ss.d 带一位小数）
export const buildRaceSplits = (inputLabel, km, sec) => {
  const paceSecKm = sec / km
  return [
    { label: inputLabel, time: formatTime(sec) },
    ...CHECKPOINTS.filter((c) => c.km < km).map((c) => ({
      label: c.label,
      time: formatTime(paceSecKm * c.km),
    })),
    ...RACE_SPLITS.filter((s) => s.km < km).map((s) => ({
      label: s.label,
      time: formatSplit(paceSecKm * s.km),
    })),
  ]
}

// 训练配速页签的间歇距离
const LONG_SPLITS = [
  { label: '1200m', km: 1.2 },
  { label: '800m', km: 0.8 },
  { label: '600m', km: 0.6 },
]
const SHORT_SPLITS = [
  { label: '400m', km: 0.4 },
  { label: '300m', km: 0.3 },
  { label: '200m', km: 0.2 },
]
// 间歇分段的全部距离（长 + 短）
const INTERVAL_SPLITS = [...LONG_SPLITS, ...SHORT_SPLITS]

// 配速区间（秒/公里）→ 显示字符串
const formatRange = (fastKm, slowKm) => {
  const fast = formatPace(fastKm)
  const slow = formatPace(slowKm)
  return fast === slow ? fast : `${fast} ~ ${slow}`
}

// 一档配速（秒/公里）× 一组距离 → 分段时间行；pad 用于末尾补占位格（— 表示该档不练此距离）
const splitRow = (label, secKm, splits, pad = 0) => ({
  label,
  times: [...splits.map((s) => formatTime(secKm * s.km)), ...Array(pad).fill('—')],
})

// 由比赛成绩生成 VDOT 相关页签（训练配速 / 等价成绩）的数据
// 比赛配速页签不依赖模型，由 buildRaceSplits 单独生成
export const buildVdotResult = (km, sec) => {
  const vdot = vdotFromRace(km, sec)

  // 各档配速（秒/公里）；E 是区间，在主表里单独取两端
  const zoneSecKm = {}
  for (const z of TRAINING_ZONES) {
    if (z.key === 'M') zoneSecKm.M = predictTime(vdot, 42.195) / 42.195
    else if (z.fractions.length === 1)
      zoneSecKm[z.key] = paceAtFraction(vdot, z.fractions[0])
  }

  return {
    vdot,
    // 训练配速主表：E/M/T/I/R
    training: TRAINING_ZONES.map((z) => {
      const rangeKm =
        z.key === 'M'
          ? [zoneSecKm.M, zoneSecKm.M]
          : z.fractions.length === 2
            ? [
                paceAtFraction(vdot, z.fractions[1]),
                paceAtFraction(vdot, z.fractions[0]),
              ]
            : [zoneSecKm[z.key], zoneSecKm[z.key]]
      return {
        label: z.label,
        paceKm: formatRange(rangeKm[0], rangeKm[1]),
      }
    }),
    // 间歇分段时间表：1200/800/600/400/300/200m
    // T 档不练 600m 以下的短间歇（单段太短达不到阈值刺激），对应单元格留空
    trainingSplits: {
      splits: INTERVAL_SPLITS,
      rows: [
        splitRow('T 乳酸阈', zoneSecKm.T, LONG_SPLITS, SHORT_SPLITS.length),
        splitRow('I 间歇', zoneSecKm.I, INTERVAL_SPLITS),
        splitRow('R 重复跑', zoneSecKm.R, INTERVAL_SPLITS),
      ],
    },
    // 等价成绩：标准距离预测
    equivalents: EQUIVALENT_DISTANCES.map((d) => {
      const t = predictTime(vdot, d.km)
      return {
        label: d.label,
        time: formatTime(t),
        paceKm: formatPace(t / d.km),
      }
    }),
  }
}
