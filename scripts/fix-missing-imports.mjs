#!/usr/bin/env node

/**
 * Fix files that have auth calls but are missing imports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hasAuthCall(content) {
  return content.includes('requireAuth(event)') ||
         content.includes('requireAdmin(event)') ||
         content.includes('requireAdminOrStaff(event)') ||
         content.includes('requireRole(event');
}

function hasUserClient(content) {
  return content.includes('getUserSupabaseClient(event)');
}

function hasAuthImport(content) {
  return content.includes("from '~/server/utils/auth'") ||
         content.includes('from "~/server/utils/auth"');
}

function hasClientImport(content) {
  return content.includes("from '~/server/utils/supabase'") ||
         content.includes("from '../utils/supabase'") ||
         content.includes("from '../../utils/supabase'") ||
         content.includes("from '../../../utils/supabase'");
}

function getAuthFunction(content) {
  if (content.includes('requireAdmin(event)')) return 'requireAdmin';
  if (content.includes('requireAdminOrStaff(event)')) return 'requireAdminOrStaff';
  if (content.includes('requireRole(event')) return 'requireRole';
  if (content.includes('requireAuth(event)')) return 'requireAuth';
  return null;
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check if auth call exists but import is missing
    if (hasAuthCall(content) && !hasAuthImport(content)) {
      const authFunc = getAuthFunction(content);
      if (authFunc) {
        // Add import at the top
        const lines = content.split('\n');
        let insertIndex = 0;

        // Find first non-comment line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
            insertIndex = i;
            break;
          }
        }

        lines.splice(insertIndex, 0, `import { ${authFunc} } from '~/server/utils/auth'`);
        content = lines.join('\n');
        changed = true;
      }
    }

    // Check if user client call exists but import is missing
    if (hasUserClient(content) && !hasClientImport(content)) {
      const lines = content.split('\n');
      let insertIndex = 0;

      // Find first non-comment line or after auth import
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*')) {
          insertIndex = i;
          if (line.startsWith('import')) {
            insertIndex = i + 1;
          }
          break;
        }
      }

      lines.splice(insertIndex, 0, `import { getUserSupabaseClient } from '~/server/utils/supabase'`);
      content = lines.join('\n');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }

    return false;

  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

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

function main() {
  const apiDir = path.join(__dirname, '..', 'server', 'api');

  console.log('🔍 Finding files with missing imports...\n');
  const files = findFiles(apiDir);

  let fixed = 0;
  const fixedFiles = [];

  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
      const relativePath = path.relative(apiDir, file);
      fixedFiles.push(relativePath);
      console.log(`✅ Fixed ${relativePath}`);
    }
  }

  console.log(`\n📊 Fixed ${fixed} file(s)`);

  if (fixedFiles.length > 0) {
    console.log('\nFixed files:');
    fixedFiles.forEach(f => console.log(`  - ${f}`));
  }

  console.log('\n✨ Complete!');
}

main();
