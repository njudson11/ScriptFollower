<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { EventBus } from '@/core/EventBus'
import { ActionController } from '@/core/ActionController' // Import ActionController
import { ACTION_TYPES } from '@/types/actions' // Import ACTION_TYPES
import packageJson from '../../package.json'
import { ChevronLeft, ChevronRight, FolderOpen, FileText, Trash2, Mic, MicOff, Target } from 'lucide-vue-next'

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
const eventBus = inject('eventBus') as EventBus
const actionController = inject('actionController') as ActionController // Inject ActionController

const isVoiceActive = ref(false);
const setFocusOnMatch = computed(() => appStore.state.voiceSettings.setFocusOnMatch);

// Update isVoiceActive based on event bus
eventBus.subscribe('voice:statusChanged', (event) => {
  isVoiceActive.value = event.payload.status === 'listening';
});

const toggleVoice = () => {
  actionController.dispatch({ type: ACTION_TYPES.TOGGLE_VOICE });
};

const toggleVoiceFocus = () => {
  appStore.updateVoiceSettings({ setFocusOnMatch: !setFocusOnMatch.value });
};

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
  <div class="toolbar" :class="{ 'has-transcript': appStore.state.lastVoiceTranscript }">
    <div class="toolbar-top">
      <div class="toolbar-left">
        <h1 class="title">SF <span class="version">v{{ packageJson.version }}</span></h1>
        <span class="document-info" v-if="currentDocument">{{ currentDocument.name }}</span>
      </div>

      <div class="toolbar-centre">
        <div v-if="hasDocument" class="search-container">
          <input
            type="text"
            class="search-input"
            placeholder="Search..."
            v-model="searchQuery"
            @input="handleSearchInput"
          />
          <button @click="navigatePreviousMatch" class="search-nav-btn" title="Previous match">
            <ChevronLeft :size="14" />
          </button>
          <button @click="navigateNextMatch" class="search-nav-btn" title="Next match">
            <ChevronRight :size="14" />
          </button>
          <span class="search-match-count" v-if="appStore.state.searchQuery">
            {{ appStore.state.activeSearchIndex !== null ? appStore.state.activeSearchIndex + 1 : 0 }} / {{ appStore.state.searchMatches.length }}
          </span>
        </div>
        
        <label v-if="currentLine" class="page-info-label">
          Pg:
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
        <div v-if="hasDocument" class="voice-controls">
          <button 
            @click="toggleVoice" 
            class="voice-toggle-btn" 
            :class="{ 'is-active': isVoiceActive }"
            :title="isVoiceActive ? 'Stop Voice' : 'Start Voice'"
          >
            <Mic v-if="!isVoiceActive" :size="14" />
            <MicOff v-else :size="14" />
            <span>Voice</span>
          </button>

          <button 
            @click="toggleVoiceFocus" 
            class="voice-focus-btn" 
            :class="{ 'is-active': setFocusOnMatch }"
            title="Auto-Focus"
          >
            <Target :size="14" />
            <span>Auto-Focus</span>
          </button>
        </div>

        <div class="divider"></div>

        <button 
          v-if="hasDocument" 
          class="toolbar-action-btn btn-danger" 
          @click="resetProject" 
          title="Reset Project"
        >
          <Trash2 :size="14" />
        </button>

        <label class="toolbar-action-btn" title="Load Project Folder">
          <input
            type="file"
            webkitdirectory
            directory
            @change="emit('soundsUpload', $event)"
            style="display: none"
            :disabled="isLoading"
          />
          <FolderOpen :size="14" />
        </label>

        <label class="toolbar-action-btn" title="Load Document">
          <input
            type="file"
            accept=".odt"
            @change="emit('fileUpload', $event)"
            style="display: none"
            :disabled="isLoading"
          />
          <FileText :size="14" />
        </label>
      </div>
    </div>

    <div v-if="appStore.state.lastVoiceTranscript" class="toolbar-bottom">
      <div class="voice-live-transcript">
        <span class="transcript-label">Heard:</span>
        <span class="transcript-text">"{{ appStore.state.lastVoiceTranscript }}"</span>
      </div>
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