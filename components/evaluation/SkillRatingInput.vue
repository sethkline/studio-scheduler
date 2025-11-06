<template>
  <Card class="skill-rating-card">
    <template #content>
      <div class="grid grid-cols-12 gap-3 items-start">
        <!-- Skill Name -->
        <div class="col-span-12 md:col-span-3">
          <InputText
            v-model="localSkill.skill_name"
            placeholder="Skill name"
            class="w-full"
            @update:modelValue="emitUpdate"
          />
        </div>

        <!-- Category -->
        <div class="col-span-12 md:col-span-2">
          <Select
            v-model="localSkill.skill_category"
            :options="categories"
            placeholder="Category"
            class="w-full"
            @update:modelValue="emitUpdate"
          />
        </div>

        <!-- Rating -->
        <div class="col-span-12 md:col-span-3">
          <Select
            v-model="localSkill.rating"
            :options="ratings"
            optionLabel="label"
            optionValue="value"
            placeholder="Rating"
            class="w-full"
            @update:modelValue="emitUpdate"
          >
            <template #value="slotProps">
              <div v-if="slotProps.value" class="flex items-center gap-2">
                <i :class="getRatingIcon(slotProps.value)" :style="{ color: getRatingColor(slotProps.value) }"></i>
                <span>{{ getRatingLabel(slotProps.value) }}</span>
              </div>
              <span v-else>{{ slotProps.placeholder }}</span>
            </template>
            <template #option="slotProps">
              <div class="flex items-center gap-2">
                <i :class="getRatingIcon(slotProps.option.value)" :style="{ color: getRatingColor(slotProps.option.value) }"></i>
                <span>{{ slotProps.option.label }}</span>
              </div>
            </template>
          </Select>
        </div>

        <!-- Notes -->
        <div class="col-span-12 md:col-span-3">
          <InputText
            v-model="localSkill.notes"
            placeholder="Notes (optional)"
            class="w-full"
            @update:modelValue="emitUpdate"
          />
        </div>

        <!-- Remove Button -->
        <div class="col-span-12 md:col-span-1 flex justify-end">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            @click="$emit('remove', index)"
            aria-label="Remove skill"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { SkillCategory, SkillRating } from '~/types/assessment'

const props = defineProps<{
  skill: {
    skill_name: string
    skill_category?: SkillCategory
    rating: SkillRating
    notes?: string
  }
  index: number
}>()

const emit = defineEmits<{
  (e: 'update', index: number, skill: typeof props.skill): void
  (e: 'remove', index: number): void
}>()

const localSkill = ref({ ...props.skill })

const categories = [
  'technique',
  'musicality',
  'performance',
  'strength',
  'flexibility'
]

const ratings = [
  { label: 'Needs Work', value: 'needs_work' },
  { label: 'Proficient', value: 'proficient' },
  { label: 'Excellent', value: 'excellent' }
]

function getRatingIcon(rating: SkillRating): string {
  switch (rating) {
    case 'needs_work':
      return 'pi pi-times-circle'
    case 'proficient':
      return 'pi pi-check-circle'
    case 'excellent':
      return 'pi pi-star-fill'
    default:
      return 'pi pi-circle'
  }
}

function getRatingColor(rating: SkillRating): string {
  switch (rating) {
    case 'needs_work':
      return '#ef4444' // red
    case 'proficient':
      return '#3b82f6' // blue
    case 'excellent':
      return '#22c55e' // green
    default:
      return '#6b7280' // gray
  }
}

function getRatingLabel(rating: SkillRating): string {
  return ratings.find(r => r.value === rating)?.label || rating
}

function emitUpdate() {
  emit('update', props.index, localSkill.value)
}

// Watch for external changes
watch(() => props.skill, (newSkill) => {
  localSkill.value = { ...newSkill }
}, { deep: true })
</script>

<style scoped>
.skill-rating-card {
  border-left: 3px solid var(--primary-color);
}
</style>
