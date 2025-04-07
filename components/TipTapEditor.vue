<template>
  <div class="tiptap-wrapper">
    <div v-if="editor" class="editor-container" :style="editorStyle">
      <Toolbar id="toolbar">
        <template #start>
          <Button
            id="bold"
            size="small"
            label="B"
            :class="{ 'p-button-outlined': !editor.isActive('bold') }"
            @click="editor.chain().focus().toggleBold().run()"
          />
          <Button
            id="italic"
            size="small"
            label="I"
            :class="{ 'p-button-outlined': !editor.isActive('italic') }"
            @click="editor.chain().focus().toggleItalic().run()"
          />
          <Button
            id="underline"
            size="small"
            label="U"
            :class="{ 'p-button-outlined': !editor.isActive('underline') }"
            @click="editor.chain().focus().toggleUnderline().run()"
          />
          <Button
            size="small"
            label="Clear"
            class="p-button-outlined"
            @click="editor.chain().focus().unsetAllMarks().run()"
          />
          <span class="separator" />
          <Button
            size="small"
            label="H1"
            :class="{ 'p-button-outlined': !editor.isActive('heading', { level: 1 }) }"
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          />
          <Button
            size="small"
            label="H2"
            :class="{ 'p-button-outlined': !editor.isActive('heading', { level: 2 }) }"
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          />
        </template>
        <template #center>
          <Button
            size="small"
            icon="pi pi-list"
            :class="{ 'p-button-outlined': !editor.isActive('bulletList') }"
            @click="editor.chain().focus().toggleBulletList().run()"
          />
          <Button
            size="small"
            icon="pi pi-list-ol"
            :class="{ 'p-button-outlined': !editor.isActive('orderedList') }"
            @click="editor.chain().focus().toggleOrderedList().run()"
          />
          <span class="separator" />
          <Button
            size="small"
            icon="pi pi-align-left"
            :class="{ 'p-button-outlined': !editor.isActive({ textAlign: 'left' }) }"
            @click="editor.chain().focus().setTextAlign('left').run()"
          />
          <Button
            size="small"
            icon="pi pi-align-center"
            :class="{ 'p-button-outlined': !editor.isActive({ textAlign: 'center' }) }"
            @click="editor.chain().focus().setTextAlign('center').run()"
          />
          <Button
            size="small"
            icon="pi pi-align-right"
            :class="{ 'p-button-outlined': !editor.isActive({ textAlign: 'right' }) }"
            @click="editor.chain().focus().setTextAlign('right').run()"
          />
        </template>
        <template #end>
          <Button
            size="small"
            severity="secondary"
            label="Undo"
            :disabled="!editor.can().chain().focus().undo().run()"
            @click="editor.chain().focus().undo().run()"
          />
          <Button
            size="small"
            severity="secondary"
            label="Redo"
            :disabled="!editor.can().chain().focus().redo().run()"
            @click="editor.chain().focus().redo().run()"
          />
        </template>
      </Toolbar>
      <EditorContent :editor="editor" class="p-inputtext tiptap" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, computed, ref } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  editable: {
    type: Boolean,
    default: true,
  },
  height: {
    type: String,
    default: '200px',
  },
  minHeight: {
    type: String,
    default: '100px',
  },
  maxHeight: {
    type: String,
    default: 'none',
  }
})

const emit = defineEmits(['update:modelValue'])

const editor = ref(null)

// Computed style for the editor container
const editorStyle = computed(() => {
  return {
    height: props.height,
    minHeight: props.minHeight,
    maxHeight: props.maxHeight
  }
})

watch(
  () => props.modelValue,
  (value) => {
    // Only update content if it's different from current content
    if (editor.value && editor.value.getHTML() !== value) {
      editor.value.commands.setContent(value, false)
    }
  },
)

onMounted(() => {
  editor.value = new Editor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: props.modelValue,
    editable: props.editable,
    onUpdate: ({ editor }) => {
      emit('update:modelValue', editor.getHTML())
    },
  })
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
})
</script>

<style scoped>
.tiptap-wrapper {
  display: flex;
  flex-direction: column;
}

.editor-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #ced4da;
  border-radius: 4px;
  overflow: hidden;
}

#toolbar {
  padding: 0.5rem;
  border-bottom: 1px solid #dee2e6;
}

#toolbar button {
  margin-right: 0.25rem;
  font-weight: bold;
}

#bold {
  font-weight: 900;
}

#italic {
  font-style: italic;
}

#underline {
  text-decoration: underline;
}

.separator {
  display: inline-block;
  width: 1px;
  height: 1.5rem;
  background-color: #dee2e6;
  margin: 0 0.5rem;
  vertical-align: middle;
}

:deep(.tiptap) {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

:deep(.tiptap:focus) {
  outline: none;
}

:deep(.tiptap p) {
  margin-bottom: 0.75rem;
}

:deep(.tiptap h1) {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

:deep(.tiptap h2) {
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}
</style>