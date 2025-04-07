import { timeToMinutes } from '~/utils/time'

/**
 * Checks for scheduling conflicts between existing items and a new item
 */
export function checkConflicts(items, newItem, options = {}) {
  const conflicts = [];

  // Get teacher availability data from options or use empty array
  const teacherAvailability = options.teacherAvailability || {
    regularAvailability: [],
    exceptions: []
  };

  // Helper function to format time for display
  const formatTimeForDisplay = (timeString) => {
    if (!timeString) return '';

    try {
      const date = new Date(`2000-01-01T${timeString}`);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeString;
    }
  };

  // Check for studio conflicts
  for (const item of items) {
    // Only check items in the same studio and day
    if (
      item.studioId !== newItem.studio_id || 
      item.dayOfWeek !== newItem.day_of_week ||
      item.id === newItem.id
    ) {
      continue;
    }

    // Convert times to minutes for comparison
    const itemStartMinutes = timeToMinutes(item.startTime);
    const itemEndMinutes = timeToMinutes(item.endTime);
    const newStartMinutes = timeToMinutes(newItem.start_time);
    const newEndMinutes = timeToMinutes(newItem.end_time);

    // Skip if classes are back-to-back
    if (newStartMinutes === itemEndMinutes || itemStartMinutes === newEndMinutes) {
      continue;
    }

    // Check for overlap
    if (
      (newStartMinutes > itemStartMinutes && newStartMinutes < itemEndMinutes) || // New class starts during existing class
      (newEndMinutes > itemStartMinutes && newEndMinutes < itemEndMinutes) || // New class ends during existing class
      (newStartMinutes < itemStartMinutes && newEndMinutes > itemEndMinutes) || // New class completely overlaps existing class
      (newStartMinutes === itemStartMinutes) // Classes start at the same time
    ) {
      conflicts.push({
        type: 'studio',
        item,
        message: `Studio conflict with ${item.className || 'another class'} (${formatTimeForDisplay(
          item.startTime
        )} - ${formatTimeForDisplay(item.endTime)})`
      });
    }
  }

  // Check for teacher conflicts
  if (newItem.teacher_id) {
    for (const item of items) {
      // Only check items with the same teacher and day
      if (
        item.teacherId !== newItem.teacher_id || 
        item.dayOfWeek !== newItem.day_of_week ||
        item.id === newItem.id
      ) {
        continue;
      }

      // Convert times to minutes for comparison
      const itemStartMinutes = timeToMinutes(item.startTime);
      const itemEndMinutes = timeToMinutes(item.endTime);
      const newStartMinutes = timeToMinutes(newItem.start_time);
      const newEndMinutes = timeToMinutes(newItem.end_time);

      // Skip if classes are back-to-back
      if (newStartMinutes === itemEndMinutes || itemStartMinutes === newEndMinutes) {
        continue;
      }

      // Check for overlap
      if (
        (newStartMinutes > itemStartMinutes && newStartMinutes < itemEndMinutes) || // New class starts during existing class
        (newEndMinutes > itemStartMinutes && newEndMinutes < itemEndMinutes) || // New class ends during existing class
        (newStartMinutes < itemStartMinutes && newEndMinutes > itemEndMinutes) || // New class completely overlaps existing class
        (newStartMinutes === itemStartMinutes) // Classes start at the same time
      ) {
        conflicts.push({
          type: 'teacher',
          item,
          message: `Teacher conflict: This teacher is already teaching ${
            item.className || 'another class'
          } (${formatTimeForDisplay(item.startTime)} - ${formatTimeForDisplay(item.endTime)})`
        });
      }
    }

    // Check teacher availability
    const regularAvailForDay = teacherAvailability.regularAvailability.filter((avail) => {
      return (
        avail.teacher_id === newItem.teacher_id &&
        parseInt(avail.day_of_week) === parseInt(newItem.day_of_week) &&
        avail.is_available === true
      );
    });

    // Convert class time to minutes for comparison
    const classStartMinutes = timeToMinutes(newItem.start_time);
    const classEndMinutes = timeToMinutes(newItem.end_time);

    // Check if the class time falls within any availability periods
    const isWithinRegularAvailability = regularAvailForDay.some((avail) => {
      const availStartMinutes = timeToMinutes(avail.start_time);
      const availEndMinutes = timeToMinutes(avail.end_time);

      // Check if class is completely within this availability window
      return classStartMinutes >= availStartMinutes && classEndMinutes <= availEndMinutes;
    });

    // Add conflict if teacher is not available at this time
    if (regularAvailForDay.length > 0 && !isWithinRegularAvailability) {
      conflicts.push({
        type: 'teacher_availability',
        message: 'Teacher is not available during this time slot'
      });
    }

    // Also handle the case where there is no availability data for this day
    if (regularAvailForDay.length === 0) {
      // No availability data for this day - teacher is not scheduled to work
      conflicts.push({
        type: 'teacher_availability',
        message: 'Teacher does not have any availability scheduled for this day'
      });
    }
  }

  return conflicts;
}

