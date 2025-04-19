<!-- components/ticket/ReservationTimer.vue -->
<template>
  <div class="reservation-timer p-4 rounded-lg shadow-sm" :class="timerClasses">
    <div class="flex justify-between items-center">
      <div>
        <h3 class="font-semibold text-lg">Seat Reservation</h3>
        <p class="text-sm opacity-75">Your seats are held for:</p>
      </div>
      
      <div class="timer-display text-xl font-bold px-4 py-2 rounded-lg" 
           :class="{'animate-pulse': isUrgent}">
        {{ displayTime }}
      </div>
    </div>
    
    <!-- Warning message when time is running low -->
    <div v-if="isUrgent" class="mt-3 text-sm flex items-center">
      <i class="pi pi-exclamation-circle mr-2"></i>
      <span>Your reservation is about to expire! Complete your purchase now.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const props = defineProps({
  duration: {
    type: Number,
    default: 30, // Default 30 minutes
    validator: (value) => value > 0
  },
  warningThreshold: {
    type: Number,
    default: 5, // Start warning when 5 minutes remain
    validator: (value) => value > 0
  },
  criticalThreshold: {
    type: Number,
    default: 2, // Critical warning when 2 minutes remain
    validator: (value) => value > 0
  }
});

const emit = defineEmits(['expire', 'update', 'warning', 'critical']);

// State
const timeRemaining = ref(props.duration * 60); // In seconds
const timerInterval = ref(null);
const isUrgent = ref(false);
const timerStatus = ref('normal'); // 'normal', 'warning', 'critical'

// Format the time as MM:SS
const displayTime = computed(() => {
  const minutes = Math.floor(timeRemaining.value / 60);
  const seconds = timeRemaining.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Computed classes based on timer status
const timerClasses = computed(() => {
  if (timerStatus.value === 'critical') {
    return 'bg-red-50 text-red-800 border border-red-200';
  } else if (timerStatus.value === 'warning') {
    return 'bg-yellow-50 text-yellow-800 border border-yellow-200';
  } else {
    return 'bg-blue-50 text-blue-800 border border-blue-200';
  }
});

// Setup timer on component mount
onMounted(() => {
  startTimer();
});

// Clean up on component unmount
onBeforeUnmount(() => {
  stopTimer();
});

// Start the timer
function startTimer() {
  // Initialize with full duration
  timeRemaining.value = props.duration * 60;
  
  // Clear any existing interval
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  
  // Start new interval to update every second
  timerInterval.value = setInterval(updateTimer, 1000);
}

// Update timer on each interval
function updateTimer() {
  if (timeRemaining.value <= 0) {
    // Time expired
    clearInterval(timerInterval.value);
    emit('expire');
    return;
  }
  
  // Decrement time
  timeRemaining.value--;
  
  // Emit update event
  emit('update', {
    minutes: Math.floor(timeRemaining.value / 60),
    seconds: timeRemaining.value % 60,
    totalSeconds: timeRemaining.value
  });
  
  // Check warning thresholds
  const minutesRemaining = Math.floor(timeRemaining.value / 60);
  
  if (minutesRemaining <= props.criticalThreshold) {
    if (timerStatus.value !== 'critical') {
      timerStatus.value = 'critical';
      isUrgent.value = true;
      emit('critical');
    }
  } else if (minutesRemaining <= props.warningThreshold) {
    if (timerStatus.value !== 'warning') {
      timerStatus.value = 'warning';
      emit('warning');
    }
  }
}

// Stop the timer
function stopTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

// Reset the timer with new duration (in minutes)
function resetTimer(newDuration) {
  timeRemaining.value = newDuration * 60;
  timerStatus.value = 'normal';
  isUrgent.value = false;
  
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
  }
  
  timerInterval.value = setInterval(updateTimer, 1000);
}

// Expose methods to parent
defineExpose({
  startTimer,
  stopTimer,
  resetTimer
});
</script>

<style scoped>
.animate-pulse {
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.timer-display {
  background-color: rgba(255, 255, 255, 0.5);
}
</style>