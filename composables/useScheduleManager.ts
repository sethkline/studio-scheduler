export function useScheduleManager() {
  const client = useSupabaseClient();
  const toast = useToast();

  const isCreating = ref(false);
  const isUpdating = ref(false);
  const isDeleting = ref(false);

  // Function to create a draggable schedule item
  const createDraggableItem = (item) => {
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
  };

  // Function to handle a schedule item drop (when dragged & dropped)
  const handleItemDrop = async (dropInfo) => {
    isUpdating.value = true;

    try {
      const { event, oldEvent } = dropInfo;

      // Calculate new day and time
      const newDayOfWeek = event.start.getDay();
      const newStartTime = `${event.start.getHours().toString().padStart(2, '0')}:${event.start
        .getMinutes()
        .toString()
        .padStart(2, '0')}:00`;
      const newEndTime = `${event.end.getHours().toString().padStart(2, '0')}:${event.end
        .getMinutes()
        .toString()
        .padStart(2, '0')}:00`;

      // Update in database
      const { data, error } = await client
        .from('schedule_classes')
        .update({
          day_of_week: newDayOfWeek,
          start_time: newStartTime,
          end_time: newEndTime
        })
        .eq('id', event.id)
        .select();

      if (error) throw error;

      toast.add({
        severity: 'success',
        summary: 'Schedule Updated',
        detail: 'Class has been rescheduled successfully',
        life: 3000
      });

      return data[0];
    } catch (error) {
      console.error('Error updating schedule:', error);

      toast.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: error.message || 'Failed to update the schedule',
        life: 3000
      });

      throw error;
    } finally {
      isUpdating.value = false;
    }
  };

  // Check for scheduling conflicts
  const checkConflicts = (items, newItem) => {
    const conflicts = [];

    // Check for time conflicts in the same studio
    const studioConflicts = items.filter(
      (item) => item.dayOfWeek === newItem.day_of_week && item.studioId === newItem.studio_id && item.id !== newItem.id
    );

    for (const item of studioConflicts) {
      const itemStart = new Date(`2000-01-01T${item.startTime}`);
      const itemEnd = new Date(`2000-01-01T${item.endTime}`);
      const newStart = new Date(`2000-01-01T${newItem.start_time}`);
      const newEnd = new Date(`2000-01-01T${newItem.end_time}`);

      // Check for overlap
      if (
        (newStart >= itemStart && newStart < itemEnd) || // New class starts during existing class
        (newEnd > itemStart && newEnd <= itemEnd) || // New class ends during existing class
        (newStart <= itemStart && newEnd >= itemEnd) // New class completely overlaps existing class
      ) {
        conflicts.push({
          type: 'studio',
          item,
          message: `Studio conflict with ${item.className || 'another class'} (${formatTime(
            item.startTime
          )} - ${formatTime(item.endTime)})`
        });
      }
    }
    console.log(newItem, 'New Item')

    // Add teacher conflict checks
    if (newItem.teacher_id) {
      const teacherConflicts = items.filter((item) => {
        // Find the class instance to get the teacher
        const classInstance = getClassInstance(item.classInstanceId);
        return (
          item.dayOfWeek === newItem.day_of_week &&
          classInstance?.teacher_id === newItem.teacher_id &&
          item.id !== newItem.id
        );
      });

      for (const item of teacherConflicts) {
        const itemStart = new Date(`2000-01-01T${item.startTime}`);
        const itemEnd = new Date(`2000-01-01T${item.endTime}`);
        const newStart = new Date(`2000-01-01T${newItem.start_time}`);
        const newEnd = new Date(`2000-01-01T${newItem.end_time}`);

        // Check for overlap
        if (
          (newStart >= itemStart && newStart < itemEnd) ||
          (newEnd > itemStart && newEnd <= itemEnd) ||
          (newStart <= itemStart && newEnd >= itemEnd)
        ) {
          conflicts.push({
            type: 'teacher',
            item,
            message: `Teacher conflict with ${item.className || 'another class'} (${formatTime(
              item.startTime
            )} - ${formatTime(item.endTime)})`
          });
        }
      }
    }

    return conflicts;
  };

  // Helper function to get class instance information
  const getClassInstance = async (id) => {
    const { data, error } = await client.from('class_instances').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching class instance:', error);
      return null;
    }

    return data;
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';

    try {
      const date = new Date(`2000-01-01T${timeString}`);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeString;
    }
  };

  // Generate a new season name based on the current date
  const generateNextSeasonName = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    let season;
    let year = currentYear;

    // Determine season based on current month
    if (currentMonth >= 0 && currentMonth < 3) {
      // If in Jan-Mar, we're planning for Spring
      season = 'Spring';
    } else if (currentMonth >= 3 && currentMonth < 6) {
      // If in Apr-Jun, we're planning for Summer
      season = 'Summer';
    } else if (currentMonth >= 6 && currentMonth < 9) {
      // If in Jul-Sep, we're planning for Fall
      season = 'Fall';
    } else {
      // If in Oct-Dec, we're planning for next year's Spring
      season = 'Spring';
      year = currentYear + 1;
    }

    // If we're close to the end of the current season, suggest the next one
    if (currentMonth === 2 || currentMonth === 5 || currentMonth === 8 || currentMonth === 11) {
      // Near end of season, suggest next one
      if (season === 'Spring') season = 'Summer';
      else if (season === 'Summer') season = 'Fall';
      else if (season === 'Fall') season = 'Winter';
      else if (season === 'Winter') {
        season = 'Spring';
        year++;
      }
    }

    return {
      name: `${season} ${year}`,
      season,
      year,
      suggestedStartDate: getSeasonStartDate(season, year),
      suggestedEndDate: getSeasonEndDate(season, year)
    };
  };

  // Get a suggested start date for a season
  const getSeasonStartDate = (season, year) => {
    const date = new Date();
    date.setFullYear(year);

    switch (season) {
      case 'Spring':
        date.setMonth(2); // March
        date.setDate(1);
        break;
      case 'Summer':
        date.setMonth(5); // June
        date.setDate(1);
        break;
      case 'Fall':
        date.setMonth(8); // September
        date.setDate(1);
        break;
      case 'Winter':
        date.setMonth(11); // December
        date.setDate(1);
        break;
    }

    return date.toISOString().split('T')[0];
  };

  // Get a suggested end date for a season
  const getSeasonEndDate = (season, year) => {
    const date = new Date();
    date.setFullYear(year);

    switch (season) {
      case 'Spring':
        date.setMonth(4); // May
        date.setDate(31);
        break;
      case 'Summer':
        date.setMonth(7); // August
        date.setDate(31);
        break;
      case 'Fall':
        date.setMonth(10); // November
        date.setDate(30);
        break;
      case 'Winter':
        date.setMonth(1); // February of next year
        date.setFullYear(year + 1);
        date.setDate(28); // Simplification - not handling leap years
        break;
    }

    return date.toISOString().split('T')[0];
  };

  // Function to help transition classes from one season to the next
  const transitionClassesToNewSeason = async (sourceScheduleId, targetScheduleId, options = {}) => {
    isCreating.value = true;

    try {
      // 1. Fetch all classes from the source schedule
      const { data: sourceClasses, error: sourceError } = await client
        .from('schedule_classes')
        .select(
          `
          id,
          day_of_week,
          start_time,
          end_time,
          class_instance_id,
          studio_id,
          teacher_id
        `
        )
        .eq('schedule_id', sourceScheduleId);

      if (sourceError) throw sourceError;

      if (!sourceClasses || sourceClasses.length === 0) {
        return { success: true, message: 'No classes to transition', count: 0 };
      }

      // 2. For each class in the source, create a corresponding class in the target
      const newClasses = sourceClasses.map((sourceClass) => ({
        schedule_id: targetScheduleId,
        class_instance_id: sourceClass.class_instance_id,
        day_of_week: sourceClass.day_of_week,
        start_time: sourceClass.start_time,
        end_time: sourceClass.end_time,
        studio_id: sourceClass.studio_id,
        teacher_id: sourceClass.teacher_id
      }));

      // 3. Insert all new classes
      const { data: inserted, error: insertError } = await client.from('schedule_classes').insert(newClasses).select();

      if (insertError) throw insertError;

      return {
        success: true,
        message: `Successfully transitioned ${newClasses.length} classes to the new season`,
        count: newClasses.length,
        classes: inserted
      };
    } catch (error) {
      console.error('Error transitioning classes:', error);
      return {
        success: false,
        message: error.message || 'Failed to transition classes',
        count: 0
      };
    } finally {
      isCreating.value = false;
    }
  };

  // Check if a schedule term is for a recital period
  const isRecitalPeriod = async (scheduleId) => {
    try {
      // Check if there are recitals associated with this schedule period
      const { data, error } = await client
        .from('recitals')
        .select('id, name, date')
        .gte('date', new Date().toISOString()) // Only look at upcoming recitals
        .limit(1);

      if (error) throw error;

      // If there's at least one recital, this is a recital period
      return {
        isRecitalPeriod: data && data.length > 0,
        recitals: data || []
      };
    } catch (error) {
      console.error('Error checking for recital period:', error);
      return {
        isRecitalPeriod: false,
        recitals: []
      };
    }
  };

  // Check if we're in a transition period between seasons
  const checkSeasonTransition = async () => {
    try {
      // Get the current active schedule
      const { data: activeSchedules, error: scheduleError } = await client
        .from('schedules')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (scheduleError) throw scheduleError;

      if (!activeSchedules || activeSchedules.length === 0) {
        return {
          isTransitionPeriod: false,
          message: 'No active schedule found'
        };
      }

      const activeSchedule = activeSchedules[0];

      // Check if active schedule is ending soon (within next 30 days)
      const endDate = new Date(activeSchedule.end_date);
      const today = new Date();
      const daysUntilEnd = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));

      // Check for recitals in the current season
      const { isRecitalPeriod: hasRecitals, recitals } = await isRecitalPeriod(activeSchedule.id);

      // We're in a transition period if either:
      // 1. The current schedule ends within 30 days
      // 2. We have upcoming recitals
      const isTransition = daysUntilEnd <= 30 || hasRecitals;

      return {
        isTransitionPeriod: isTransition,
        daysUntilEnd,
        currentSchedule: activeSchedule,
        hasRecitals,
        recitals,
        message: isTransition
          ? `Transition period detected: ${daysUntilEnd} days until end of current season${
              hasRecitals ? ' with upcoming recitals' : ''
            }`
          : 'Not in a transition period'
      };
    } catch (error) {
      console.error('Error checking for season transition:', error);
      return {
        isTransitionPeriod: false,
        message: error.message || 'Error checking for season transition'
      };
    }
  };

  // Suggest next steps for schedule creation during transition
  const suggestScheduleTransition = async () => {
    const transitionStatus = await checkSeasonTransition();

    if (!transitionStatus.isTransitionPeriod) {
      return {
        shouldCreateNewSeason: false,
        message: 'Current schedule is active and not ending soon.',
        nextSteps: []
      };
    }

    // Generate suggestions for next season
    const nextSeason = generateNextSeasonName();

    // Check if there's already a schedule for the suggested next season
    const { data: existingSchedules, error } = await client
      .from('schedules')
      .select('*')
      .ilike('name', `%${nextSeason.year}%${nextSeason.season}%`);

    if (error) {
      console.error('Error checking for existing schedules:', error);
    }

    const hasExistingSchedule = existingSchedules && existingSchedules.length > 0;

    return {
      shouldCreateNewSeason: !hasExistingSchedule,
      message: hasExistingSchedule
        ? `A schedule for ${nextSeason.name} already exists.`
        : `It's time to create a schedule for ${nextSeason.name}.`,
      currentSeason: transitionStatus.currentSchedule ? transitionStatus.currentSchedule.name : 'Unknown',
      nextSeason,
      hasUpcomingRecitals: transitionStatus.hasRecitals,
      recitals: transitionStatus.recitals,
      daysUntilEndOfSeason: transitionStatus.daysUntilEnd,
      existingSchedules: hasExistingSchedule ? existingSchedules : [],
      nextSteps: hasExistingSchedule
        ? ['Manage existing schedules', 'Update class assignments']
        : [
            'Create a new season schedule',
            'Copy existing classes to new schedule',
            'Update class information for the new season'
          ]
    };
  };

  return {
    isCreating,
    isUpdating,
    isDeleting,
    createDraggableItem,
    handleItemDrop,
    checkConflicts,
    formatTime,
    generateNextSeasonName,
    getSeasonStartDate,
    getSeasonEndDate,
    transitionClassesToNewSeason,
    isRecitalPeriod,
    checkSeasonTransition,
    suggestScheduleTransition
  };
}
