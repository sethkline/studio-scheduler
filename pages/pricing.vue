<template>
  <div>
    <section class="bg-gradient-to-r from-primary to-secondary text-white py-20">
      <div class="container mx-auto px-4 text-center">
        <h1 class="text-5xl font-bold mb-4">Pricing & Tuition</h1>
        <p class="text-xl max-w-2xl mx-auto">
          Transparent, affordable pricing for quality dance education. No hidden fees.
        </p>
      </div>
    </section>

    <div class="container mx-auto px-4 py-12">
      <!-- Pricing Tiers -->
      <div class="grid md:grid-cols-3 gap-8 mb-16">
        <div v-for="(tier, index) in pricingTiers" :key="index"
          :class="[
            'bg-white rounded-xl shadow-lg overflow-hidden transition-all',
            tier.featured ? 'ring-4 ring-primary transform scale-105' : ''
          ]">
          <div v-if="tier.featured" class="bg-primary text-white text-center py-2 font-bold">
            MOST POPULAR
          </div>
          <div class="p-8">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ tier.name }}</h3>
            <div class="text-4xl font-bold text-primary mb-2">
              ${{ tier.price }}
              <span class="text-lg text-gray-600">/{{ tier.period }}</span>
            </div>
            <p class="text-gray-600 mb-6">{{ tier.description }}</p>
            <ul class="space-y-3 mb-8">
              <li v-for="(feature, i) in tier.features" :key="i" class="flex items-start gap-3">
                <i class="pi pi-check text-primary mt-1" />
                <span class="text-gray-700">{{ feature }}</span>
              </li>
            </ul>
            <NuxtLink to="/register/enroll"
              :class="[
                'block text-center py-3 rounded-lg font-bold transition-all',
                tier.featured
                  ? 'bg-primary text-white hover:shadow-lg'
                  : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
              ]">
              Get Started
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Payment Options -->
      <div class="bg-gray-50 rounded-xl p-8 mb-16">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">Payment Options</h2>
        <div class="grid md:grid-cols-2 gap-8">
          <div class="bg-white rounded-lg p-6">
            <h3 class="font-bold text-xl text-gray-900 mb-3">Monthly Payment</h3>
            <p class="text-gray-600 mb-4">Pay month-to-month with automatic billing. Cancel anytime with 30 days notice.</p>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-primary" />
                Flexible commitment
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-primary" />
                Auto-pay available
              </li>
            </ul>
          </div>

          <div class="bg-white rounded-lg p-6">
            <h3 class="font-bold text-xl text-gray-900 mb-3">Semester Payment</h3>
            <p class="text-gray-600 mb-4">Pay for the full semester upfront and save 10% on tuition.</p>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-primary" />
                10% discount
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-primary" />
                Guaranteed spot
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Discounts -->
      <div class="bg-white rounded-xl shadow-lg p-8 mb-16">
        <h2 class="text-3xl font-bold text-gray-900 mb-6 text-center">Discounts & Savings</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="text-center p-6">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-users text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg mb-2">Sibling Discount</h3>
            <p class="text-3xl font-bold text-primary mb-2">15% OFF</p>
            <p class="text-sm text-gray-600">Second child and beyond</p>
          </div>

          <div class="text-center p-6">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-th-large text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg mb-2">Multi-Class</h3>
            <p class="text-3xl font-bold text-primary mb-2">10% OFF</p>
            <p class="text-sm text-gray-600">Take 3+ classes per week</p>
          </div>

          <div class="text-center p-6">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-calendar text-primary text-3xl" />
            </div>
            <h3 class="font-bold text-lg mb-2">Early Bird</h3>
            <p class="text-3xl font-bold text-primary mb-2">5% OFF</p>
            <p class="text-sm text-gray-600">Register before semester starts</p>
          </div>
        </div>
      </div>

      <!-- What's Included -->
      <div class="bg-gray-900 text-white rounded-xl p-8 mb-16">
        <h2 class="text-3xl font-bold mb-6 text-center">What's Included in Tuition</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="text-center">
            <i class="pi pi-book text-accent text-3xl mb-3" />
            <h3 class="font-semibold mb-2">Expert Instruction</h3>
            <p class="text-sm text-gray-300">Professional teachers</p>
          </div>
          <div class="text-center">
            <i class="pi pi-home text-accent text-3xl mb-3" />
            <h3 class="font-semibold mb-2">Studio Access</h3>
            <p class="text-sm text-gray-300">State-of-the-art facilities</p>
          </div>
          <div class="text-center">
            <i class="pi pi-star text-accent text-3xl mb-3" />
            <h3 class="font-semibold mb-2">Performances</h3>
            <p class="text-sm text-gray-300">Annual recital included</p>
          </div>
          <div class="text-center">
            <i class="pi pi-heart text-accent text-3xl mb-3" />
            <h3 class="font-semibold mb-2">Community</h3>
            <p class="text-sm text-gray-300">Supportive environment</p>
          </div>
        </div>
      </div>

      <!-- Additional Fees -->
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-8 mb-16">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">Additional Fees</h2>
        <div class="space-y-3 text-gray-700">
          <div class="flex justify-between">
            <span>Registration Fee (annual)</span>
            <span class="font-bold">$35</span>
          </div>
          <div class="flex justify-between">
            <span>Costume Fee (per recital piece)</span>
            <span class="font-bold">$75-$125</span>
          </div>
          <div class="flex justify-between">
            <span>Competition Team (optional)</span>
            <span class="font-bold">Contact for details</span>
          </div>
        </div>
      </div>

      <!-- Financial Aid -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">Financial Assistance Available</h2>
        <p class="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          We believe dance should be accessible to all. Limited scholarships and payment plans are available.
        </p>
        <NuxtLink to="/contact"
          class="inline-block px-8 py-4 bg-primary text-white font-bold rounded-lg hover:shadow-lg transition-all">
          Inquire About Financial Aid
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

const { applyTheme } = useTheme()
onMounted(() => {
  applyTheme()
})

const pricingTiers = [
  {
    name: 'Single Class',
    price: '85',
    period: 'month',
    description: 'Perfect for trying out dance or supplementing other activities',
    features: [
      'One 60-minute class per week',
      'Performance in annual recital',
      'Access to studio facilities',
      'Progress reports',
    ],
    featured: false,
  },
  {
    name: 'Dance Enthusiast',
    price: '225',
    period: 'month',
    description: 'Our most popular option for dedicated dancers',
    features: [
      'Up to 3 classes per week',
      '10% multi-class discount',
      'Priority recital placement',
      'Quarterly parent meetings',
      'Access to studio events',
    ],
    featured: true,
  },
  {
    name: 'Unlimited',
    price: '375',
    period: 'month',
    description: 'For serious dancers pursuing excellence',
    features: [
      'Unlimited classes',
      'Private lesson discount',
      'Competition team eligible',
      'Master class access',
      'Mentorship opportunities',
    ],
    featured: false,
  },
]
</script>
