<template>
  <div class="space-y-4">
    <!-- Basic Information -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="field">
        <label for="studentFirstName" class="font-medium">First Name *</label>
        <InputText
          id="studentFirstName"
          v-model="localStudent.first_name"
          class="w-full"
          :class="{ 'p-invalid': localErrors.first_name }"
          placeholder="First name"
        />
        <small v-if="localErrors.first_name" class="p-error">{{ localErrors.first_name }}</small>
      </div>

      <div class="field">
        <label for="studentLastName" class="font-medium">Last Name *</label>
        <InputText
          id="studentLastName"
          v-model="localStudent.last_name"
          class="w-full"
          :class="{ 'p-invalid': localErrors.last_name }"
          placeholder="Last name"
        />
        <small v-if="localErrors.last_name" class="p-error">{{ localErrors.last_name }}</small>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="field">
        <label for="dateOfBirth" class="font-medium">Date of Birth *</label>
        <Calendar
          id="dateOfBirth"
          v-model="birthDate"
          dateFormat="mm/dd/yy"
          :showIcon="true"
          :maxDate="new Date()"
          class="w-full"
          :class="{ 'p-invalid': localErrors.date_of_birth }"
          placeholder="MM/DD/YYYY"
        />
        <small v-if="localErrors.date_of_birth" class="p-error">{{ localErrors.date_of_birth }}</small>
      </div>

      <div class="field">
        <label for="gender" class="font-medium">Gender</label>
        <Select
          id="gender"
          v-model="localStudent.gender"
          :options="genderOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select gender"
          class="w-full"
        />
      </div>
    </div>

    <!-- Relationship to Parent -->
    <div class="field">
      <label for="relationship" class="font-medium">Relationship to You *</label>
      <Select
        id="relationship"
        v-model="localStudent.relationship"
        :options="relationshipOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select relationship"
        class="w-full"
        :class="{ 'p-invalid': localErrors.relationship }"
      />
      <small v-if="localErrors.relationship" class="p-error">{{ localErrors.relationship }}</small>
    </div>

    <div v-if="localStudent.relationship === 'other'" class="field">
      <label for="relationshipCustom" class="font-medium">Please specify relationship</label>
      <InputText
        id="relationshipCustom"
        v-model="localStudent.relationship_custom"
        class="w-full"
        placeholder="e.g., Foster parent, Family friend"
      />
    </div>

    <!-- Emergency Contact -->
    <Divider />
    <h3 class="font-semibold text-lg">Emergency Contact</h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="field">
        <label for="emergencyName" class="font-medium">Contact Name *</label>
        <InputText
          id="emergencyName"
          v-model="localStudent.emergency_contact_name"
          class="w-full"
          :class="{ 'p-invalid': localErrors.emergency_contact_name }"
          placeholder="Full name"
        />
        <small v-if="localErrors.emergency_contact_name" class="p-error">{{
          localErrors.emergency_contact_name
        }}</small>
      </div>

      <div class="field">
        <label for="emergencyPhone" class="font-medium">Contact Phone *</label>
        <InputText
          id="emergencyPhone"
          v-model="localStudent.emergency_contact_phone"
          type="tel"
          class="w-full"
          :class="{ 'p-invalid': localErrors.emergency_contact_phone }"
          placeholder="(555) 123-4567"
        />
        <small v-if="localErrors.emergency_contact_phone" class="p-error">{{
          localErrors.emergency_contact_phone
        }}</small>
      </div>
    </div>

    <div class="field">
      <label for="emergencyRelationship" class="font-medium">Relationship</label>
      <InputText
        id="emergencyRelationship"
        v-model="localStudent.emergency_contact_relationship"
        class="w-full"
        placeholder="e.g., Grandmother, Uncle"
      />
    </div>

    <!-- Medical Information (Expandable) -->
    <Divider />
    <div class="flex items-center justify-between cursor-pointer" @click="showMedical = !showMedical">
      <h3 class="font-semibold text-lg">Medical Information (Optional)</h3>
      <i :class="showMedical ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
    </div>

    <div v-if="showMedical" class="space-y-4 mt-4">
      <div class="field">
        <label for="allergies" class="font-medium">Allergies</label>
        <Textarea
          id="allergies"
          v-model="localStudent.allergies"
          rows="2"
          class="w-full"
          placeholder="List any allergies..."
        />
      </div>

      <div class="field">
        <label for="medicalConditions" class="font-medium">Medical Conditions</label>
        <Textarea
          id="medicalConditions"
          v-model="localStudent.medical_conditions"
          rows="2"
          class="w-full"
          placeholder="List any medical conditions..."
        />
      </div>

      <div class="field">
        <label for="medications" class="font-medium">Current Medications</label>
        <Textarea
          id="medications"
          v-model="localStudent.medications"
          rows="2"
          class="w-full"
          placeholder="List any current medications..."
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="field">
          <label for="doctorName" class="font-medium">Doctor Name</label>
          <InputText id="doctorName" v-model="localStudent.doctor_name" class="w-full" placeholder="Dr. Name" />
        </div>

        <div class="field">
          <label for="doctorPhone" class="font-medium">Doctor Phone</label>
          <InputText
            id="doctorPhone"
            v-model="localStudent.doctor_phone"
            type="tel"
            class="w-full"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
    </div>

    <!-- Costume Sizing (Expandable) -->
    <Divider />
    <div class="flex items-center justify-between cursor-pointer" @click="showCostume = !showCostume">
      <h3 class="font-semibold text-lg">Costume Sizing (Optional)</h3>
      <i :class="showCostume ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"></i>
    </div>

    <div v-if="showCostume" class="space-y-4 mt-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="field">
          <label for="costumeTop" class="font-medium">Top Size</label>
          <Select
            id="costumeTop"
            v-model="localStudent.costume_size_top"
            :options="clothingSizes"
            placeholder="Select size"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="costumeBottom" class="font-medium">Bottom Size</label>
          <Select
            id="costumeBottom"
            v-model="localStudent.costume_size_bottom"
            :options="clothingSizes"
            placeholder="Select size"
            class="w-full"
          />
        </div>

        <div class="field">
          <label for="shoeSize" class="font-medium">Shoe Size</label>
          <InputText id="shoeSize" v-model="localStudent.shoe_size" class="w-full" placeholder="e.g., 7.5" />
        </div>
      </div>

      <div class="field">
        <label for="height" class="font-medium">Height (inches)</label>
        <InputNumber
          id="height"
          v-model="localStudent.height_inches"
          :min="0"
          :max="96"
          placeholder="Height in inches"
          class="w-full"
        />
      </div>
    </div>

    <!-- Permissions -->
    <Divider />
    <h3 class="font-semibold text-lg mb-2">Permissions & Authorization</h3>
    <div class="space-y-2">
      <div class="field-checkbox">
        <Checkbox id="primaryContact" v-model="localStudent.primary_contact" :binary="true" />
        <label for="primaryContact" class="ml-2">I am the primary contact for this dancer</label>
      </div>

      <div class="field-checkbox">
        <Checkbox id="authorizedPickup" v-model="localStudent.authorized_pickup" :binary="true" />
        <label for="authorizedPickup" class="ml-2">I am authorized to pick up this dancer</label>
      </div>

      <div class="field-checkbox">
        <Checkbox id="financialResponsibility" v-model="localStudent.financial_responsibility" :binary="true" />
        <label for="financialResponsibility" class="ml-2">I am financially responsible for this dancer</label>
      </div>

      <div class="field-checkbox">
        <Checkbox id="medicalAuthorization" v-model="localStudent.can_authorize_medical" :binary="true" />
        <label for="medicalAuthorization" class="ml-2"
          >I can authorize emergency medical treatment for this dancer</label
        >
      </div>
    </div>

    <!-- Additional Notes -->
    <div class="field">
      <label for="notes" class="font-medium">Additional Notes</label>
      <Textarea
        id="notes"
        v-model="localStudent.notes"
        rows="3"
        class="w-full"
        placeholder="Any additional information we should know..."
      />
    </div>

    <!-- Actions -->
    <div class="flex justify-end space-x-2 pt-4">
      <Button label="Cancel" class="p-button-text" @click="$emit('cancel')" />
      <Button label="Save Dancer" icon="pi pi-check" @click="handleSave" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AddStudentForm } from '~/types/parents'

