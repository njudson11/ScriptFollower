<template>
  <div class="document-viewer" ref="documentViewer" tabindex="0">
    <p
      v-for="(line, idx) in lines"
      :key="idx"
      :data-line-idx="idx"
      :data-sound-ref="isSoundCue(line) ? extractSoundRef(line) : null"
      :ref="idx === userSelectedLineIdx ? setActiveLineEl : null"
      :class="{
        'active-line': idx === userSelectedLineIdx && !(idx === speechActiveLineIdx && noMatch),
        'speech-highlight': idx === speechActiveLineIdx && !noMatch,
        'active-line-no-match': idx === speechActiveLineIdx && noMatch
      }"
      tabindex="0"
      @click="selectUserLine(idx)"
    >
      <span v-html="highlightLine(line, highlightRules)"></span>

      <template v-if="isSoundCue(line)">
        <span class="sound-controls">
          <button
            class="play-sound-btn" @click.stop="soundManager.playOrStopSound(extractSoundRef(line))" :disabled="!soundManager.isSoundAvailable(extractSoundRef(line)) && !soundManager.isPlaying(extractSoundRef(line))" >
            <span v-if="playingAudios[extractSoundRef(line)]">
              <i  class="fa-solid fa-stop"></i>
            </span>
            <span v-else>
              <i class="fa-solid fa-play"></i>
            </span>
          </button>

          <span v-if="soundManager.isPlaying(extractSoundRef(line))" class="sound-time-left">
            {{ playingAudios[extractSoundRef(line)]?.timeLeft.toFixed(2) }}s left
          </span>

          <span v-if="!soundManager.isSoundAvailable(extractSoundRef(line))" class="sound-missing">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </span>
        </span>
      </template>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { highlightLine } from '../modules/textFormatter'
import { isSoundCue, extractSoundRef}  from '../modules/utilities'

const props = defineProps([
  'lines', 'userSelectedLineIdx', 'speechActiveLineIdx', 'noMatch',
  'setActiveLineEl', 'selectUserLine', 'soundManager'
])

const documentViewer = ref(null)

const soundManager = props.soundManager
const playingAudios = soundManager?.playingAudios 

const highlightRules = [
  { regex: /(?<=^|>)(\b[\w\s']+\b(:|\t))(?=\s|<)/gi, className: 'name-highlight' },
  { regex: /(?<=^|>)SOUND( [A-Z])?.*\d{4}.*$/gm, className: 'sound-cue' },
  { regex: /(?<=^|>)LIGHTS.*$/gm, className: 'lights-cue' },
  { regex: /Act (One|Two).*$/igm, className: 'Scene' }
]

</script>

<style src="../css/documentViewer.css"></style>