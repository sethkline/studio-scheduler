import { timeToMinutes } from '~/utils/time'

/**
 * Student Enrollment Conflict Checker
 * Detects scheduling conflicts when enrolling students in classes
 */

export interface StudentEnrollment {
  id: string
  student_id: string
  class_instance_id: string
  status: 'active' | 'waitlist' | 'dropped'
  class_name: string
  day_of_week: number
  start_time: string
  end_time: string
  teacher_name?: string
  dance_style?: string
}

export interface ConflictCheckResult {
  hasConflict: boolean
  conflicts: StudentScheduleConflict[]
  warnings: StudentScheduleWarning[]
}

export interface StudentScheduleConflict {
  type: 'time_overlap' | 'duplicate_enrollment' | 'age_restriction' | 'skill_level' | 'class_full'
  severity: 'error' | 'warning'
  message: string
  conflictingClass?: {
    id: string
    name: string
    day_of_week: number
    start_time: string
    end_time: string
    teacher_name?: string
  }
  details?: Record<string, any>
}

export interface StudentScheduleWarning {
  type: 'back_to_back' | 'same_day_multiple' | 'max_classes_exceeded' | 'recommended_level'
  message: string
  details?: Record<string, any>
}

/**
 * Check if a student has schedule conflicts when enrolling in a new class
 */
export function checkStudentScheduleConflicts(
  studentEnrollments: StudentEnrollment[],
  newClass: {
    class_instance_id: string
    class_name: string
    day_of_week: number
    start_time: string
    end_time: string
    teacher_name?: string
    dance_style?: string
  }
): ConflictCheckResult {
  const conflicts: StudentScheduleConflict[] = []
  const warnings: StudentScheduleWarning[] = []

  // Filter only active enrollments
  const activeEnrollments = studentEnrollments.filter(
    enrollment => enrollment.status === 'active' || enrollment.status === 'waitlist'
  )

  // Check for duplicate enrollment in the same class
  const duplicateEnrollment = activeEnrollments.find(
    enrollment => enrollment.class_instance_id === newClass.class_instance_id
  )

  if (duplicateEnrollment) {
    conflicts.push({
      type: 'duplicate_enrollment',
      severity: 'error',
      message: `Student is already enrolled in ${newClass.class_name}`,
      conflictingClass: {
        id: duplicateEnrollment.class_instance_id,
        name: duplicateEnrollment.class_name,
        day_of_week: duplicateEnrollment.day_of_week,
        start_time: duplicateEnrollment.start_time,
        end_time: duplicateEnrollment.end_time,
        teacher_name: duplicateEnrollment.teacher_name
      }
    })
  }

  // Check for time overlaps on the same day
  const sameDayClasses = activeEnrollments.filter(
    enrollment => enrollment.day_of_week === newClass.day_of_week
  )

  const newStartMinutes = timeToMinutes(newClass.start_time)
  const newEndMinutes = timeToMinutes(newClass.end_time)

  for (const enrollment of sameDayClasses) {
    const enrollmentStartMinutes = timeToMinutes(enrollment.start_time)
    const enrollmentEndMinutes = timeToMinutes(enrollment.end_time)

    // Check if classes are back-to-back (not a conflict, but worth warning)
    if (
      newStartMinutes === enrollmentEndMinutes ||
      enrollmentStartMinutes === newEndMinutes
    ) {
      warnings.push({
        type: 'back_to_back',
        message: `Back-to-back classes: ${enrollment.class_name} and ${newClass.class_name}`,
        details: {
          existingClass: {
            name: enrollment.class_name,
            time: `${formatTime(enrollment.start_time)} - ${formatTime(enrollment.end_time)}`
          },
          newClass: {
            name: newClass.class_name,
            time: `${formatTime(newClass.start_time)} - ${formatTime(newClass.end_time)}`
          }
        }
      })
      continue // Don't mark as conflict if they're just back-to-back
    }

    // Check for time overlap
    const hasOverlap =
      (newStartMinutes >= enrollmentStartMinutes && newStartMinutes < enrollmentEndMinutes) || // New class starts during existing
      (newEndMinutes > enrollmentStartMinutes && newEndMinutes <= enrollmentEndMinutes) || // New class ends during existing
      (newStartMinutes <= enrollmentStartMinutes && newEndMinutes >= enrollmentEndMinutes) || // New class completely encompasses existing
      (newStartMinutes === enrollmentStartMinutes) // Classes start at same time

    if (hasOverlap) {
      conflicts.push({
        type: 'time_overlap',
        severity: 'error',
        message: `Schedule conflict with ${enrollment.class_name} on ${getDayName(enrollment.day_of_week)}`,
        conflictingClass: {
          id: enrollment.class_instance_id,
          name: enrollment.class_name,
          day_of_week: enrollment.day_of_week,
          start_time: enrollment.start_time,
          end_time: enrollment.end_time,
          teacher_name: enrollment.teacher_name
        },
        details: {
          existingTime: `${formatTime(enrollment.start_time)} - ${formatTime(enrollment.end_time)}`,
          newTime: `${formatTime(newClass.start_time)} - ${formatTime(newClass.end_time)}`
        }
      })
    }
  }

  // Warning for multiple classes on same day
  if (sameDayClasses.length >= 2) {
    warnings.push({
      type: 'same_day_multiple',
      message: `Student will have ${sameDayClasses.length + 1} classes on ${getDayName(newClass.day_of_week)}`,
      details: {
        dayOfWeek: getDayName(newClass.day_of_week),
        totalClasses: sameDayClasses.length + 1,
        classes: [...sameDayClasses.map(e => e.class_name), newClass.class_name]
      }
    })
  }

  // Warning if total classes exceeds recommended amount
  const totalActiveClasses = activeEnrollments.length
  const recommendedMaxClasses = 5 // Configurable threshold

  if (totalActiveClasses >= recommendedMaxClasses) {
    warnings.push({
      type: 'max_classes_exceeded',
      message: `Student will have ${totalActiveClasses + 1} active classes (recommended maximum: ${recommendedMaxClasses})`,
      details: {
        currentClasses: totalActiveClasses,
        afterEnrollment: totalActiveClasses + 1,
        recommended: recommendedMaxClasses
      }
    })
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    warnings
  }
}

