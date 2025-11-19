#!/usr/bin/env node

/**
 * Migration script to refactor Supabase authentication
 *
 * This script updates all API handlers to:
 * 1. Use user-scoped Supabase clients by default
 * 2. Add proper authentication/authorization checks
 * 3. Only use service role client when explicitly needed
 */

const fs = require('fs');
const path = require('path');

// Configuration for different endpoint categories
const AUTH_PATTERNS = {
  // Public endpoints - no auth required, use service client for public data only
  public: {
    patterns: [
      '/api/public/',
      '/api/config/',
      '/api/newsletter/subscribe',
      '/api/blog/',
      '/api/marketing/classes/',
      '/api/webhooks/',
      '/api/cron/',
    ],
    transformation: (content) => {
      // Public endpoints can keep service client but add comment explaining why
      if (!content.includes('// Public endpoint')) {
        const lines = content.split('\n');
        const importIndex = lines.findIndex(line => line.includes('export default defineEventHandler'));
        if (importIndex !== -1) {
          lines.splice(importIndex, 0, '// Public endpoint - uses service client for public data queries only');
        }
        content = lines.join('\n');
      }

      // Replace getSupabaseClient with getServiceSupabaseClient for clarity
      content = content.replace(
        /const client = getSupabaseClient\(\)/g,
        '// Service client OK here - public endpoint querying public data only\n  const client = getServiceSupabaseClient()'
      );

      return content;
    }
  },

  // Admin-only endpoints
  admin: {
    patterns: [
      '/api/admin/',
      '/api/users/',
      '/api/studio/',
      '/api/venues/',
      '/api/email-campaigns',
      '/api/email-templates',
    ],
    authCheck: 'await requireAdmin(event)',
    transformation: (content) => {
      return addAuthCheckAndUserClient(content, 'requireAdmin');
    }
  },

  // Admin or Staff endpoints
  staff: {
    patterns: [
      '/api/students/',
      '/api/teachers/',
      '/api/classes/',
      '/api/class-definitions/',
      '/api/class-instances/',
      '/api/class-levels/',
      '/api/schedules/',
      '/api/schedule-classes/',
      '/api/dance-styles/',
      '/api/recitals/',
      '/api/recital-series/',
      '/api/recital-shows/',
      '/api/recital-tasks/',
      '/api/shows/',
      '/api/rehearsals/',
      '/api/attendance/',
      '/api/absences/',
      '/api/costumes/',
      '/api/fees/',
      '/api/fee-types/',
      '/api/student-fees/',
      '/api/email/',
      '/api/media/',
      '/api/media-albums/',
      '/api/media-items/',
      '/api/volunteers/',
      '/api/volunteer-shifts/',
      '/api/tasks/',
    ],
    authCheck: 'await requireAdminOrStaff(event)',
    transformation: (content) => {
      return addAuthCheckAndUserClient(content, 'requireAdminOrStaff');
    }
  },

  // Parent portal endpoints
  parent: {
    patterns: [
      '/api/parent/',
    ],
    authCheck: 'await requireRole(event, [\'parent\', \'admin\', \'staff\'])',
    transformation: (content) => {
      return addAuthCheckAndUserClient(content, 'requireRole', ['parent', 'admin', 'staff']);
    }
  },

  // Authenticated user endpoints (any role)
  authenticated: {
    patterns: [
      '/api/dashboard/',
      '/api/orders/',
      '/api/tickets/',
      '/api/reservations/',
      '/api/seat-reservations/',
      '/api/ticket-orders/',
      '/api/payments/',
      '/api/makeup/',
      '/api/notifications/',
    ],
    authCheck: 'await requireAuth(event)',
    transformation: (content) => {
      return addAuthCheckAndUserClient(content, 'requireAuth');
    }
  },
};

/**
 * Add auth check and convert to user-scoped client
 */
