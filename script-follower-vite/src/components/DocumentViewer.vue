<template>
  <div class="document-viewer" ref="documentViewer" tabindex="0">
    <p
      v-for="(line, idx) in lines"
      :key="idx"
      :data-line-idx="idx"
      :data-line-tag=line.ref
      :data-line-ref=line.ref
      :data-line-page-number=line.pageNumber
      :data-line-type=line.type
      :ref="idx === userSelectedLineIdx ? setActiveLineEl : null"
      :class="{
        'active-line': idx === userSelectedLineIdx && !(idx === speechActiveLineIdx && noMatch),
        'speech-highlight': idx === speechActiveLineIdx && !noMatch,
        'active-line-no-match': idx === speechActiveLineIdx && noMatch,
        [lineTypeDocClassMap[line.type]]: !!lineTypeDocClassMap[line.type]
      } "
      tabindex="0"
      @click="selectUserLine(idx)"
    >
      <span :class="line.style" v-html="toHTML(line)"></span>

    <template v-if="line.type=='SOUND'" >
      <span class="sound-controls">
        <button
          class="play-sound-btn" 
          @click.stop="soundManager.playOrStopSound(line.ref)" 
          :disabled="!soundManager.isSoundAvailable(line.ref) "
        >
           <span v-if="soundManager?.playingAudios.value && soundManager?.playingAudios?.value[line.ref]">
              <i  class="fa-solid fa-stop"></i>
            </span>
            <span v-else>
              <i class="fa-solid fa-play"></i>
            </span>
        </button>
        <span v-if="soundManager.isPreloaded(line.ref)" class="sound-preloaded">
          <i class="fa-solid fa-check"></i>
        </span>

        <span v-if="soundManager?.playingAudios?.value && soundManager?.playingAudios && soundManager?.playingAudios?.value[line.ref]" class="sound-time-left">
          {{ soundManager.playingAudios?.value[line.ref].timeLeft?.toFixed(2) }}s left
        </span>

        <span v-if="!soundManager.isSoundAvailable(line.ref)" class="sound-missing">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </span>
      </span>
    </template>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { wrapWithSpans}  from '../modules/utilities'
import { lineTypeDocClassMap, lineTypeLabel } from '../modules/constants.js'

const props = defineProps([
  'lines', 'userSelectedLineIdx', 'speechActiveLineIdx', 'noMatch',
  'setActiveLineEl', 'selectUserLine', 'soundManager'
])

const documentViewer = ref(null)
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

</script>

<style src="../css/documentViewer.css"></style>