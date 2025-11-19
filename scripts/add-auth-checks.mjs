#!/usr/bin/env node

/**
 * Add appropriate auth checks to API endpoints based on their category
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth check mappings by path pattern
const AUTH_CHECK_MAP = {
  // Admin-only endpoints
  'admin/': 'requireAdmin',
  'users/': 'requireAdmin',
  'email-campaigns': 'requireAdmin',
  'email-templates': 'requireAdmin',

  // Staff endpoints (admin or staff)
  'students/': 'requireAdminOrStaff',
  'teachers/': 'requireAdminOrStaff',
  'classes/': 'requireAdminOrStaff',
  'class-definitions/': 'requireAdminOrStaff',
  'class-instances/': 'requireAdminOrStaff',
  'class-levels/': 'requireAdminOrStaff',
  'schedules/': 'requireAdminOrStaff',
  'schedule-classes/': 'requireAdminOrStaff',
  'dance-styles/': 'requireAdminOrStaff',
  'studio/': 'requireAdmin',
  'recitals/': 'requireAdminOrStaff',
  'recital-series/': 'requireAdminOrStaff',
  'recital-shows/': 'requireAdminOrStaff',
  'recital-tasks/': 'requireAdminOrStaff',
  'shows/': 'requireAdminOrStaff',
  'rehearsals/': 'requireAdminOrStaff',
  'attendance/': 'requireAdminOrStaff',
  'absences/': 'requireAdminOrStaff',
  'costumes/': 'requireAdminOrStaff',
  'fees/': 'requireAdminOrStaff',
  'fee-types/': 'requireAdminOrStaff',
  'student-fees/': 'requireAdminOrStaff',
  'email/': 'requireAdminOrStaff',
  'media/': 'requireAdminOrStaff',
  'media-albums/': 'requireAdminOrStaff',
  'media-items/': 'requireAdminOrStaff',
  'volunteers/': 'requireAdminOrStaff',
  'volunteer-shifts/': 'requireAdminOrStaff',
  'tasks/': 'requireAdminOrStaff',
  'task-templates': 'requireAdminOrStaff',
  'venues/': 'requireAdmin',

  // Parent endpoints
  'parent/': 'requireRole',

  // Authenticated endpoints
  'dashboard/': 'requireAuth',
  'orders/': 'requireAuth',
  'tickets/': 'requireAuth',
  'reservations/': 'requireAuth',
  'seat-reservations/': 'requireAuth',
  'ticket-orders/': 'requireAuth',
  'payments/': 'requireAuth',
  'makeup/': 'requireAuth',
  'notifications/': 'requireAuth',
};

/**
 * Determine auth check for file
 */
function getAuthCheck(filePath) {
  // Public endpoints (no auth)
  if (filePath.includes('/public/') ||
      filePath.includes('/config/') ||
      filePath.includes('/blog/') ||
      filePath.includes('/marketing/') ||
      filePath.includes('/webhooks/') ||
      filePath.includes('/cron/')) {
    return null;
  }

  // Find matching pattern
  for (const [pattern, authFunc] of Object.entries(AUTH_CHECK_MAP)) {
    if (filePath.includes(`/api/${pattern}`)) {
      return authFunc;
    }
  }

  // Default to requireAuth
  return 'requireAuth';
}

/**
 * Process file to add auth check
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if no TODO marker
    if (!content.includes('// TODO: Add appropriate auth check')) {
      return { status: 'skipped', reason: 'no TODO' };
    }

    const authCheck = getAuthCheck(filePath);

    if (!authCheck) {
      // Remove TODO for public endpoints
      content = content.replace(
        /\s*\/\/ TODO: Add appropriate auth check.*\n/g,
        ''
      );
      fs.writeFileSync(filePath, content, 'utf8');
      return { status: 'updated', type: 'public' };
    }

    // Update imports if needed
    const hasCorrectImport = content.includes(`{ ${authCheck} }`);
    if (!hasCorrectImport) {
      // Find auth import line
      const authImportMatch = content.match(/import\s*{[^}]*}\s*from\s*'~\/server\/utils\/auth'/);
      if (authImportMatch) {
        const importLine = authImportMatch[0];
        // Extract current imports
        const importsMatch = importLine.match(/{\s*([^}]*)\s*}/);
        if (importsMatch) {
          const currentImports = importsMatch[1].split(',').map(s => s.trim()).filter(s => s);
          if (!currentImports.includes(authCheck)) {
            currentImports.push(authCheck);
            const newImportLine = `import { ${currentImports.join(', ')} } from '~/server/utils/auth'`;
            content = content.replace(importLine, newImportLine);
          }
        }
      }
    }

    // Replace TODO with actual auth check
    let authCallCode;
    if (authCheck === 'requireRole') {
      authCallCode = "  await requireRole(event, ['parent', 'admin', 'staff'])";
    } else {
      authCallCode = `  await ${authCheck}(event)`;
    }

    content = content.replace(
      /\s*\/\/ TODO: Add appropriate auth check.*\n/g,
      `${authCallCode}\n\n`
    );

    fs.writeFileSync(filePath, content, 'utf8');
    return { status: 'updated', type: authCheck };

  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Find all TypeScript files with TODO markers
 */
function findFilesWithTodo(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findFilesWithTodo(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('// TODO: Add appropriate auth check')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Main function
 */
function main() {
  const apiDir = path.join(__dirname, '..', 'server', 'api');

  console.log('🔍 Finding files with TODO markers...\n');
  const files = findFilesWithTodo(apiDir);

  console.log(`📁 Found ${files.length} files with TODO markers\n`);
  console.log('🔄 Adding auth checks...\n');

  const stats = {
    total: files.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    byType: {}
  };

  for (const file of files) {
    const relativePath = path.relative(apiDir, file);
    const result = processFile(file);

    if (result.status === 'updated') {
      stats.updated++;
      stats.byType[result.type] = (stats.byType[result.type] || 0) + 1;
      console.log(`✅ ${relativePath} [${result.type}]`);
    } else if (result.status === 'skipped') {
      stats.skipped++;
      console.log(`⏭️  ${relativePath} (${result.reason})`);
    } else if (result.status === 'error') {
      stats.errors++;
      console.error(`❌ ${relativePath}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Total files:     ${stats.total}`);
  console.log(`✅ Updated:      ${stats.updated}`);
  console.log(`⏭️  Skipped:      ${stats.skipped}`);
  console.log(`❌ Errors:       ${stats.errors}`);

  console.log('\n📈 By auth type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`   ${type}: ${count}`);
  }

  console.log('\n✨ Complete!\n');

  return stats.errors > 0 ? 1 : 0;
}

process.exit(main());
