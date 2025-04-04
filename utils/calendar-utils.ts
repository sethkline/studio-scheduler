/**
 * Creates a draggable calendar item from a schedule item
 */
export function createDraggableItem(item) {
  // Get current date information
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate the date for the given day of week
  // We want to display the current week, so we adjust based on the difference
  // between today's day and the event's day
  let dayOffset = item.dayOfWeek - currentDay;

  // Adjust for Sunday (0) vs Monday (1) as week start
  // If item.dayOfWeek is 0 (Sunday) and today is not Sunday, we need to add days
  if (item.dayOfWeek === 0 && currentDay !== 0) {
    dayOffset = 7 - currentDay; // Move to next Sunday
  }

  // Create date objects for start and end times
  const startDate = new Date(currentYear, currentMonth, currentDate + dayOffset);
  const endDate = new Date(currentYear, currentMonth, currentDate + dayOffset);

  // Parse time strings and set hours and minutes
  const [startHours, startMinutes] = item.startTime.split(':').map(Number);
  const [endHours, endMinutes] = item.endTime.split(':').map(Number);

  startDate.setHours(startHours, startMinutes, 0);
  endDate.setHours(endHours, endMinutes, 0);

  return {
    id: item.id,
    title: item.className,
    start: startDate,
    end: endDate,
    backgroundColor: item.danceStyleColor,
    classInstanceId: item.classInstanceId,
    teacherId: item.teacherId,
    teacherName: item.teacherName,
    studioId: item.studioId,
    studioName: item.studioName,
    danceStyle: item.danceStyle,
    extendedProps: {
      teacherName: item.teacherName || 'No teacher',
      studioName: item.studioName || 'No studio',
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime
    }
  };
}

/**
 * Formats a time string for display
 */
export function formatTime(timeString: string) {
  if (!timeString) return '';

  try {
    const date = new Date(`2000-01-01T${timeString}`);
    
    // Format with consistent behavior
    const formattedTime = date.toLocaleTimeString([], { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
    
    return formattedTime;
  } catch (e) {
    return timeString;
  }
}

/**
 * Formats a date object to a time string in HH:MM:SS format
 */
export function formatDateToTimeString(date) {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:00`;
}