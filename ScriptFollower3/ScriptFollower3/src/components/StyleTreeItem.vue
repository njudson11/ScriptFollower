<script setup lang="ts">
import { computed } from 'vue'
import type { StyleInfo } from '@/types/core'

interface StyleTreeItemProps {
  styleInfo: StyleInfo & { children?: StyleInfo[] }
  level: number
}

const props = defineProps<StyleTreeItemProps>()

const hasChildren = computed(() => props.styleInfo.children && props.styleInfo.children.length > 0)

const indent = computed(() => `${props.level * 15}px`)
</script>

<template>
  <div class="style-tree-item" :style="{ paddingLeft: indent }">
    <span class="style-name">{{ styleInfo.displayName || styleInfo.name }}</span>
    <span v-if="styleInfo.parent" class="style-parent">(parent: {{ styleInfo.parent }})</span>
    <div v-if="hasChildren" class="style-children">
      <StyleTreeItem
        v-for="child in styleInfo.children"
        :key="child.name"
        :style-info="child"
        :level="level + 1"
      />
    </div>
  </div>
</template>

<style scoped>
@import '../css/StyleTreeItem.css';
</style>
