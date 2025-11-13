<template>
  <div class="sidebar" :style="style">
    <div class="sidebar-filters mb-2">
      <label v-for="(type, key) in sidebarTypes" :key="key" class="sidebar-filter">
        <input type="checkbox" v-model="visibleTypes[key]" />
        {{ type.label }}
      </label>
            <button
        class="sidebar-toggle-btn"
        @click="onToggleSidebar"
        aria-label="Hide sidebar"
      >&#10094;</button>
    </div>
    <div
      v-for="(item,idx) in sidebarItems"
      :key="`${item.idx}-${item.style}-${item.text}`"
      :class="['sidebar-item', sidebarTypes[item.type].style, item.style, { selected: isSidebarItemSelected(item) , nextSidebarItem:isSidebarItemNext(item) }]"
      :style="getSidebarItemStyle(item)"
      :data-line-idx="item.idx"
      :data-sound-ref="item.ref || null"
      @click="selectSidebarItem(item)"
    >        
      <span class="sound-controls" v-if="item.type=='SOUND'">
          <button 
            class="play-sound-btn" @click.stop="soundManager.playOrStopSound(item.ref)" :disabled="!soundManager || !soundManager.isSoundAvailable(item.ref) " >
            <span v-if="soundManager.playingAudios && soundManager.playingAudios.value && soundManager.playingAudios.value[item.ref]">
              <i  class="fa-solid fa-stop"></i>
            </span>
            <span v-else>
              <i class="fa-solid fa-play"></i>
            </span>
          </button>
      </span>
      {{ item.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { sidebarTypeMap,lineTypeLabel } from '../modules/constants.js'

const props = defineProps({
  lines: Array,
  activeLineIdx: Number,
  onSelectUserLine: Function,
  playingAudios: Object,
  soundManager: Object,
  state: Object,
  style: Object,
  onToggleSidebar: Function
})

const sidebarTypes = sidebarTypeMap

// --- Add filter state ---
const visibleTypes = ref({})
for (const key in sidebarTypes) {
  visibleTypes.value[key] = true // All checked by default
}

// --- Filtered sidebar items ---
const sidebarItems = ref([])

async function updateSidebarItems() {
  await nextTick()
  sidebarItems.value = props.lines
    .filter((item) => sidebarTypes[item.type] && visibleTypes.value[item.type])
    .sort((a, b) => a.idx - b.idx)
}

watch(() => props.lines, updateSidebarItems, { immediate: true })
watch(visibleTypes, updateSidebarItems, { deep: true })

// Watch for activeLineIdx changes to update selectedSidebarItem
watch( () => props.activeLineIdx, findSelectedSidebarItem, { immediate: true } )

async function findSelectedSidebarItem() {
  await nextTick()
  const found = sidebarItems.value.find(item => item.idx === props.activeLineIdx)
  if (found) {
    selectedSidebarItem.value = { idx: found.idx, className: found.className }
  } else {
    selectedSidebarItem.value = { idx: -1, className: '' }
  }
}

const selectedSidebarItem = ref({ idx: -1, className: '' })
const nextSidebarItem = ref({ idx: -1, className: '' })
const previousSideBarItem=ref(0)

function selectSidebarItem(item) {
  selectedSidebarItem.value = { idx: item.idx, className: item.className }
  if (typeof props.onSelectUserLine === 'function') {
    props.onSelectUserLine(item.idx)
  }
}

function isSidebarItemSelected(item) {
  return (
    item.idx === selectedSidebarItem.value.idx &&
    item.className === selectedSidebarItem.value.className
  )
}

watch(() => props.activeLineIdx, findNextSidebarItem, { immediate: true })
watch(() => props.activeLineIdx, findPreviousSidebarItem, { immediate: true })

async function findNextSidebarItem() {
  await nextTick()
  // Find the first item with idx greater than activeLineIdx
  const found = sidebarItems.value.find(item => item.idx > props.activeLineIdx)
  if (found) {
    nextSidebarItem.value = { idx: found.idx, className: found.className }
    scrollToLineIndex(found.idx)
  } else {
    nextSidebarItem.value = { idx: -1, className: '' }
  }
}

async function findPreviousSidebarItem() {
  await nextTick()
  // Find the last item with idx less than activeLineIdx
  const found = sidebarItems.value.slice().reverse().find(item => item.idx < props.activeLineIdx)
  if (found) {
    previousSideBarItem.value = { idx: found.idx, className: found.className }
  } else {
    previousSideBarItem.value = { idx: -1, className: '' }
  }
}

function isSidebarItemNext(item) {
  return (
    item.idx === nextSidebarItem.value.idx &&
    item.className === nextSidebarItem.value.className
  )
}

function getSoundProgress(ref) {
  if (!props.soundManager || !props.soundManager.playingAudios || !props.soundManager.playingAudios.value) {
    return 0
  }
  const audioState = props.soundManager.playingAudios.value[ref]
  if (audioState && audioState.duration > 0) {
    return 1 - (audioState.timeLeft / audioState.duration)
  }
  return 0
}

function getSidebarItemStyle(item) {
  const level = typeof item === 'object' && item.level !== undefined ? item.level : 0
  const baseStyle = {
    paddingLeft: `${level * 1.5}em`
  }

  const nextItemGradient = getNextItemGradient(item)
  const soundProgressGradien = getSoundProgressBar(item,baseStyle)
  return {
    ...baseStyle,
    background: soundProgressGradien ? soundProgressGradien : nextItemGradient
  }
}

function getSoundProgressBar(item){
  if (item.type !== lineTypeLabel.sound) return
  const ref = item.ref
  const progress = getSoundProgress(ref)
  if (progress > 0) {
    return `linear-gradient(to right, #007bff ${progress * 100}%, black ${progress * 100}%)`
    
  }
  return 
}

function getNextItemGradient(item){
  const previousSideBarItemIdx = previousSideBarItem.value.idx
  if (item.idx < previousSideBarItemIdx) return 
  const distanceToNextItem = nextSidebarItem.value.idx - previousSideBarItemIdx
  const distanceFromLastItem = props.state.userSelectedLineIdx - previousSideBarItemIdx
  const lineProximity= distanceToNextItem > 0 ? distanceFromLastItem / distanceToNextItem : 1
  if (item.idx == nextSidebarItem.value.idx && lineProximity >= 0) {
    return `linear-gradient(to right, #eaaa4f ${lineProximity * 100}%, #6e5b13 ${lineProximity * 100}%)`
    
  }
  return 
}

function scrollToLineIndex(newIdx){
  const activeLineEl = document.querySelector(`.sidebar-item[data-line-idx="${nextSidebarItem.value.idx}"]`)
  if (newIdx === -1) {
    const viewer = document.querySelector('.sidebar')
    if (viewer) viewer.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (activeLineEl) {
    const viewer = document.querySelector('.sidebar')
    const el = activeLineEl
    if (viewer && el) {
      const viewerRect = viewer.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - viewerRect.top + viewer.scrollTop - (10 * 16)
      viewer.scrollTo({ top: offset, behavior: 'smooth' })
      el.focus({ preventScroll: true })
    }
  }
}




</script>

<style src="../css/sidebar.css"></style>