// utils/stripe.js
/**
 * Formats a cents amount to a display price
 * @param {number} cents Amount in cents
 * @returns {string} Formatted price
 */
export function formatPrice(cents) {
  if (!cents && cents !== 0) return '0.00';
  return (cents / 100).toFixed(2);
}

/**
 * Calculates service fee for a given amount
 * @param {number} subtotal Amount in cents
 * @returns {number} Service fee in cents
 */
export function calculateServiceFee(subtotal) {
  // Example: 5% service fee
  return Math.round(subtotal * 0.05);
}

/**
 * Creates and manages reservation timers
 * @param {number} minutes Duration in minutes
 * @param {Function} onExpire Function to call when timer expires
 * @param {Function} onUpdate Function to call on each timer update
 * @returns {Object} Timer control object
 */
export function createReservationTimer(minutes, onExpire, onUpdate) {
  let timerInterval;
  const expiryTime = new Date(Date.now() + minutes * 60 * 1000).getTime();
  
  const formatTimeRemaining = (milliseconds) => {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const updateTimer = () => {
    const now = Date.now();
    const remaining = Math.max(0, expiryTime - now);
    
    if (remaining <= 0) {
      clearInterval(timerInterval);
      if (onExpire) onExpire();
      return;
    }
    
    const timeFormatted = formatTimeRemaining(remaining);
    const isUrgent = remaining < 5 * 60 * 1000; // Less than 5 minutes
    
    if (onUpdate) onUpdate(timeFormatted, remaining, isUrgent);
  };
  
  return {
    start: () => {
      updateTimer(); // Run immediately once
      timerInterval = setInterval(updateTimer, 1000);
    },
    stop: () => {
      if (timerInterval) clearInterval(timerInterval);
    }
  };
}

/**
 * Detects if seats are consecutive in the same section
 * @param {Array} seats Array of seat objects
 * @returns {Object} Analysis result
 */
export function detectConsecutiveSeats(seats) {
  if (!seats || seats.length === 0) {
    return {
      isConsecutive: true,
      inSameSection: true,
      inSameRow: true,
      explanation: 'No seats to analyze'
    };
  }

  // Check if in same section
  const firstSection = seats[0].section;
  const inSameSection = seats.every(seat => seat.section === firstSection);
  
  if (!inSameSection) {
    return {
      isConsecutive: false,
      inSameSection: false,
      inSameRow: false,
      explanation: 'Seats are in different sections'
    };
  }
  
  // Check if in same row
  const firstRow = seats[0].row_name;
  const inSameRow = seats.every(seat => seat.row_name === firstRow);
  
  if (!inSameRow) {
    return {
      isConsecutive: false,
      inSameSection: true,
      inSameRow: false,
      explanation: 'Seats are in the same section but different rows'
    };
  }
  
  // Check if consecutive
  // Sort by seat number numerically
  const sortedSeats = [...seats].sort((a, b) => {
    const numA = parseInt(a.seat_number, 10) || a.seat_number;
    const numB = parseInt(b.seat_number, 10) || b.seat_number;
    return numA - numB;
  });
  
  for (let i = 0; i < sortedSeats.length - 1; i++) {
    const current = parseInt(sortedSeats[i].seat_number, 10) || sortedSeats[i].seat_number;
    const next = parseInt(sortedSeats[i+1].seat_number, 10) || sortedSeats[i+1].seat_number;
    
    if (next - current !== 1) {
      return {
        isConsecutive: false,
        inSameSection: true,
        inSameRow: true,
        explanation: 'Seats are in the same row but not consecutive'
      };
    }
  }
  
  return {
    isConsecutive: true,
    inSameSection: true,
    inSameRow: true,
    explanation: 'Seats are consecutive in the same row'
  };
}