<template>
  <div class="relative">
    <Button
      :label="label"
      icon="pi pi-download"
      :outlined="outlined"
      :loading="loading"
      @click="toggleMenu"
      class="export-button"
    />

    <!-- Export Options Menu -->
    <div
      v-if="showMenu"
      class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
    >
      <div class="py-1">
        <button
          @click="handleExport('csv')"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <i class="pi pi-file mr-3"></i>
          Export as CSV
        </button>
        <button
          @click="handleExport('excel')"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <i class="pi pi-file-excel mr-3"></i>
          Export as Excel
        </button>
        <button
          @click="handleExport('pdf')"
          class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <i class="pi pi-file-pdf mr-3"></i>
          Export as PDF
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'

interface Props {
  label?: string
  outlined?: boolean
  reportType: string
  reportData?: any
}

interface Emits {
  (e: 'export', format: 'csv' | 'excel' | 'pdf'): void
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Export',
  outlined: true
})

const emit = defineEmits<Emits>()
const toast = useToast()

const showMenu = ref(false)
const loading = ref(false)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function closeMenu() {
  showMenu.value = false
}

async function handleExport(format: 'csv' | 'excel' | 'pdf') {
  closeMenu()
  loading.value = true

  try {
    emit('export', format)

    // Show success toast
    toast.add({
      severity: 'success',
      summary: 'Export Started',
      detail: `Exporting data to ${format.toUpperCase()}...`,
      life: 3000
    })

    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (format === 'csv') {
      exportToCSV()
    } else if (format === 'excel') {
      exportToExcel()
    } else if (format === 'pdf') {
      exportToPDF()
    }

    toast.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: `Data exported to ${format.toUpperCase()} successfully`,
      life: 3000
    })
  } catch (error) {
    console.error('Export error:', error)
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'Failed to export data. Please try again.',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

function exportToCSV() {
  if (!props.reportData) return

  // Convert data to CSV format
  const csvContent = convertToCSV(props.reportData)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadFile(blob, `${props.reportType}-report-${getTimestamp()}.csv`)
}

function exportToExcel() {
  if (!props.reportData) return

  // Use xlsx library to create Excel file
  // This is a placeholder - actual implementation would use the xlsx library
  const csvContent = convertToCSV(props.reportData)
  const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadFile(blob, `${props.reportType}-report-${getTimestamp()}.xlsx`)
}

function exportToPDF() {
  if (!props.reportData) return

  // Use jsPDF library to create PDF
  // This is a placeholder - actual implementation would use jsPDF
  toast.add({
    severity: 'info',
    summary: 'PDF Export',
    detail: 'PDF export is being prepared...',
    life: 3000
  })
}

function convertToCSV(data: any): string {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return ''
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  const headerRow = headers.join(',')

  // Convert data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header]
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

function getTimestamp(): string {
  return new Date().toISOString().split('T')[0]
}

// Close menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.export-button') && showMenu.value) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Export button styles */
.export-button {
  position: relative;
}
</style>
