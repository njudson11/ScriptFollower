<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import { ActionController } from '@/core/ActionController' // Import ActionController
import { ACTION_TYPES } from '@/types/actions' // Import ACTION_TYPES
import packageJson from '../../package.json'

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
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <h1 class="title">ScriptFollower <span class="version">v{{ packageJson.version }}</span></h1>
    </div>

    <div class="toolbar-center">
      <span v-if="hasDocument && currentDocument" class="document-info">
        {{ currentDocument.name }} (v{{ currentDocument.version }})
      </span>
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
      <label class="file-input-label" v-if="hasDocument">
        <input
          type="file"
          webkitdirectory
          directory
          @change="emit('soundsUpload', $event)"
          style="display: none"
          :disabled="isLoading"
        />
        <span>Load Sounds</span>
      </label>
      <label class="file-input-label">
        <input
          type="file"
          accept=".odt"
          @change="emit('fileUpload', $event)"
          style="display: none"
          :disabled="isLoading"
        />
        <span>{{ isLoading ? 'Loading...' : 'Load Document' }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
@import '../css/Toolbar.css';
</style>