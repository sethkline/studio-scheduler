/**
 * Script to run the trial registrations and contact inquiries migration
 *
 * Usage:
 *   node scripts/run-trial-contact-migration.js
 *
 * Requirements:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_KEY environment variable
 *
 * This script will:
 *   1. Connect to your Supabase database
 *   2. Create the trial_registrations table
 *   3. Create the contact_inquiries table
 *   4. Set up RLS policies
 *   5. Create necessary indexes
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  // Load environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing environment variables')
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  console.log('🔌 Connecting to Supabase...')
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Read the SQL migration file
  const sqlPath = resolve(__dirname, '../docs/database/trial-and-contact-tables.sql')
  console.log(`📖 Reading migration file: ${sqlPath}`)

  let sqlContent
  try {
    sqlContent = readFileSync(sqlPath, 'utf-8')
  } catch (error) {
    console.error('❌ Error reading SQL file:', error.message)
    process.exit(1)
  }

  // Split SQL into individual statements (rough split by semicolons)
  // Note: This is a simple split and may not work for complex SQL
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements to execute`)
  console.log('🚀 Running migration...\n')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ')

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        // Try direct execution if RPC fails
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql: statement }),
        })

        if (!response.ok) {
          console.error(`❌ Statement ${i + 1} failed: ${preview}...`)
          console.error(`   Error: ${error.message || 'Unknown error'}`)
          errorCount++
        } else {
          console.log(`✅ Statement ${i + 1}: ${preview}...`)
          successCount++
        }
      } else {
        console.log(`✅ Statement ${i + 1}: ${preview}...`)
        successCount++
      }
    } catch (error) {
      console.error(`❌ Statement ${i + 1} failed: ${preview}...`)
      console.error(`   Error: ${error.message}`)
      errorCount++
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Test the /api/register/trial endpoint')
    console.log('2. Test the /api/contact endpoint')
    console.log('3. Check the Supabase dashboard to verify tables were created')
  } else {
    console.log('\n⚠️  Migration completed with errors')
    console.log('Please check the errors above and run the migration manually in Supabase SQL Editor')
    console.log(`SQL file location: ${sqlPath}`)
    process.exit(1)
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
