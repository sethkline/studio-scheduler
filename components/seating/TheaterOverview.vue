<!-- components/seating/TheaterOverview.vue -->
<template>
  <div class="theater-overview">
    <svg viewBox="0 0 800 400" class="w-full max-w-3xl mx-auto">
      <!-- Stage -->
      <rect x="200" y="50" width="400" height="60" class="theater-stage" />
      <text x="400" y="85" class="theater-text" text-anchor="middle">STAGE</text>
      
      <!-- Sections - highlight active section -->
      <g @click="$emit('select-section', 'left-wing')" 
         :class="['theater-section', { 'active': selectedSection === 'left-wing' }]">
        <polygon points="50,150 150,120 150,300 50,330" />
        <text x="100" y="225" class="theater-text" text-anchor="middle">Left Wing</text>
      </g>
      
      <g @click="$emit('select-section', 'left-main')" 
         :class="['theater-section', { 'active': selectedSection === 'left-main' }]">
        <polygon points="150,120 300,120 300,300 150,300" />
        <text x="225" y="225" class="theater-text" text-anchor="middle">Left Main</text>
      </g>
      
      <g @click="$emit('select-section', 'center')" 
         :class="['theater-section', { 'active': selectedSection === 'center' }]">
        <polygon points="300,120 500,120 500,300 300,300" />
        <text x="400" y="225" class="theater-text" text-anchor="middle">Center</text>
      </g>
      
      <g @click="$emit('select-section', 'right-main')" 
         :class="['theater-section', { 'active': selectedSection === 'right-main' }]">
        <polygon points="500,120 650,120 650,300 500,300" />
        <text x="575" y="225" class="theater-text" text-anchor="middle">Right Main</text>
      </g>
      
      <g @click="$emit('select-section', 'right-wing')" 
         :class="['theater-section', { 'active': selectedSection === 'right-wing' }]">
        <polygon points="650,120 750,150 750,330 650,300" />
        <text x="700" y="225" class="theater-text" text-anchor="middle">Right Wing</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  selectedSection: {
    type: String,
    default: null
  }
});

defineEmits(['select-section']);
</script>

<style scoped>
.theater-overview {
  margin-bottom: 1.5rem;
}

.theater-stage {
  fill: #27272a;
  stroke: none;
}

.theater-text {
  fill: white;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

.theater-section {
  fill: #d4d4d8;
  stroke: #a1a1aa;
  stroke-width: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.theater-section text {
  fill: #52525b;
}

.theater-section:hover {
  fill: #e4e4e7;
}

.theater-section.active {
  fill: var(--p-primary-100);
  stroke: var(--p-primary-500);
  stroke-width: 2;
}

.theater-section.active text {
  fill: var(--p-primary-700);
}

@media (prefers-color-scheme: dark) {
  .theater-section {
    fill: #3f3f46;
    stroke: #52525b;
  }
  
  .theater-section text {
    fill: #e4e4e7;
  }
  
  .theater-section:hover {
    fill: #52525b;
  }
  
  .theater-section.active {
    fill: var(--highlight-background);
    stroke: var(--p-primary-500);
  }
  
  .theater-section.active text {
    fill: white;
  }
}
</style>