<!-- components/seating/SectionSeats.vue -->
<template>
  <div class="section-seats" :class="sectionClass">
    <h3 class="font-semibold mb-3">{{ sectionName }}</h3>
    
    <!-- Rows -->
    <div v-for="row in rows" :key="row.name" class="mb-3">
      <div class="flex items-center">
        <div class="row-label">Row {{ row.name }}</div>
        
        <!-- Seats Container - Align based on section -->
        <div :class="['seats-container', `align-${alignment}`]">
          <!-- Visualize empty space for proper alignment in angled sections -->
          <div v-if="needsLeftSpacer" class="seat-spacer" :style="spacerStyle"></div>
          
          <!-- Actual Seats -->
          <div v-for="seat in row.seats" :key="seat.id" 
               class="seat-container"
               @click="$emit('select-seat', seat)">
            <div class="seat" :class="getSeatClasses(seat)">
              {{ seat.seat_number }}
            </div>
          </div>
          
          <div v-if="needsRightSpacer" class="seat-spacer" :style="spacerStyle"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  section: {
    type: Object,
    required: true
  },
  selectedSeats: {
    type: Array,
    default: () => []
  },
  sectionType: {
    type: String,
    default: 'center',
    validator: (value) => ['left-wing', 'left-main', 'center', 'right-main', 'right-wing'].includes(value)
  }
});

defineEmits(['select-seat']);

const rows = computed(() => {
  return Object.values(props.section.rows).sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true })
  );
});

const sectionName = computed(() => props.section.name);

const sectionClass = computed(() => `section-${props.sectionType}`);

const alignment = computed(() => {
  switch(props.sectionType) {
    case 'left-wing': return 'right';
    case 'left-main': return 'right';
    case 'center': return 'center';
    case 'right-main': return 'left';
    case 'right-wing': return 'left';
    default: return 'center';
  }
});

const needsLeftSpacer = computed(() => 
  props.sectionType === 'right-main' || props.sectionType === 'right-wing'
);

const needsRightSpacer = computed(() => 
  props.sectionType === 'left-main' || props.sectionType === 'left-wing'
);

// Calculate spacer width based on row number for angled sections
const spacerStyle = computed(() => {
  if (props.sectionType === 'left-wing' || props.sectionType === 'right-wing') {
    return { width: '20%' };
  }
  return { width: '10%' };
});

const getSeatClasses = (seat) => {
  const isSelected = props.selectedSeats.some(s => s.id === seat.id);
  
  const classes = [];
  
  if (isSelected) {
    classes.push('selected');
  } else {
    classes.push('available');
  }
  
  if (seat.handicap_access) {
    classes.push('accessible');
  }
  
  return classes.join(' ');
};
</script>

<style scoped>
.section-seats {
  margin-bottom: 2rem;
}

.row-label {
  width: 4rem;
  font-weight: 500;
  color: #374151;
}

.seats-container {
  display: flex;
  flex-wrap: wrap;
}

.seats-container.align-left {
  justify-content: flex-start;
}

.seats-container.align-center {
  justify-content: center;
}

.seats-container.align-right {
  justify-content: flex-end;
}

.seat-spacer {
  height: 1px;
}

/* Seat styling */
.seat-container {
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.seat {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.seat.available {
  background-color: #e5e7eb;
  color: #374151;
}

.seat.available:hover {
  background-color: #d1d5db;
}

.seat.selected {
  background-color: var(--p-primary-600);
  color: white;
}

.seat.unavailable {
  background-color: #fecaca;
  color: #991b1b;
  cursor: not-allowed;
  opacity: 0.7;
}

.seat.accessible {
  border: 2px solid #10b981;
}

@media (prefers-color-scheme: dark) {
  .seat.selected {
    background-color: var(--p-primary-500);
  }

  .seat.available {
    background-color: #3f3f46;
    color: #f4f4f5;
  }

  .seat.available:hover {
    background-color: #52525b;
  }
}
</style>