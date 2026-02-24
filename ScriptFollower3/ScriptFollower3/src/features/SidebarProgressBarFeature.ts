import type { FeaturePlugin } from '@/types/core'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { AppStore } from '@/store/AppStore'
import { computed, inject } from 'vue'

export class SidebarProgressBarFeature implements FeaturePlugin {
  readonly id = 'sidebar-progress-bar-feature'
  readonly name = 'Sidebar Progress Bar'
  readonly version = '1.0.0'
  readonly description = 'Adds a progress bar above the active sidebar item, indicating document position.'

  private selectionManager: LineSelectionManager
  private appStore: AppStore

  // Computed properties that will be exposed by the feature instance
  public activeSidebarLineId = computed(() => {
    // We need to access appStore.state.lineTypeVisibility from the main appStore.
    // However, inject can only be called synchronously during setup() or within a component.
    // For a non-component class like this feature, we need to pass these reactive dependencies
    // through the constructor or a reactive proxy.
    // Given AppStore is a dependency, we can access it directly.
    return this.selectionManager.getSidebarActiveLine(this.selectionManager.getCurrentLine(), this.appStore.state.lineTypeVisibility);
  });

  public previousVisibleLineId = computed<string | null>(() => {
    const activeId = this.activeSidebarLineId.value;
    if (!activeId) return null;

    const visibleLines = this.appStore.getLines().filter(line => this.appStore.state.lineTypeVisibility[line.lineType]);
    const activeIndex = visibleLines.findIndex(line => line.id === activeId);
    if (activeIndex > 0) {
      return visibleLines[activeIndex - 1].id;
    }
    return null;
  });

  public progressPercentage = computed<number>(() => {
    const docCurrentLineId = this.selectionManager.getCurrentLine();
    const sidebarActiveId = this.activeSidebarLineId.value;
    const prevVisibleId = this.previousVisibleLineId.value;

    if (!docCurrentLineId || !sidebarActiveId) return 0;

    const allLines = this.appStore.getLines();

    const docCurrentIndex = allLines.findIndex(line => line.id === docCurrentLineId);
    const sidebarActiveIndex = allLines.findIndex(line => line.id === sidebarActiveId);

    if (docCurrentIndex === -1 || sidebarActiveIndex === -1) return 0;

    // If the document's current line is the same as the sidebar's active line, progress is 0
    if (docCurrentLineId === sidebarActiveId) return 0;

    let prevVisibleIndex = -1;
    if (prevVisibleId) {
      prevVisibleIndex = allLines.findIndex(line => line.id === prevVisibleId);
    } else {
      return 0; // If no previous line, we can't calculate 'between'
    }

    // Ensure the current document line falls within the range (prevVisibleId, sidebarActiveId]
    if (docCurrentIndex <= prevVisibleIndex || docCurrentIndex > sidebarActiveIndex) {
      return 0; // The current line is outside the range for this specific progress bar
    }

    const rangeLength = sidebarActiveIndex - prevVisibleIndex;
    if (rangeLength <= 0) return 0; // Avoid division by zero, or invalid range

    const progress = (docCurrentIndex - prevVisibleIndex) / rangeLength;
    return Math.min(100, Math.max(0, Math.round(progress * 100)));
  });

  constructor(selectionManager: LineSelectionManager, appStore: AppStore) {
    this.selectionManager = selectionManager
    this.appStore = appStore
  }

  async init(): Promise<void> {
    console.log(`[${this.name}] Initializing...`)
    // No specific registration needed for FeatureManager for this UI element,
    // as Sidebar will directly query this feature's exposed computed properties.
  }

  async destroy(): Promise<void> {
    console.log(`[${this.name}] Destroying...`)
  }
}
