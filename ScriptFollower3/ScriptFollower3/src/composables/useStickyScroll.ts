import { ref, watch, nextTick, type Ref, type ComputedRef } from 'vue'
import type { ScriptLineBase } from '@/types/core'

interface UseStickyScrollOptions {
  viewerRef: Ref<HTMLElement | null>
  lines: ComputedRef<readonly ScriptLineBase[]>
  currentLineId: ComputedRef<string | null>
  scrollOffsetPx: Ref<number>
}

/**
 * Vue composable to implement sticky scrolling behavior for a viewer component.
 * It watches the current active line and scrolls the viewer to bring it into view,
 * applying an offset.
 *
 * @param options - Options for the sticky scroll:
 *   - viewerRef: A ref to the HTML element that serves as the scrollable viewer.
 *   - lines: A computed ref of all script lines in the viewer.
 *   - currentLineId: A computed ref of the ID of the currently active line.
 *   - scrollOffsetPx: A ref to the pixel offset to apply when scrolling.
 */
export function useStickyScroll(options: UseStickyScrollOptions) {
  const { viewerRef, lines, currentLineId, scrollOffsetPx } = options

  // A map to store refs to individual line components
  const lineRefs: Ref<Map<string, HTMLElement | Component | null>> = ref(new Map());

  // Function to set the ref for each line component
  const setLineRef = (lineId: string, el: HTMLElement | Component | null) => {
    if (el) {
      lineRefs.value.set(lineId, el);
    } else {
      lineRefs.value.delete(lineId);
    }
  };

  watch(currentLineId, async (newLineId) => {
    if (newLineId && viewerRef.value) {
      await nextTick(); // Ensure DOM is updated

      const lineRefInstance = lineRefs.value.get(newLineId);

      let activeLineElement: HTMLElement | null = null;

      if (lineRefInstance instanceof HTMLElement) {
        activeLineElement = lineRefInstance;
      } else if (lineRefInstance && '$el' in lineRefInstance && lineRefInstance.$el instanceof HTMLElement) {
        // If it's a Vue component instance, access its root DOM element
        activeLineElement = lineRefInstance.$el;
      }

      if (activeLineElement) {
        const viewer = viewerRef.value;
        if (!viewer) return;

        const viewerRect = viewer.getBoundingClientRect();
        const activeElementRect = activeLineElement.getBoundingClientRect();

        // Calculate position of active element relative to the viewer's scrollable area
        // This accounts for any scrolling already present in the viewer
        const relativeTop = activeElementRect.top - viewerRect.top + viewer.scrollTop;

        // Calculate the desired scroll position
        const desiredScrollTop = relativeTop - scrollOffsetPx.value;

        viewer.scrollTo({
          top: desiredScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, { immediate: true });

  return {
    setLineRef // Expose this function so parent component can bind refs in v-for
  };
}
