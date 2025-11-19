#!/usr/bin/env node

/**
 * Simple migration script to update Supabase client imports
 *
 * This script does a simple, safe transformation:
 * 1. Updates imports to include getUserSupabaseClient
 * 2. Replaces getSupabaseClient() calls with getUserSupabaseClient(event)
 * 3. Marks files for manual review based on their category
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files that should remain public (no auth required)
const PUBLIC_PATTERNS = [
  'public/',
  'config/stripe-key',
  'newsletter/subscribe',
  'blog/',
  'marketing/classes/',
  'webhooks/',
  'cron/',
  'images/', // Static image serving
];

// Files that already have auth checks (we just need to update the client)
const HAS_AUTH_CHECK_PATTERNS = [
  'admin/',
  'parent/',
];

/**
 * Check if file is a public endpoint
 */
function isPublicEndpoint(filePath) {
  return PUBLIC_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Check if file likely has auth checks already
 */
function hasAuthCheck(content) {
  return content.includes('requireAuth') ||
         content.includes('requireAdmin') ||
         content.includes('requireAdminOrStaff') ||
         content.includes('requireRole') ||
         content.includes('checkTicketOwnership');
}

/**
 * Update imports in the file
 */
function updateImports(content, filePath) {
  // Calculate relative path to utils
  const depth = filePath.split('/api/')[1].split('/').length - 1;
  const relativePath = '../'.repeat(depth) + 'utils/supabase';

  // Pattern 1: import { getSupabaseClient } from ...
  const importPattern1 = /import\s*{\s*getSupabaseClient\s*}\s*from\s*['"].*supabase['"]/;

  if (importPattern1.test(content)) {
    content = content.replace(
      importPattern1,
      `import { getUserSupabaseClient } from '${relativePath}'`
    );
  }
  // Pattern 2: import ... from '~/server/utils/supabase'
  else if (content.includes("from '~/server/utils/supabase'")) {
    content = content.replace(
      /import\s*{\s*([^}]*)\s*}\s*from\s*'~\/server\/utils\/supabase'/,
      (match, imports) => {
        if (!imports.includes('getUserSupabaseClient')) {
          return `import { getUserSupabaseClient } from '~/server/utils/supabase'`;
        }
        return match;
      }
    );
  }
  // Pattern 3: No import, need to add it
  else if (content.includes('getSupabaseClient()')) {
    const firstImportMatch = content.match(/^import.*$/m);
    if (firstImportMatch) {
      const insertPos = content.indexOf(firstImportMatch[0]);
      content = content.slice(0, insertPos) +
                `import { getUserSupabaseClient } from '${relativePath}'\n` +
                content.slice(insertPos);
    }
  }

  return content;
}

/**
 * Update client instantiation
 */
function updateClientCalls(content, isPublic = false) {
  if (isPublic) {
    // Public endpoints: Add comment and keep service client
    content = content.replace(
      /(\s*)(const client = getSupabaseClient\(\))/g,
      '$1// Public endpoint - querying public data only\n$1const client = getSupabaseClient()'
    );
  } else {
    // Protected endpoints: Use user-scoped client
    content = content.replace(
      /const client = getSupabaseClient\(\)/g,
      'const client = await getUserSupabaseClient(event)'
    );
  }

  return content;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already migrated
    if (content.includes('getUserSupabaseClient')) {
      return { status: 'skipped', reason: 'already migrated' };
    }

    // Skip if no Supabase client usage
    if (!content.includes('getSupabaseClient')) {
      return { status: 'skipped', reason: 'no client usage' };
    }

    const isPublic = isPublicEndpoint(filePath);
    const alreadyHasAuth = hasAuthCheck(content);

    // Update imports
    content = updateImports(content, filePath);

    // Update client calls
    content = updateClientCalls(content, isPublic);

    // Add auth import if needed (but not for public endpoints)
    if (!isPublic && !alreadyHasAuth && !content.includes("from '~/server/utils/auth'")) {
      // Find the first import
      const firstImportMatch = content.match(/^import.*$/m);
      if (firstImportMatch) {
        const insertPos = content.indexOf(firstImportMatch[0]);
        content = content.slice(0, insertPos) +
                  `import { requireAuth } from '~/server/utils/auth'\n` +
                  content.slice(insertPos);
      }

      // Add TODO comment after defineEventHandler
      content = content.replace(
        /(export default defineEventHandler\(async \(event\) => {)/,
        '$1\n  // TODO: Add appropriate auth check (requireAuth, requireAdmin, requireAdminOrStaff, requireRole)'
      );
    }

    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');

    return {
      status: 'updated',
      isPublic,
      hasAuth: alreadyHasAuth,
      needsAuthCheck: !isPublic && !alreadyHasAuth
    };

  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Find all TypeScript files recursively
 */
function findFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main function
 */
function main() {
  const apiDir = path.join(__dirname, '..', 'server', 'api');

  console.log('🔍 Finding API files...\n');
  const files = findFiles(apiDir);

  console.log(`📁 Found ${files.length} files\n`);
  console.log('🔄 Processing files...\n');

  const stats = {
    total: files.length,
    updated: 0,
    skipped: 0,
    errors: 0,
    needsAuth: [],
    public: [],
  };

  for (const file of files) {
    const result = processFile(file);
    const relativePath = path.relative(apiDir, file);

    if (result.status === 'updated') {
      stats.updated++;
      console.log(`✅ ${relativePath}`);

      if (result.needsAuthCheck) {
        stats.needsAuth.push(relativePath);
      }
      if (result.isPublic) {
        stats.public.push(relativePath);
      }
    } else if (result.status === 'skipped') {
      stats.skipped++;
      console.log(`⏭️  ${relativePath} (${result.reason})`);
    } else if (result.status === 'error') {
      stats.errors++;
      console.error(`❌ ${relativePath}: ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total files:     ${stats.total}`);
  console.log(`✅ Updated:      ${stats.updated}`);
  console.log(`⏭️  Skipped:      ${stats.skipped}`);
  console.log(`❌ Errors:       ${stats.errors}`);
  console.log(`🌐 Public:       ${stats.public.length}`);
  console.log(`⚠️  Needs auth:   ${stats.needsAuth.length}`);

  if (stats.needsAuth.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  Files needing auth checks (marked with TODO):');
    console.log('='.repeat(60));
    stats.needsAuth.forEach(file => console.log(`   - ${file}`));
  }

  console.log('\n✨ Migration complete!\n');

  return stats.errors > 0 ? 1 : 0;
}

process.exit(main());
