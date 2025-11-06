import webpush from 'web-push';

console.log('Generating VAPID keys for web push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log('# Web Push Notifications (VAPID Keys)');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('\n⚠️  IMPORTANT:');
console.log('1. Keep the private key secret and never commit it to version control');
console.log('2. Add both keys to your .env file');
console.log('3. Also add VAPID_PUBLIC_KEY to nuxt.config.ts under runtimeConfig.public');
console.log('4. Restart your development server after adding the keys\n');
