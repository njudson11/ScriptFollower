<script setup lang="ts">
import { inject } from 'vue';
import type { ActionController } from '@/core/ActionController';
import { ACTION_TYPES } from '@/types/actions';
import type { LineSelectionManager } from '@/core/LineSelectionManager';
import type { AppStore } from '@/store/AppStore';
import { LineType } from '@/types/core';

const actionController = inject('actionController') as ActionController;
const selectionManager = inject('selectionManager') as LineSelectionManager;
const appStore = inject('appStore') as AppStore;

const navigateUp = () => {
  actionController.dispatch({ type: ACTION_TYPES.NAVIGATE_PREVIOUS_LINE, payload: {} });
};

const navigateDown = () => {
  actionController.dispatch({ type: ACTION_TYPES.NAVIGATE_NEXT_LINE, payload: {} });
};

const triggerSpacebar = () => {
  const lineId = selectionManager.getCurrentLine();
  if (!lineId) return;

  const line = appStore.getLineById(lineId);
  if (line?.lineType === LineType.SOUND_CUE) {
    actionController.dispatch({ 
      type: ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE, 
      payload: { lineId } 
    });
  }
};
</script>

<template>
  <div class="touch-controls-container">
    <button class="touch-btn" @click="navigateUp">
      <span class="icon">↑</span>
      <span class="label">Up</span>
    </button>
    <button class="touch-btn space-btn" @click="triggerSpacebar">
      <span class="icon">GO</span>
      <span class="label">Trigger</span>
    </button>
    <button class="touch-btn" @click="navigateDown">
      <span class="icon">↓</span>
      <span class="label">Down</span>
    </button>
  </div>
</template>

<style scoped>
@import '../css/TouchControls.css';
</style>
