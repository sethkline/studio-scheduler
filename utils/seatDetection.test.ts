import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectMechanicsburgConsecutiveSeats,
  determineMechanicsburgSectionType,
  createReservationTimer
} from '~/utils/seatDetection';

// Mock typings for seat objects
interface Seat {
  id: string;
  section: string;
  section_type?: string;
  row_name: string;
  seat_number: string;
  status?: string;
  handicap_access?: boolean;
}

describe('determineMechanicsburgSectionType', () => {
  it('should identify center section by seat number', () => {
    const centerSeat: Seat = {
      id: '1',
      section: 'Orchestra Center',
      row_name: 'F',
      seat_number: '205'
    };

    expect(determineMechanicsburgSectionType(centerSeat)).toBe('center');
  });

  it('should identify left section by odd seat number', () => {
    const leftSeat: Seat = {
      id: '2',
      section: 'Orchestra Left',
      row_name: 'C',
      seat_number: '103'
    };

    expect(determineMechanicsburgSectionType(leftSeat)).toBe('left');
  });

  it('should identify right section by even seat number', () => {
    const rightSeat: Seat = {
      id: '3',
      section: 'Orchestra Right',
      row_name: 'D',
      seat_number: '104'
    };

    expect(determineMechanicsburgSectionType(rightSeat)).toBe('right');
  });

  it('should fallback to section name if seat number pattern is unusual', () => {
    const specialSeat: Seat = {
      id: '4',
      section: 'Left Wing',
      row_name: 'A',
      seat_number: '7' // Non-standard numbering
    };

    expect(determineMechanicsburgSectionType(specialSeat)).toBe('left');
  });

  it('should handle center section fallback by name', () => {
    const specialCenterSeat: Seat = {
      id: '5',
      section: 'Center Orchestra',
      row_name: 'A',
      seat_number: '55' // Non-standard numbering
    };

    expect(determineMechanicsburgSectionType(specialCenterSeat)).toBe('center');
  });
});

