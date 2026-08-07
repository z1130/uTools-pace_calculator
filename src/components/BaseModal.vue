<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        @click.self="close()"
      >
        <div
          class="max-h-[85vh] overflow-y-auto rounded-xl border border-line bg-pop p-5 shadow-xl"
          :style="{ width, maxWidth: '100%' }"
          role="dialog"
        >
          <div v-if="title" class="mb-3 flex items-center justify-between">
            <span class="text-base font-bold text-ink">{{ title }}</span>
            <button
              type="button"
              class="text-mute hover:text-ink"
              @click="close"
            >
              <svg viewBox="0 0 12 12" class="h-3 w-3"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
            </button>
          </div>
          <slot />
          <div v-if="$slots.footer" class="mt-4 flex justify-end">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
// 居中弹窗：点击遮罩关闭（不绑 Esc——uTools 里 Esc 是退出插件的全局键）
import { watch, onBeforeUnmount } from 'vue'
import { useScrollLock } from '@vueuse/core'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '420px' },
})
const emit = defineEmits(['update:modelValue'])

const close = () => emit('update:modelValue', false)

// 打开时锁定背景滚动（页面滚动条在文档根元素上）
const scrollLock = useScrollLock(document.documentElement)
watch(() => props.modelValue, v => (scrollLock.value = v), { immediate: true })
onBeforeUnmount(() => (scrollLock.value = false))
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
