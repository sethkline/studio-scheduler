// types/auth.ts

/**
 * User roles in the dance studio system
 * - admin: Studio owner/director with full access
 * - staff: Front desk staff with limited admin access
 * - teacher: Dance instructors who manage their classes
 * - parent: Parent/guardian with access to their children's info
 * - student: Students with limited self-service access
 */
export type UserRole = 'admin' | 'staff' | 'teacher' | 'parent' | 'student'

/**
 * User profile with role information
 */
export interface UserProfile {
  id: string
  user_id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  user_role: UserRole
  status: 'active' | 'inactive'
  bio?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

/**
 * Permission groups for different features
 */
export interface Permissions {
  // Studio Management
  canManageStudioProfile: boolean
  canManageLocations: boolean
  canManageSettings: boolean

  // Class Management
  canManageClassDefinitions: boolean
  canManageDanceStyles: boolean
  canManageClassLevels: boolean
  canViewAllClasses: boolean
  canManageOwnClasses: boolean

  // Schedule Management
  canManageSchedules: boolean
  canViewSchedule: boolean
  canBuildSchedule: boolean

  // People Management
  canManageStudents: boolean
  canViewAllStudents: boolean
  canViewOwnStudents: boolean
  canManageTeachers: boolean
  canManageParents: boolean

  // Recital Management
  canManageRecitals: boolean
  canViewRecitals: boolean
  canManagePrograms: boolean
  canManageCostumes: boolean
  canViewCostumes: boolean
  canManageVolunteers: boolean
  canSignUpVolunteer: boolean

  // Ticket & Media
  canManageTickets: boolean
  canPurchaseTickets: boolean
  canManageMedia: boolean
  canPurchaseMedia: boolean
  canViewOwnPurchases: boolean

  // Financial
  canViewReports: boolean
  canManagePayments: boolean
  canViewOwnPayments: boolean

  // User Management
  canManageUsers: boolean
  canManageRoles: boolean