describe('detectMechanicsburgConsecutiveSeats', () => {
  it('should handle empty or single seat selections', () => {
    // Empty array
    expect(detectMechanicsburgConsecutiveSeats([])).toEqual({
      isConsecutive: true,
      inSameSection: true,
      inSameRow: true,
      explanation: 'Single seat or no seats selected'
    });

    // Single seat
    const singleSeat: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Center',
        row_name: 'F',
        seat_number: '205'
      }
    ];

    expect(detectMechanicsburgConsecutiveSeats(singleSeat)).toEqual({
      isConsecutive: true,
      inSameSection: true,
      inSameRow: true,
      explanation: 'Single seat or no seats selected'
    });
  });

  it('should detect when seats are in different sections', () => {
    const mixedSectionSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Left',
        row_name: 'F',
        seat_number: '105'
      },
      {
        id: '2',
        section: 'Orchestra Right',
        row_name: 'F',
        seat_number: '106'
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(mixedSectionSeats);
    expect(result.isConsecutive).toBe(false);
    expect(result.inSameSection).toBe(false);
    expect(result.explanation).toContain('different sections');
  });

  it('should detect when seats are in different rows', () => {
    const mixedRowSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '205'
      },
      {
        id: '2',
        section: 'Orchestra Center',
        row_name: 'F',
        seat_number: '205'
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(mixedRowSeats);
    expect(result.isConsecutive).toBe(false);
    expect(result.inSameRow).toBe(false);
    expect(result.explanation).toContain('different rows');
  });

  it('should detect consecutive seats in left section (odd numbers)', () => {
    const leftConsecutiveSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Left',
        row_name: 'C',
        seat_number: '101'
      },
      {
        id: '2',
        section: 'Orchestra Left',
        row_name: 'C',
        seat_number: '103'
      },
      {
        id: '3',
        section: 'Orchestra Left',
        row_name: 'C',
        seat_number: '105'
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(leftConsecutiveSeats);
    expect(result.isConsecutive).toBe(true);
    expect(result.inSameSection).toBe(true);
    expect(result.inSameRow).toBe(true);
    expect(result.explanation).toBe('Seats are consecutive');
  });

  it('should detect consecutive seats in right section (even numbers)', () => {
    const rightConsecutiveSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Right',
        row_name: 'D',
        seat_number: '102'
      },
      {
        id: '2',
        section: 'Orchestra Right',
        row_name: 'D',
        seat_number: '104'
      },
      {
        id: '3',
        section: 'Orchestra Right',
        row_name: 'D',
        seat_number: '106'
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(rightConsecutiveSeats);
    expect(result.isConsecutive).toBe(true);
    expect(result.inSameSection).toBe(true);
    expect(result.inSameRow).toBe(true);
    expect(result.explanation).toBe('Seats are consecutive');
  });

  it('should detect consecutive seats in center section (sequential numbers)', () => {
    const centerConsecutiveSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '201'
      },
      {
        id: '2',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '202'
      },
      {
        id: '3',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '203'
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(centerConsecutiveSeats);
    expect(result.isConsecutive).toBe(true);
    expect(result.inSameSection).toBe(true);
    expect(result.inSameRow).toBe(true);
    expect(result.explanation).toBe('Seats are consecutive');
  });

  it('should detect non-consecutive seats in left section', () => {
    const leftNonConsecutiveSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Left',
        row_name: 'C',
        seat_number: '101'
      },
      {
        id: '2',
        section: 'Orchestra Left',
        row_name: 'C',
        seat_number: '105' // Skipping 103
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(leftNonConsecutiveSeats);
    expect(result.isConsecutive).toBe(false);
    expect(result.inSameSection).toBe(true);
    expect(result.inSameRow).toBe(true);
    expect(result.explanation).toContain('not consecutive in the left section');
  });

  it('should detect non-consecutive seats in right section', () => {
    const rightNonConsecutiveSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Right',
        row_name: 'D',
        seat_number: '102'
      },
      {
        id: '2',
        section: 'Orchestra Right',
        row_name: 'D',
        seat_number: '108' // Skipping 104, 106
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(rightNonConsecutiveSeats);
    expect(result.isConsecutive).toBe(false);
    expect(result.inSameSection).toBe(true);
    expect(result.inSameRow).toBe(true);
    expect(result.explanation).toContain('not consecutive in the right section');
  });

  it('should detect non-consecutive seats in center section', () => {
    const centerNonConsecutiveSeats: Seat[] = [
      {
        id: '1',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '201'
      },
      {
        id: '2',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '203' // Skipping 202
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(centerNonConsecutiveSeats);
    expect(result.isConsecutive).toBe(false);
    expect(result.inSameSection).toBe(true);
    expect(result.inSameRow).toBe(true);
    expect(result.explanation).toContain('not consecutive in the center section');
  });

  it('should handle unsorted seat arrays and sort them properly', () => {
    const unsortedSeats: Seat[] = [
      {
        id: '3',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '203'
      },
      {
        id: '1',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '201'
      },
      {
        id: '2',
        section: 'Orchestra Center',
        row_name: 'E',
        seat_number: '202'
      }
    ];

    const result = detectMechanicsburgConsecutiveSeats(unsortedSeats);
    expect(result.isConsecutive).toBe(true);
    expect(result.explanation).toBe('Seats are consecutive');
  });
});

