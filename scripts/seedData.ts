/**
 * Test data templates for seeding the database
 */

export const studio = {
  name: 'Test Dance Academy',
  slug: 'test-dance-academy',
  tagline: 'Where Dreams Take Flight',
  description: 'A premier dance studio offering classes in Ballet, Jazz, Hip Hop, and more.',
  email: 'info@testdanceacademy.com',
  phone: '(555) 123-4567',
  website: 'https://testdanceacademy.com',
  address: '123 Dance Street',
  city: 'Los Angeles',
  state: 'CA',
  zip_code: '90001',
  country: 'US',
  subscription_tier: 'professional' as const,
  subscription_status: 'active' as const,
  timezone: 'America/Los_Angeles',
  locale: 'en-US',
  currency: 'USD',
  features: {},
  settings: {}
}

export const studioProfile = {
  name: 'Test Dance Academy',
  description: 'A premier dance studio offering classes in Ballet, Jazz, Hip Hop, and more.',
  email: 'info@testdanceacademy.com',
  phone: '(555) 123-4567',
  website: 'https://testdanceacademy.com',
  address: '123 Dance Street',
  city: 'Los Angeles',
  state: 'CA',
  postal_code: '90001',
  country: 'USA',
  tax_id: '12-3456789',
  social_media: {
    facebook: 'https://facebook.com/testdanceacademy',
    instagram: 'https://instagram.com/testdanceacademy',
    twitter: 'https://twitter.com/testdanceacademy'
  }
}

export const danceStyles = [
  { name: 'Ballet', color: '#FFB6C1', description: 'Classical ballet technique and performance' },
  { name: 'Jazz', color: '#FF6B9D', description: 'High-energy jazz dance and choreography' },
  { name: 'Hip Hop', color: '#4ECDC4', description: 'Urban street dance and hip hop styles' },
  { name: 'Tap', color: '#95E1D3', description: 'Rhythmic tap dancing and percussion' },
  { name: 'Contemporary', color: '#C7CEEA', description: 'Modern contemporary dance expression' }
]

export const classLevels = [
  { name: 'Beginner', min_age: 3, max_age: 6, description: 'Introduction to dance fundamentals' },
  { name: 'Intermediate', min_age: 7, max_age: 12, description: 'Building on basic skills' },
  { name: 'Advanced', min_age: 13, max_age: 17, description: 'Advanced technique and performance' },
  { name: 'Pre-Professional', min_age: 16, max_age: null, description: 'College prep and professional training' }
]

export const studioLocations = [
  {
    name: 'Main Studio',
    address: '123 Dance Street',
    city: 'Los Angeles',
    state: 'CA',
    postal_code: '90001',
    country: 'USA',
    phone: '(555) 123-4567',
    email: 'main@testdanceacademy.com',
    description: 'Our primary location with state-of-the-art facilities',
    capacity: 100,
    is_active: true
  },
  {
    name: 'Westside Studio',
    address: '456 Arts Avenue',
    city: 'Santa Monica',
    state: 'CA',
    postal_code: '90401',
    country: 'USA',
    phone: '(555) 234-5678',
    email: 'westside@testdanceacademy.com',
    description: 'Convenient westside location',
    capacity: 75,
    is_active: true
  },
  {
    name: 'Valley Studio',
    address: '789 Performance Parkway',
    city: 'Sherman Oaks',
    state: 'CA',
    postal_code: '91403',
    country: 'USA',
    phone: '(555) 345-6789',
    email: 'valley@testdanceacademy.com',
    description: 'Valley location with ample parking',
    capacity: 80,
    is_active: true
  }
]

export const studioRooms = [
  { name: 'Studio A', description: 'Large studio with mirrors and ballet barres', capacity: 30, area_sqft: 1200, features: ['Mirrors', 'Ballet Barres', 'Sound System', 'Air Conditioning'] },
  { name: 'Studio B', description: 'Medium studio perfect for smaller classes', capacity: 20, area_sqft: 800, features: ['Mirrors', 'Ballet Barres', 'Sound System'] },
  { name: 'Rehearsal Studio', description: 'Spacious rehearsal space for performances', capacity: 40, area_sqft: 1500, features: ['Mirrors', 'Ballet Barres', 'Sound System', 'Stage Area', 'Air Conditioning'] }
]

