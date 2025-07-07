<template>
  <div class="sidebar">
    <div
      v-for="(item,idx) in sidebarItems"
      :key="`${item.idx}-${item.style}-${item.text}`"
      :class="['sidebar-item', sidebarTypes[item.type].style, { selected: isSidebarItemSelected(item) , nextSidebarItem:isSidebarItemNext(item) }]"
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
import { sidebarTypeMap } from '../modules/constants.js'

const props = defineProps({
  lines: Array,
  activeLineIdx: Number,
  onSelectUserLine: Function,
  playingAudios: Object,
  soundManager: Object
})

const sidebarTypes = sidebarTypeMap


const sidebarItems = ref([])

async function updateSidebarItems() {
  await nextTick()

  sidebarItems.value = props.lines
    .filter((item, i, arr) => sidebarTypes[item.type] )
    .sort((a, b) => a.idx - b.idx)
}

watch(() => props.lines, updateSidebarItems, { immediate: true })
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
  const ref = item.ref
  const progress = getSoundProgress(ref)
  const level = typeof item === 'object' && item.level !== undefined ? item.level : 0
  const baseStyle = {
    paddingLeft: `${level * 1.5}em`
  }
  if (progress > 0) {
    return {
      ...baseStyle,
      background: `linear-gradient(to right, #007bff ${progress * 100}%, black ${progress * 100}%)`
    }
  }
  return baseStyle
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