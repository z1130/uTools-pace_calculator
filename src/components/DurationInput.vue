<template>
  <div>
    <div
      class="control-box flex h-11 w-full items-center rounded-md border bg-field transition-colors"
      :class="[focused ? 'border-brand-500' : 'border-fieldline', { 'is-shake': shaking }]"
      @animationend="shaking = false"
    >
      <input
        ref="inputEl"
        type="text"
        inputmode="numeric"
        class="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-left text-sm outline-none placeholder:text-transparent focus:placeholder:text-mute"
        :class="invalid ? 'text-danger' : 'text-ink'"
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
    <!-- 非法输入的持续提示：文字通道，不用边框色——边框红是「计算求解项」高亮专属 -->
    <div v-if="invalid" class="mt-1 pl-1 text-xs text-danger">{{ invalidHint }}</div>
  </div>
</template>

<style scoped>
/* 点计算被非法输入拦下时抖动字段：动作反馈由动效承担，不再弹 toast 重复文字 */
.is-shake {
  animation: shake 0.3s;
}
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}
</style>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'

// 时长/配速输入框：两种输入方式
// 1. 数字流（默认）：冒号自动插入，从右往左每两位一段。例：212 → 2:12，21200 → 2:12:00
//    聚焦期间不校验（敲 25959 会经过 25:95 这种瞬时中间态），失焦时校验最终形态：
//    除最高位段外每段 ≤ 59，否则非法（26969 → 2:69:69）
// 2. 冒号分段：本次聚焦期间敲过 ':' 即切换，展示用户原文，从右往左按 秒/分/时 解析
//    例：1:5 → 65 秒（失焦后规范化为 1:05），5: → 300 秒
//    段数超过字段位数、或分/秒段 > 59（如 2:69:69）实时判为非法
// 非法输入：输入文字标红 + 框下小字提示，保留原文、值按未填处理（不参与计算），
// 等用户回来改正，不静默进位。边框不标红——边框红是「计算求解项」高亮专属通道，混用分不清
// v-model 为总秒数；聚焦期间的瞬时溢出按 60 进制进位（如 25:95 按 26:35 计），无需额外 clamp
const props = defineProps({
  modelValue: { type: [Number, null], default: null }, // 总秒数
  segments: { type: Number, default: 3 }, // 3 = hh:mm:ss，2 = mm:ss
})
const emit = defineEmits(['update:modelValue', 'update:invalid'])

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
// 非法输入标记：红框、保留原文、值按未填处理（v-model:invalid 同步给外层浮动标签用）
const invalid = ref(false)
// 非法输入快照（普通变量）：失焦时记下原文与模式，再次聚焦原样恢复让用户接着改
let invalidBackup = null // { colon: boolean, text: string }
// 敲过 ':' 的待生效标记（普通变量）。不能直接在 beforeinput 里翻 manualColon：
// 响应式变更会让 Vue 的微任务抢在浏览器插入字符前刷新，display 把已有内容抹掉
let colonPending = false

const pad2 = (n) => String(n).padStart(2, '0')

// 空值占位提示：告诉新用户两种写法等价——带冒号的完整格式，或纯数字流（冒号自动补）
const placeholder = computed(() =>
  props.segments === 2 ? '如 4:16 或 416' : '如 2:59:59 或 25959'
)