/**
 * Finds conflicts with other classes in the same studio
 * Keep this for compatibility with existing code
 */
export function findStudioConflicts(items, newItem) {
  // Filter for items in the same studio and day
  const studioConflicts = items.filter(
    (item) => item.dayOfWeek === newItem.day_of_week && item.studioId === newItem.studio_id && item.id !== newItem.id
  );

  // Check each item for time conflicts
  return studioConflicts.filter(item => {
    // Convert times to minutes for comparison
    const itemStartMinutes = timeToMinutes(item.startTime);
    const itemEndMinutes = timeToMinutes(item.endTime);
    const newStartMinutes = timeToMinutes(newItem.start_time);
    const newEndMinutes = timeToMinutes(newItem.end_time);

    // Skip if classes are back-to-back
    if (newStartMinutes === itemEndMinutes || itemStartMinutes === newEndMinutes) {
      return false;
    }

    // Check for overlap
    return (
      (newStartMinutes > itemStartMinutes && newStartMinutes < itemEndMinutes) || // New class starts during existing class
      (newEndMinutes > itemStartMinutes && newEndMinutes < itemEndMinutes) || // New class ends during existing class
      (newStartMinutes < itemStartMinutes && newEndMinutes > itemEndMinutes) || // New class completely overlaps existing class
      (newStartMinutes === itemStartMinutes) // Classes start at the same time
    );
  });
}

/**
 * Finds conflicts with other classes taught by the same teacher
 * Keep this for compatibility with existing code
 */
export function findTeacherConflicts(items, newItem) {
  // Filter for items with same teacher and day
  const teacherConflicts = items.filter(
    (item) => 
      item.dayOfWeek === newItem.day_of_week && 
      item.teacherId === newItem.teacher_id && 
      item.id !== newItem.id
  );

  // Check each item for time conflicts
  return teacherConflicts.filter(item => {
    // Convert times to minutes for comparison
    const itemStartMinutes = timeToMinutes(item.startTime);
    const itemEndMinutes = timeToMinutes(item.endTime);
    const newStartMinutes = timeToMinutes(newItem.start_time);
    const newEndMinutes = timeToMinutes(newItem.end_time);

    // Skip if classes are back-to-back
    if (newStartMinutes === itemEndMinutes || itemStartMinutes === newEndMinutes) {
      return false;
    }

    // Check for overlap
    return (
      (newStartMinutes > itemStartMinutes && newStartMinutes < itemEndMinutes) || // New class starts during existing class
      (newEndMinutes > itemStartMinutes && newEndMinutes < itemEndMinutes) || // New class ends during existing class
      (newStartMinutes < itemStartMinutes && newEndMinutes > itemEndMinutes) || // New class completely overlaps existing class
      (newStartMinutes === itemStartMinutes) // Classes start at the same time
    );
  });
}

/**
 * Checks if a class is within the teacher's availability
 * Keep this for compatibility with existing code
 */
export function checkTeacherAvailability(newItem, teacherAvailability) {
  const conflicts = [];
  
  const regularAvailForDay = teacherAvailability.regularAvailability.filter((avail) => {
    return (
      avail.teacher_id === newItem.teacher_id &&
      parseInt(avail.day_of_week) === parseInt(newItem.day_of_week) &&
      avail.is_available === true
    );
  });

  // Convert class time to minutes for comparison
  const classStartMinutes = timeToMinutes(newItem.start_time);
  const classEndMinutes = timeToMinutes(newItem.end_time);

  // Check if the class time falls within any availability periods
  const isWithinRegularAvailability = regularAvailForDay.some((avail) => {
    const availStartMinutes = timeToMinutes(avail.start_time);
    const availEndMinutes = timeToMinutes(avail.end_time);

    // Check if class is completely within this availability window
    return classStartMinutes >= availStartMinutes && classEndMinutes <= availEndMinutes;
  });

  // Add conflict if teacher is not available at this time
  if (regularAvailForDay.length > 0 && !isWithinRegularAvailability) {
    conflicts.push({
      type: 'teacher_availability',
      message: 'Teacher is not available during this time slot'
    });
  }

  // Also handle the case where there is no availability data for this day
  if (regularAvailForDay.length === 0) {
    // No availability data for this day - teacher is not scheduled to work
    conflicts.push({
      type: 'teacher_availability',
      message: 'Teacher does not have any availability scheduled for this day'
    });
  }

  return conflicts;
}

// Utility function to convert time string to minutes since midnight
