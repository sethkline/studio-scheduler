<template>
  <div class="csv-import card p-4">
    <h3 class="text-xl font-semibold mb-4">Import Seats from CSV</h3>

    <div class="mb-4">
      <h4 class="font-medium mb-2">Instructions:</h4>
      <ol class="list-decimal ml-5 space-y-1 text-sm">
        <li>Download the template CSV file</li>
        <li>Fill in your seat details (section, row, seat number, etc.)</li>
        <li>Upload the completed file or paste the data</li>
        <li>Review the preview and fix any errors</li>
        <li>Click "Import Seats" to add all seats to the venue</li>
      </ol>
    </div>

    <!-- Template Download -->
    <div class="mb-4">
      <Button
        label="Download Template"
        icon="pi pi-download"
        @click="downloadTemplate"
        class="p-button-outlined"
      />
    </div>

    <!-- File Upload -->
    <div class="mb-4">
      <FileUpload
        mode="basic"
        name="seatData"
        :auto="true"
        accept=".csv"
        :maxFileSize="5000000"
        @select="onFileSelect"
        @upload="onUpload"
        :customUpload="true"
        chooseLabel="Select CSV File"
        class="w-full"
      />
    </div>

    <!-- Progress and Status -->
    <div v-if="loading" class="mb-4">
      <ProgressBar :value="uploadProgress" class="mb-2" />
      <p class="text-sm text-gray-600">{{ statusMessage }}</p>
    </div>

    <!-- Paste Text Area Alternative -->
    <div v-if="!fileUploaded" class="mb-4">
      <h4 class="font-medium mb-2">Or paste CSV data:</h4>
      <Textarea
        v-model="pastedData"
        placeholder="section_name,row_name,seat_number,seat_type,price_zone_name,x_position,y_position&#10;Orchestra,A,1,regular,Premium,100,100"
        rows="6"
        class="w-full font-mono text-sm"
      />
      <Button
        label="Process Pasted Data"
        icon="pi pi-check"
        @click="processPastedData"
        class="mt-2"
        :disabled="!pastedData.trim()"
      />
    </div>

    <!-- Validation Errors -->
    <div v-if="validationErrors.length > 0" class="mb-4 p-3 bg-red-50 border border-red-200 rounded">
      <p class="font-medium text-red-800 mb-2">
        <i class="pi pi-exclamation-triangle mr-2"></i>
        Validation Errors ({{ validationErrors.length }}):
      </p>
      <ul class="list-disc ml-5 text-sm text-red-800 max-h-40 overflow-y-auto">
        <li v-for="(error, index) in validationErrors.slice(0, 20)" :key="index">
          {{ error }}
        </li>
      </ul>
      <p v-if="validationErrors.length > 20" class="text-sm text-red-600 mt-1">
        ... and {{ validationErrors.length - 20 }} more errors
      </p>
    </div>

    <!-- Data Preview -->
    <div v-if="parsedData.length > 0" class="mb-4">
      <h4 class="font-medium mb-2">
        Data Preview ({{ parsedData.length }} seats):
        <span v-if="validSeats.length !== parsedData.length" class="text-yellow-600">
          ({{ validSeats.length }} valid, {{ parsedData.length - validSeats.length }} with errors)
        </span>
      </h4>
      <DataTable
        :value="previewData"
        responsiveLayout="scroll"
        class="p-datatable-sm"
        :paginator="parsedData.length > 10"
        :rows="10"
      >
        <Column field="row" header="Row" style="min-width: 60px" />
        <Column field="section_name" header="Section" style="min-width: 100px">
          <template #body="{ data }">
            <span :class="{ 'text-red-600': !data.isValid && data.errors?.includes('section') }">
              {{ data.section_name }}
            </span>
          </template>
        </Column>
        <Column field="row_name" header="Row Name" style="min-width: 80px" />
        <Column field="seat_number" header="Seat #" style="min-width: 80px" />
        <Column field="seat_type" header="Type" style="min-width: 80px">
          <template #body="{ data }">
            <span :class="{ 'text-red-600': !data.isValid && data.errors?.includes('seat_type') }">
              {{ data.seat_type || 'regular' }}
            </span>
          </template>
        </Column>
        <Column field="price_zone_name" header="Price Zone" style="min-width: 100px">
          <template #body="{ data }">
            <span :class="{ 'text-red-600': !data.isValid && data.errors?.includes('price_zone') }">
              {{ data.price_zone_name || '-' }}
            </span>
          </template>
        </Column>
        <Column field="x_position" header="X" style="min-width: 60px" />
        <Column field="y_position" header="Y" style="min-width: 60px" />
        <Column header="Status" style="min-width: 100px">
          <template #body="{ data }">
            <Tag
              v-if="data.isValid"
              severity="success"
              value="Valid"
              icon="pi pi-check"
            />
            <Tag
              v-else
              severity="danger"
              value="Error"
              icon="pi pi-times"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2">
      <Button
        label="Cancel"
        icon="pi pi-times"
        class="p-button-text"
        @click="reset"
      />
      <Button
        label="Import Seats"
        icon="pi pi-upload"
        @click="processImport"
        :disabled="!canImport || processing"
        :loading="processing"
      />
    </div>

    <!-- Results Dialog -->
    <Dialog
      v-model:visible="showResults"
      header="Import Results"
      :style="{ width: '500px' }"
      modal
    >
      <div v-if="importResults">
        <div
          class="mb-4 text-center"
          :class="{
            'text-green-600': importResults.success,
            'text-red-600': !importResults.success
          }"
        >
          <i
            :class="importResults.success ? 'pi pi-check-circle' : 'pi pi-times-circle'"
            style="font-size: 3rem"
          ></i>
          <h3 class="text-xl font-bold mt-2">
            {{ importResults.success ? 'Import Complete!' : 'Import Failed' }}
          </h3>
        </div>

        <div v-if="importResults.success">
          <p class="mb-2">Successfully processed {{ importResults.total }} seats:</p>
          <ul class="list-disc ml-5 mb-4">
            <li>{{ importResults.created }} seats created</li>
            <li v-if="importResults.skipped > 0" class="text-yellow-600">
              {{ importResults.skipped }} seats skipped (duplicates or errors)
            </li>
          </ul>
        </div>

        <div v-else>
          <p class="mb-2">Error: {{ importResults.error }}</p>
        </div>

        <div
          v-if="importResults.warnings && importResults.warnings.length > 0"
          class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded max-h-60 overflow-y-auto"
        >
          <p class="font-medium text-yellow-800 mb-1">Warnings:</p>
          <ul class="list-disc ml-5 text-sm text-yellow-800">
            <li v-for="(warning, index) in importResults.warnings" :key="index">
              {{ warning }}
            </li>
          </ul>
        </div>

        <div class="flex justify-end">
          <Button label="Close" @click="closeResults" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Papa from 'papaparse'
