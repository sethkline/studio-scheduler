#!/usr/bin/env tsx

/**
 * Database Seeding Script
 *
 * Seeds the database with test data for development and testing.
 *
 * Usage:
 *   npm run seed        - Seed minimal test data
 *   npm run seed:full   - Seed comprehensive test data
 *
 * Environment:
 *   - Only runs in development (NODE_ENV=development)
 *   - Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 *
 * Safety:
 *   - Clears existing test data before seeding
 *   - Only deletes records with test email domains (@test.com)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import {
  studio,
  studioProfile,
  danceStyles,
  classLevels,
  studioLocations,
  studioRooms,
  adminUser,
  teachers,
  parentFamilies,
  classDefinitions,
  scheduleData,
  recitalSeries
} from './seedData'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  section: (msg: string) => console.log(`\n${colors.magenta}▸${colors.reset} ${msg}`)
}

// Parse command line arguments
const args = process.argv.slice(2)
const isFullSeed = args.includes('--full')

// Environment check
function checkEnvironment() {
  const nodeEnv = process.env.NODE_ENV

  if (nodeEnv !== 'development' && !args.includes('--force')) {
    log.error('This script can only run in development environment')
    log.info('Set NODE_ENV=development or use --force flag to override (not recommended)')
    process.exit(1)
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    log.error('Missing required environment variables')
    log.info('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  if (nodeEnv !== 'development') {
    log.warning('Running in non-development environment with --force flag')
  }
}

// Initialize Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Clear existing test data
async function clearTestData(supabase: ReturnType<typeof getSupabaseClient>) {
  log.section('Clearing existing test data...')

  try {
    // Delete in reverse dependency order to avoid foreign key violations

    // 1. Enrollments - get student IDs first
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .ilike('email', '%@test.com')

    if (students && students.length > 0) {
      const studentIds = students.map(s => s.id)
      const { error: enrollError } = await supabase
        .from('enrollments')
        .delete()
        .in('student_id', studentIds)
      if (enrollError && enrollError.code !== 'PGRST116') log.warning(`Enrollments: ${enrollError.message}`)
    }

    // 2. Schedule classes - get schedule IDs first
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id')
      .or('name.ilike.%Fall 2024%,name.ilike.%Test%')

    if (schedules && schedules.length > 0) {
      const scheduleIds = schedules.map(s => s.id)
      const { error: schedClassError } = await supabase
        .from('schedule_classes')
        .delete()
        .in('schedule_id', scheduleIds)
      if (schedClassError && schedClassError.code !== 'PGRST116') log.warning(`Schedule classes: ${schedClassError.message}`)
    }

    // 3. Schedules
    const { error: schedError } = await supabase
      .from('schedules')
      .delete()
      .or('name.ilike.%Fall 2024%,name.ilike.%Test%')
    if (schedError && schedError.code !== 'PGRST116') log.warning(`Schedules: ${schedError.message}`)

    // 4. Recital programs (depends on shows)
    const { error: programError } = await supabase
      .from('recital_programs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (programError && programError.code !== 'PGRST116') log.warning(`Recital programs: ${programError.message}`)

    // 5. Recital performances
    const { error: perfError } = await supabase
      .from('recital_performances')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (perfError && perfError.code !== 'PGRST116') log.warning(`Recital performances: ${perfError.message}`)

    // 6. Recital shows
    const { error: showError } = await supabase
      .from('recital_shows')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (showError && showError.code !== 'PGRST116') log.warning(`Recital shows: ${showError.message}`)

    // 7. Recital series
    const { error: seriesError } = await supabase
      .from('recital_series')
      .delete()
      .or('name.ilike.%Showcase%,name.ilike.%Test%')
    if (seriesError && seriesError.code !== 'PGRST116') log.warning(`Recital series: ${seriesError.message}`)

    // 8. Student-guardian relationships (reuse students from earlier)
    if (students && students.length > 0) {
      const studentIds = students.map(s => s.id)
      const { error: relError } = await supabase
        .from('student_guardian_relationships')
        .delete()
        .in('student_id', studentIds)
      if (relError && relError.code !== 'PGRST116') log.warning(`Student-guardian relationships: ${relError.message}`)
    }

    // 9. Students
    const { error: studentError } = await supabase
      .from('students')
      .delete()
      .ilike('email', '%@test.com')
    if (studentError && studentError.code !== 'PGRST116') log.warning(`Students: ${studentError.message}`)

    // 10. Guardians
    const { error: guardianError } = await supabase
      .from('guardians')
      .delete()
      .ilike('email', '%@test.com')
    if (guardianError && guardianError.code !== 'PGRST116') log.warning(`Guardians: ${guardianError.message}`)

    // 11. Teacher availability
    const { data: teacherList } = await supabase
      .from('teachers')
      .select('id')
      .ilike('email', '%@test.com')

    if (teacherList && teacherList.length > 0) {
      const teacherIds = teacherList.map(t => t.id)
      const { error: availError } = await supabase
        .from('teacher_availability')
        .delete()
        .in('teacher_id', teacherIds)
      if (availError && availError.code !== 'PGRST116') log.warning(`Teacher availability: ${availError.message}`)
    }

    // 12. Teachers
    const { error: teacherError } = await supabase
      .from('teachers')
      .delete()
      .ilike('email', '%@test.com')
    if (teacherError && teacherError.code !== 'PGRST116') log.warning(`Teachers: ${teacherError.message}`)

    // 13. Class instances
    const { error: instanceError } = await supabase
      .from('class_instances')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (instanceError && instanceError.code !== 'PGRST116') log.warning(`Class instances: ${instanceError.message}`)

    // 14. Class definitions
    const { error: defError } = await supabase
      .from('class_definitions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (defError && defError.code !== 'PGRST116') log.warning(`Class definitions: ${defError.message}`)

    // 15. Class levels
    const { error: levelError } = await supabase
      .from('class_levels')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (levelError && levelError.code !== 'PGRST116') log.warning(`Class levels: ${levelError.message}`)

    // 16. Dance styles
    const { error: styleError } = await supabase
      .from('dance_styles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (styleError && styleError.code !== 'PGRST116') log.warning(`Dance styles: ${styleError.message}`)

    // 17. Operating hours (depends on studio_locations)
    const { error: hoursError } = await supabase
      .from('operating_hours')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (hoursError && hoursError.code !== 'PGRST116') log.warning(`Operating hours: ${hoursError.message}`)

    // 18. Studio rooms
    const { error: roomError } = await supabase
      .from('studio_rooms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (roomError && roomError.code !== 'PGRST116') log.warning(`Studio rooms: ${roomError.message}`)

    // 19. Studio locations
    const { error: locationError } = await supabase
      .from('studio_locations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (locationError && locationError.code !== 'PGRST116') log.warning(`Studio locations: ${locationError.message}`)

    // 20. Studio profile
    const { error: studioProfileError } = await supabase
      .from('studio_profile')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (studioProfileError && studioProfileError.code !== 'PGRST116') log.warning(`Studio profile: ${studioProfileError.message}`)

    // 21. Studios (multi-tenant studio records)
    const { error: studiosError } = await supabase
      .from('studios')
      .delete()
      .ilike('slug', 'test-%')
    if (studiosError && studiosError.code !== 'PGRST116') log.warning(`Studios: ${studiosError.message}`)

    // 22. Auth users and profiles (test users only) - using admin API
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    if (authUsers?.users) {
      const testUserIds: string[] = []

      for (const user of authUsers.users) {
        if (user.email?.includes('@test.com')) {
          testUserIds.push(user.id)
        }
      }

      // Delete profiles for test users
      if (testUserIds.length > 0) {
        const { error: userProfileError } = await supabase
          .from('profiles')
          .delete()
          .in('id', testUserIds)
        if (userProfileError && userProfileError.code !== 'PGRST116') log.warning(`Profiles: ${userProfileError.message}`)

        // Delete auth users
        for (const userId of testUserIds) {
          await supabase.auth.admin.deleteUser(userId)
        }
      }
    }

    log.success('Test data cleared')
  } catch (error: any) {
    log.error(`Failed to clear test data: ${error.message}`)
    throw error
  }
}

// Create studio (multi-tenant record)
async function seedStudioRecord(supabase: ReturnType<typeof getSupabaseClient>) {
  log.section('Creating studio...')

  const { data: studioRecord, error: studioError } = await supabase
    .from('studios')
    .insert([studio])
    .select()
    .single()

  if (studioError) throw studioError
  log.success(`Studio: ${studioRecord.name} (${studioRecord.slug})`)

  return studioRecord
}

// Create studio profile and locations
async function seedStudioProfile(supabase: ReturnType<typeof getSupabaseClient>) {
  log.section('Creating studio profile and locations...')

  // Create studio profile
  const { data: studio, error: studioError } = await supabase
    .from('studio_profile')
    .insert([studioProfile])
    .select()
    .single()

  if (studioError) throw studioError
  log.success(`Studio profile: ${studio.name}`)

  // Create locations
  const locationsToCreate = isFullSeed ? studioLocations : [studioLocations[0]]
  const { data: locations, error: locationError } = await supabase
    .from('studio_locations')
    .insert(locationsToCreate)
    .select()

  if (locationError) throw locationError
  log.success(`Studio locations: ${locations.length} created`)

  // Create rooms for each location
  const roomsToCreate = isFullSeed ? studioRooms : studioRooms.slice(0, 3)
  const roomsWithLocationId = roomsToCreate.map((room, index) => ({
    ...room,
    location_id: locations[0].id, // Assign all rooms to first location
    is_active: true
  }))

  const { data: rooms, error: roomError } = await supabase
    .from('studio_rooms')
    .insert(roomsWithLocationId)
    .select()

  if (roomError) throw roomError
  log.success(`Studio rooms: ${rooms.length} created`)

  return { studio, locations, rooms }
}

// Create dance styles and class levels
async function seedClassMetadata(supabase: ReturnType<typeof getSupabaseClient>, studioId: string) {
  log.section('Creating dance styles and class levels...')

  const stylesWithStudioId = danceStyles.map(style => ({
    ...style,
    studio_id: studioId
  }))

  const { data: styles, error: styleError } = await supabase
    .from('dance_styles')
    .insert(stylesWithStudioId)
    .select()

  if (styleError) throw styleError
  log.success(`Dance styles: ${styles.length} created`)

  const levelsWithStudioId = classLevels.map(level => ({
    ...level,
    studio_id: studioId
  }))

  const { data: levels, error: levelError } = await supabase
    .from('class_levels')
    .insert(levelsWithStudioId)
    .select()

  if (levelError) throw levelError
  log.success(`Class levels: ${levels.length} created`)

  return { styles, levels }
}

// Create admin user
async function seedAdmin(supabase: ReturnType<typeof getSupabaseClient>) {
  log.section('Creating admin user...')

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminUser.email,
    password: adminUser.password,
    email_confirm: true,
    user_metadata: {
      first_name: adminUser.first_name,
      last_name: adminUser.last_name
    }
  })

  if (authError) throw authError

  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{
      id: authData.user.id,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name
    }])

  if (profileError) throw profileError
  log.success(`Admin user: ${adminUser.email} / ${adminUser.password}`)

  return authData.user
}

// Create teachers with availability
async function seedTeachers(supabase: ReturnType<typeof getSupabaseClient>, studioId: string) {
  log.section('Creating teachers...')

  const teachersToCreate = isFullSeed ? teachers : teachers.slice(0, 3)
  const createdTeachers = []

  for (const teacher of teachersToCreate) {
    // Create auth user for teacher
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: teacher.user.email,
      password: teacher.user.password,
      email_confirm: true,
      user_metadata: {
        first_name: teacher.first_name,
        last_name: teacher.last_name
      }
    })

    if (authError) {
      log.warning(`Failed to create auth for ${teacher.email}: ${authError.message}`)
      continue
    }

    // Create profile
    await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name
      }])

    // Create teacher record
    const { data: teacherRecord, error: teacherError } = await supabase
      .from('teachers')
      .insert([{
        studio_id: studioId,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        phone: teacher.phone,
        bio: teacher.bio,
        specialties: teacher.specialties,
        status: teacher.status
      }])
      .select()
      .single()

    if (teacherError) {
      log.warning(`Failed to create teacher ${teacher.first_name}: ${teacherError.message}`)
      continue
    }

    // Create availability
    const availabilityRecords = teacher.availability.map(avail => ({
      teacher_id: teacherRecord.id,
      ...avail
    }))

    await supabase
      .from('teacher_availability')
      .insert(availabilityRecords)

    createdTeachers.push(teacherRecord)
    log.success(`Teacher: ${teacher.first_name} ${teacher.last_name}`)
  }

  return createdTeachers
}

// Create parents and students
async function seedParentsAndStudents(supabase: ReturnType<typeof getSupabaseClient>, studioId: string) {
  log.section('Creating parents and students...')

  const familiesToCreate = isFullSeed ? parentFamilies : parentFamilies.slice(0, 2)
  const createdStudents = []

  for (const family of familiesToCreate) {
    // Create parent auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: family.parent.email,
      password: family.parent.password,
      email_confirm: true,
      user_metadata: {
        first_name: family.parent.first_name,
        last_name: family.parent.last_name
      }
    })

    if (authError) {
      log.warning(`Failed to create auth for ${family.parent.email}: ${authError.message}`)
      continue
    }

    // Create profile
    await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        first_name: family.parent.first_name,
        last_name: family.parent.last_name
      }])

    // Create guardian record
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .insert([{
        user_id: authData.user.id,
        first_name: family.parent.first_name,
        last_name: family.parent.last_name,
        email: family.parent.email,
        phone: family.parent.phone,
        address: family.parent.address,
        city: family.parent.city,
        state: family.parent.state,
        zip_code: family.parent.zip_code,
        emergency_contact: family.parent.emergency_contact,
        status: 'active'
      }])
      .select()
      .single()

    if (guardianError) {
      log.warning(`Failed to create guardian ${family.parent.first_name}: ${guardianError.message}`)
      continue
    }

    log.success(`Parent: ${family.parent.email} / ${family.parent.password}`)

    // Create students for this parent
    for (const student of family.students) {
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .insert([{
          studio_id: studioId,
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          email: student.email,
          phone: student.phone,
          allergies: student.allergies,
          medical_conditions: student.medical_conditions,
          medications: student.medications,
          emergency_contact_name: student.emergency_contact_name,
          emergency_contact_phone: student.emergency_contact_phone,
          emergency_contact_relationship: student.emergency_contact_relationship,
          costume_size_top: student.costume_size_top,
          costume_size_bottom: student.costume_size_bottom,
          shoe_size: student.shoe_size,
          height_inches: student.height_inches,
          notes: student.notes,
          status: student.status
        }])
        .select()
        .single()

      if (studentError) {
        log.warning(`Failed to create student ${student.first_name}: ${studentError.message}`)
        continue
      }

      // Create student-guardian relationship
      await supabase
        .from('student_guardian_relationships')
        .insert([{
          student_id: studentRecord.id,
          guardian_id: guardian.id,
          relationship: student.relationship,
          primary_contact: true,
          authorized_pickup: true,
          financial_responsibility: true,
          can_authorize_medical: true
        }])

      createdStudents.push(studentRecord)
      log.success(`  Student: ${student.first_name} ${student.last_name}`)
    }
  }

  return createdStudents
}

// Create class definitions and instances
async function seedClasses(
  supabase: ReturnType<typeof getSupabaseClient>,
  studioId: string,
  styles: any[],
  levels: any[],
  teachers: any[]
) {
  log.section('Creating class definitions and instances...')

  const defsToCreate = isFullSeed ? classDefinitions : classDefinitions.slice(0, 5)
  const createdInstances = []

  for (const classDef of defsToCreate) {
    // Find matching style and level
    const style = styles.find(s => s.name === classDef.style)
    const level = levels.find(l => l.name === classDef.level)

    // Create class definition
    const { data: definition, error: defError } = await supabase
      .from('class_definitions')
      .insert([{
        studio_id: studioId,
        name: classDef.name,
        dance_style_id: style?.id,
        class_level_id: level?.id,
        min_age: classDef.min_age,
        max_age: classDef.max_age,
        description: classDef.description,
        duration: classDef.duration,
        max_students: classDef.max_students
      }])
      .select()
      .single()

    if (defError) {
      log.warning(`Failed to create class definition ${classDef.name}: ${defError.message}`)
      continue
    }

    // Assign a teacher based on specialties
    const teacher = teachers.find(t =>
      t.specialties?.includes(classDef.style)
    ) || teachers[0]

    // Create class instance
    const { data: instance, error: instanceError } = await supabase
      .from('class_instances')
      .insert([{
        studio_id: studioId,
        class_definition_id: definition.id,
        name: classDef.name,
        teacher_id: teacher?.id,
        status: 'active'
      }])
      .select()
      .single()

    if (instanceError) {
      log.warning(`Failed to create class instance ${classDef.name}: ${instanceError.message}`)
      continue
    }

    createdInstances.push(instance)
    log.success(`Class: ${classDef.name}`)
  }

  return createdInstances
}

// Create schedule and enrollments (comprehensive mode only)
async function seedScheduleAndEnrollments(
  supabase: ReturnType<typeof getSupabaseClient>,
  instances: any[],
  students: any[]
) {
  if (!isFullSeed) return null

  log.section('Creating schedule and enrollments...')

  // Create schedule
  const { data: schedule, error: schedError } = await supabase
    .from('schedules')
    .insert([scheduleData])
    .select()
    .single()

  if (schedError) {
    log.warning(`Failed to create schedule: ${schedError.message}`)
    return null
  }
  log.success(`Schedule: ${schedule.name}`)

  // Create enrollments for students
  let enrollmentCount = 0
  for (const student of students) {
    // Enroll each student in 1-2 classes
    const classesToEnroll = instances.slice(0, Math.floor(Math.random() * 2) + 1)

    for (const classInstance of classesToEnroll) {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert([{
          student_id: student.id,
          class_instance_id: classInstance.id,
          status: 'active',
          enrollment_date: new Date().toISOString()
        }])

      if (!enrollError) enrollmentCount++
    }
  }

  log.success(`Enrollments: ${enrollmentCount} created`)
  return schedule
}

// Create recital series (comprehensive mode only)
async function seedRecitals(supabase: ReturnType<typeof getSupabaseClient>) {
  if (!isFullSeed) return null

  log.section('Creating recital series...')

  const { data: series, error: seriesError } = await supabase
    .from('recital_series')
    .insert([recitalSeries])
    .select()
    .single()

  if (seriesError) {
    log.warning(`Failed to create recital series: ${seriesError.message}`)
    return null
  }
  log.success(`Recital series: ${series.name}`)

  return series
}

// Main seeding function
async function seed() {
  log.header(`🌱 Dance Studio Database Seeding - ${isFullSeed ? 'COMPREHENSIVE' : 'MINIMAL'} Mode`)

  checkEnvironment()

  const supabase = getSupabaseClient()

  try {
    // Clear existing data
    await clearTestData(supabase)

    // Seed data
    const studioRecord = await seedStudioRecord(supabase)
    const { studio: studioProfileRecord, locations, rooms } = await seedStudioProfile(supabase)
    const { styles, levels } = await seedClassMetadata(supabase, studioRecord.id)
    const admin = await seedAdmin(supabase)
    const teacherList = await seedTeachers(supabase, studioRecord.id)
    const studentList = await seedParentsAndStudents(supabase, studioRecord.id)
    const classList = await seedClasses(supabase, studioRecord.id, styles, levels, teacherList)
    const schedule = await seedScheduleAndEnrollments(supabase, classList, studentList)
    const recital = await seedRecitals(supabase)

    // Summary
    log.header('✨ Seeding Complete!')
    console.log('\n' + colors.bright + 'Summary:' + colors.reset)
    console.log(`  Studio Profile: 1`)
    console.log(`  Locations: ${locations.length}`)
    console.log(`  Rooms: ${rooms.length}`)
    console.log(`  Dance Styles: ${styles.length}`)
    console.log(`  Class Levels: ${levels.length}`)
    console.log(`  Teachers: ${teacherList.length}`)
    console.log(`  Parents: ${isFullSeed ? 4 : 2}`)
    console.log(`  Students: ${studentList.length}`)
    console.log(`  Classes: ${classList.length}`)
    if (isFullSeed) {
      console.log(`  Schedules: 1`)
      console.log(`  Recital Series: 1`)
    }

    console.log('\n' + colors.bright + 'Test Login Credentials:' + colors.reset)
    console.log(`  ${colors.cyan}Admin:${colors.reset} admin@test.com / password123`)
    console.log(`  ${colors.cyan}Teachers:${colors.reset} [firstname].[lastname]@test.com / password123`)
    console.log(`  ${colors.cyan}Parents:${colors.reset} [firstname].[lastname]@test.com / password123`)
    console.log('')

  } catch (error: any) {
    log.error(`Seeding failed: ${error.message}`)
    console.error(error)
    process.exit(1)
  }
}

// Run the seed
seed()