function addAuthCheckAndUserClient(content, authFunction, roles = null) {
  let updated = content;

  // Check if auth check already exists
  const hasAuthCheck = updated.includes(`${authFunction}(event)`);

  // Replace getSupabaseClient() with getUserSupabaseClient(event)
  updated = updated.replace(
    /const client = getSupabaseClient\(\)/g,
    'const client = await getUserSupabaseClient(event)'
  );

  // Add getUserSupabaseClient import if needed
  if (updated.includes('getUserSupabaseClient') && !updated.includes("from '~/server/utils/supabase'") && !updated.includes("from '../../utils/supabase'")) {
    // Find the existing import line
    const importMatch = updated.match(/import.*from ['"].*supabase['"]/);
    if (importMatch) {
      updated = updated.replace(
        importMatch[0],
        importMatch[0].replace('getSupabaseClient', 'getUserSupabaseClient')
      );
    } else {
      // Add new import at the top
      const firstImportIndex = updated.indexOf('import');
      if (firstImportIndex !== -1) {
        updated = "import { getUserSupabaseClient } from '~/server/utils/supabase'\n" + updated;
      }
    }
  }

  // Add auth check if not present
  if (!hasAuthCheck) {
    const handlerMatch = updated.match(/export default defineEventHandler\(async \(event\) => \{/);
    if (handlerMatch) {
      const insertPosition = updated.indexOf(handlerMatch[0]) + handlerMatch[0].length;

      let authCheckCode;
      if (roles) {
        authCheckCode = `\n  // Require authentication with specific roles\n  await requireRole(event, ${JSON.stringify(roles)})\n`;
      } else {
        authCheckCode = `\n  // Require authentication\n  ${authFunction}(event)\n`;
      }

      updated = updated.slice(0, insertPosition) + authCheckCode + updated.slice(insertPosition);

      // Add auth import if needed
      if (!updated.includes("from '~/server/utils/auth'") && !updated.includes("from '../../utils/auth'")) {
        const firstImportIndex = updated.indexOf('import');
        if (firstImportIndex !== -1) {
          updated = `import { ${authFunction} } from '~/server/utils/auth'\n` + updated;
        }
      }
    }
  }

  return updated;
}

/**
 * Determine which category a file belongs to
 */
function categorizeFile(filePath) {
  for (const [category, config] of Object.entries(AUTH_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (filePath.includes(pattern)) {
        return { category, config };
      }
    }
  }

  // Default to authenticated for unknown endpoints
  return { category: 'authenticated', config: AUTH_PATTERNS.authenticated };
}

/**
 * Process a single API file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already migrated (contains getUserSupabaseClient)
    if (content.includes('getUserSupabaseClient')) {
      console.log(`⏭️  Skipping ${filePath} (already migrated)`);
      return { skipped: true };
    }

    // Skip if doesn't use Supabase client
    if (!content.includes('getSupabaseClient()')) {
      console.log(`⏭️  Skipping ${filePath} (no Supabase client usage)`);
      return { skipped: true };
    }

    const { category, config } = categorizeFile(filePath);

    // Apply transformation
    const updated = config.transformation(content);

    // Write back to file
    fs.writeFileSync(filePath, updated, 'utf8');

    console.log(`✅ Updated ${filePath} [${category}]`);
    return { category, updated: true };

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { error: true };
  }
}

/**
 * Recursively find all .ts files in a directory
 */
function findTsFiles(dir) {
  const files = [];

  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main migration function
 */
function main() {
  const apiDir = path.join(__dirname, '..', 'server', 'api');

  console.log('🔍 Finding API handler files...\n');
  const files = findTsFiles(apiDir);

  console.log(`📁 Found ${files.length} API handler files\n`);
  console.log('🔄 Starting migration...\n');

  const stats = {
    total: files.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    byCategory: {}
  };

  for (const file of files) {
    const result = processFile(file);

    if (result.updated) {
      stats.updated++;
      stats.byCategory[result.category] = (stats.byCategory[result.category] || 0) + 1;
    } else if (result.skipped) {
      stats.skipped++;
    } else if (result.error) {
      stats.errors++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Total files: ${stats.total}`);
  console.log(`   ✅ Updated: ${stats.updated}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   ❌ Errors: ${stats.errors}`);

  console.log('\n📈 Updates by category:');
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`   ${category}: ${count}`);
  }

  console.log('\n✨ Migration complete!');

  if (stats.errors > 0) {
    console.log('\n⚠️  Some files had errors. Please review them manually.');
    process.exit(1);
  }
}

// Run migration
main();
