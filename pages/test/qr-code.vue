<script setup lang="ts">
interface QRCodeResponse {
  success: boolean
  token: string
  isValid: boolean
  qrCodeDataURL: string
  qrCodeSVG: string
  qrCodeSVGLength: number
  message: string
}

const qrCode = ref('')
const token = ref('')
const loading = ref(false)
const error = ref('')
const toast = useToast()

const generateCode = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<QRCodeResponse>('/api/test/qr-code')
    qrCode.value = response.qrCodeDataURL
    token.value = response.token
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'QR code generated successfully'
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
              @click="generateCode"
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
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Token:</h3>
              <div class="text-sm text-gray-900 font-mono break-all">
                {{ token }}
              </div>
            </div>

            <div class="flex gap-2 justify-center">
              <Button
                label="Generate New"
                icon="pi pi-refresh"
                @click="generateCode"
                :loading="loading"
              />
              <Button
                label="Download"
                icon="pi pi-download"
                severity="secondary"
                @click="() => {
                  const link = document.createElement('a')
                  link.href = qrCode
                  link.download = `qr-code-${token}.png`
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
      </ul>
    </div>
  </div>
</template>
