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
      <div class="editor-content-wrapper">
        <EditorContent :editor="editor" class="p-inputtext tiptap" />
        <div v-if="showPlaceholder" class="editor-placeholder">{{ placeholder }}</div>
      </div>
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
import Placeholder from '@tiptap/extension-placeholder'

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
  },
  placeholder: {
    type: String,
    default: 'Start typing...',
  }
})

const emit = defineEmits(['update:modelValue'])

const editor = ref(null)
const isEmpty = ref(true)

// Compute if we should show the placeholder
const showPlaceholder = computed(() => {
  return isEmpty.value && (!editor.value || !editor.value.isFocused)
})

// Computed style for the editor container
const editorStyle = computed(() => {
  return {
    height: props.height,
    minHeight: props.minHeight,
    maxHeight: props.maxHeight
  }
})

// Helper function to check if content is empty
const checkIfEmpty = (content) => {
  if (!content) return true
  
  // Remove HTML tags to check if there's actual content
  const div = document.createElement('div')
  div.innerHTML = content
  const text = div.textContent || div.innerText || ''
  return text.trim() === ''
}

// Watch for external model changes
watch(
  () => props.modelValue,
  (value) => {
    // Only update content if it's different from current content
    if (editor.value && editor.value.getHTML() !== value) {
      // Ensure we always have at least an empty paragraph
      const content = value || '<p></p>'
      editor.value.commands.setContent(content, false)
      isEmpty.value = checkIfEmpty(content)
    }
  },
)

// Initialize editor
onMounted(() => {
  // Ensure we have at least an empty paragraph
  const initialContent = props.modelValue || '<p></p>'
  isEmpty.value = checkIfEmpty(initialContent)
  
  editor.value = new Editor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: props.placeholder,
        showOnlyWhenEditable: true,
      }),
    ],
    content: initialContent,
    editable: props.editable,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      isEmpty.value = checkIfEmpty(content)
      emit('update:modelValue', content)
    },
    onFocus: () => {
      // No need to show custom placeholder when editor is focused
      // as the built-in placeholder will show
    },
    onBlur: () => {
      // Check if content is empty after blur
      if (editor.value) {
        isEmpty.value = checkIfEmpty(editor.value.getHTML())
      }
    },
  })
})

// Clean up on unmount
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
    editor.value = null
  }
})

// Watch for editable property changes
watch(() => props.editable, (isEditable) => {
  if (editor.value) {
    editor.value.setEditable(isEditable)
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

.editor-content-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
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

.editor-placeholder {
  position: absolute;
  top: 1rem;
  left: 1rem;
  color: #6c757d;
  pointer-events: none;
}

/* Style for empty paragraphs to ensure they have enough height */
:deep(.tiptap p:empty::after) {
  content: '\00a0';
}
</style>