interface Props {
  modelValue?: AddStudentForm | null
}

const props = defineProps<Props>()
const emit = defineEmits(['save', 'cancel'])

// Local state
const showMedical = ref(false)
const showCostume = ref(false)
const localErrors = ref<Record<string, string>>({})

// Date handling
const birthDate = ref<Date | null>(null)

// Initialize local student data
const localStudent = ref<AddStudentForm>({
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  phone: '',
  allergies: '',
  medical_conditions: '',
  medications: '',
  doctor_name: '',
  doctor_phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  costume_size_top: '',
  costume_size_bottom: '',
  shoe_size: '',
  height_inches: undefined,
  relationship: '',
  relationship_custom: '',
  primary_contact: true,
  authorized_pickup: true,
  financial_responsibility: true,
  can_authorize_medical: true,
  notes: '',
})

// Watch for prop changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      localStudent.value = { ...newValue }
      if (newValue.date_of_birth) {
        birthDate.value = new Date(newValue.date_of_birth)
      }
    }
  },
  { immediate: true }
)

// Watch birthDate changes
watch(birthDate, (newDate) => {
  if (newDate) {
    localStudent.value.date_of_birth = newDate.toISOString().split('T')[0]
  }
})

// Options
const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
]

const relationshipOptions = [
  { label: 'Parent', value: 'parent' },
  { label: 'Legal Guardian', value: 'legal_guardian' },
  { label: 'Grandparent', value: 'grandparent' },
  { label: 'Aunt/Uncle', value: 'aunt_uncle' },
  { label: 'Sibling', value: 'sibling' },
  { label: 'Other', value: 'other' },
]

const clothingSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'Child S', 'Child M', 'Child L', 'Adult S', 'Adult M', 'Adult L']

// Validation
function validate(): boolean {
  localErrors.value = {}

  if (!localStudent.value.first_name) {
    localErrors.value.first_name = 'First name is required'
  }
  if (!localStudent.value.last_name) {
    localErrors.value.last_name = 'Last name is required'
  }
  if (!localStudent.value.date_of_birth) {
    localErrors.value.date_of_birth = 'Date of birth is required'
  }
  if (!localStudent.value.relationship) {
    localErrors.value.relationship = 'Relationship is required'
  }
  if (!localStudent.value.emergency_contact_name) {
    localErrors.value.emergency_contact_name = 'Emergency contact name is required'
  }
  if (!localStudent.value.emergency_contact_phone) {
    localErrors.value.emergency_contact_phone = 'Emergency contact phone is required'
  }

  return Object.keys(localErrors.value).length === 0
}

// Handle save
function handleSave() {
  if (validate()) {
    emit('save', { ...localStudent.value })
  }
}
</script>

<style scoped>
.field {
  @apply mb-4;
}

.field label {
  @apply block mb-2;
}
</style>
