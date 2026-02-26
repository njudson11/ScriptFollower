// src/composables/useTouch.ts
import { onMounted, onUnmounted, ref } from 'vue'

export function useTouch() {
  const isTouchDevice = ref(false)

  const checkTouch = () => {
    isTouchDevice.value = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
  }

  onMounted(() => {
    checkTouch()
    window.addEventListener('resize', checkTouch) // In case of device mode changes in dev tools
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkTouch)
  })

  return { isTouchDevice }
}
