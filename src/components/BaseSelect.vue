<template>
  <div ref="root" class="relative w-full">
    <button
      type="button"
      class="control-box flex h-11 w-full items-center justify-between rounded-md border bg-field px-3 text-left text-sm transition-colors outline-none"
      :class="open ? 'border-brand-500' : 'border-fieldline'"
      @click="toggle"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="open ? choose(options[highlightIndex]) : toggle()"
      @keydown.esc="open = false"
    >
      <span
        class="select-label truncate"
        :class="selected ? 'text-ink' : 'text-transparent'"
      >
        {{ selected?.label ?? ' ' }}
      </span>
      <svg
        viewBox="0 0 10 6"
        class="h-1.5 w-2.5 shrink-0 text-mute transition-transform"
        :class="{ 'rotate-180': open }"
      >
        <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>

    <Transition name="drop">
      <ul
        v-if="open"
        class="absolute z-20 mt-1 w-full rounded-md border border-line bg-pop py-1 shadow-lg"
      >
        <li
          v-for="(opt, i) in options"
          :key="opt.value"
          class="cursor-pointer px-3 py-2 text-sm"
          :class="[
            opt.value === modelValue
              ? 'text-brand-text font-medium'
              : 'text-ink',
            i === highlightIndex ? 'bg-brand-50' : '',
          ]"
          @mouseenter="highlightIndex = i"
          @click="choose(opt)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'

// 单选下拉：options 为 { label, value } 数组，支持键盘上下选择、Esc 关闭
const props = defineProps({
  modelValue: { type: [Number, String, null], default: null },
  options: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue', 'change'])

const root = ref(null)
const open = ref(false)
const highlightIndex = ref(-1)

const selected = computed(() =>
  props.options.find((o) => o.value === props.modelValue)
)

onClickOutside(root, () => (open.value = false))

const toggle = () => {
  open.value = !open.value
  if (open.value) {
    highlightIndex.value = Math.max(
      props.options.findIndex((o) => o.value === props.modelValue),
      0
    )
  }
}

const move = (dir) => {
  if (!open.value) {
    open.value = true
    highlightIndex.value = 0
    return
  }
  const len = props.options.length
  highlightIndex.value = (highlightIndex.value + dir + len) % len
}

const choose = (opt) => {
  if (!opt) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  open.value = false
}
</script>

<style scoped>
.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
