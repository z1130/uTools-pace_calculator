import { reactive } from 'vue'

// 轻量 toast：全局共享队列，由 <Toasts /> 组件渲染
let seq = 0
export const toasts = reactive([])

export const toast = (message, duration = 2500) => {
  const item = { id: ++seq, message }
  toasts.push(item)
  setTimeout(() => {
    const i = toasts.indexOf(item)
    if (i > -1) toasts.splice(i, 1)
  }, duration)
}