export const adminUser = {
  email: 'admin@test.com',
  password: 'password123',
  first_name: 'Studio',
  last_name: 'Admin',
  phone: '(555) 100-0000',
  user_role: 'admin' as const,
  status: 'active' as const
}

export const teachers = [
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@test.com',
    phone: '(555) 200-0001',
    bio: 'Professional ballet dancer with 15 years of teaching experience. Trained at the Royal Ballet School.',
    specialties: ['Ballet', 'Contemporary'],
    status: 'active' as const,
    availability: [
      { day_of_week: 1, start_time: '09:00', end_time: '17:00', recurring: true, is_available: true },
      { day_of_week: 2, start_time: '09:00', end_time: '17:00', recurring: true, is_available: true },
      { day_of_week: 3, start_time: '09:00', end_time: '17:00', recurring: true, is_available: true },
      { day_of_week: 4, start_time: '09:00', end_time: '17:00', recurring: true, is_available: true }
    ],
    user: {
      email: 'sarah.johnson@test.com',
      password: 'password123',
      user_role: 'teacher' as const
    }
  },
  {
    first_name: 'Marcus',
    last_name: 'Williams',
    email: 'marcus.williams@test.com',
    phone: '(555) 200-0002',
    bio: 'Hip hop choreographer and instructor. Featured in music videos and dance competitions.',
    specialties: ['Hip Hop', 'Jazz'],
    status: 'active' as const,
    availability: [
      { day_of_week: 1, start_time: '14:00', end_time: '21:00', recurring: true, is_available: true },
      { day_of_week: 3, start_time: '14:00', end_time: '21:00', recurring: true, is_available: true },
      { day_of_week: 5, start_time: '14:00', end_time: '21:00', recurring: true, is_available: true }
    ],
    user: {
      email: 'marcus.williams@test.com',
      password: 'password123',
      user_role: 'teacher' as const
    }
  },
  {
    first_name: 'Emily',
    last_name: 'Chen',
    email: 'emily.chen@test.com',
    phone: '(555) 200-0003',
    bio: 'Award-winning tap dancer and instructor. Specializes in rhythm tap and musical theater.',
    specialties: ['Tap', 'Jazz'],
    status: 'active' as const,
    availability: [
      { day_of_week: 2, start_time: '10:00', end_time: '18:00', recurring: true, is_available: true },
      { day_of_week: 4, start_time: '10:00', end_time: '18:00', recurring: true, is_available: true },
      { day_of_week: 6, start_time: '09:00', end_time: '15:00', recurring: true, is_available: true }
    ],
    user: {
      email: 'emily.chen@test.com',
      password: 'password123',
      user_role: 'teacher' as const
    }
  },
  {
    first_name: 'David',
    last_name: 'Martinez',
    email: 'david.martinez@test.com',
    phone: '(555) 200-0004',
    bio: 'Contemporary dance artist with international performance experience.',
    specialties: ['Contemporary', 'Ballet'],
    status: 'active' as const,
    availability: [
      { day_of_week: 1, start_time: '10:00', end_time: '16:00', recurring: true, is_available: true },
      { day_of_week: 3, start_time: '10:00', end_time: '16:00', recurring: true, is_available: true },
      { day_of_week: 5, start_time: '10:00', end_time: '16:00', recurring: true, is_available: true }
    ],
    user: {
      email: 'david.martinez@test.com',
      password: 'password123',
      user_role: 'teacher' as const
    }
  },
  {
    first_name: 'Lisa',
    last_name: 'Thompson',
    email: 'lisa.thompson@test.com',
    phone: '(555) 200-0005',
    bio: 'Versatile instructor specializing in jazz and musical theater dance.',
    specialties: ['Jazz', 'Tap'],
    status: 'active' as const,
    availability: [
      { day_of_week: 0, start_time: '10:00', end_time: '16:00', recurring: true, is_available: true },
      { day_of_week: 2, start_time: '15:00', end_time: '20:00', recurring: true, is_available: true },
      { day_of_week: 4, start_time: '15:00', end_time: '20:00', recurring: true, is_available: true }
    ],
    user: {
      email: 'lisa.thompson@test.com',
      password: 'password123',
      user_role: 'teacher' as const
    }
  }
]

