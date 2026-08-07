<template>
  <div
    class="relative w-full"
    :class="{ 'is-float': floated }"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <slot />
    <label
      class="pointer-events-none absolute whitespace-nowrap transition-all duration-150"
      :class="
        floated
          ? 'left-3 top-1.5 text-[12px] text-brand-text'
          : 'left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-mute'
      "
    >
      {{ label }}
    </label>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

// in label 浮动标签：未输入时居中占位，聚焦/有值后缩到框内左上角
// 子控件需要提供边框、圆角、高度（建议 h-11 给标签留位）和背景
const props = defineProps({
  label: { type: String, required: true },
  hasValue: { type: Boolean, default: false },
})

const focused = ref(false)
const floated = computed(() => focused.value || props.hasValue)
</script>

<style scoped>
/* 上浮后输入内容下移，给框内小标签让位 */
.is-float :deep(input) {
  padding-top: 14px;
}
.is-float :deep(.select-label) {
  transform: translateY(7px);
}
:deep(input),
:deep(.select-label) {
  transition: padding-top 0.15s ease, transform 0.15s ease;
}
</style>