import type { VenueSection, PriceZone } from '~/types/ticketing'

// Props
const props = defineProps<{
  venueId: string
  sections: VenueSection[]
  priceZones: PriceZone[]
}>()

// Emits
const emit = defineEmits<{
  'import-complete': []
  cancel: []
}>()

// State
const fileUploaded = ref(false)
const loading = ref(false)
const processing = ref(false)
const uploadProgress = ref(0)
const statusMessage = ref('')
const parsedData = ref<any[]>([])
const pastedData = ref('')
const importResults = ref<any>(null)
const showResults = ref(false)
const validationErrors = ref<string[]>([])

// Seat types enum
const VALID_SEAT_TYPES = ['regular', 'ada', 'house', 'blocked']

// Computed properties
const validSeats = computed(() => {
  return parsedData.value.filter((seat) => seat.isValid)
})

const previewData = computed(() => {
  return parsedData.value.map((seat, index) => ({
    ...seat,
    row: index + 1
  }))
})

const canImport = computed(() => {
  return validSeats.value.length > 0 && !processing.value
})

// Methods
function downloadTemplate() {
  const templateData = [
    'section_name,row_name,seat_number,seat_type,price_zone_name,x_position,y_position',
    'Orchestra,A,1,regular,Premium,100,100',
    'Orchestra,A,2,regular,Premium,120,100',
    'Orchestra,B,1,regular,Standard,100,120',
    'Balcony,A,1,regular,Economy,100,50'
  ].join('\n')

  const blob = new Blob([templateData], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'seat_import_template.csv'
  link.click()
  window.URL.revokeObjectURL(url)
}

function onFileSelect(event: any) {
  const file = event.files[0]
  if (!file) return

  fileUploaded.value = true
  loading.value = true
  uploadProgress.value = 20
  statusMessage.value = 'Reading file...'

  const reader = new FileReader()

  reader.onload = function (e) {
    try {
      const text = e.target?.result as string
      parseCsvData(text)
      uploadProgress.value = 100
      statusMessage.value = 'File processed successfully'
      setTimeout(() => {
        loading.value = false
      }, 500)
    } catch (error: any) {
      statusMessage.value = `Error: ${error.message}`
      loading.value = false
    }
  }

  reader.readAsText(file)
}

function onUpload() {
  // This is just a stub as we're using customUpload=true
  // Actual file processing happens in onFileSelect
}

function parseCsvData(csvText: string) {
  Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      if (results.data.length === 0) {
        statusMessage.value = 'No data found in the CSV file'
        return
      }

      // Validate and process each row
      const processedData: any[] = []
      const errors: string[] = []

      results.data.forEach((row: any, index: number) => {
        const rowNum = index + 2 // +2 because index starts at 0 and header is row 1
        const rowErrors: string[] = []
        let isValid = true

        // Required fields validation
        if (!row.section_name || !row.section_name.trim()) {
          errors.push(`Row ${rowNum}: Missing section_name`)
          rowErrors.push('section')
          isValid = false
        }

        if (!row.row_name || !row.row_name.trim()) {
          errors.push(`Row ${rowNum}: Missing row_name`)
          rowErrors.push('row')
          isValid = false
        }

        if (!row.seat_number || !row.seat_number.trim()) {
          errors.push(`Row ${rowNum}: Missing seat_number`)
          rowErrors.push('seat_number')
          isValid = false
        }

        // Validate section exists
        const section = props.sections.find(
          (s) => s.name.toLowerCase() === row.section_name?.toLowerCase().trim()
        )
        if (row.section_name && !section) {
          errors.push(
            `Row ${rowNum}: Section "${row.section_name}" not found. Available: ${props.sections.map((s) => s.name).join(', ')}`
          )
          rowErrors.push('section')
          isValid = false
        }

        // Validate seat type
        const seatType = row.seat_type?.toLowerCase().trim() || 'regular'
        if (!VALID_SEAT_TYPES.includes(seatType)) {
          errors.push(
            `Row ${rowNum}: Invalid seat_type "${row.seat_type}". Must be one of: ${VALID_SEAT_TYPES.join(', ')}`
          )
          rowErrors.push('seat_type')
          isValid = false
        }

        // Validate price zone (optional but must exist if provided)
        let priceZone = null
        if (row.price_zone_name && row.price_zone_name.trim()) {
          priceZone = props.priceZones.find(
            (pz) => pz.name.toLowerCase() === row.price_zone_name.toLowerCase().trim()
          )
          if (!priceZone) {
            errors.push(
              `Row ${rowNum}: Price zone "${row.price_zone_name}" not found. Available: ${props.priceZones.map((pz) => pz.name).join(', ')}`
            )
            rowErrors.push('price_zone')
            isValid = false
          }
        }

        // Parse position values
        const xPosition = row.x_position ? parseFloat(row.x_position) : null
        const yPosition = row.y_position ? parseFloat(row.y_position) : null

        if (row.x_position && isNaN(xPosition!)) {
          errors.push(`Row ${rowNum}: Invalid x_position "${row.x_position}"`)
          rowErrors.push('x_position')
          isValid = false
        }

        if (row.y_position && isNaN(yPosition!)) {
          errors.push(`Row ${rowNum}: Invalid y_position "${row.y_position}"`)
          rowErrors.push('y_position')
          isValid = false
        }

        processedData.push({
          section_name: row.section_name?.trim(),
          section_id: section?.id,
          row_name: row.row_name?.trim(),
          seat_number: row.seat_number?.trim(),
          seat_type: seatType,
          price_zone_name: row.price_zone_name?.trim() || null,
          price_zone_id: priceZone?.id || null,
          x_position: xPosition,
          y_position: yPosition,
          isValid,
          errors: rowErrors
        })
      })

      parsedData.value = processedData
      validationErrors.value = errors
    },
    error: function (error: any) {
      statusMessage.value = `Error parsing CSV: ${error.message}`
    }
  })
}

