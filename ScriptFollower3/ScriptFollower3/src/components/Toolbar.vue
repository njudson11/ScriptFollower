<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue' // Import watch
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager' // Import LineSelectionManager
import packageJson from '../../package.json'

interface Props {
  hasDocument: boolean
  isLoading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  fileUpload: [event: Event]
}>()

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager // Inject selectionManager

const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLineId = computed(() => selectionManager.getCurrentLine()) // Get currentLineId
const currentLine = computed(() => { // Get full current line object
  if (!currentLineId.value) return undefined;
  return appStore.getLineById(currentLineId.value);
});

// Reactive variable for the editable page number input
const editablePageNumber = ref<number | null>(currentLine.value?.pageNumber ?? null);

// Watch for changes in the currentLine's pageNumber and update editablePageNumber
watch(() => currentLine.value?.pageNumber, (newPageNumber) => {
  editablePageNumber.value = newPageNumber ?? null;
}, { immediate: true });

const handlePageNumberChange = () => {
  if (editablePageNumber.value === null) {
    // If input is cleared, clear selection or revert
    if (currentLine.value) {
      editablePageNumber.value = currentLine.value.pageNumber; // Revert to current page
    }
    return;
  }

  const newPage = parseInt(String(editablePageNumber.value), 10); // Ensure number
  if (isNaN(newPage) || newPage <= 0) {
    // Invalid input, revert to current page
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
    selectionManager.selectLine(firstLineOfTargetPage.id);
  } else {
    // Page not found, revert input
    if (currentLine.value) {
      editablePageNumber.value = currentLine.value.pageNumber;
    } else {
      editablePageNumber.value = null;
    }
    // Optionally, show a toast/notification about page not found
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