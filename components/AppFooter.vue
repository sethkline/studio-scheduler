<template>
  <footer class="bg-gray-800 text-white py-8">
    <div class="container mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="text-lg font-semibold mb-4">Dance Studio Scheduler</h3>
          <p class="text-gray-400">Simplify your dance studio management with our comprehensive scheduling tool.</p>
        </div>
        
        <div>
          <h3 class="text-lg font-semibold mb-4">Quick Links</h3>
          <ul class="space-y-2">
            <li><NuxtLink to="/schedule" class="text-gray-400 hover:text-white">Schedule</NuxtLink></li>
            <li><NuxtLink to="/classes" class="text-gray-400 hover:text-white">Classes</NuxtLink></li>
            <li><NuxtLink to="/recitals" class="text-gray-400 hover:text-white">Recitals</NuxtLink></li>
          </ul>
        </div>
        
        <div>
          <h3 class="text-lg font-semibold mb-4">Contact</h3>
          <p class="text-gray-400">support@dancestudioscheduler.com</p>
        </div>
      </div>
      
      <div class="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
        <p>&copy; {{ new Date().getFullYear() }} Dance Studio Scheduler. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>