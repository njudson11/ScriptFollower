import { ref, watch, nextTick, type Ref, type ComputedRef } from 'vue'

interface UseStickyScrollOptions {
  viewerRef: Ref<HTMLElement | null>
  currentLineId: ComputedRef<string | null>
  scrollOffsetPx?: Ref<number>
}

export function useStickyScroll(options: UseStickyScrollOptions) {
  const { viewerRef, currentLineId, scrollOffsetPx = ref(200) } = options
  const lineRefs = new Map<string, HTMLElement>()

  const setLineRef = (id: string, el: any) => {
    if (el) {
      lineRefs.set(id, el.$el || el)
    } else {
      lineRefs.delete(id)
    }
  }

  const scrollToActive = () => {
    const activeId = currentLineId.value
    if (!activeId || !viewerRef.value) return

    const element = lineRefs.get(activeId)
    if (!element) return

    const container = viewerRef.value
    const elementTop = element.offsetTop
    
    // Calculate if element is outside current view or needs centering
    const containerScrollTop = container.scrollTop
    const containerHeight = container.clientHeight
    
    // Simple logic: if it's not in the "comfort zone", scroll to it
    const targetScrollTop = elementTop - scrollOffsetPx.value

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }

  // Watch for selection changes to trigger scroll
  watch(currentLineId, () => {
    nextTick(() => {
      scrollToActive()
    })
  })

  return {
    setLineRef,
    scrollToActive
  }
}
