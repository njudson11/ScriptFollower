<script setup lang="ts">
import { ref, inject, computed, watch } from 'vue';
import type { ScriptLineBase, SoundCue } from '@/types/core';
import type { AppStore } from '@/store/AppStore';
import type { ActionController } from '@/core/ActionController';
import type { AnnotationManager } from '@/core/AnnotationManager';
import { ACTION_TYPES } from '@/types/actions';
import { LineType } from '@/types/core';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps<{
  line: ScriptLineBase
}>();

const annotationManager = inject('annotationManager') as AnnotationManager;
const appStore = inject('appStore') as AppStore;
const actionController = inject('actionController') as ActionController;

// --- Stop Behaviour State ---
const isStopDropdownOpen = ref(false);
type StopMode = 'none' | 'previous' | 'all' | 'refs';
const stopMode = ref<StopMode>('none');
const selectedStopRefs = ref<string[]>([]);

const recentSoundCues = computed(() => {
  const allLines = appStore.getLines();
  const currentIndex = appStore.getLineIndex(props.line.id);
  if (currentIndex === -1) return [];

  return allLines
    .slice(0, currentIndex)
    .filter(l => l.lineType === LineType.SOUND_CUE && l.metadata.soundRef)
    .slice(-5) 
    .map(l => ({
      ref: l.metadata.soundRef,
      lineNumber: l.lineNumber,
      soundDescription: l.metadata.soundDescription || l.text 
    }))
    .reverse();
});

const stopDisplayValue = computed(() => {
  switch (stopMode.value) {
    case 'previous': return 'Stop Previous';
    case 'all': return 'Stop All';
    case 'refs':
      if (selectedStopRefs.value.length === 0) return 'Select Cues...';
      if (selectedStopRefs.value.length === 1) return `Stop [${selectedStopRefs.value[0]}]`;
      return `Stop [${selectedStopRefs.value.length}] Cues`;
    default: return 'None';
  }
});

const parseAnnotations = () => {
  const stopValue = annotationManager.getValue(props.line.annotation, 'stop');
  if (stopValue === 'previous' || stopValue === 'all') {
    stopMode.value = stopValue;
    selectedStopRefs.value = [];
  } else if (typeof stopValue === 'string' && stopValue.startsWith('[') && stopValue.endsWith(']')) {
    stopMode.value = 'refs';
    selectedStopRefs.value = stopValue.slice(1, -1).split(',').map(s => s.trim());
  } else {
    stopMode.value = 'none';
    selectedStopRefs.value = [];
  }
};

const updateAnnotations = () => {
  let stopValue: string | null = null;
  if (stopMode.value === 'previous' || stopMode.value === 'all') {
    stopValue = stopMode.value;
  } else if (stopMode.value === 'refs' && selectedStopRefs.value.length > 0) {
    stopValue = `[${selectedStopRefs.value.join(',')}]`;
  }

  const annotationString = annotationManager.update(props.line.annotation, {
    'stop': stopValue
  });
  
  if (props.line.annotation !== annotationString) {
    actionController.dispatch({
      type: ACTION_TYPES.UPDATE_LINE,
      payload: {
        lineId: props.line.id,
        updates: { annotation: annotationString }
      }
    });
  }
};

const setStopMode = (mode: StopMode) => {
  stopMode.value = mode;
  if (mode !== 'refs') {
    selectedStopRefs.value = [];
  }
  isStopDropdownOpen.value = false;
};

const toggleStopRef = (refId: string) => {
  stopMode.value = 'refs';
  const index = selectedStopRefs.value.indexOf(refId);
  if (index === -1) {
    selectedStopRefs.value.push(refId);
  } else {
    selectedStopRefs.value.splice(index, 1);
  }
};

watch([stopMode, selectedStopRefs], () => {
  updateAnnotations();
}, { deep: true });

watch(() => props.line.id, () => {
  parseAnnotations();
}, { immediate: true });
</script>

<template>
  <div class="base-cue-panel">
    <div class="section-column">
      <div class="input-group">
        <label>Stop Behaviour</label>
        <div class="custom-dropdown">
          <button class="dropdown-toggle" @click="isStopDropdownOpen = !isStopDropdownOpen">
            {{ stopDisplayValue }}
            <ChevronDown :size="14" class="dropdown-arrow" />
          </button>
          <div v-if="isStopDropdownOpen" class="dropdown-menu stopBehaviour">
            <button @click="setStopMode('none')">None</button>
            <button @click="setStopMode('previous')">Stop Previous</button>
            <button @click="setStopMode('all')">Stop All</button>
            <div class="dropdown-divider"></div>
            <div class="dropdown-header">Stop Specific Cues:</div>
            <div v-for="cue in recentSoundCues" :key="cue.ref" class="checkbox-item">
              <input 
                type="checkbox" 
                :id="`stop-ref-${cue.ref}`"
                :value="cue.ref" 
                :checked="selectedStopRefs.includes(cue.ref)"
                @change="toggleStopRef(cue.ref)"
              />
              <label :for="`stop-ref-${cue.ref}`">
                <span class="ref-id">[{{ cue.ref }}]</span> 
                <span class="ref-text">{{ cue.soundDescription }}</span>
              </label>
            </div>
             <div v-if="recentSoundCues.length === 0" class="no-recent-cues">
              No recent sound cues found.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reuse existing styles if possible or define shared ones */
@import '../css/SoundCuePanel.css';

.base-cue-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
