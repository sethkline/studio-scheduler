// utils/seatDetection.ts
import type {
  Seat,
  SeatConsecutiveResult,
  SectionType,
  ReservationTimer
} from '~/types/seatDetection';

/**
 * Specialized algorithm for Mechanicsburg Middle School Auditorium
 * Detects consecutive seats based on the unique layout with three sections
 * @param {Seat[]} seats - Array of seat objects
 * @returns {SeatConsecutiveResult} - Detection results with explanation
 */
export function detectMechanicsburgConsecutiveSeats(seats: Seat[]): SeatConsecutiveResult {
  // Handle edge cases
  if (!seats || seats.length <= 1) {
    return {
      isConsecutive: true,
      inSameSection: true,
      inSameRow: true,
      explanation: "Single seat or no seats selected"
    };
  }

  // Check if all seats are in the same section
  const firstSeat = seats[0];
  const allInSameSection = seats.every(seat => seat.section === firstSeat.section);
  
  // Check if all seats are in the same row
  const allInSameRow = seats.every(seat => seat.row_name === firstSeat.row_name);
  
  // If seats are in different sections or rows, they're not consecutive
  if (!allInSameSection || !allInSameRow) {
    return {
      isConsecutive: false,
      inSameSection: allInSameSection,
      inSameRow: allInSameRow,
      explanation: !allInSameSection 
        ? "Seats are in different sections" 
        : "Seats are in different rows"
    };
  }
  
  // Sort seats by number for consecutive check
  const sortedSeats = [...seats].sort((a, b) => {
    return parseInt(a.seat_number) - parseInt(b.seat_number);
  });
  
  // Determine section type - based on Mechanicsburg Auditorium layout
  // Left section (odd): 101, 103, 105, etc.
  // Center section: 201-214
  // Right section (even): 102, 104, 106, etc.
  const sectionType = determineMechanicsburgSectionType(firstSeat);
  
  // Check if seats are consecutive based on section numbering pattern
  let isConsecutive = true;
  let explanation = "Seats are consecutive";
  
  // Inspect numbering pattern - different rules for different sections
  for (let i = 0; i < sortedSeats.length - 1; i++) {
    const currentSeat = sortedSeats[i];
    const nextSeat = sortedSeats[i + 1];
    const currentNumber = parseInt(currentSeat.seat_number);
    const nextNumber = parseInt(nextSeat.seat_number);
    
    // Check based on section pattern
    if (sectionType === 'left') {
      // Left section - odd numbers: 101, 103, 105, etc.
      // Check if numbers differ by 2
      if (nextNumber - currentNumber !== 2) {
        isConsecutive = false;
        explanation = `Seats ${currentSeat.seat_number} and ${nextSeat.seat_number} are not consecutive in the left section`;
        break;
      }
    } else if (sectionType === 'right') {
      // Right section - even numbers: 102, 104, 106, etc.
      // Check if numbers differ by 2
      if (nextNumber - currentNumber !== 2) {
        isConsecutive = false;
        explanation = `Seats ${currentSeat.seat_number} and ${nextSeat.seat_number} are not consecutive in the right section`;
        break;
      }
    } else if (sectionType === 'center') {
      // Center section - sequential numbers: 201, 202, 203, etc.
      // Check if numbers differ by 1
      if (nextNumber - currentNumber !== 1) {
        isConsecutive = false;
        explanation = `Seats ${currentSeat.seat_number} and ${nextSeat.seat_number} are not consecutive in the center section`;
        break;
      }
    } else {
      // Default for special cases or unknown sections
      if (nextNumber - currentNumber !== 1 && nextNumber - currentNumber !== 2) {
        isConsecutive = false;
        explanation = `Seats ${currentSeat.seat_number} and ${nextSeat.seat_number} are not consecutive`;
        break;
      }
    }
  }
  
  return {
    isConsecutive,
    inSameSection: true,
    inSameRow: true,
    explanation
  };
}

/**
 * Determines the section type for the Mechanicsburg Auditorium
 * @param {Seat} seat - Seat object
 * @returns {SectionType} - 'left', 'center', 'right', or 'unknown'
 */
