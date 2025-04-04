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

  // Check for time conflicts in the same studio
  const studioConflicts = findStudioConflicts(items, newItem);
  for (const item of studioConflicts) {
    conflicts.push({
      type: 'studio',
      item,
      message: `Studio conflict with ${item.className || 'another class'} (${formatTimeForDisplay(
        item.startTime
      )} - ${formatTimeForDisplay(item.endTime)})`
    });
  }

  // Add teacher conflict checks - check both existing classes and availability
  if (newItem.teacher_id) {
    // Check conflicts with other classes (same teacher, same day, different class)
    const teacherConflicts = findTeacherConflicts(items, newItem);
    for (const item of teacherConflicts) {
      conflicts.push({
        type: 'teacher',
        item,
        message: `Teacher conflict: This teacher is already teaching ${
          item.className || 'another class'
        } (${formatTimeForDisplay(item.startTime)} - ${formatTimeForDisplay(item.endTime)})`
      });
    }

    // Check teacher availability
    const availabilityConflicts = checkTeacherAvailability(newItem, teacherAvailability);
    conflicts.push(...availabilityConflicts);
  }

  return conflicts;
}

/**
 * Finds conflicts with other classes in the same studio
 */
export function findStudioConflicts(items, newItem) {
  // Filter for items in the same studio and day
  const studioConflicts = items.filter(
    (item) => item.dayOfWeek === newItem.day_of_week && item.studioId === newItem.studio_id && item.id !== newItem.id
  );

  // Check each item for time conflicts
  return studioConflicts.filter(item => {
    const itemStart = new Date(`2000-01-01T${item.startTime}`);
    const itemEnd = new Date(`2000-01-01T${item.endTime}`);
    const newStart = new Date(`2000-01-01T${newItem.start_time}`);
    const newEnd = new Date(`2000-01-01T${newItem.end_time}`);

    // Compare time values directly to avoid any potential JavaScript date comparison issues
    const itemStartTime = itemStart.getTime();
    const itemEndTime = itemEnd.getTime();
    const newStartTime = newStart.getTime();
    const newEndTime = newEnd.getTime();

    // Check for back-to-back classes
    if (newStartTime === itemEndTime || itemStartTime === newEndTime) {
      // Back-to-back classes - no conflict
      return false;
    }

    // Check for other types of overlaps
    return (
      (newStartTime > itemStartTime && newStartTime < itemEndTime) || // New class starts during existing class
      (newEndTime > itemStartTime && newEndTime < itemEndTime) || // New class ends during existing class
      (newStartTime < itemStartTime && newEndTime > itemEndTime) || // New class completely overlaps existing class
      (newStartTime === itemStartTime) // Classes start at the same time
    );
  });
}

/**
 * Finds conflicts with other classes taught by the same teacher
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
    const itemStart = new Date(`2000-01-01T${item.startTime}`);
    const itemEnd = new Date(`2000-01-01T${item.endTime}`);
    const newStart = new Date(`2000-01-01T${newItem.start_time}`);
    const newEnd = new Date(`2000-01-01T${newItem.end_time}`);

    // Compare time values directly to avoid any potential JavaScript date comparison issues
    const itemStartTime = itemStart.getTime();
    const itemEndTime = itemEnd.getTime();
    const newStartTime = newStart.getTime();
    const newEndTime = newEnd.getTime();

    // Check for overlap with explicit handling of back-to-back case
    if (newStartTime === itemEndTime || itemStartTime === newEndTime) {
      // Back-to-back classes - no conflict
      return false;
    }

    // Check for any other overlap
    return (
      (newStartTime > itemStartTime && newStartTime < itemEndTime) || // New class starts during existing class
      (newEndTime > itemStartTime && newEndTime < itemEndTime) || // New class ends during existing class
      (newStartTime < itemStartTime && newEndTime > itemEndTime) || // New class completely overlaps existing class
      (newStartTime === itemStartTime) // Classes start at the same time
    );
  });
}

/**
 * Checks if a class is within the teacher's availability
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

  // Convert class time to dates for comparison
  const classStart = new Date(`2000-01-01T${newItem.start_time}`);
  const classEnd = new Date(`2000-01-01T${newItem.end_time}`);

  // Check if the class time falls within any availability periods
  const isWithinRegularAvailability = regularAvailForDay.some((avail) => {
    const availStart = new Date(`2000-01-01T${avail.start_time}`);
    const availEnd = new Date(`2000-01-01T${avail.end_time}`);

    // Check if class is completely within this availability window
    return classStart >= availStart && classEnd <= availEnd;
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
