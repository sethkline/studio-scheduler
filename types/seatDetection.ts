// types/seatDetection.ts

/**
 * Represents a seat in the Mechanicsburg Middle School Auditorium
 */
export interface Seat {
  id: string;
  section: string;
  section_type?: string;
  row_name: string;
  seat_number: string;
  status?: string;
  handicap_access?: boolean;
  price_in_cents?: number;
  reserved_until?: string;
  reserved_by?: string;
  customer?: SeatCustomer;
}

/**
 * Represents customer information for a reserved seat
 */
export interface SeatCustomer {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  order_id?: string;
}

/**
 * Result of seat consecutive detection algorithm
 */
export interface SeatConsecutiveResult {
  isConsecutive: boolean;
  inSameSection: boolean;
  inSameRow: boolean;
  explanation: string;
}

/**
 * Section types in the auditorium
 */
export type SectionType = 'left' | 'center' | 'right' | 'unknown';

/**
 * Timer update data passed to the callback
 */
export interface TimerUpdateData {
  formattedTime: string;
  timeRemaining: number;
  isUrgent: boolean;
}

/**
 * Interface for the reservation timer control functions
 */
export interface ReservationTimer {
  start: () => void;
  stop: () => void;
  reset: (newDurationMinutes: number) => void;
  getEndTime: () => Date;
  isRunning: () => boolean;
  getTimeRemaining: () => number;
}

/**
 * Signature for the seat detection function
 */
export type DetectConsecutiveSeatsFunction = (seats: Seat[]) => SeatConsecutiveResult;

/**
 * Signature for the section type determination function
 */
export type DetermineSectionTypeFunction = (seat: Seat) => SectionType;

/**
 * Signature for the timer creation function
 */
export type CreateReservationTimerFunction = (
  durationMinutes: number, 
  onExpire: () => void, 
  onUpdate: (formattedTime: string, timeRemaining: number, isUrgent: boolean) => void
) => ReservationTimer;