  // Lesson Planning
  canManageLessonPlans: boolean
  canViewAllLessonPlans: boolean
  canManageLearningObjectives: boolean
  canViewLearningObjectives: boolean
  canManageLessonTemplates: boolean
  canViewAllLessonTemplates: boolean
  canShareLessonPlans: boolean
  canTrackStudentProgress: boolean
}

/**
 * Default permissions for each role
 */
export const RolePermissions: Record<UserRole, Permissions> = {
  admin: {
    // Studio Management
    canManageStudioProfile: true,
    canManageLocations: true,
    canManageSettings: true,

    // Class Management
    canManageClassDefinitions: true,
    canManageDanceStyles: true,
    canManageClassLevels: true,
    canViewAllClasses: true,
    canManageOwnClasses: true,

    // Schedule Management
    canManageSchedules: true,
    canViewSchedule: true,
    canBuildSchedule: true,

    // People Management
    canManageStudents: true,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canManageTeachers: true,
    canManageParents: true,

    // Recital Management
    canManageRecitals: true,
    canViewRecitals: true,
    canManagePrograms: true,
    canManageCostumes: true,
    canViewCostumes: true,
    canManageVolunteers: true,
    canSignUpVolunteer: true,

    // Ticket & Media
    canManageTickets: true,
    canPurchaseTickets: true,
    canManageMedia: true,
    canPurchaseMedia: true,
    canViewOwnPurchases: true,

    // Financial
    canViewReports: true,
    canManagePayments: true,
    canViewOwnPayments: true,

    // User Management
    canManageUsers: true,
    canManageRoles: true,

    // Lesson Planning
    canManageLessonPlans: true,
    canViewAllLessonPlans: true,
    canManageLearningObjectives: true,
    canViewLearningObjectives: true,
    canManageLessonTemplates: true,
    canViewAllLessonTemplates: true,
    canShareLessonPlans: true,
    canTrackStudentProgress: true,
  },

  staff: {
    // Studio Management
    canManageStudioProfile: false,
    canManageLocations: false,
    canManageSettings: false,

    // Class Management
    canManageClassDefinitions: true,
    canManageDanceStyles: true,
    canManageClassLevels: true,
    canViewAllClasses: true,
    canManageOwnClasses: true,

    // Schedule Management
    canManageSchedules: true,
    canViewSchedule: true,
    canBuildSchedule: true,

    // People Management
    canManageStudents: true,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canManageTeachers: false,
    canManageParents: true,

    // Recital Management
    canManageRecitals: true,
    canViewRecitals: true,
    canManagePrograms: true,
    canManageCostumes: true,
    canViewCostumes: true,
    canManageVolunteers: true,
    canSignUpVolunteer: true,

    // Ticket & Media
    canManageTickets: true,
    canPurchaseTickets: true,
    canManageMedia: false,
    canPurchaseMedia: true,
    canViewOwnPurchases: true,

    // Financial
    canViewReports: false,
    canManagePayments: true,
    canViewOwnPayments: true,

    // User Management
    canManageUsers: false,
    canManageRoles: false,

    // Lesson Planning
    canManageLessonPlans: true,
    canViewAllLessonPlans: true,
    canManageLearningObjectives: true,
    canViewLearningObjectives: true,
    canManageLessonTemplates: true,
    canViewAllLessonTemplates: true,
    canShareLessonPlans: true,
    canTrackStudentProgress: true,
  },

  teacher: {
    // Studio Management
    canManageStudioProfile: false,
    canManageLocations: false,
    canManageSettings: false,

    // Class Management
    canManageClassDefinitions: false,
    canManageDanceStyles: false,
    canManageClassLevels: false,
    canViewAllClasses: true,
    canManageOwnClasses: true,

    // Schedule Management
    canManageSchedules: false,
    canViewSchedule: true,
    canBuildSchedule: false,

    // People Management
    canManageStudents: false,
    canViewAllStudents: true,
    canViewOwnStudents: true,
    canManageTeachers: false,
    canManageParents: false,

    // Recital Management
    canManageRecitals: false,
    canViewRecitals: true,
    canManagePrograms: false,
    canManageCostumes: true,
    canViewCostumes: true,
    canManageVolunteers: false,
    canSignUpVolunteer: true,

    // Ticket & Media
    canManageTickets: false,
    canPurchaseTickets: true,
    canManageMedia: false,
    canPurchaseMedia: true,
    canViewOwnPurchases: true,

    // Financial
    canViewReports: false,
    canManagePayments: false,
    canViewOwnPayments: true,

    // User Management
    canManageUsers: false,
    canManageRoles: false,

    // Lesson Planning
    canManageLessonPlans: true, // Can manage own lesson plans
    canViewAllLessonPlans: false, // Cannot view other teachers' plans
    canManageLearningObjectives: false, // Cannot create curriculum objectives
    canViewLearningObjectives: true, // Can view objectives
    canManageLessonTemplates: true, // Can manage own templates
    canViewAllLessonTemplates: true, // Can view all public templates
    canShareLessonPlans: true, // Can share with assistants
    canTrackStudentProgress: true, // Can track progress for own students
  },

  parent: {
    // Studio Management
    canManageStudioProfile: false,
    canManageLocations: false,
    canManageSettings: false,

    // Class Management
    canManageClassDefinitions: false,
    canManageDanceStyles: false,
    canManageClassLevels: false,
    canViewAllClasses: true,
    canManageOwnClasses: false,

    // Schedule Management
    canManageSchedules: false,
    canViewSchedule: true,
    canBuildSchedule: false,

    // People Management
    canManageStudents: false,
    canViewAllStudents: false,
    canViewOwnStudents: true,
    canManageTeachers: false,
    canManageParents: false,

    // Recital Management
    canManageRecitals: false,
    canViewRecitals: true,
    canManagePrograms: false,
    canManageCostumes: false,
    canViewCostumes: true,
    canManageVolunteers: false,
    canSignUpVolunteer: true,

    // Ticket & Media
    canManageTickets: false,
    canPurchaseTickets: true,
    canManageMedia: false,
    canPurchaseMedia: true,
    canViewOwnPurchases: true,

    // Financial
    canViewReports: false,
    canManagePayments: false,
    canViewOwnPayments: true,

    // User Management
    canManageUsers: false,
    canManageRoles: false,

    // Lesson Planning
    canManageLessonPlans: false,
    canViewAllLessonPlans: false,
    canManageLearningObjectives: false,
    canViewLearningObjectives: false,
    canManageLessonTemplates: false,
    canViewAllLessonTemplates: false,
    canShareLessonPlans: false,
    canTrackStudentProgress: false,
  },

  student: {
    // Studio Management
    canManageStudioProfile: false,
    canManageLocations: false,
    canManageSettings: false,

    // Class Management
    canManageClassDefinitions: false,
    canManageDanceStyles: false,
    canManageClassLevels: false,
    canViewAllClasses: true,
    canManageOwnClasses: false,

    // Schedule Management
    canManageSchedules: false,
    canViewSchedule: true,
    canBuildSchedule: false,

    // People Management
    canManageStudents: false,
    canViewAllStudents: false,
    canViewOwnStudents: true,
    canManageTeachers: false,
    canManageParents: false,

    // Recital Management
    canManageRecitals: false,
    canViewRecitals: true,
    canManagePrograms: false,
    canManageCostumes: false,
    canViewCostumes: true,
    canManageVolunteers: false,
    canSignUpVolunteer: false,

    // Ticket & Media
    canManageTickets: false,
    canPurchaseTickets: false,
    canManageMedia: false,
    canPurchaseMedia: false,
    canViewOwnPurchases: true,

    // Financial
    canViewReports: false,
    canManagePayments: false,
    canViewOwnPayments: true,

    // User Management
    canManageUsers: false,
    canManageRoles: false,

    // Lesson Planning
    canManageLessonPlans: false,
    canViewAllLessonPlans: false,
    canManageLearningObjectives: false,
    canViewLearningObjectives: false,
    canManageLessonTemplates: false,
    canViewAllLessonTemplates: false,
    canShareLessonPlans: false,
    canTrackStudentProgress: false,
  },
}

/**
 * Helper function to get permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permissions {
  return RolePermissions[role]
}

/**
 * Helper function to check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole, permission: keyof Permissions): boolean {
  return RolePermissions[role][permission]
}

/**
 * Helper function to check if user has any of the specified roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole)
}