export const parentFamilies = [
  {
    parent: {
      first_name: 'Jennifer',
      last_name: 'Smith',
      email: 'jennifer.smith@test.com',
      password: 'password123',
      phone: '(555) 300-0001',
      address: '456 Oak Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90012',
      user_role: 'parent' as const,
      emergency_contact: true
    },
    students: [
      {
        first_name: 'Emma',
        last_name: 'Smith',
        date_of_birth: '2014-05-15',
        gender: 'female' as const,
        email: 'emma.smith@test.com',
        phone: '(555) 300-0001',
        allergies: 'None',
        medical_conditions: '',
        emergency_contact_name: 'Jennifer Smith',
        emergency_contact_phone: '(555) 300-0001',
        emergency_contact_relationship: 'Mother',
        costume_size_top: 'Child M',
        costume_size_bottom: 'Child M',
        shoe_size: '4',
        height_inches: 52,
        notes: 'Very enthusiastic about ballet',
        status: 'active' as const,
        relationship: 'parent' as const
      },
      {
        first_name: 'Olivia',
        last_name: 'Smith',
        date_of_birth: '2016-08-22',
        gender: 'female' as const,
        email: 'olivia.smith@test.com',
        phone: '(555) 300-0001',
        allergies: 'Peanuts',
        medical_conditions: 'Mild asthma',
        medications: 'Albuterol inhaler as needed',
        emergency_contact_name: 'Jennifer Smith',
        emergency_contact_phone: '(555) 300-0001',
        emergency_contact_relationship: 'Mother',
        costume_size_top: 'Child S',
        costume_size_bottom: 'Child S',
        shoe_size: '2',
        height_inches: 45,
        notes: 'Loves tap dancing',
        status: 'active' as const,
        relationship: 'parent' as const
      }
    ]
  },
  {
    parent: {
      first_name: 'Michael',
      last_name: 'Rodriguez',
      email: 'michael.rodriguez@test.com',
      password: 'password123',
      phone: '(555) 300-0002',
      address: '789 Maple Drive',
      city: 'Santa Monica',
      state: 'CA',
      zip_code: '90405',
      user_role: 'parent' as const,
      emergency_contact: true
    },
    students: [
      {
        first_name: 'Sofia',
        last_name: 'Rodriguez',
        date_of_birth: '2013-03-10',
        gender: 'female' as const,
        email: 'sofia.rodriguez@test.com',
        phone: '(555) 300-0002',
        allergies: '',
        medical_conditions: '',
        emergency_contact_name: 'Michael Rodriguez',
        emergency_contact_phone: '(555) 300-0002',
        emergency_contact_relationship: 'Father',
        costume_size_top: 'Child L',
        costume_size_bottom: 'Child L',
        shoe_size: '5',
        height_inches: 58,
        notes: 'Advanced level, interested in contemporary',
        status: 'active' as const,
        relationship: 'parent' as const
      }
    ]
  },
  {
    parent: {
      first_name: 'Amanda',
      last_name: 'Taylor',
      email: 'amanda.taylor@test.com',
      password: 'password123',
      phone: '(555) 300-0003',
      address: '321 Pine Street',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90028',
      user_role: 'parent' as const,
      emergency_contact: true
    },
    students: [
      {
        first_name: 'Ethan',
        last_name: 'Taylor',
        date_of_birth: '2015-11-05',
        gender: 'male' as const,
        email: 'ethan.taylor@test.com',
        phone: '(555) 300-0003',
        allergies: '',
        medical_conditions: '',
        emergency_contact_name: 'Amanda Taylor',
        emergency_contact_phone: '(555) 300-0003',
        emergency_contact_relationship: 'Mother',
        costume_size_top: 'Child M',
        costume_size_bottom: 'Child M',
        shoe_size: '3',
        height_inches: 48,
        notes: 'Enjoys hip hop classes',
        status: 'active' as const,
        relationship: 'parent' as const
      }
    ]
  },
  {
    parent: {
      first_name: 'Robert',
      last_name: 'Anderson',
      email: 'robert.anderson@test.com',
      password: 'password123',
      phone: '(555) 300-0004',
      address: '654 Elm Boulevard',
      city: 'Sherman Oaks',
      state: 'CA',
      zip_code: '91423',
      user_role: 'parent' as const,
      emergency_contact: true
    },
    students: [
      {
        first_name: 'Mia',
        last_name: 'Anderson',
        date_of_birth: '2012-07-18',
        gender: 'female' as const,
        email: 'mia.anderson@test.com',
        phone: '(555) 300-0004',
        allergies: 'Latex',
        medical_conditions: '',
        emergency_contact_name: 'Robert Anderson',
        emergency_contact_phone: '(555) 300-0004',
        emergency_contact_relationship: 'Father',
        costume_size_top: 'Adult XS',
        costume_size_bottom: 'Adult XS',
        shoe_size: '6',
        height_inches: 60,
        notes: 'Pre-professional level, considering dance career',
        status: 'active' as const,
        relationship: 'parent' as const
      },
      {
        first_name: 'Ava',
        last_name: 'Anderson',
        date_of_birth: '2014-09-30',
        gender: 'female' as const,
        email: 'ava.anderson@test.com',
        phone: '(555) 300-0004',
        allergies: '',
        medical_conditions: '',
        emergency_contact_name: 'Robert Anderson',
        emergency_contact_phone: '(555) 300-0004',
        emergency_contact_relationship: 'Father',
        costume_size_top: 'Child M',
        costume_size_bottom: 'Child M',
        shoe_size: '4',
        height_inches: 54,
        notes: 'Loves ballet and jazz',
        status: 'active' as const,
        relationship: 'parent' as const
      }
    ]
  }
]