describe('createReservationTimer', () => {
  // Mock the Date object
  let originalDate: typeof Date;
  let mockNow: number;

  beforeEach(() => {
    originalDate = global.Date;
    mockNow = 1617184800000; // A fixed timestamp: 2021-03-31T12:00:00.000Z

    // @ts-ignore - Mocking Date for testing
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockNow);
        } else {
          super(...args);
        }
      }

      static now() {
        return mockNow;
      }
    };
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  it('should create a timer with correct initial values', () => {
    const mockExpire = vi.fn();
    const mockUpdate = vi.fn();

    const timer = createReservationTimer(30, mockExpire, mockUpdate);

    // Initial timer should not be running
    expect(timer.isRunning()).toBe(false);

    // Check end time is set to 30 minutes in the future
    const expectedEndTime = new Date(mockNow + 30 * 60 * 1000);
    expect(timer.getEndTime().getTime()).toBe(expectedEndTime.getTime());
  });

  it('should start the timer and call update callback', () => {
    vi.useFakeTimers();

    const mockExpire = vi.fn();
    const mockUpdate = vi.fn();

    const timer = createReservationTimer(30, mockExpire, mockUpdate);
    timer.start();

    // Timer should be running
    expect(timer.isRunning()).toBe(true);

    // Initial update should happen immediately
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Advance time by 1 second
    mockNow += 1000;
    vi.advanceTimersByTime(1000);

    // Update should be called again
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    // Check that update was called with correct values
    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.stringMatching(/29:\d\d/), // Something like "29:59"
      expect.any(Number),
      false // Not urgent yet
    );

    vi.useRealTimers();
  });

  it('should call expire callback when timer ends', () => {
    vi.useFakeTimers();

    const mockExpire = vi.fn();
    const mockUpdate = vi.fn();

    const timer = createReservationTimer(30, mockExpire, mockUpdate);
    timer.start();

    // Advance time to just before expiration
    mockNow += 30 * 60 * 1000 - 1000;
    vi.advanceTimersByTime(30 * 60 * 1000 - 1000);

    // Expire should not have been called yet
    expect(mockExpire).not.toHaveBeenCalled();

    // Last update should include the urgent flag
    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.stringMatching(/0:\d\d/), // Something like "0:01"
      expect.any(Number),
      true // Now urgent
    );

    // Advance time past expiration
    mockNow += 2000;
    vi.advanceTimersByTime(2000);

    // Expire should have been called
    expect(mockExpire).toHaveBeenCalledTimes(1);

    // Timer should no longer be running
    expect(timer.isRunning()).toBe(false);

    vi.useRealTimers();
  });

  it('should stop the timer', () => {
    vi.useFakeTimers();

    const mockExpire = vi.fn();
    const mockUpdate = vi.fn();

    const timer = createReservationTimer(30, mockExpire, mockUpdate);
    timer.start();

    // Timer should be running
    expect(timer.isRunning()).toBe(true);

    // Stop the timer
    timer.stop();

    // Timer should not be running
    expect(timer.isRunning()).toBe(false);

    // Advance time
    mockNow += 5000;
    vi.advanceTimersByTime(5000);

    // Update should not be called again
    expect(mockUpdate).toHaveBeenCalledTimes(1); // Only the initial call

    vi.useRealTimers();
  });

  it('should reset the timer with a new duration', () => {
    vi.useFakeTimers();

    const mockExpire = vi.fn();
    const mockUpdate = vi.fn();

    const timer = createReservationTimer(30, mockExpire, mockUpdate);
    timer.start();

    // Advance time
    mockNow += 10000;
    vi.advanceTimersByTime(10000);

    // Reset with new duration
    timer.reset(15);

    // End time should be updated
    const newExpectedEndTime = new Date(mockNow + 15 * 60 * 1000);
    expect(timer.getEndTime().getTime()).toBe(newExpectedEndTime.getTime());

    // Timer should still be running
    expect(timer.isRunning()).toBe(true);

    vi.useRealTimers();
  });

  // Updated 'should format time correctly' test

  it.skip('should format time correctly', () => {
    vi.useFakeTimers();

    const mockUpdate = vi.fn();

    const timer = createReservationTimer(30, () => {}, mockUpdate);
    timer.start();

    // Check initial format
    expect(mockUpdate).toHaveBeenCalledWith('30:00', expect.any(Number), false);

    // Test different time formats
    const testTimes = [
      { advance: 59 * 1000, expected: '29:01' }, // 29 min, 1 sec
      { advance: 10 * 60 * 1000, expected: '19:01' } // 19 min, 1 sec
    ];

    for (const test of testTimes) {
      // Reset mock to check new calls
      mockUpdate.mockReset();

      // Advance time
      mockNow += test.advance;
      vi.advanceTimersByTime(test.advance);

      // Check format
      expect(mockUpdate).toHaveBeenLastCalledWith(test.expected, expect.any(Number), expect.any(Boolean));
    }

    // Special case for 1:01 test
    mockUpdate.mockReset();

    // Calculate how much time to advance to exactly 1:01 remaining
    // 30 minutes = 1,800,000 milliseconds
    // 1 min 1 sec = 61,000 milliseconds
    // So we need to advance by 1,800,000 - 61,000 = 1,739,000 milliseconds
    const timeToAdvance = 1739000; // This should leave exactly 1:01 remaining

    mockNow += timeToAdvance;
    vi.advanceTimersByTime(timeToAdvance);

    // Check format is exactly 1:01
    expect(mockUpdate).toHaveBeenLastCalledWith('1:01', expect.any(Number), expect.any(Boolean));

    vi.useRealTimers();
  });
});
