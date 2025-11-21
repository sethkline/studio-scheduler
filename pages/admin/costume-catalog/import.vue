<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-2">Import Costume Catalog</h1>
      <p class="text-gray-600">Import costumes from vendor CSV files</p>
    </div>

    <!-- Import Form -->
    <Card class="max-w-2xl">
      <template #title>Upload CSV File</template>
      <template #content>
        <div class="space-y-6">
          <!-- Vendor Selection -->
          <div>
            <label class="block mb-2 font-semibold">Vendor *</label>
            <Select
              v-model="selectedVendor"
              :options="vendors"
              optionLabel="name"
              optionValue="slug"
              placeholder="Select a vendor"
              class="w-full"
              :loading="loadingVendors"
            />
            <small class="text-gray-500">Select the vendor whose catalog you're importing</small>
          </div>

          <!-- File Upload -->
          <div>
            <label class="block mb-2 font-semibold">CSV File *</label>
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              @change="handleFileSelect"
              class="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-violet-50 file:text-violet-700
                hover:file:bg-violet-100"
            />
            <small class="text-gray-500">Upload a CSV file with costume data</small>
          </div>

          <!-- CSV Format Help -->
          <Message severity="info" :closable="false">
            <div class="text-sm">
              <p class="font-semibold mb-2">Required CSV Columns:</p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li><code>vendor_sku</code> - Vendor SKU/Item number (required)</li>
                <li><code>name</code> - Costume name (required)</li>
                <li><code>category</code> - Category (ballet, jazz, tap, etc.)</li>
                <li><code>description</code> - Costume description</li>
                <li><code>season</code> - Season (2025, Fall 2024, etc.)</li>
                <li><code>gender</code> - Gender (girls, boys, unisex, etc.)</li>
                <li><code>price</code> - Price in dollars (e.g., 45.99)</li>
                <li><code>sizes</code> - Comma-separated sizes (SC,IC,MC,LC)</li>
                <li><code>colors</code> - Comma-separated colors (Black,Royal Blue)</li>
                <li><code>image_urls</code> - Comma-separated image URLs</li>
                <li><code>availability</code> - in_stock, limited, discontinued, etc.</li>
              </ul>
            </div>
          </Message>

          <!-- Preview Data -->
          <div v-if="csvData.length > 0">
            <label class="block mb-2 font-semibold">Preview (first 5 rows)</label>
            <DataTable :value="csvData.slice(0, 5)" :scrollable="true" scrollHeight="300px" class="text-sm">
              <Column field="vendor_sku" header="SKU" style="min-width: 100px" />
              <Column field="name" header="Name" style="min-width: 200px" />
              <Column field="category" header="Category" style="min-width: 100px" />
              <Column field="price" header="Price" style="min-width: 80px">
                <template #body="{ data }">
                  {{ data.price ? `$${data.price}` : 'N/A' }}
                </template>
              </Column>
              <Column field="season" header="Season" style="min-width: 100px" />
            </DataTable>
            <p class="text-sm text-gray-500 mt-2">Total rows: {{ csvData.length }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <Button
              label="Import Costumes"
              icon="pi pi-upload"
              :loading="importing"
              :disabled="!selectedVendor || csvData.length === 0"
              @click="importCostumes"
            />
            <Button
              label="Clear"
              icon="pi pi-times"
              severity="secondary"
              outlined
              :disabled="importing"
              @click="clearForm"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Import Results -->
    <Card v-if="importResult" class="max-w-2xl mt-6">
      <template #title>Import Results</template>
      <template #content>
        <div class="space-y-4">
          <!-- Summary -->
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{{ importResult.total_rows }}</div>
              <div class="text-sm text-gray-600">Total Rows</div>
            </div>
            <div class="text-center p-4 bg-green-50 rounded-lg">
              <div class="text-2xl font-bold text-green-600">{{ importResult.imported }}</div>
              <div class="text-sm text-gray-600">Imported</div>
            </div>
            <div class="text-center p-4 bg-yellow-50 rounded-lg">
              <div class="text-2xl font-bold text-yellow-600">{{ importResult.updated }}</div>
              <div class="text-sm text-gray-600">Updated</div>
            </div>
          </div>

          <!-- Errors -->
          <div v-if="importResult.errors.length > 0">
            <Message severity="warn">
              <div class="text-sm">
                <p class="font-semibold mb-2">{{ importResult.errors.length }} errors occurred:</p>
                <ul class="list-disc list-inside space-y-1 ml-2 max-h-40 overflow-y-auto">
                  <li v-for="error in importResult.errors" :key="error.row">
                    Row {{ error.row }}: {{ error.error }}
                  </li>
                </ul>
              </div>
            </Message>
          </div>

          <div v-else>
            <Message severity="success" :closable="false">
              All costumes imported successfully!
            </Message>
          </div>

          <Button
            label="View Catalog"
            icon="pi pi-eye"
            @click="$router.push('/admin/costume-catalog')"
          />
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useCostumeCatalogService } from '~/composables/useCostumeCatalogService'
import type { Vendor, CostumeImportRow, CostumeImportResult } from '~/types/costume-catalog'

definePageMeta({
  middleware: 'staff',
  layout: 'default'
})

const toast = useToast()
const catalogService = useCostumeCatalogService()

const vendors = ref<Vendor[]>([])
const loadingVendors = ref(false)
const selectedVendor = ref<string>('')
const csvData = ref<CostumeImportRow[]>([])
const importing = ref(false)
const importResult = ref<CostumeImportResult | null>(null)
const fileInput = ref<HTMLInputElement>()

// Load vendors on mount
onMounted(async () => {
  loadingVendors.value = true
  const { data, error } = await catalogService.getVendors()
  if (error.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load vendors',
      life: 3000
    })
  } else if (data.value) {
    vendors.value = data.value
  }
  loadingVendors.value = false
})

// Handle file selection
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    csvData.value = parseCSV(text)
  }
  reader.readAsText(file)
}

// Simple CSV parser
const parseCSV = (text: string): CostumeImportRow[] => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const rows: CostumeImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',')
    const row: any = {}

    headers.forEach((header, index) => {
      const value = values[index]?.trim()
      
      if (header === 'price') {
        row[header] = value ? parseFloat(value) : undefined
      } else {
        row[header] = value || undefined
      }
    })

    if (row.vendor_sku && row.name) {
      rows.push(row as CostumeImportRow)
    }
  }

  return rows
}

// Import costumes
const importCostumes = async () => {
  if (!selectedVendor.value || csvData.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please select a vendor and upload a CSV file',
      life: 3000
    })
    return
  }

  importing.value = true
  importResult.value = null

  const { data, error } = await catalogService.importCostumes(
    selectedVendor.value,
    csvData.value
  )

  importing.value = false

  if (error.value) {
    toast.add({
      severity: 'error',
      summary: 'Import Failed',
      detail: error.value.message || 'Failed to import costumes',
      life: 5000
    })
  } else if (data.value) {
    importResult.value = data.value
    toast.add({
      severity: 'success',
      summary: 'Import Complete',
      detail: `Imported ${data.value.imported} costumes, updated ${data.value.updated}`,
      life: 5000
    })
  }
}

// Clear form
const clearForm = () => {
  selectedVendor.value = ''
  csvData.value = []
  importResult.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>