/**
 * Check if student meets age requirements for a class
 */
export function checkAgeRequirements(
  studentAge: number,
  classAgeRange: { min_age?: number; max_age?: number }
): StudentScheduleConflict | null {
  const { min_age, max_age } = classAgeRange

  if (min_age && studentAge < min_age) {
    return {
      type: 'age_restriction',
      severity: 'error',
      message: `Student is too young for this class (minimum age: ${min_age})`,
      details: {
        studentAge,
        minAge: min_age,
        maxAge: max_age
      }
    }
  }

  if (max_age && studentAge > max_age) {
    return {
      type: 'age_restriction',
      severity: 'error',
      message: `Student is too old for this class (maximum age: ${max_age})`,
      details: {
        studentAge,
        minAge: min_age,
        maxAge: max_age
      }
    }
  }

  return null
}

/**
 * Check if class has capacity for new enrollment
 */
export function checkClassCapacity(
  currentEnrollments: number,
  maxStudents?: number
): { isFull: boolean; hasWaitlist: boolean; availableSpots: number } {
  if (!maxStudents) {
    return {
      isFull: false,
      hasWaitlist: false,
      availableSpots: Infinity
    }
  }

  const isFull = currentEnrollments >= maxStudents
  const availableSpots = Math.max(0, maxStudents - currentEnrollments)

  return {
    isFull,
    hasWaitlist: isFull,
    availableSpots
  }
}

/**
 * Comprehensive enrollment validation
 * Combines all checks for a complete validation result
 */
export async function validateEnrollmentRequest(params: {
  student: {
    id: string
    age: number
    currentEnrollments: StudentEnrollment[]
  }
  classDetails: {
    class_instance_id: string
    class_name: string
    day_of_week: number
    start_time: string
    end_time: string
    teacher_name?: string
    dance_style?: string
    min_age?: number
    max_age?: number
    max_students?: number
    current_enrollment_count: number
  }
}): Promise<{
  canEnroll: boolean
  requiresWaitlist: boolean
  conflicts: StudentScheduleConflict[]
  warnings: StudentScheduleWarning[]
}> {
  const { student, classDetails } = params
  const allConflicts: StudentScheduleConflict[] = []
  const allWarnings: StudentScheduleWarning[] = []

  // Check schedule conflicts
  const scheduleCheck = checkStudentScheduleConflicts(
    student.currentEnrollments,
    classDetails
  )
  allConflicts.push(...scheduleCheck.conflicts)
  allWarnings.push(...scheduleCheck.warnings)

  // Check age requirements
  const ageCheck = checkAgeRequirements(student.age, {
    min_age: classDetails.min_age,
    max_age: classDetails.max_age
  })
  if (ageCheck) {
    allConflicts.push(ageCheck)
  }

  // Check class capacity
  const capacityCheck = checkClassCapacity(
    classDetails.current_enrollment_count,
    classDetails.max_students
  )

  const requiresWaitlist = capacityCheck.isFull

  if (capacityCheck.isFull) {
    allWarnings.push({
      type: 'class_full' as any,
      message: `Class is full. Student will be added to waitlist.`,
      details: {
        maxStudents: classDetails.max_students,
        currentEnrollments: classDetails.current_enrollment_count
      }
    })
  }

  // Can enroll if no critical conflicts (even if going to waitlist)
  const canEnroll = allConflicts.length === 0

  return {
    canEnroll,
    requiresWaitlist,
    conflicts: allConflicts,
    warnings: allWarnings
  }
}

/**
 * Get student's weekly schedule summary
 */
export function getStudentWeeklySchedule(enrollments: StudentEnrollment[]) {
  const weeklySchedule: Record<number, StudentEnrollment[]> = {}

  // Group enrollments by day of week
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'active' && enrollment.status !== 'waitlist') {
      continue
    }

    if (!weeklySchedule[enrollment.day_of_week]) {
      weeklySchedule[enrollment.day_of_week] = []
    }
    weeklySchedule[enrollment.day_of_week].push(enrollment)
  }

  // Sort each day's classes by start time
  for (const day in weeklySchedule) {
    weeklySchedule[day].sort((a, b) => {
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    })
  }

  return weeklySchedule
}

/**
 * Helper Functions
 */

function formatTime(timeString: string): string {
  if (!timeString) return ''

  try {
    const date = new Date(`2000-01-01T${timeString}`)
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch (e) {
    return timeString
  }
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[dayOfWeek] || `Day ${dayOfWeek}`
}

/**
 * Format conflict details for display
 */
export function formatConflictMessage(conflict: StudentScheduleConflict): string {
  return conflict.message
}

/**
 * Format warning details for display
 */
export function formatWarningMessage(warning: StudentScheduleWarning): string {
  return warning.message
}

/**
 * Check if enrollment conflicts are blocking (vs. warnings)
 */
export function hasBlockingConflicts(conflicts: StudentScheduleConflict[]): boolean {
  return conflicts.some(conflict => conflict.severity === 'error')
}
