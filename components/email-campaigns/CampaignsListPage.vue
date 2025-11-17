<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Email Campaigns</h1>
        <p class="text-sm text-gray-600 mt-1">Send targeted emails to parents, staff, and students</p>
      </div>
      <AppButton variant="primary" @click="showCreateModal = true" v-if="can('canManageRecitals')">
        <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        New Campaign
      </AppButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <!-- Campaigns List -->
    <div v-else class="space-y-4">
      <div v-if="campaigns.length === 0" class="text-center py-12 text-gray-500">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p>No campaigns yet</p>
        <AppButton variant="primary" class="mt-4" @click="showCreateModal = true">Create First Campaign</AppButton>
      </div>

      <AppCard
        v-for="campaign in campaigns"
        :key="campaign.id"
        class="hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-lg font-semibold">{{ campaign.campaign_name }}</h3>
              <span
                :class="[
                  'px-2 py-1 text-xs font-medium rounded',
                  statusColor(campaign.status)
                ]"
              >
                {{ campaign.status }}
              </span>
            </div>

            <p class="text-gray-600 text-sm mb-2">
              <strong>Subject:</strong> {{ campaign.subject_line }}
            </p>

            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span>{{ campaign.target_audience.replace(/_/g, ' ') }}</span>
              <span>•</span>
              <span>{{ campaign.total_recipients }} recipients</span>
              <span v-if="campaign.sent_at">•</span>
              <span v-if="campaign.sent_at">Sent {{ formatDate(campaign.sent_at) }}</span>
            </div>

            <!-- Stats (if sent) -->
            <div v-if="campaign.status === 'sent'" class="mt-3 grid grid-cols-4 gap-4">
              <div class="text-center p-2 bg-gray-50 rounded">
                <p class="text-xs text-gray-500">Sent</p>
                <p class="text-lg font-semibold">{{ campaign.sent_count }}</p>
              </div>
              <div class="text-center p-2 bg-blue-50 rounded">
                <p class="text-xs text-gray-500">Delivered</p>
                <p class="text-lg font-semibold text-blue-600">{{ campaign.delivered_count }}</p>
              </div>
              <div class="text-center p-2 bg-green-50 rounded">
                <p class="text-xs text-gray-500">Opened</p>
                <p class="text-lg font-semibold text-green-600">{{ campaign.opened_count }}</p>
              </div>
              <div class="text-center p-2 bg-purple-50 rounded">
                <p class="text-xs text-gray-500">Clicked</p>
                <p class="text-lg font-semibold text-purple-600">{{ campaign.clicked_count }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <AppButton
              v-if="campaign.status === 'draft'"
              variant="primary"
              size="sm"
              @click="sendCampaign(campaign.id)"
            >
              Send Now
            </AppButton>
            <AppButton
              variant="secondary"
              size="sm"
              @click="viewCampaign(campaign.id)"
            >
              View
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Create Campaign Modal -->
    <CreateCampaignModal
      v-model="showCreateModal"
      :recital-id="recitalId"
      @created="fetchCampaigns"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '~/composables/usePermissions'
import type { EmailCampaign } from '~/types/tier1-features'

const props = defineProps<{ recitalId?: string }>()

const router = useRouter()
const { can } = usePermissions()

const loading = ref(false)
const campaigns = ref<EmailCampaign[]>([])
const showCreateModal = ref(false)

async function fetchCampaigns() {
  loading.value = true
  try {
    const params: any = {}
    if (props.recitalId) params.recital_id = props.recitalId

    const { data } = await useFetch('/api/email-campaigns', { params })
    campaigns.value = (data.value as any)?.campaigns || []
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
  } finally {
    loading.value = false
  }
}

async function sendCampaign(campaignId: string) {
  if (!confirm('Are you sure you want to send this campaign?')) return

  try {
    await $fetch(`/api/email-campaigns/${campaignId}/send`, { method: 'POST' })
    await fetchCampaigns()
  } catch (error) {
    console.error('Failed to send campaign:', error)
  }
}

function viewCampaign(campaignId: string) {
  router.push(`/email-campaigns/${campaignId}`)
}

function statusColor(status: string) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    sending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchCampaigns()
})
</script>