export const classDefinitions = [
  { name: 'Beginner Ballet', style: 'Ballet', level: 'Beginner', min_age: 4, max_age: 7, description: 'Introduction to classical ballet for young dancers', duration: 45, max_students: 12 },
  { name: 'Intermediate Jazz', style: 'Jazz', level: 'Intermediate', min_age: 8, max_age: 12, description: 'Energetic jazz technique and choreography', duration: 60, max_students: 15 },
  { name: 'Hip Hop Fundamentals', style: 'Hip Hop', level: 'Beginner', min_age: 7, max_age: 12, description: 'Learn basic hip hop moves and street dance', duration: 60, max_students: 20 },
  { name: 'Advanced Contemporary', style: 'Contemporary', level: 'Advanced', min_age: 13, max_age: 18, description: 'Advanced contemporary dance technique and expression', duration: 90, max_students: 12 },
  { name: 'Tap Dance Basics', style: 'Tap', level: 'Beginner', min_age: 6, max_age: 10, description: 'Rhythm and percussion through tap dancing', duration: 45, max_students: 15 },
  { name: 'Pre-Professional Ballet', style: 'Ballet', level: 'Pre-Professional', min_age: 14, max_age: null, description: 'Intensive ballet training for serious dancers', duration: 90, max_students: 10 },
  { name: 'Teen Hip Hop', style: 'Hip Hop', level: 'Intermediate', min_age: 13, max_age: 17, description: 'Contemporary urban dance styles for teens', duration: 60, max_students: 18 },
  { name: 'Intermediate Tap', style: 'Tap', level: 'Intermediate', min_age: 9, max_age: 14, description: 'Building tap technique and musicality', duration: 60, max_students: 12 }
]

export const scheduleData = {
  name: 'Fall 2024 Season',
  description: 'Fall season classes September through December',
  start_date: '2024-09-01',
  end_date: '2024-12-20',
  is_active: true
}

export const recitalSeries = {
  name: 'Annual Winter Showcase 2024',
  description: 'Our annual winter performance featuring all student levels',
  start_date: '2024-12-14',
  end_date: '2024-12-15',
  venue_name: 'Test Dance Academy Main Studio',
  venue_address: '123 Dance Street, Los Angeles, CA 90001',
  is_active: true
}
