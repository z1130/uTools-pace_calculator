<template>
  <div class="app-container">
    <!-- 内容区 -->
    <div class="rounded-xl border border-line bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <div class="text-lg font-bold text-ink">跑步配速计算器</div>
          <div class="mt-0.5 text-xs text-mute">
            距离、时长、配速，输入任意两项即可计算第三项
          </div>
        </div>
        <!-- VDOT 跑道徽章：数值叠在跑道内道里，未计算时显示问号引导点击 -->
        <div
          class="track-badge"
          :class="{ 'is-active': vdotResult }"
          @click="vdotHelpVisible = true"
        >
          <svg viewBox="0 0 96 64" class="track-svg" aria-hidden="true">
            <rect x="10" y="10" width="76" height="44" rx="22" class="track-surface" />
          </svg>
          <div class="track-text">
            <template v-if="vdotResult">
              <div class="badge-label">跑力值</div>
              <div class="badge-value">{{ vdotResult.toFixed(1) }}</div>
            </template>
            <div v-else class="badge-hint">跑力值?</div>
          </div>
        </div>
      </div>

      <!-- 距离 -->
      <div class="mb-3 flex gap-2" :class="{ 'solved-group': solvedGroup === 'distance' }">
        <FloatField label="距离" :has-value="distance.dis_type != null">
          <BaseSelect
            v-model="distance.dis_type"
            :options="distanceOptions"
            @change="disTypeChange"
          />
        </FloatField>
        <template v-if="distance.dis_type === 0">
          <FloatField label="自定义距离" :has-value="customDistance != null">
            <NumberInput
              v-model="customDistance"
              :min="0"
              :precision="distance.dis_unit === 'm' ? 0 : 4"
            />
          </FloatField>
          <FloatField label="单位" has-value class="unit-field">
            <BaseSelect v-model="distance.dis_unit" :options="unitOptions" />
          </FloatField>
        </template>
      </div>

      <!-- 时长 -->
      <div class="mb-3 flex gap-2" :class="{ 'solved-group': solvedGroup === 'time' }">
        <FloatField label="时长 (hh:mm:ss)" :has-value="timeTotal != null">
          <DurationInput v-model="timeTotal" :segments="3" />
        </FloatField>
      </div>

      <!-- 配速 -->
      <div class="mb-4 flex gap-2" :class="{ 'solved-group': solvedGroup === 'pace' }">
        <FloatField label="配速 (mm:ss)" :has-value="paceTotal != null">
          <DurationInput v-model="paceTotal" :segments="2" />
        </FloatField>
      </div>

      <!-- 操作按钮：计算占大头，重置自适应 -->
      <div class="flex gap-2">
        <button
          type="button"
          class="h-10 flex-1 rounded-[10px] bg-brand-500 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-75"
          @click="calculate"
        >
          计算
        </button>
        <button
          type="button"
          class="h-10 rounded-[10px] bg-btn2 px-5 text-sm font-medium text-btn2text transition-opacity hover:opacity-90 active:opacity-75"
          @click="reset"
        >
          重置
        </button>
      </div>
    </div>

    <!-- 计算结果：比赛配速（任意距离）/ 训练配速 / 等价成绩（后两者需 VDOT，≥1500m） -->
    <div v-if="raceSplits" class="mt-3 rounded-xl border border-line bg-card p-5 shadow-sm">
      <!-- 页签 -->
      <div class="mb-3 flex gap-5 border-b border-line">
        <button
          v-for="t in tabs"
          :key="t.name"
          type="button"
          class="-mb-px border-b-2 pb-2 text-sm transition-colors focus-visible:shadow-none focus-visible:text-ink"
          :class="
            activeTab === t.name
              ? 'border-brand-text font-medium text-brand-text'
              : 'border-transparent text-mute hover:text-ink'
          "
          @click="activeTab = t.name"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- 比赛配速（滚动容器：窄屏表格溢出时横向滑动，下列各表同） -->
      <div v-show="activeTab === 'race'" class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr><th>距离</th><th>分段用时</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in raceSplits" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.time }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 训练配速（vdotData 为空时页签隐藏且 activeTab 已归位，此分支不会激活） -->
      <template v-if="vdotData && activeTab === 'training'">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>类型</th><th>配速 /公里</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in vdotData.training" :key="row.label">
                <td><span class="zone-key">{{ zoneParts(row.label)[0] }}</span>{{ zoneParts(row.label)[1] }}</td>
                <td>{{ row.paceKm }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="data-table splits-table">
            <thead>
              <tr>
                <th>类型</th>
                <th v-for="s in vdotData.trainingSplits.splits" :key="s.label">{{ s.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in vdotData.trainingSplits.rows" :key="row.label">
                <td><span class="zone-key">{{ zoneParts(row.label)[0] }}</span>{{ zoneParts(row.label)[1] }}</td>
                <td v-for="(t, i) in row.times" :key="i" :class="{ 'text-mute': t === '—' }">{{ t }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- 等价成绩 -->
      <template v-if="vdotData && activeTab === 'equivalent'">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>项目</th><th>预测成绩</th><th>配速 /公里</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in vdotData.equivalents" :key="row.label">
                <td>{{ row.label }}</td>
                <td>{{ row.time }}</td>
                <td>{{ row.paceKm }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- 跑力值说明弹窗 -->
    <BaseModal v-model="vdotHelpVisible" width="420px" title="什么是跑力值？">
      <div class="text-sm leading-6 text-ink">
        <p class="mb-3">
          跑力值是衡量你当前跑步能力的指标，算法源自跑步教练 Jack Daniels
          的 VDOT 模型。输入一项近期（或预估的）比赛成绩，即可得到你的跑力值及对应的训练配速。
        </p>
        <p class="mb-2">每一档训练配速都有明确的训练目的：</p>
        <ul class="mb-3 list-disc pl-4">
          <li><b><span class="zone-key">E</span> 轻松跑</b>：打好有氧基础、促进恢复</li>
          <li><b><span class="zone-key">M</span> 马拉松配速</b>：适应全马比赛节奏</li>
          <li><b><span class="zone-key">T</span> 乳酸阈</b>：提升耐力，推迟乳酸堆积</li>
          <li><b><span class="zone-key">I</span> 间歇</b>：提升最大摄氧量（VO₂max）</li>
          <li><b><span class="zone-key">R</span> 重复跑</b>：提升速度与跑步经济性</li>
        </ul>
        <p>
          「等价成绩」可帮助你设定比赛目标，或比较自己在不同距离上成绩的水平高低。
        </p>
        <p class="mt-3 text-mute">
          注：跑力值适用于 1500 米及以上的比赛距离，更短的成绩超出模型有效范围，不做推算。
        </p>
      </div>
    </BaseModal>

    <Toasts />
  </div>
</template>

<script setup>
import { useDark, useThrottleFn } from '@vueuse/core'
import { computed, reactive, ref } from 'vue'
import { buildRaceSplits, buildVdotResult } from '@/utils/vdot'
import { toast } from '@/utils/toast'
import FloatField from '@/components/FloatField.vue'
import NumberInput from '@/components/NumberInput.vue'
import DurationInput from '@/components/DurationInput.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import BaseModal from '@/components/BaseModal.vue'
import Toasts from '@/components/Toasts.vue'

// useDark 有副作用：会根据系统主题给 <html> 切换 dark class，不能删
const isDark = useDark()

// uTools 深色模式不走系统媒体查询，需用其 API 显式同步（浏览器开发环境下 utools 不存在，需判空）
const syncUtoolsDark = () => {
  if (window.utools?.isDarkColors) isDark.value = window.utools.isDarkColors()
}
syncUtoolsDark()
window.utools?.onDarkModeChange?.(syncUtoolsDark)

// 上次计算求出的组（'time' | 'distance' | 'pace'），用于输入框高亮
const solvedGroup = ref(null)
// VDOT 说明弹窗
const vdotHelpVisible = ref(false)

// 比赛配速页签数据（纯算术，任意距离都生成，含 1500m 以下）
const raceSplits = ref(null)
// 训练配速 / 等价成绩页签数据（依赖 VDOT 模型，仅 ≥1500m 生成）
const vdotData = ref(null)
// 右上角徽章的 VDOT 值：派生自结果数据，不单独维护
const vdotResult = computed(() => vdotData.value?.vdot ?? null)
const activeTab = ref('race')
// 无 VDOT 数据时（<1500m）只剩比赛配速一个页签
const tabs = computed(() => [
  { name: 'race', label: '比赛配速' },
  ...(vdotData.value
    ? [
        { name: 'training', label: '训练配速' },
        { name: 'equivalent', label: '等价成绩' },
      ]
    : []),
])

// 训练标签拆成「代号 + 名称」（'R 重复跑' → ['R', ' 重复跑']），代号单独上色
const zoneParts = (label) => {
  const i = label.indexOf(' ')
  return [label.slice(0, i), label.slice(i)]
}

// 项目与距离的映射表，value=0 表示自定义距离（手动输入公里数）
const distanceOptions = [
  { value: 1, label: '全马', km: 42.195 },
  { value: 2, label: '半马', km: 21.0975 },
  { value: 3, label: '15K', km: 15 },
  { value: 4, label: '10K', km: 10 },
  { value: 5, label: '5K', km: 5 },
  { value: 6, label: '3K', km: 3 },
  { value: 7, label: '1500m', km: 1.5 },
  { value: 0, label: '其他', km: null },
]
const unitOptions = [
  { label: 'km', value: 'km' },
  { label: 'm', value: 'm' },
]

// 表单数据，始终保持 number 类型，补零只在展示层做
// dis_value 内部统一存公里；dis_unit 只影响自定义输入框的展示和解析
const distance = reactive({ dis_value: null, dis_type: null, dis_unit: 'km' })
// DurationInput 的 v-model 就是总秒数，直接存总秒数，不再另维护时/分/秒分段
const timeTotal = ref(null)
const paceTotal = ref(null)

// 自定义距离输入框的代理：按当前单位做 公里↔米 换算
const customDistance = computed({
  get: () =>
    distance.dis_value == null
      ? null
      : distance.dis_unit === 'm'
        ? distance.dis_value * 1000
        : distance.dis_value,
  set: (val) => {
    distance.dis_value =
      val == null ? null : distance.dis_unit === 'm' ? val / 1000 : val
  },
})

// 计算：自动找出唯一未填的项并求解，节流 1s 内只能触发一次
const calculate = useThrottleFn(() => {
  const distKm = distance.dis_value
  const totalSec = timeTotal.value ?? 0
  const paceSec = paceTotal.value ?? 0

  const isTimeEmpty = timeTotal.value == null
  const isDistanceEmpty = distKm == null || distKm === 0
  let isPaceEmpty = paceTotal.value == null

  const emptyCount = [isTimeEmpty, isDistanceEmpty, isPaceEmpty].filter(Boolean).length
  // 规则：恰好空一项则求它；三项都填则固定重算配速（配速是最高频的求解目标）
  if (emptyCount === 0) {
    paceTotal.value = null
    isPaceEmpty = true
  } else if (emptyCount > 1) {
    return toast('请输入【距离】、【时长】、【配速】中的任意两项')
  }

  if (isTimeEmpty) {
    // time = pace * distance
    if (paceSec === 0) return toast('配速不能为 0')
    timeTotal.value = Math.floor(paceSec * distKm)
  } else if (isDistanceEmpty) {
    // distance = time / pace
    if (paceSec === 0) return toast('配速不能为 0')
    distance.dis_value = parseFloat((totalSec / paceSec).toFixed(2))
    // 算出的距离放到自定义输入框里展示
    distance.dis_type = 0
  } else {
    // pace = time / distance，四舍五入到整秒（与主流跑步平台一致）
    if (totalSec === 0) return toast('时长不能为 0')
    paceTotal.value = Math.round(totalSec / distKm)
  }
  // 高亮被求出的那一组输入框，直到下次计算或重置
  solvedGroup.value = isTimeEmpty ? 'time' : isDistanceEmpty ? 'distance' : 'pace'

  // 计算成功后，用完整的距离+时长生成结果页签数据
  // 比赛配速是纯算术，任意距离都生成；VDOT 相关页签有 1500m 下限
  const finalKm = distance.dis_value
  const finalSec = timeTotal.value ?? 0
  if (finalKm > 0 && finalSec > 0) {
    // 标准项目用项目名；自定义距离按量级用 K / m（与检查点标签风格一致）
    const label = distance.dis_type
      ? distanceOptions.find((o) => o.value === distance.dis_type)?.label
      : distance.dis_value >= 1
        ? `${distance.dis_value}K`
        : `${Math.round(distance.dis_value * 1000)}m`
    raceSplits.value = buildRaceSplits(label, finalKm, finalSec)
    if (finalKm >= 1.5) {
      vdotData.value = buildVdotResult(finalKm, finalSec)
    } else {
      vdotData.value = null
      // 页签只剩比赛配速，activeTab 归位，防止停留在已隐藏的训练/等价页签
      activeTab.value = 'race'
      toast('1500 米以内的距离超出 VDOT 模型有效范围，不生成跑力值与训练配速')
    }
  } else {
    raceSplits.value = null
    vdotData.value = null
  }
}, 1000)

// 项目切换：标准项目自动填入距离，自定义则保留现有输入
const disTypeChange = (val) => {
  const km = distanceOptions.find((item) => item.value === val)?.km
  if (km != null) distance.dis_value = km
}

// 重置按钮
const reset = () => {
  Object.assign(distance, { dis_value: null, dis_type: null, dis_unit: 'km' })
  timeTotal.value = null
  paceTotal.value = null
  solvedGroup.value = null
  raceSplits.value = null
  vdotData.value = null
  // 按钮点击后主动失焦，避免保持激活样式
  document.activeElement?.blur()
}

// 不在 onPluginOut 时 reset：进程被销毁时状态天然清空，
// 进程保留（后台常驻）时让用户回来能继续上次的计算
</script>

<style scoped>
/* 单位下拉只有 km/m 两个短选项，收窄并允许压缩，把空间让给距离选择和输入 */
.unit-field {
  width: 72px;
  min-width: 60px;
  flex-shrink: 1;
}
/* 窄框内边距同步收紧，给浮动标签和箭头留位 */
.unit-field :deep(.control-box) {
  padding-left: 8px;
  padding-right: 8px;
}
.unit-field :deep(label) {
  left: 8px;
}

/* 被求出的一组输入框：主题色高亮（计算后保持，下次计算或重置时移除） */
.solved-group :deep(.control-box) {
  background-color: rgb(var(--c-brand-rgb) / 0.1);
  border-color: rgb(var(--c-brand-rgb) / 0.55);
}
/* 高亮组聚焦时仍给明确的聚焦边框 */
.solved-group :deep(.control-box:focus-within) {
  border-color: var(--c-brand);
}

/* 结果表格：纯展示，无边框斑马纹 */
.data-table {
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;
}
.data-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 500;
  color: var(--c-mute);
  border-bottom: 1px solid var(--c-line);
  white-space: nowrap;
}
.data-table td {
  padding: 8px 12px;
  color: var(--c-ink);
  border-bottom: 1px solid var(--c-line);
  white-space: nowrap;
}

/* 占位格（—）：特异性需高于 .data-table td 才能盖住默认墨色 */
.data-table td.text-mute {
  color: var(--c-mute);
}

/* 间歇分表：固定布局，上下两表列宽均分以严格对齐；
   设最小宽度，窄屏时在滚动容器里横向滑动而不是被压扁 */
.splits-table {
  table-layout: fixed;
  min-width: 480px;
}
/* 横向滚动时固定首列（类型）：底色盖住滑过的列，右侧细线示意可滑 */
.splits-table th:first-child,
.splits-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--c-card);
  box-shadow: 1px 0 0 var(--c-line);
}

/* VDOT 跑道徽章：跑道做容器，文字绝对定位于内道中央 */
.track-badge {
  position: relative;
  margin-left: 12px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none; /* 徽章可点击打开弹窗，与按钮同理禁选 */
}

.track-svg {
  display: block;
  width: 108px;
  height: 72px;
}

/* 跑道 = 单圈体育场形红环：外形本身承载跑道隐喻，不画分道线，
   避免小尺寸下多层描边与下方扁平表格风格打架 */
/* 路面：未激活是浅灰描边环，激活点亮为铁红 */
.track-surface {
  fill: none;
  stroke: var(--c-mute);
  stroke-width: 6;
  opacity: 0.15;
}
.is-active .track-surface {
  stroke: var(--c-brand);
  opacity: 0.85;
}

/* 文字层：收进路面内圈（viewBox 内缩 14/96 ≈ 15%），居中于场内 */
.track-text {
  position: absolute;
  inset: 0 17%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.3;
  color: var(--c-brand-text);
}

/* 标签小号灰色细体，数值大号深灰粗体 */
.badge-label {
  font-size: 11px;
  font-weight: 400;
  color: var(--c-mute);
  letter-spacing: 0.5px;
}

.badge-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--c-ink);
  line-height: 1.1;
}

/* 训练区间代号（E/M/T/I/R）：铁红加粗，一眼扫到训练类型 */
.zone-key {
  color: var(--c-brand-text);
  font-weight: 700;
}

.badge-hint {
  font-size: 14px;
  text-align: center;
  white-space: nowrap;
  color: var(--c-mute);
}
</style>