function processPastedData() {
  if (!pastedData.value.trim()) return

  loading.value = true
  uploadProgress.value = 20
  statusMessage.value = 'Processing pasted data...'

  try {
    parseCsvData(pastedData.value)
    uploadProgress.value = 100
    statusMessage.value = 'Data processed successfully'
    setTimeout(() => {
      loading.value = false
    }, 500)
  } catch (error: any) {
    console.error('Paste processing error:', error)
    statusMessage.value = `Error: ${error.message}`
    loading.value = false
  }
}

async function processImport() {
  if (!canImport.value) return

  processing.value = true
  statusMessage.value = 'Importing seats...'

  try {
    // Format seat data for API
    const seatsToImport = validSeats.value.map((seat) => ({
      venue_id: props.venueId,
      section_id: seat.section_id,
      row_name: seat.row_name,
      seat_number: seat.seat_number,
      seat_type: seat.seat_type,
      price_zone_id: seat.price_zone_id,
      is_sellable: seat.seat_type !== 'blocked' && seat.seat_type !== 'house',
      x_position: seat.x_position,
      y_position: seat.y_position
    }))

    // Call API endpoint
    const { data, error } = await useFetch(`/api/venues/${props.venueId}/seats/import`, {
      method: 'POST',
      body: {
        seats: seatsToImport
      }
    })

    if (error.value) {
      throw new Error(error.value.statusMessage || 'Import failed')
    }

    const result = data.value as any

    // Show results
    importResults.value = {
      success: true,
      total: seatsToImport.length,
      created: result.created || 0,
      skipped: result.skipped?.length || 0,
      warnings: result.skipped?.map(
        (s: any) => `Seat ${s.seat.row_name}${s.seat.seat_number} (${s.seat.section_name}): ${s.error}`
      ) || []
    }

    showResults.value = true

    // Emit complete event
    emit('import-complete')
  } catch (error: any) {
    console.error('Import error:', error)
    importResults.value = {
      success: false,
      error: error.message || 'Unknown error occurred'
    }
    showResults.value = true
  } finally {
    processing.value = false
  }
}

function reset() {
  fileUploaded.value = false
  loading.value = false
  processing.value = false
  uploadProgress.value = 0
  statusMessage.value = ''
  parsedData.value = []
  pastedData.value = ''
  validationErrors.value = []
  emit('cancel')
}

function closeResults() {
  showResults.value = false

  // If successful, reset the form
  if (importResults.value && importResults.value.success) {
    reset()
  }
}
</script>
