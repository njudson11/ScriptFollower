<template>
  <div class="sidebar">
    <div
      v-for="item in reactiveSidebarItems"
      :key="`${item.idx}-${item.className}-${item.text}`"
      :class="['sidebar-item', item.className, { selected: isSidebarItemSelected(item) }]"
      :style="getSidebarItemStyle(item)"
      :data-line-idx="item.idx"
      :data-sound-ref="item.soundRef || null"
      @click="selectSidebarItem(item)"
    >        
      <span class="sound-controls" v-if="isSoundCue(item.text)">
          <button
            class="play-sound-btn" @click.stop="soundManager.playOrStopSound(extractSoundRef(item.text))" :disabled="!soundManager.isSoundAvailable(extractSoundRef(item.text)) && !soundManager.isPlaying(extractSoundRef(item.text))" >
            <span v-if="playingAudios[extractSoundRef(item.text)]">
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
import { isSoundCue, extractSoundRef}  from '../modules/utilities'

const props = defineProps({
  lines: Array,
  activeLineIdx: Number,
  onSelectUserLine: Function,
  playingAudios: Object,
  soundManager: Object
})

const sidebarClasses = [
  { className: 'Act', level: 0 },
  { className: 'Scene', level: 0 },
  { className: 'sound-cue', level: 1 },
  { className: 'lights-cue', level: 1 }
]

const sidebarItems = ref([])

function getParentParagraphWithLineIdx(el) {
  let parent = el
  while (
    parent &&
    (
      typeof parent.tagName === 'undefined' ||
      parent.tagName !== 'P' ||
      !parent.hasAttribute('data-line-idx')
    )
  ) {
    parent = parent.parentElement
  }
  return parent
}

function createSidebarItem(parentP, el, sc) {
  const idx = Number(parentP.getAttribute('data-line-idx'))
  if (isNaN(idx)) return null
  const text = (sc.className === 'Scene')
    ? parentP.textContent.trim()
    : el.textContent.trim()
  const soundRef = sc.className === 'sound-cue' ? extractSoundRefFromItem(text) : null
  return {
    idx,
    className: sc.className,
    level: sc.level,
    text,
    soundRef
  }
}

function extractSidebarItemsFromClass(sc, viewer) {
  const items = []
  const elements = viewer.querySelectorAll(`.${sc.className}`)
  elements.forEach(el => {
    const parentP = getParentParagraphWithLineIdx(el)
    if (parentP) {
      const item = createSidebarItem(parentP, el, sc)
      if (item) items.push(item)
    }
  })
  return items
}

async function updateSidebarItems() {
  await nextTick()
  const viewerEl = document.querySelector('.document-viewer')
  const items = []
  if (viewerEl) {
    sidebarClasses.forEach(sc => {
      items.push(...extractSidebarItemsFromClass(sc, viewerEl))
    })
  }
  sidebarItems.value = items
    .filter((item, i, arr) =>
      arr.findIndex(it =>
        it.idx === item.idx &&
        it.className === item.className &&
        it.text === item.text
      ) === i
    )
    .sort((a, b) => a.idx - b.idx)
}

watch(() => props.lines, updateSidebarItems, { immediate: true })

const selectedSidebarItem = ref({ idx: -1, className: '' })

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

function extractSoundRefFromItem(item) {
  // Accepts either a string or an object with a text property
  const text = typeof item === 'string' ? item : item.text
  if (!text) return null
  const match = text.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

function getSoundProgress(ref) {
  const audioState = props.playingAudios?.[ref]
  if (audioState && audioState.duration > 0) {
    return 1 - (audioState.timeLeft / audioState.duration)
  }
  return 0
}

function getSidebarItemStyle(item) {
  const ref = item.soundRef
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

const reactiveSidebarItems = computed(() => {
  // This line ensures Vue tracks both keys and timeLeft values
  const _ = props.playingAudios
    ? Object.entries(props.playingAudios)
        .map(([ref, state]) => `${ref}:${state.timeLeft}`)
        .join(',')
    : ''
  return sidebarItems.value
})


</script>

<style src="../css/sidebar.css"></style>