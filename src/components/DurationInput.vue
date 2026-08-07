<template>
  <div
    class="control-box flex h-11 w-full items-center rounded-md border bg-field transition-colors"
    :class="focused ? 'border-brand-500' : 'border-fieldline'"
  >
    <input
      ref="inputEl"
      type="text"
      inputmode="numeric"
      class="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-left text-sm text-ink outline-none placeholder:text-transparent focus:placeholder:text-mute"
      :placeholder="placeholder"
      :value="display"
      @beforeinput="onBeforeinput"
      @input="onInput"
      @compositionend="onCompositionend"
      @focus="onFocus"
      @mouseup="onMouseup"
      @blur="onBlur"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

// 时长/配速输入框：两种输入方式
// 1. 数字流（默认）：冒号自动插入，从右往左每两位一段。例：212 → 2:12，21200 → 2:12:00
// 2. 冒号分段：本次聚焦期间敲过 ':' 即切换，展示用户原文，从右往左按 秒/分/时 解析
//    例：1:5 → 65 秒（失焦后规范化为 1:05），5: → 300 秒
// v-model 为总秒数，溢出自动进位（如 2:99 归一化为 3:39），无需额外 clamp
const props = defineProps({
  modelValue: { type: [Number, null], default: null }, // 总秒数
  segments: { type: Number, default: 3 }, // 3 = hh:mm:ss，2 = mm:ss
})
const emit = defineEmits(['update:modelValue'])

const inputEl = ref(null)
const focused = ref(false)
// 聚焦期间的原始数字串
const digits = ref('')
// 失焦后的展示文本：失焦时冻结聚焦期间的内容（数字流保留前导零，如 000336 → 00:03:36），
// 外部改 modelValue（预设、计算回填）时由下方 watch 重算
const blurText = ref('')
// 失焦时的数字串（普通变量即可，仅聚焦还原时读取）：
// 再次聚焦且值未被外部改动时原样恢复，让 00:03:36 不会在聚焦时塌成 3:36
let blurredDigits = null
// 冒号分段模式：用户原文 + 开关（本次聚焦期间敲过 ':' 即开启）
const rawText = ref('')
const manualColon = ref(false)
// 敲过 ':' 的待生效标记（普通变量）。不能直接在 beforeinput 里翻 manualColon：
// 响应式变更会让 Vue 的微任务抢在浏览器插入字符前刷新，display 把已有内容抹掉
let colonPending = false

const pad2 = (n) => String(n).padStart(2, '0')

// 空值占位提示：告诉新用户两种写法等价——带冒号的完整格式，或纯数字流（冒号自动补）
const placeholder = computed(() =>
  props.segments === 2 ? '如 4:16 或 416' : '如 2:59:59 或 25959'
)

// 数字串 → 总秒数（从右往左每两位一段）
const parse = (d) => {
  if (!d) return null
  const s = Number(d.slice(-2))
  if (props.segments === 2) return Number(d.slice(0, -2) || 0) * 60 + s
  const m = Number(d.slice(-4, -2) || 0)
  const h = Number(d.slice(0, -4) || 0)
  return h * 3600 + m * 60 + s
}