// 非法输入的提示小字：与计算时的 toast 口径一致，只报名称不解释细节
const invalidHint = computed(() =>
  props.segments === 2 ? '【配速】不合法' : '【时长】不合法'
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

// 冒号分段合法性：段数不超过字段位数（时:分:秒 / 分:秒），
// 且除最高位段外每段 ≤ 59（分、秒的正常进制；2:69:69、配速框里 1:2:3 都算非法）
const colonInvalid = (t) => {
  if (!t) return false
  const p = t.split(':')
  return p.length > props.segments || p.slice(1).some((x) => Number(x || 0) > 59)
}

// 数字串合法性（仅供失焦时校验最终形态）：右起每两位一段，除最高位段外每段 ≤ 59
// 最高位段不限——69:23（69 分 23 秒）、配速框 12345（123 分 45 秒）都是合法输入
const digitInvalid = (d) => {
  for (let end = d.length; end > 0; end -= 2) {
    const start = Math.max(0, end - 2)
    if (start === 0) break // 最高位段
    if (Number(d.slice(start, end)) > 59) return true
  }
  return false
}

// invalid 变化时同步给外层（FloatField 靠它把非法原文当作「有内容」，保持标签上浮）
const setInvalid = (v) => {
  if (invalid.value === v) return
  invalid.value = v
  emit('update:invalid', v)
}

// 抖动动效：外层（点计算被拦下时）通过组件引用触发，animationend 复位以便重复触发
const shaking = ref(false)
const shake = () => {
  shaking.value = false
  nextTick(() => {
    shaking.value = true
  })
}
defineExpose({ shake })

const display = computed(() => {
  if (!focused.value) return blurText.value
  return manualColon.value ? rawText.value : chunk(digits.value)
})

// 未聚焦时 modelValue 被外部改动 → 重新格式化展示（聚焦期间不动，由失焦冻结逻辑接管）
watch(
  () => props.modelValue,
  (v) => {
    if (focused.value) return
    if (invalid.value) {
      // 非法期间：null 是自己发的（值按未填处理），忽略；
      // 外部回填了真实值（计算把本字段求出来了）则非法状态让位，按新值展示
      if (v == null) return
      setInvalid(false)
      invalidBackup = null
    }
    blurText.value = chunk(toDigits(v))
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
    // 非法输入（2:69:69 之类）：红框提示、值按未填处理，不参与计算；原文保留等用户改正
    setInvalid(colonInvalid(rawText.value))
    emit('update:modelValue', invalid.value ? null : parseColon(rawText.value))
    await nextTick()
    syncDom(e.target)
    return
  }
  // 数字流：失焦前留下的非法红框在继续编辑时先摘掉，最终形态由失焦时再判
  setInvalid(false)
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
  colonPending = false
  if (invalidBackup && props.modelValue == null) {
    // 上次失焦时是非法输入：原样恢复原文与输入模式，让用户接着改
    manualColon.value = invalidBackup.colon
    if (invalidBackup.colon) {
      rawText.value = invalidBackup.text
    } else {
      digits.value = invalidBackup.text
      rawText.value = ''
    }
    invalidBackup = null
  } else {
    manualColon.value = false
    rawText.value = ''
    // 值未被外部改动（计算回填、重置）时恢复失焦前的数字串，保留前导零；
    // 否则从当前值还原，保留低位段的补零（如 2:05:03 → 20503）
    digits.value =
      blurredDigits != null && parse(blurredDigits) === props.modelValue
        ? blurredDigits
        : toDigits(props.modelValue)
    blurredDigits = null
  }
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
  // 冒号分段在输入时已实时判定；数字流在此校验最终形态（聚焦期间的瞬时态不判）
  const bad = manualColon.value ? invalid.value : digitInvalid(digits.value)
  if (bad) {
    // 非法：保留原文与红框，值按未填处理（不参与计算），存快照供再次聚焦时恢复
    emit('update:modelValue', null) // 先置空：触发的 watch(v=null) 会被 invalid 守卫忽略
    setInvalid(true)
    invalidBackup = {
      colon: manualColon.value,
      text: manualColon.value ? rawText.value : digits.value,
    }
    blurredDigits = null
    blurText.value = manualColon.value ? rawText.value : chunk(digits.value)
    return
  }
  // 数字流：保留前导零（000336 → 00:03:36）；冒号分段：统一规范化（5: → 5:00，1:5 → 1:05）
  blurText.value = manualColon.value
    ? chunk(toDigits(props.modelValue))
    : chunk(digits.value)
  // 冒号分段失焦后已规范化，无需还原原文，只给数字流存底
  blurredDigits = manualColon.value ? null : digits.value
}
</script>
