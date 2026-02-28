<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import { ActionController } from '@/core/ActionController' // Import ActionController
import { ACTION_TYPES } from '@/types/actions' // Import ACTION_TYPES
import packageJson from '../../package.json'
import { ChevronLeft, ChevronRight, FolderOpen, FileText, Trash2 } from 'lucide-vue-next'

interface Props {
  hasDocument: boolean
  isLoading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  fileUpload: [event: Event],
  soundsUpload: [event: Event]
}>()

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const actionController = inject('actionController') as ActionController // Inject ActionController

const searchQuery = ref('');

const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLineId = computed(() => selectionManager.getCurrentLine())
const currentLine = computed(() => {
  if (!currentLineId.value) return undefined;
  return appStore.getLineById(currentLineId.value);
});

const editablePageNumber = ref<number | null>(currentLine.value?.pageNumber ?? null);

watch(() => currentLine.value?.pageNumber, (newPageNumber) => {
  editablePageNumber.value = newPageNumber ?? null;
}, { immediate: true });

const handlePageNumberChange = () => {
  if (editablePageNumber.value === null) {
    if (currentLine.value) {
      editablePageNumber.value = currentLine.value.pageNumber;
    }
    return;
  }

  const newPage = parseInt(String(editablePageNumber.value), 10);
  if (isNaN(newPage) || newPage <= 0) {
    if (currentLine.value) {
      editablePageNumber.value = currentLine.value.pageNumber;
    } else {
      editablePageNumber.value = null;
    }
    return;
  }

  const allLines = appStore.getLines();
  const firstLineOfTargetPage = allLines.find(line => line.pageNumber === newPage);

  if (firstLineOfTargetPage) {
    actionController.dispatch({
      type: ACTION_TYPES.SELECT_LINE,
      payload: { lineId: firstLineOfTargetPage.id }
    });
  } else {
    if (currentLine.value) {
      editablePageNumber.value = currentLine.value.pageNumber;
    } else {
      editablePageNumber.value = null;
    }
  }
};

const handleSearchInput = () => {
  actionController.dispatch({
    type: ACTION_TYPES.SEARCH_QUERY_CHANGED,
    payload: { query: searchQuery.value }
  });
};

const navigateNextMatch = () => {
  actionController.dispatch({ type: ACTION_TYPES.NAVIGATE_NEXT_MATCH });
};

const navigatePreviousMatch = () => {
  actionController.dispatch({ type: ACTION_TYPES.NAVIGATE_PREVIOUS_MATCH });
};

const resetProject = () => {
  if (window.confirm('Are you sure you want to reset the project? This will clear the script and all matched sounds.')) {
    actionController.dispatch({ type: ACTION_TYPES.CLEAR_PROJECT });
  }
};
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <h1 class="title">ScriptFollower <span class="version">v{{ packageJson.version }}</span></h1>
    </div>

    <div class="toolbar-center">
      <span class="document-info">{{ currentDocument?.name ?? 'No Document Loaded' }} </span>
      <div v-if="hasDocument" class="search-container">
        <input
          type="text"
          class="search-input"
          placeholder="Search..."
          v-model="searchQuery"
          @input="handleSearchInput"
        />
        <button @click="navigatePreviousMatch" class="search-nav-btn" title="Previous match">
          <ChevronLeft :size="16" />
        </button>
        <button @click="navigateNextMatch" class="search-nav-btn" title="Next match">
          <ChevronRight :size="16" />
        </button>
        <span class="search-match-count" v-if="appStore.state.searchQuery">
          {{ appStore.state.activeSearchIndex !== null ? appStore.state.activeSearchIndex + 1 : 0 }} / {{ appStore.state.searchMatches.length }}
        </span>
      </div>
      <label v-if="currentLine" class="page-info-label">
        Page:
        <input
          type="number"
          v-model.lazy="editablePageNumber"
          @change="handlePageNumberChange"
          class="page-number-input"
          :disabled="!hasDocument || isLoading"
        />
      </label>
    </div>

    <div class="toolbar-right">
      <button 
        v-if="hasDocument" 
        class="file-input-label btn-danger" 
        @click="resetProject" 
        title="Reset Project"
      >
        <span class="btn-content"><Trash2 :size="16" /> Reset</span>
      </button>
      <label class="file-input-label">
        <input
          type="file"
          webkitdirectory
          directory
          @change="e => { const target = e.target as HTMLInputElement; console.log('[Toolbar] Raw files from input (change event):', target.files); emit('soundsUpload', e) }"
          style="display: none"
          :disabled="isLoading"
        />
        <span class="btn-content"><FolderOpen :size="16" /> Load Project Folder</span>
      </label>
      <label class="file-input-label">
        <input
          type="file"
          accept=".odt"
          @change="emit('fileUpload', $event)"
          style="display: none"
          :disabled="isLoading"
        />
        <span class="btn-content"><FileText :size="16" /> {{ isLoading ? 'Loading...' : 'Load Document' }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
@import '../css/Toolbar.css';

.btn-content {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>