<template>
  <div class="custom-radio-container">
    <input 
      type="radio" 
      :id="inputId" 
      :name="name" 
      :value="value" 
      :checked="modelValue === value" 
      class="custom-radio-input" 
      @change="$emit('update:modelValue', value)" 
    />
    <label :for="inputId" class="custom-radio-label">
      <span class="custom-radio-button"></span>
      <slot></slot>
    </label>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    required: true
  },
  value: {
    type: [String, Number, Boolean],
    required: true
  },
  inputId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.custom-radio-container {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.custom-radio-input {
  position: absolute;
  opacity: 0;
}

.custom-radio-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.custom-radio-button {
  width: 20px;
  height: 20px;
  border: 2px solid var(--p-surface-300);
  border-radius: 50%;
  margin-right: 0.5rem;
  position: relative;
  transition: all 0.2s;
}

.custom-radio-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: white;
  transition: transform 0.2s;
}

.custom-radio-input:checked + .custom-radio-label .custom-radio-button {
  background-color: var(--p-primary-600);
  border-color: var(--p-primary-600);
}

.custom-radio-input:checked + .custom-radio-label .custom-radio-button::after {
  transform: translate(-50%, -50%) scale(1);
}

.custom-radio-input:focus + .custom-radio-label .custom-radio-button {
  box-shadow: 0 0 0 3px var(--p-primary-200);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .custom-radio-input:checked + .custom-radio-label .custom-radio-button {
    background-color: var(--p-primary-500);
    border-color: var(--p-primary-500);
  }
  
  .custom-radio-input:focus + .custom-radio-label .custom-radio-button {
    box-shadow: 0 0 0 3px var(--highlight-background);
  }
  
  .custom-radio-button {
    border-color: var(--p-surface-600);
  }
}
</style>