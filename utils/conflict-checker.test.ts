import { describe, it, expect } from 'vitest';
import { 
  checkConflicts, 
  findStudioConflicts, 
  findTeacherConflicts,
  checkTeacherAvailability 
} from '~/utils/conflict-checker';

describe('conflict-checker', () => {
  describe('findStudioConflicts', () => {
    const studio1 = 'studio-1';
    const day = 2; // Tuesday
    
    it('should detect when a new class completely overlaps an existing class', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '10:00:00',
        endTime: '11:00:00',
        studioId: studio1,
        className: 'Jazz Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day,
        start_time: '09:30:00',  // Starts before
        end_time: '11:30:00',    // Ends after
        studio_id: studio1
      };
      
      const conflicts = findStudioConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe('existing-1');
    });
    
    it('should detect when a new class starts during an existing class', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '10:00:00',
        endTime: '11:00:00',
        studioId: studio1,
        className: 'Jazz Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day,
        start_time: '10:30:00',  // Starts during existing class
        end_time: '11:30:00',    // Ends after
        studio_id: studio1
      };
      
      const conflicts = findStudioConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(1);
    });
    
    it('should detect when a new class ends during an existing class', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '10:00:00',
        endTime: '11:00:00',
        studioId: studio1,
        className: 'Jazz Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day,
        start_time: '09:30:00',  // Starts before
        end_time: '10:30:00',    // Ends during existing class
        studio_id: studio1
      };
      
      const conflicts = findStudioConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(1);
    });
    
    it('should NOT detect conflict when a class starts exactly when another ends', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '10:00:00',
        endTime: '11:00:00',
        studioId: studio1,
        className: 'Jazz Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day,
        start_time: '11:00:00',  // Starts exactly when the other ends
        end_time: '12:00:00',
        studio_id: studio1
      };
      
      const conflicts = findStudioConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(0);
    });
    
    it('should NOT detect conflict when classes are in different studios', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '10:00:00',
        endTime: '11:00:00',
        studioId: studio1,
        className: 'Jazz Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day,
        start_time: '10:30:00',  // Overlapping time
        end_time: '11:30:00',
        studio_id: 'studio-2'    // Different studio
      };
      
      const conflicts = findStudioConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(0);
    });
  });
  
  describe('findTeacherConflicts', () => {
    const teacher1 = 'teacher-1';
    const day = 3; // Wednesday
    
    it('should detect when a teacher is double-booked', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '13:00:00',
        endTime: '14:00:00',
        teacherId: teacher1,
        studioId: 'studio-1',
        className: 'Ballet Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day,
        start_time: '13:30:00',  // Overlaps
        end_time: '14:30:00',
        teacher_id: teacher1,
        studio_id: 'studio-2'    // Different studio but same teacher
      };
      
      const conflicts = findTeacherConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(1);
    });
    
    it('should NOT detect conflict when classes are on different days', () => {
      const existingItems = [{
        id: 'existing-1',
        dayOfWeek: day,
        startTime: '13:00:00',
        endTime: '14:00:00',
        teacherId: teacher1,
        studioId: 'studio-1',
        className: 'Ballet Class'
      }];
      
      const newItem = {
        id: 'new-class',
        day_of_week: day + 1,  // Different day
        start_time: '13:30:00',  // Overlaps if same day
        end_time: '14:30:00',
        teacher_id: teacher1,
        studio_id: 'studio-1'
      };
      
      const conflicts = findTeacherConflicts(existingItems, newItem);
      expect(conflicts.length).toBe(0);
    });
  });
  
  describe('checkTeacherAvailability', () => {
    const teacher1 = 'teacher-1';
    const day = 4; // Thursday
    
    it('should detect when class time is outside teacher availability hours', () => {
      const teacherAvailability = {
        regularAvailability: [
          {
            teacher_id: teacher1,
            day_of_week: day,
            is_available: true,
            start_time: '09:00:00',
            end_time: '13:00:00'  // Available until 1 PM
          }
        ],
        exceptions: []
      };
      
      const newItem = {
        day_of_week: day,
        start_time: '13:30:00',  // Starts after availability ends
        end_time: '14:30:00',
        teacher_id: teacher1,
        studio_id: 'studio-1'
      };
      
      const conflicts = checkTeacherAvailability(newItem, teacherAvailability);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('teacher_availability');
    });
    
    it('should NOT detect conflict when class is within teacher availability', () => {
      const teacherAvailability = {
        regularAvailability: [
          {
            teacher_id: teacher1,
            day_of_week: day,
            is_available: true,
            start_time: '09:00:00',
            end_time: '17:00:00'  // 9 AM to 5 PM
          }
        ],
        exceptions: []
      };
      
      const newItem = {
        day_of_week: day,
        start_time: '13:00:00',  // Within availability
        end_time: '14:00:00',
        teacher_id: teacher1,
        studio_id: 'studio-1'
      };
      
      const conflicts = checkTeacherAvailability(newItem, teacherAvailability);
      expect(conflicts.length).toBe(0);
    });
    
    it('should detect when teacher has no availability for the day', () => {
      const teacherAvailability = {
        regularAvailability: [
          // No availability record for this teacher on this day
        ],
        exceptions: []
      };
      
      const newItem = {
        day_of_week: day,
        start_time: '13:00:00',
        end_time: '14:00:00',
        teacher_id: teacher1,
        studio_id: 'studio-1'
      };
      
      const conflicts = checkTeacherAvailability(newItem, teacherAvailability);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('teacher_availability');
    });
  });
  
  describe('checkConflicts', () => {
    it('should detect multiple types of conflicts', () => {
      const existingItems = [
        {
          id: 'item-1',
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '10:30:00',
          studioId: 'studio-1',
          teacherId: 'teacher-1',
          className: 'Jazz 101'
        }
      ];
          
      const teacherAvailability = {
        regularAvailability: [],
        exceptions: []
      };
          
      const newItem = {
        id: 'new-item',
        day_of_week: 2, // Tuesday
        start_time: '10:00:00', // Overlaps with item-1
        end_time: '11:00:00',
        studio_id: 'studio-1',
        teacher_id: 'teacher-1'
      };
          
      const conflicts = checkConflicts(existingItems, newItem, { teacherAvailability });
          
      // Should find studio, teacher, and teacher availability conflicts
      expect(conflicts.length).toBe(3);
          
      // Check if we have all three types of conflicts
      const conflictTypes = conflicts.map(conflict => conflict.type);
      expect(conflictTypes).toContain('studio');
      expect(conflictTypes).toContain('teacher');
      expect(conflictTypes).toContain('teacher_availability');
    });
    
    it('should not check teacher conflicts if no teacher_id is provided', () => {
      const existingItems = [
        {
          id: 'item-1',
          dayOfWeek: 2, // Tuesday
          startTime: '09:00:00',
          endTime: '10:30:00',
          studioId: 'studio-1',
          teacherId: 'teacher-1',
          className: 'Jazz 101'
        }
      ];
      
      const newItem = {
        id: 'new-item',
        day_of_week: 2, // Tuesday
        start_time: '10:00:00', // Overlaps with item-1
        end_time: '11:00:00',
        studio_id: 'studio-1'
        // No teacher_id
      };
      
      const conflicts = checkConflicts(existingItems, newItem);
      
      // Should only find studio conflict
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('studio');
    });
    it.skip('should not detect conflict for back-to-back classes in the same studio', () => {
      const existingItems = [
        {
          id: 'item-1',
          dayOfWeek: 2, // Tuesday
          startTime: '14:30:00',
          endTime: '15:30:00',
          studioId: 'studio-1',
          teacherId: 'teacher-1',
          className: 'Jazz 101'
        }
      ];
      
      const newItem = {
        id: 'new-item',
        day_of_week: 2, // Tuesday
        start_time: '15:30:00', // Starts exactly when previous class ends
        end_time: '16:30:00',
        studio_id: 'studio-1',
        teacher_id: 'teacher-2' // Different teacher to isolate studio conflict testing
      };
      
      const conflicts = checkConflicts(existingItems, newItem);
      
      // Should find no conflicts
      expect(conflicts.length).toBe(0);
    });
    
    it.skip('should not detect conflict for back-to-back classes with the same teacher', () => {
      const existingItems = [
        {
          id: 'item-1',
          dayOfWeek: 3, // Wednesday
          startTime: '14:30:00',
          endTime: '15:30:00',
          studioId: 'studio-1',
          teacherId: 'teacher-1',
          className: 'Jazz 101'
        }
      ];
      
      const newItem = {
        id: 'new-item',
        day_of_week: 3, // Wednesday
        start_time: '15:30:00', // Starts exactly when previous class ends
        end_time: '16:30:00',
        studio_id: 'studio-2', // Different studio to isolate teacher conflict testing
        teacher_id: 'teacher-1' // Same teacher
      };
      
      const conflicts = checkConflicts(existingItems, newItem);
      
      // Should find no conflicts
      expect(conflicts.length).toBe(0);
    });
    
    it('should not detect any conflicts in full end-to-end scenario for back-to-back classes', () => {
      const existingItems = [
        {
          id: 'item-1',
          dayOfWeek: 2, // Tuesday
          startTime: '14:30:00',
          endTime: '15:30:00',
          studioId: 'studio-1',
          teacherId: 'teacher-1',
          className: 'Jazz 101'
        }
      ];
      
      const teacherAvailability = {
        regularAvailability: [
          {
            teacher_id: 'teacher-1',
            day_of_week: 2,
            is_available: true,
            start_time: '14:00:00',
            end_time: '16:30:00' // Available for both classes
          }
        ],
        exceptions: []
      };
      
      const newItem = {
        id: 'new-item',
        day_of_week: 2, // Tuesday
        start_time: '15:30:00', // Starts exactly when previous class ends
        end_time: '16:30:00',
        studio_id: 'studio-1',
        teacher_id: 'teacher-1' 
      };
      
      const conflicts = checkConflicts(existingItems, newItem, { teacherAvailability });
      
      // Should find no conflicts at all
      expect(conflicts.length).toBe(0);
    });
  });
})