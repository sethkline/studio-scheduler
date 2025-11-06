import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const screenshotsDir = join(__dirname, '../public/screenshots');

// Create schedule screenshot placeholder
const scheduleScreenshot = {
  create: Buffer.from(`
    <svg width="540" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6D28D9;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="540" height="720" fill="url(#grad)"/>
      <text x="270" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">Dance Studio</text>

      <!-- Calendar representation -->
      <rect x="30" y="100" width="480" height="500" rx="10" fill="white" opacity="0.95"/>
      <text x="270" y="140" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#6D28D9" text-anchor="middle">Class Schedule</text>

      <!-- Mock schedule items -->
      <g>
        <rect x="50" y="170" width="440" height="70" rx="5" fill="#EDE9FE"/>
        <text x="70" y="200" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#6D28D9">Ballet - Beginner</text>
        <text x="70" y="225" font-family="Arial, sans-serif" font-size="14" fill="#666">Monday 4:00 PM - 5:00 PM</text>

        <rect x="50" y="255" width="440" height="70" rx="5" fill="#EDE9FE"/>
        <text x="70" y="285" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#6D28D9">Jazz - Intermediate</text>
        <text x="70" y="310" font-family="Arial, sans-serif" font-size="14" fill="#666">Tuesday 5:30 PM - 6:30 PM</text>

        <rect x="50" y="340" width="440" height="70" rx="5" fill="#EDE9FE"/>
        <text x="70" y="370" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#6D28D9">Hip Hop - Advanced</text>
        <text x="70" y="395" font-family="Arial, sans-serif" font-size="14" fill="#666">Wednesday 6:00 PM - 7:30 PM</text>

        <rect x="50" y="425" width="440" height="70" rx="5" fill="#EDE9FE"/>
        <text x="70" y="455" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#6D28D9">Contemporary</text>
        <text x="70" y="480" font-family="Arial, sans-serif" font-size="14" fill="#666">Thursday 5:00 PM - 6:00 PM</text>
      </g>

      <text x="270" y="680" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" opacity="0.9">View and manage your class schedules</text>
    </svg>
  `)
};

const recitalScreenshot = {
  create: Buffer.from(`
    <svg width="540" height="720" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6D28D9;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="540" height="720" fill="url(#grad2)"/>
      <text x="270" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">Dance Studio</text>

      <!-- Recital content -->
      <rect x="30" y="100" width="480" height="500" rx="10" fill="white" opacity="0.95"/>
      <text x="270" y="140" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#6D28D9" text-anchor="middle">Recital Management</text>

      <!-- Recital info -->
      <g>
        <rect x="50" y="170" width="440" height="100" rx="5" fill="#EDE9FE"/>
        <text x="70" y="200" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#6D28D9">Spring Recital 2025</text>
        <text x="70" y="230" font-family="Arial, sans-serif" font-size="14" fill="#666">Date: June 15-16, 2025</text>
        <text x="70" y="255" font-family="Arial, sans-serif" font-size="14" fill="#666">Venue: Main Theater - 3 Shows</text>

        <!-- Ticket info -->
        <rect x="50" y="290" width="440" height="80" rx="5" fill="#DDD6FE"/>
        <text x="70" y="320" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#6D28D9">Ticket Sales</text>
        <text x="70" y="345" font-family="Arial, sans-serif" font-size="14" fill="#666">Available: 156 seats</text>
        <text x="70" y="365" font-family="Arial, sans-serif" font-size="14" fill="#666">Sold: 94 tickets</text>

        <!-- Performances -->
        <rect x="50" y="390" width="440" height="180" rx="5" fill="#F3F4F6"/>
        <text x="70" y="420" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#6D28D9">Performances</text>
        <text x="70" y="450" font-family="Arial, sans-serif" font-size="14" fill="#666">Ballet Ensemble - "Swan Lake"</text>
        <text x="70" y="475" font-family="Arial, sans-serif" font-size="14" fill="#666">Jazz Group - "City Lights"</text>
        <text x="70" y="500" font-family="Arial, sans-serif" font-size="14" fill="#666">Hip Hop Crew - "Urban Beat"</text>
        <text x="70" y="525" font-family="Arial, sans-serif" font-size="14" fill="#666">Contemporary - "Reflections"</text>
        <text x="70" y="550" font-family="Arial, sans-serif" font-size="14" fill="#666">Tap Dance - "Rhythm and Soul"</text>
      </g>

      <text x="270" y="680" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" opacity="0.9">Plan and manage recitals and performances</text>
    </svg>
  `)
};

console.log('Generating app screenshots...\n');

await sharp(scheduleScreenshot.create)
  .png()
  .toFile(join(screenshotsDir, 'schedule.png'));
console.log('✓ Generated schedule screenshot');

await sharp(recitalScreenshot.create)
  .png()
  .toFile(join(screenshotsDir, 'recitals.png'));
console.log('✓ Generated recitals screenshot');

console.log('\n✅ All screenshots generated successfully!');
