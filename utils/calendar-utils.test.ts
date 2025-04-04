import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createDraggableItem, formatTime, formatDateToTimeString } from '~/utils/calendar-utils';

describe('calendar-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed date for testing: Wednesday, June 15, 2023
    vi.setSystemTime(new Date(2023, 5, 15));
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe('createDraggableItem', () => {
    it('should correctly convert a schedule item to a draggable event', () => {
      const mockItem = {
        id: 'test-id',
        className: 'Ballet 101',
        dayOfWeek: 2, // Tuesday
        startTime: '14:30:00', // 2:30 PM
        endTime: '15:30:00', // 3:30 PM
        danceStyleColor: '#ff0000',
        classInstanceId: 'class-123',
        teacherId: 'teacher-123',
        teacherName: 'John Doe',
        studioId: 'studio-123',
        studioName: 'Main Studio',
        danceStyle: 'Ballet'
      };
      
      const result = createDraggableItem(mockItem);
      
      expect(result).toMatchObject({
        id: 'test-id',
        title: 'Ballet 101',
        backgroundColor: '#ff0000',
        classInstanceId: 'class-123',
        teacherId: 'teacher-123',
        teacherName: 'John Doe',
        studioId: 'studio-123',
        studioName: 'Main Studio',
        danceStyle: 'Ballet',
        extendedProps: {
          teacherName: 'John Doe',
          studioName: 'Main Studio',
          dayOfWeek: 2,
          startTime: '14:30:00',
          endTime: '15:30:00'
        }
      });
      
      // Check that the dates are set correctly
      expect(result.start.getDay()).toBe(2); // Tuesday
      expect(result.start.getHours()).toBe(14);
      expect(result.start.getMinutes()).toBe(30);
      expect(result.end.getHours()).toBe(15);
      expect(result.end.getMinutes()).toBe(30);
    });

    it('should handle items without teacher or studio name', () => {
      const mockItem = {
        id: 'test-id',
        className: 'Ballet 101',
        dayOfWeek: 3, // Wednesday
        startTime: '10:00:00',
        endTime: '11:00:00',
        danceStyleColor: '#0000ff',
        classInstanceId: 'class-456'
        // No teacher or studio name
      };
      
      const result = createDraggableItem(mockItem);
      
      expect(result.extendedProps.teacherName).toBe('No teacher');
      expect(result.extendedProps.studioName).toBe('No studio');
    });
    
    it('should adjust day offset correctly for Sunday', () => {
      // Current day is Wednesday (3), dayOfWeek is Sunday (0)
      const mockItem = {
        id: 'test-id',
        className: 'Sunday Class',
        dayOfWeek: 0, // Sunday
        startTime: '10:00:00',
        endTime: '11:00:00',
        danceStyleColor: '#0000ff',
      };
      
      const result = createDraggableItem(mockItem);
      
      // Should be the following Sunday (not previous)
      const todayDate = new Date(2023, 5, 15); // Wednesday
      const expectedSunday = new Date(2023, 5, 18); // Following Sunday
      
      expect(result.start.getDate()).toBe(expectedSunday.getDate());
      expect(result.start.getDay()).toBe(0); // Sunday
    });
  });
  
  describe('formatTime', () => {
    it('should format time strings correctly', () => {
      expect(formatTime('09:30:00')).toBe('9:30 AM');
      expect(formatTime('14:45:00')).toBe('2:45 PM');
      expect(formatTime('00:00:00')).toBe('12:00 AM');
      expect(formatTime('12:00:00')).toBe('12:00 PM');
    });
    
    it('should handle invalid time strings', () => {
      expect(formatTime('')).toBe('');
      expect(formatTime(null)).toBe('');
      expect(formatTime('invalid')).toBe('Invalid Date');
    });
  });
  
  describe('formatDateToTimeString', () => {
    it('should format date objects to HH:MM:SS strings', () => {
      const date1 = new Date(2023, 5, 15, 9, 30, 0);
      expect(formatDateToTimeString(date1)).toBe('09:30:00');
      
      const date2 = new Date(2023, 5, 15, 14, 5, 0);
      expect(formatDateToTimeString(date2)).toBe('14:05:00');
      
      const date3 = new Date(2023, 5, 15, 0, 0, 0);
      expect(formatDateToTimeString(date3)).toBe('00:00:00');
    });
  });
});