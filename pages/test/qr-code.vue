<script setup lang="ts">
interface QRCodeResponse {
  success: boolean
  data: string
  isGeneratedToken: boolean
  isValidToken: boolean
  qrCodeDataURL: string
  qrCodeSVG: string
  qrCodeSVGLength: number
  message: string
}

const qrCode = ref('')
const encodedData = ref('')
const customData = ref('')
const isGeneratedToken = ref(false)
const isValidToken = ref(false)
const loading = ref(false)
const error = ref('')
const toast = useToast()

const generateCode = async (useCustomData = false) => {
  loading.value = true
  error.value = ''
  try {
    const params = useCustomData && customData.value
      ? { data: customData.value }
      : {}

    const response = await $fetch<QRCodeResponse>('/api/test/qr-code', { params })
    qrCode.value = response.qrCodeDataURL
    encodedData.value = response.data
    isGeneratedToken.value = response.isGeneratedToken
    isValidToken.value = response.isValidToken
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: response.message
    })
  } catch (err: any) {
    error.value = err.message || 'Failed to generate QR code'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  generateCode()
})
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 text-gray-900">QR Code Generator Test</h1>

    <!-- Custom Data Input -->
    <Card class="mb-4">
      <template #content>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Test Custom Data (optional)
            </label>
            <InputText
              v-model="customData"
              placeholder="Enter custom data to encode (e.g., a URL, ticket ID, etc.)"
              class="w-full"
            />
          </div>
          <div class="flex gap-2">
            <Button
              label="Generate Token"
              icon="pi pi-refresh"
              @click="generateCode(false)"
              :loading="loading"
            />
            <Button
              label="Encode Custom Data"
              icon="pi pi-qrcode"
              severity="secondary"
              @click="generateCode(true)"
              :loading="loading"
              :disabled="!customData"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- QR Code Display -->
    <Card>
      <template #content>
        <div class="text-center">
          <div v-if="loading" class="py-12">
            <ProgressSpinner />
            <p class="mt-4 text-gray-600">Generating QR code...</p>
          </div>

          <div v-else-if="error" class="py-12">
            <div class="text-red-600 mb-4">
              <i class="pi pi-exclamation-triangle text-4xl"></i>
              <p class="mt-4">{{ error }}</p>
            </div>
            <Button
              label="Try Again"
              icon="pi pi-refresh"
              @click="generateCode(false)"
            />
          </div>

          <div v-else>
            <div class="mb-6">
              <h2 class="text-xl font-semibold mb-4 text-gray-800">Generated QR Code</h2>
              <img
                v-if="qrCode"
                :src="qrCode"
                alt="QR Code"
                class="mx-auto mb-4 border-2 border-gray-300 rounded-lg p-4 bg-white"
              />
            </div>

            <div class="mb-6 p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-gray-700">
                  {{ isGeneratedToken ? 'Generated Token:' : 'Encoded Data:' }}
                </h3>
                <span
                  v-if="isGeneratedToken"
                  :class="[
                    'text-xs px-2 py-1 rounded',
                    isValidToken ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ isValidToken ? '✓ Valid Token' : 'Custom Data' }}
                </span>
              </div>
              <div class="text-sm text-gray-900 font-mono break-all">
                {{ encodedData }}
              </div>
            </div>

            <div class="flex gap-2 justify-center">
              <Button
                label="Download"
                icon="pi pi-download"
                severity="secondary"
                @click="() => {
                  const link = document.createElement('a')
                  link.href = qrCode
                  const filename = isGeneratedToken ? encodedData : 'custom-qr-code'
                  link.download = `qr-code-${filename}.png`
                  link.click()
                }"
                :disabled="!qrCode"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 class="text-sm font-semibold text-blue-900 mb-2">
        <i class="pi pi-info-circle mr-2"></i>
        About QR Codes
      </h3>
      <ul class="text-sm text-blue-800 space-y-1">
        <li>• Token format: TKT-[RANDOM_12_CHARS]-[TIMESTAMP]</li>
        <li>• Error correction level: High (H)</li>
        <li>• Size: 300x300 pixels</li>
        <li>• Format: PNG (base64 data URL)</li>
        <li>• Use case: Ticket validation at events</li>
        <li>• Can encode any arbitrary data (URLs, IDs, text, etc.)</li>
      </ul>
    </div>
  </div>
</template>