export function determineMechanicsburgSectionType(seat: Seat): SectionType {
  // Check section name first for special cases
  const sectionName = seat.section.toLowerCase();
  if (sectionName.includes('center')) {
    return 'center';
  } else if (sectionName.includes('left')) {
    return 'left';
  } else if (sectionName.includes('right')) {
    return 'right';
  }
  
  // Then check seat number patterns
  const seatNum = parseInt(seat.seat_number);
  
  // Based on auditorium layout:
  // Left section: 101, 103, 105, etc. (odd numbers)
  // Center section: 201-214
  // Right section: 102, 104, 106, etc. (even numbers)
  if (seatNum >= 200 && seatNum <= 214) {
    return 'center';
  } else if (seatNum % 2 === 1) {
    return 'left';  // Odd seat numbers are in left section
  } else if (seatNum % 2 === 0) {
    return 'right'; // Even seat numbers are in right section
  }
  
  // Default fallback
  return 'unknown';
}

/**
 * Creates a reservation timer to show users how long they have to complete their purchase
 * @param {number} durationMinutes - Duration in minutes for the reservation
 * @param {() => void} onExpire - Callback function when timer expires
 * @param {(formattedTime: string, timeRemaining: number, isUrgent: boolean) => void} onUpdate - Callback to update UI on each second
 * @returns {ReservationTimer} - Timer control functions
 */
export function createReservationTimer(
  durationMinutes: number,
  onExpire: () => void,
  onUpdate: (formattedTime: string, timeRemaining: number, isUrgent: boolean) => void
): ReservationTimer {
  const startTime: Date = new Date();
  const endTime: Date = new Date(startTime.getTime() + (durationMinutes * 60 * 1000));
  
  let timerInterval: any = null; // Use 'any' type to support both browser and Node environments
  let isRunning: boolean = false;
  
  // Format time remaining as MM:SS
  function formatTimeRemaining(millisRemaining: number): string {
    const minutes: number = Math.floor(millisRemaining / 60000);
    const seconds: number = Math.floor((millisRemaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Cross-environment setInterval function
  function crossPlatformSetInterval(callback: () => void, ms: number): any {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      return window.setInterval(callback, ms);
    } 
    // Node.js environment
    else if (typeof global !== 'undefined') {
      return setInterval(callback, ms);
    }
    // Fallback
    else {
      console.warn('Neither window nor global is defined. Timer might not work properly.');
      return null;
    }
  }
  
  // Cross-environment clearInterval function
  function crossPlatformClearInterval(id: any): void {
    if (typeof window !== 'undefined') {
      window.clearInterval(id);
    } 
    else if (typeof global !== 'undefined') {
      clearInterval(id);
    }
  }
  
  // Start the timer
  function start(): void {
    if (isRunning) return;
    
    isRunning = true;
    updateTimer(); // Update immediately
    timerInterval = crossPlatformSetInterval(updateTimer, 1000);
  }
  
  // Update timer
  function updateTimer(): void {
    const now: Date = new Date();
    const timeRemaining: number = endTime.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      if (timerInterval !== null) {
        crossPlatformClearInterval(timerInterval);
      }
      isRunning = false;
      
      // Call expire callback
      if (typeof onExpire === 'function') {
        onExpire();
      }
    } else {
      // Call update callback
      if (typeof onUpdate === 'function') {
        const formattedTime: string = formatTimeRemaining(timeRemaining);
        const isUrgent: boolean = timeRemaining < 60000; // Last minute warning
        
        onUpdate(formattedTime, timeRemaining, isUrgent);
      }
    }
  }
  
  // Stop the timer
  function stop(): void {
    if (timerInterval !== null) {
      crossPlatformClearInterval(timerInterval);
      timerInterval = null;
    }
    isRunning = false;
  }
  
  // Reset the timer with new duration
  function reset(newDurationMinutes: number): void {
    stop();
    
    const now: Date = new Date();
    endTime.setTime(now.getTime() + (newDurationMinutes * 60 * 1000));
    
    start();
  }
  
  // Return timer control functions
  return {
    start,
    stop,
    reset,
    getEndTime: () => new Date(endTime),
    isRunning: () => isRunning,
    getTimeRemaining: () => {
      const now: Date = new Date();
      return Math.max(0, endTime.getTime() - now.getTime());
    }
  };
}