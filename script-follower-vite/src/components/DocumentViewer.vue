<template>
  <div class="document-viewer" ref="documentViewer" tabindex="0">
    <p
      v-for="(line, idx) in lines"
      :key="idx"
      :data-line-idx="idx"
      :data-line-idxInt=line.idx
      :data-line-page-number=line.pageNumber
      :data-line-style=line.style
      :data-line-ref=line.ref
      :data-line-tag=line.tag
      :data-line-type=line.type
      :data-line-outline-level=line.outlineLevel
      :data-line-text=line.text
      :data-line-description=line.description
      :data-line-sound-ref=line.soundRef
      :data-line-sound-duration=line.soundDuration 
      :data-line-sound-preloaded=line.soundPreloaded
      :ref="idx === state.userSelectedLineIdx ? setActiveLineEl : null"
      :class="{
        'active-line': idx === state.userSelectedLineIdx && !(idx === state.speechActiveLineIdx && state.noMatch),
        'speech-highlight': idx === state.speechActiveLineIdx && !state.noMatch,
        'active-line-no-match': idx === state.speechActiveLineIdx && state.noMatch,
        [lineTypeDocClassMap[line.type]]: !!lineTypeDocClassMap[line.type],
        [line.style]: true
        
      }"
      tabindex="0"
      @click="selectUserLine(idx)"
    >
    <pre class="raw">{{ line.raw }}</pre>
    <span :class="line.style" v-html="toHTML(line)"></span>
    <span v-if="line.annotation" class="annotation">[{{ line.annotation.creator }}:{{ line.annotation.content }}]</span>

    <template v-if="line.type=='SOUND' && line.style!='Removed'" >
      <span class="sound-controls">
        <button
          class="play-sound-btn" 
          @click.stop="soundManager.playOrStopSound(line, lines)" 
          :disabled="!soundManager.isSoundAvailable(line.ref) "
        >
           <span v-if="soundManager?.playingAudios.value && soundManager?.playingAudios?.value[line.ref]">
              <font-awesome-icon icon="stop" />
            </span>
            <span v-else>
              <font-awesome-icon icon="play" />
            </span>
        </button>
        <span v-if="soundManager.isPreloaded(line.ref)" class="sound-preloaded">
          <font-awesome-icon icon="check" />
        </span>
        <span v-if="soundManager?.playingAudios?.value && soundManager?.playingAudios && soundManager?.playingAudios?.value[line.ref]" class="sound-time-left">
          {{ secondsToMinutes(soundManager.playingAudios?.value[line.ref].timeLeft) }}s left
        </span>
        <span v-if="!soundManager.isSoundAvailable(line.ref)" class="sound-missing">
          <font-awesome-icon icon="triangle-exclamation" />
        </span>
        <div class="sound-controls-flex" v-if="idx === state.userSelectedLineIdx">
          <label>
            Stop All: <input type="checkbox" v-model="line.soundCue.stopAll" />
          </label>
          <label>
            Stop Prev: <input type="checkbox" v-model="line.soundCue.stopPrev" />
          </label>
          <label>
            Volume: <input type="range" min="0" max="100" v-model="line.soundCue.volume" @input="handleVolumeChange(line, $event.target.value)" /> <input type="number" min="0" max="100" v-model="line.soundCue.volume" @input="handleVolumeChange(line, $event.target.value)" />%
          </label>
          <label>
            Balance (L/R): <input type="range" min="-100" max="100" v-model="line.soundCue.balance" /> 
            L <input type="number" min="0" max="100" :value="getBalanceL(line.soundCue.balance)" @input="setBalanceFromL(line, $event.target.value)" />% 
            R <input type="number" min="0" max="100" :value="getBalanceR(line.soundCue.balance)" @input="setBalanceFromR(line, $event.target.value)" />%
          </label>
          <label>
            Channel:
            <select v-model="line.soundCue.channel">
              <option value="A">A Output</option>
              <option value="B">B Output</option>
            </select>
          </label>
        </div>
      </span>
    </template>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { secondsToMinutes, wrapWithSpans}  from '../modules/utilities'
import { lineTypeDocClassMap, lineTypeLabel } from '../modules/constants.js'

const props = defineProps([
  'lines',
  'setActiveLineEl', 
  'selectUserLine', 
  'soundManager',
  'state'
])

const documentViewer = ref(null)
//const playingAudios = props.soundManager?.playingAudios 
//const playingAudios = props.soundManager?.playingAudios 

const highlightRules = [
  { match: /(?<=^|>)(\b[\w ']+\b(:|\t))/gi, className: 'name-highlight', types:[lineTypeLabel.character,lineTypeLabel.dialogue] }
  ,{ match: /(?<=(:|\t))(.*)$/gi, className: 'textContent', types:[lineTypeLabel.character,lineTypeLabel.dialogue] }
]

function toHTML(line) {
  let html=wrapWithSpans(line,highlightRules)

  html=html.replace(/\t/g,'<span class="tab"></span>') // replace tabs with a span
  // Then wrap paragraphs
  html = html
    .split(/\r?\n\r?\n/) // split on double line breaks (paragraphs)
    .map(p => `${p.replace(/\r?\n/g, '<br>')}`)
    .join('')
  return html
}

function getBalanceL(balance) {
  return 50 - balance / 2;
}
function getBalanceR(balance) {
  return 50 + balance / 2;
}
function setBalanceFromL(line, lValue) {
  line.soundCue.balance = (50-lValue)*2;
}
function setBalanceFromR(line, rValue) {
  line.soundCue.balance = (rValue-50)*2;
}

function handleVolumeChange(line, volume) {
  props.soundManager.setVolume(line.ref, volume);
}


</script>

<style src="../css/documentViewer.css"></style>