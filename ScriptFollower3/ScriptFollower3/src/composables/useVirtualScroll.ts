import { ref, computed, onMounted, onUnmounted, watch, nextTick, type Ref, type ComputedRef } from 'vue'

interface VirtualScrollOptions<T> {
  containerRef: Ref<HTMLElement | null>
  items: ComputedRef<readonly T[]>
  estimatedItemHeight: number
  buffer?: number // Number of items to render above/below the visible area
}

export function useVirtualScroll<T extends { id: string }>(options: VirtualScrollOptions<T>) {
  const { containerRef, items, estimatedItemHeight, buffer = 10 } = options

  const scrollTop = ref(0)
  const containerHeight = ref(0)
  const itemHeights = ref(new Map<string, number>())
  const itemOffsets = ref<number[]>([])

  // Calculate offsets based on actual or estimated heights
  const updateOffsets = () => {
    const offsets: number[] = []
    let currentOffset = 0
    for (let i = 0; i < items.value.length; i++) {
      offsets.push(currentOffset)
      const id = items.value[i].id
      currentOffset += itemHeights.value.get(id) || estimatedItemHeight
    }
    itemOffsets.value = offsets
  }

  const totalHeight = computed(() => {
    let height = 0
    for (let i = 0; i < items.value.length; i++) {
      const id = items.value[i].id
      height += itemHeights.value.get(id) || estimatedItemHeight
    }
    return height
  })

  // Determine which items should be visible
  const visibleRange = computed(() => {
    if (items.value.length === 0) return { start: 0, end: 0 }

    let start = 0
    let end = 0

    // Find start index (binary search could be used here for very large lists)
    for (let i = 0; i < itemOffsets.value.length; i++) {
      if (itemOffsets.value[i] > scrollTop.value - (buffer * estimatedItemHeight)) {
        start = Math.max(0, i - buffer)
        break
      }
    }

    // Find end index
    const viewportEnd = scrollTop.value + containerHeight.value
    for (let i = start; i < itemOffsets.value.length; i++) {
      if (itemOffsets.value[i] > viewportEnd + (buffer * estimatedItemHeight)) {
        end = Math.min(items.value.length, i + buffer)
        break
      }
      end = items.value.length
    }

    return { start, end }
  })

  const visibleItems = computed(() => {
    return items.value.slice(visibleRange.value.start, visibleRange.value.end)
  })

  const offsetY = computed(() => {
    return itemOffsets.value[visibleRange.value.start] || 0
  })

  const handleScroll = () => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop
    }
  }

  const handleResize = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }

  const setItemRef = (id: string, el: any) => {
    if (el) {
      const element = el.$el || el
      if (element instanceof HTMLElement) {
        const height = element.offsetHeight
        if (height > 0 && itemHeights.value.get(id) !== height) {
          itemHeights.value.set(id, height)
          updateOffsets()
        }
      }
    }
  }

  const scrollToItem = (id: string, offsetPx: number = 0) => {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1 && containerRef.value) {
      const top = itemOffsets.value[index] - offsetPx
      containerRef.value.scrollTo({
        top,
        behavior: 'smooth'
      })
    }
  }

  watch(items, () => {
    updateOffsets()
  }, { deep: true, immediate: true })

  onMounted(() => {
    if (containerRef.value) {
      containerRef.value.addEventListener('scroll', handleScroll, { passive: true })
      window.addEventListener('resize', handleResize)
      handleResize()
      updateOffsets()
    }
  })

  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll)
    }
    window.removeEventListener('resize', handleResize)
  })

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setItemRef,
    scrollToItem
  }
}