// 总秒数 → 数字串：低位段补足两位，高位零段省略（2:05:03 → 20503，45 秒 → 45）
const toDigits = (total) => {
  if (total == null) return ''
  const s = total % 60
  const m = Math.floor(total / 60)
  if (props.segments === 2) return m > 0 ? `${m}${pad2(s)}` : String(s)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}${pad2(m % 60)}${pad2(s)}`
  return m > 0 ? `${m}${pad2(s)}` : String(s)
}

// 数字串 → 显示文本：右起每两位一段用冒号连接，不足两位的段原样显示
// 例：2 → "2"，21 → "21"，212 → "2:12"，21200 → "2:12:00"
const chunk = (d) => {
  const parts = []
  for (let i = d.length; i > 0; i -= 2) parts.unshift(d.slice(Math.max(0, i - 2), i))
  return parts.join(':')
}

// 冒号分段文本 → 总秒数：从右往左依次为秒、分、时（与数字流方向一致）
const parseColon = (t) => {
  if (!t) return null
  const p = t.split(':')
  const s = Number(p.pop() || 0)
  const m = Number(p.pop() || 0)
  const h = Number(p.join('') || 0)
  return h * 3600 + m * 60 + s
}

const display = computed(() => {
  if (!focused.value) return blurText.value
  return manualColon.value ? rawText.value : chunk(digits.value)
})

// 未聚焦时 modelValue 被外部改动 → 重新格式化展示（聚焦期间不动，由失焦冻结逻辑接管）
watch(
  () => props.modelValue,
  (v) => {
    if (!focused.value) blurText.value = chunk(toDigits(v))
  },
  { immediate: true }
)

// 插入前拦截：非数字/冒号直接挡掉（打字、粘贴都在此拦截，字符不会落进输入框）
// IME 组词期间 e.data 为 null，放行，由 compositionend 兜底
// 敲到 ':' 说明用户在用分段写法，本次聚焦期间切换为冒号分段模式
const onBeforeinput = (e) => {
  if (e.data == null) return
  if (/[^\d:]/.test(e.data)) return e.preventDefault()
  if (e.data.includes(':')) colonPending = true
}

// 同步回写 DOM：display 未变化时 Vue 会跳过 value 补丁，非法字符会残留到失焦
const syncDom = (el) => {
  if (el.value !== display.value) el.value = display.value
}

const onInput = async (e) => {
  // 上一击敲过 ':'：此刻字符已落入 DOM，翻开关是安全的（rawText 随即就位）
  if (colonPending) {
    colonPending = false
    manualColon.value = true
  }
  // 冒号模式下把冒号删光（含清空），退回数字流模式
  if (manualColon.value && !e.target.value.includes(':')) manualColon.value = false
  if (manualColon.value) {
    // 冒号分段：展示原文（仅剥非法字符），合法输入不回写 DOM，光标自然不动
    rawText.value = e.target.value
      .replace(/[^\d:]/g, '')
      .replace(/^:+/, '')
      .replace(/:+/g, ':')
      .slice(0, 8)
    emit('update:modelValue', parseColon(rawText.value))
    await nextTick()
    syncDom(e.target)
    return
  }
  digits.value = e.target.value.replace(/\D/g, '').slice(0, 6)
  emit('update:modelValue', parse(digits.value))
  // 格式化会插入冒号导致光标漂移，统一收回到末尾（该输入本质是追加式的）
  await nextTick()
  syncDom(e.target)
  const el = e.target
  el.setSelectionRange(el.value.length, el.value.length)
}

// IME 组词提交后，清掉中文等非法字符（beforeinput 拦不住组词）
const onCompositionend = async (e) => {
  await nextTick()
  syncDom(e.target)
}

const onFocus = async () => {
  focused.value = true
  manualColon.value = false
  colonPending = false
  rawText.value = ''
  // 值未被外部改动（计算回填、重置）时恢复失焦前的数字串，保留前导零；
  // 否则从当前值还原，保留低位段的补零（如 2:05:03 → 20503）
  digits.value =
    blurredDigits != null && parse(blurredDigits) === props.modelValue
      ? blurredDigits
      : toDigits(props.modelValue)
  blurredDigits = null
  // 光标定位到末尾：输入是追加式的，中间编辑无意义
  await nextTick()
  const el = inputEl.value
  el?.setSelectionRange(el.value.length, el.value.length)
}

// 点击聚焦时，mouseup 的默认行为会把光标定位到点击处，拦掉让它留在末尾
const onMouseup = (e) => {
  e.preventDefault()
}

const onBlur = () => {
  focused.value = false
  // 数字流：保留前导零（000336 → 00:03:36）；冒号分段：统一规范化（5: → 5:00，1:5 → 1:05）
  blurText.value = manualColon.value
    ? chunk(toDigits(props.modelValue))
    : chunk(digits.value)
  // 冒号分段失焦后已规范化，无需还原原文，只给数字流存底
  blurredDigits = manualColon.value ? null : digits.value
}
</script>
