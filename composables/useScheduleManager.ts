import { ref } from 'vue';
import { createDraggableItem, formatTime, formatDateToTimeString } from '~/utils/calendar-utils';
import { checkConflicts } from '~/utils/conflict-checker';
import { 
  generateNextSeasonName, 
  getSeasonStartDate, 
  getSeasonEndDate, 
  isDateInTransitionPeriod,
  mapClassesToNewSeason
} from '~/utils/season-manager';

export function useScheduleManager() {
  const client = useSupabaseClient();
  const toast = useToast();

  const isCreating = ref(false);
  const isUpdating = ref(false);
  const isDeleting = ref(false);

  // Function to handle a schedule item drop (when dragged & dropped)
  const handleItemDrop = async (dropInfo) => {
    isUpdating.value = true;

    try {
      const { event, oldEvent } = dropInfo;

      // Calculate new day and time
      const newDayOfWeek = event.start.getDay();
      const newStartTime = formatDateToTimeString(event.start);
      const newEndTime = formatDateToTimeString(event.end);

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

  // Helper function to get class instance information
  const getClassInstance = async (id) => {
    const { data, error } = await client.from('class_instances').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching class instance:', error);
      return null;
    }

    return data;
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

      // 2. Map source classes to target classes
      const newClasses = mapClassesToNewSeason(sourceClasses, targetScheduleId);

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
      const isInTransitionPeriod = isDateInTransitionPeriod(activeSchedule.end_date);
      const isTransition = isInTransitionPeriod || hasRecitals;

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