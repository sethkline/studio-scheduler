<template>
  <Card>
    <template #content>
      <div>
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Discount Code Usage</h3>

        <div v-if="!discounts || discounts.length === 0" class="text-center py-8 text-gray-500">
          <i class="pi pi-tag text-4xl mb-3"></i>
          <p>No discount data available</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="discount in discounts"
            :key="`${discount.show_id}-${discount.channel}`"
            class="p-4 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-gray-900 capitalize">
                {{ discount.channel || 'All Channels' }}
              </span>
              <span class="text-sm text-gray-600">
                {{ discount.discount_usage_rate?.toFixed(1) }}% usage
              </span>
            </div>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-gray-600">Orders with Discount</p>
                <p class="font-semibold text-gray-900">
                  {{ discount.orders_with_discount }} / {{ discount.total_orders }}
                </p>
              </div>
              <div>
                <p class="text-gray-600">Total Discounts</p>
                <p class="font-semibold text-gray-900">
                  {{ formatCurrency(discount.total_discounts_given) }}
                </p>
              </div>
            </div>

            <div class="mt-2 pt-2 border-t border-gray-200">
              <p class="text-xs text-gray-600">
                Avg discount: {{ formatCurrency(discount.avg_discount_amount) }}
              </p>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-200">
            <p class="text-sm text-gray-600">
              <i class="pi pi-info-circle mr-2"></i>
              Track which discount codes are most effective for your campaigns
            </p>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
interface DiscountData {
  show_id: string
  recital_id: string
  channel: string
  orders_with_discount: number
  total_orders: number
  total_discounts_given: number
  avg_discount_amount: number
  discount_usage_rate: number
}

interface Props {
  discounts?: DiscountData[]
}

defineProps<Props>()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0)
}
</script>

<style scoped>
/* Styles are inline with Tailwind classes */
</style>
