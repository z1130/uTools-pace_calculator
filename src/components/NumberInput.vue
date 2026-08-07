<template>
  <div
    class="control-box flex h-11 w-full items-center rounded-md border bg-field transition-colors"
    :class="focused ? 'border-brand-500' : 'border-fieldline'"
  >
    <input
      ref="inputEl"
      type="number"
      class="h-full w-full min-w-0 rounded-md bg-transparent px-3 text-left text-sm text-ink outline-none"
      :value="modelValue ?? ''"
      :min="min"
      :max="max"
      :step="step"
      @input="onInput"
      @focus="focused = true"
      @blur="onBlur"
    />
    <!-- 右侧上下箭头，不参与 Tab 顺序（触屏设备隐藏：触摸目标太小，且有数字键盘） -->
    <div class="spin-group flex h-full w-6 shrink-0 flex-col border-l border-line">
      <button
        type="button"
        tabindex="-1"
        class="spin-btn rounded-tr-md border-b border-line"
        @click="bump(1)"
      >
        <svg viewBox="0 0 10 6" class="h-1.5 w-2.5"><path d="M1 5l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
      </button>
      <button
        type="button"
        tabindex="-1"
        class="spin-btn rounded-br-md"
        @click="bump(-1)"
      >
        <svg viewBox="0 0 10 6" class="h-1.5 w-2.5"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 数字输入框：v-model 保持 number | null，失焦时按 min/max/precision 收敛
const props = defineProps({
  modelValue: { type: [Number, null], default: null },
  min: { type: Number, default: -Infinity },
  max: { type: Number, default: Infinity },
  precision: { type: Number, default: 0 },
  step: { type: Number, default: 1 },
})
const emit = defineEmits(['update:modelValue'])

const focused = ref(false)
const inputEl = ref(null)

const clamp = (val) => {
  if (val == null || Number.isNaN(val)) return null
  const fixed = Number(val.toFixed(props.precision))
  return Math.min(props.max, Math.max(props.min, fixed))
}

const onInput = (e) => {
  const raw = e.target.value
  emit('update:modelValue', raw === '' ? null : Number(raw))
}

const onBlur = () => {
  focused.value = false
  emit('update:modelValue', clamp(props.modelValue))
}

const bump = (dir) => {
  const next = clamp((props.modelValue ?? 0) + dir * props.step) ?? 0
  emit('update:modelValue', next)
  // 点击箭头后焦点回到输入框，保证浮动标签状态稳定
  inputEl.value?.focus()
}
</script>

<style scoped>
.spin-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-mute);
  cursor: pointer;
}
.spin-btn:hover {
  color: var(--c-brand-text);
  background: rgb(var(--c-brand-rgb) / 0.08);
}

/* 触屏设备隐藏上下箭头 */
@media (pointer: coarse) {
  .spin-group {
    display: none;
  }
}

/* 隐藏浏览器原生 number 箭头 */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
