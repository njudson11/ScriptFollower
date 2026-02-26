// src/features/SearchFeature.ts
import { FeaturePlugin } from '@/types/core';
import type { ActionController } from '@/core/ActionController';
import type { AppStore } from '@/store/AppStore';
import { ACTION_TYPES } from '@/types/actions';
import { LineType } from '@/types/core';

export class SearchFeature implements FeaturePlugin {
  readonly id = 'search-feature';
  readonly name = 'Search';
  readonly version = '1.0.0';
  readonly description = 'Provides text search and navigation functionality.';

  private actionController: ActionController;
  private appStore: AppStore;

  constructor(actionController: ActionController, appStore: AppStore) {
    this.actionController = actionController;
    this.appStore = appStore;
  }

  async init(): Promise<void> {
    this.actionController.registerHandler(ACTION_TYPES.SEARCH_QUERY_CHANGED, this.handleSearchQueryChanged.bind(this));
    this.actionController.registerHandler(ACTION_TYPES.NAVIGATE_NEXT_MATCH, this.handleNavigateNextMatch.bind(this));
    this.actionController.registerHandler(ACTION_TYPES.NAVIGATE_PREVIOUS_MATCH, this.handleNavigatePreviousMatch.bind(this));
  }

  async destroy(): Promise<void> {
    // Unregister handlers if the action controller supports it.
  }

  private handleSearchQueryChanged(action: { payload: { query: string } }): void {
    const query = action.payload.query.toLowerCase();
    this.appStore.setSearchQuery(query);

    if (!query) {
      this.appStore.setSearchResults([], null);
      return;
    }

    const lines = this.appStore.getLines();
    const matches: string[] = [];
    for (const line of lines) {
      const textToSearch = line.lineType === LineType.DIALOGUE
        ? line.metadata.dialogue?.toLowerCase()
        : line.text.toLowerCase();
      
      if (textToSearch && textToSearch.includes(query)) {
        matches.push(line.id);
      }
    }
    
    this.appStore.setSearchResults(matches, matches.length > 0 ? 0 : null);
  }

  private handleNavigateNextMatch(): void {
    const { searchMatches, activeSearchIndex } = this.appStore.state;
    if (searchMatches.length === 0 || activeSearchIndex === null) return;

    const nextIndex = (activeSearchIndex + 1) % searchMatches.length;
    this.appStore.setActiveSearchIndex(nextIndex);
    const nextLineId = searchMatches[nextIndex];
    this.actionController.dispatch({ type: ACTION_TYPES.SELECT_LINE, payload: { lineId: nextLineId } });
  }

  private handleNavigatePreviousMatch(): void {
    const { searchMatches, activeSearchIndex } = this.appStore.state;
    if (searchMatches.length === 0 || activeSearchIndex === null) return;

    const prevIndex = (activeSearchIndex - 1 + searchMatches.length) % searchMatches.length;
    this.appStore.setActiveSearchIndex(prevIndex);
    const prevLineId = searchMatches[prevIndex];
    this.actionController.dispatch({ type: ACTION_TYPES.SELECT_LINE, payload: { lineId: prevLineId } });
  }
}
