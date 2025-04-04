/**
 * Generates a new season name based on the current date
 */
export function generateNextSeasonName() {
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
}

/**
 * Gets a suggested start date for a season
 */
export function getSeasonStartDate(season, year) {
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
}

/**
 * Gets a suggested end date for a season
 */
export function getSeasonEndDate(season, year) {
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
}

/**
 * Determines if a date is within the transition period (30 days before end of season)
 */
export function isDateInTransitionPeriod(endDate) {
  const today = new Date();
  const seasonEndDate = new Date(endDate);
  const daysUntilEnd = Math.floor((seasonEndDate - today) / (1000 * 60 * 60 * 24));
  
  return daysUntilEnd <= 30 && daysUntilEnd >= 0;
}

/**
 * Maps source classes to target classes for transitioning to a new season
 */
export function mapClassesToNewSeason(sourceClasses, targetScheduleId) {
  if (!sourceClasses || sourceClasses.length === 0) {
    return [];
  }
  
  return sourceClasses.map((sourceClass) => ({
    schedule_id: targetScheduleId,
    class_instance_id: sourceClass.class_instance_id,
    day_of_week: sourceClass.day_of_week,
    start_time: sourceClass.start_time,
    end_time: sourceClass.end_time,
    studio_id: sourceClass.studio_id,
    teacher_id: sourceClass.teacher_id
  }));
}