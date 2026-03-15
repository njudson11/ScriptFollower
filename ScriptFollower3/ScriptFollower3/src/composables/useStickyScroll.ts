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
    if (!element) {
      // If element not found, it might be due to a recent re-render.
      // We don't retry here to avoid loops, but subsequent selection 
      // changes will trigger it again.
      return
    }

    const container = viewerRef.value
    
    // Use getBoundingClientRect for more robust calculation, 
    // especially when intermediate elements have 'position: relative' (like in Sidebar)
    const elementRect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // Relative position of element top within the container's content
    const relativeTop = elementRect.top - containerRect.top + container.scrollTop
    
    const targetScrollTop = relativeTop - scrollOffsetPx.value

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
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
