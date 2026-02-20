<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    :header="'Set Your Location'" 
    :style="{ width: '50rem' }"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
  >
    <div class="location-dialog-content">
      <!-- Location Method Tabs -->
      <TabView v-model:activeIndex="activeTab">
        <!-- Auto Detection Tab -->
        <TabPanel header="Auto-Detect">
          <div class="tab-content">
            <p class="instruction">Allow location access to automatically detect your position.</p>
            
            <div v-if="locationError" class="error-message">
              <Message severity="error" :closable="false">{{ locationError }}</Message>
            </div>
            
            <div v-if="detectedLocation" class="detected-info">
              <Message severity="success" :closable="false">
                <div>
                  <strong>Location Detected:</strong><br/>
                  Latitude: {{ detectedLocation.latitude.toFixed(4) }}<br/>
                  Longitude: {{ detectedLocation.longitude.toFixed(4) }}
                </div>
              </Message>
            </div>
            
            <Button 
              label="Detect My Location" 
              icon="pi pi-map-marker" 
              @click="detectLocation"
              :loading="isDetecting"
              class="full-width-button"
            />
          </div>
        </TabPanel>

        <!-- City Selection Tab -->
        <TabPanel header="Select City">
          <div class="tab-content">
            <p class="instruction">Search and select a city from our database.</p>
            
            <div class="search-section">
              <span class="p-input-icon-left full-width">
                <i class="pi pi-search" />
                <InputText 
                  v-model="citySearch" 
                  placeholder="Search city or country..." 
                  class="full-width"
                  @input="onCitySearch"
                />
              </span>
            </div>
            
            <div v-if="filteredCities.length > 0" class="cities-list">
              <DataView :value="filteredCities" :rows="5" paginator>
                <template #list="slotProps">
                  <div class="city-list">
                    <div 
                      v-for="city in slotProps.items" 
                      :key="`${city.name}-${city.country}`"
                      class="city-item"
                      :class="{ 'selected': selectedCity?.name === city.name }"
                      @click="selectCity(city)"
                    >
                      <div class="city-info">
                        <span class="city-name">{{ city.name }}</span>
                        <span class="city-country">{{ city.country }}</span>
                      </div>
                      <div class="city-coords">
                        <small>{{ city.lat.toFixed(2) }}, {{ city.lon.toFixed(2) }}</small>
                      </div>
                      <i v-if="selectedCity?.name === city.name" class="pi pi-check"></i>
                    </div>
                  </div>
                </template>
              </DataView>
            </div>
            
            <div v-else class="no-results">
              <p>No cities found. Try a different search term.</p>
            </div>
          </div>
        </TabPanel>

        <!-- Manual Coordinates Tab -->
        <TabPanel header="Manual Entry">
          <div class="tab-content">
            <p class="instruction">Enter your exact coordinates manually.</p>
            
            <div class="manual-inputs">
              <div class="input-group">
                <label for="latitude">Latitude</label>
                <InputNumber 
                  id="latitude"
                  v-model="manualLat" 
                  :min="-90" 
                  :max="90"
                  :minFractionDigits="2"
                  :maxFractionDigits="6"
                  placeholder="e.g., 51.5074"
                  class="full-width"
                />
                <small>Range: -90 to 90</small>
              </div>
              
              <div class="input-group">
                <label for="longitude">Longitude</label>
                <InputNumber 
                  id="longitude"
                  v-model="manualLon" 
                  :min="-180" 
                  :max="180"
                  :minFractionDigits="2"
                  :maxFractionDigits="6"
                  placeholder="e.g., -0.1278"
                  class="full-width"
                />
                <small>Range: -180 to 180</small>
              </div>
            </div>
            
            <div v-if="manualLat !== null && manualLon !== null" class="manual-preview">
              <Message severity="info" :closable="false">
                <strong>Coordinates:</strong> {{ manualLat }}, {{ manualLon }}
              </Message>
            </div>
          </div>
        </TabPanel>
      </TabView>

      <!-- Privacy Note -->
      <Message severity="info" :closable="false" class="privacy-note">
        <template #messageicon>
          <i class="pi pi-shield"></i>
        </template>
        <strong>Privacy Notice:</strong> Your location data is only used locally in your browser to calculate accurate prayer times. 
        We do not collect, store, or share your location information with any third party. 
        All data stays on your device.
      </Message>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" @click="closeDialog" text />
      <Button 
        label="Save Location" 
        icon="pi pi-check" 
        @click="saveLocation"
        :disabled="!canSave"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useLocationStore } from '../stores/locationStore'
import { popularCities, searchCities } from '../utils/cities'

import Dialog from 'primevue/dialog'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import DataView from 'primevue/dataview'
import Message from 'primevue/message'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['update:visible', 'location-set'])

const locationStore = useLocationStore()

// State
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const activeTab = ref(0)
const isDetecting = ref(false)
const locationError = ref(null)
const detectedLocation = ref(null)

const citySearch = ref('')
const filteredCities = ref([...popularCities].slice(0, 20))
const selectedCity = ref(null)

const manualLat = ref(null)
const manualLon = ref(null)

// Computed
const canSave = computed(() => {
  if (activeTab.value === 0) {
    return detectedLocation.value !== null
  } else if (activeTab.value === 1) {
    return selectedCity.value !== null
  } else if (activeTab.value === 2) {
    return manualLat.value !== null && manualLon.value !== null &&
           manualLat.value >= -90 && manualLat.value <= 90 &&
           manualLon.value >= -180 && manualLon.value <= 180
  }
  return false
})

// Methods
const detectLocation = async () => {
  isDetecting.value = true
  locationError.value = null
  detectedLocation.value = null
  
  try {
    const location = await locationStore.requestGeolocation()
    detectedLocation.value = location
  } catch (error) {
    locationError.value = locationStore.locationError
  } finally {
    isDetecting.value = false
  }
}

const onCitySearch = () => {
  if (citySearch.value.trim() === '') {
    filteredCities.value = [...popularCities].slice(0, 20)
  } else {
    filteredCities.value = searchCities(citySearch.value)
  }
}

const selectCity = (city) => {
  selectedCity.value = city
}

const saveLocation = () => {
  if (activeTab.value === 0 && detectedLocation.value) {
    // Already saved by requestGeolocation
    emit('location-set')
    closeDialog()
  } else if (activeTab.value === 1 && selectedCity.value) {
    locationStore.setCityLocation(
      selectedCity.value.name,
      selectedCity.value.country,
      selectedCity.value.lat,
      selectedCity.value.lon
    )
    emit('location-set')
    closeDialog()
  } else if (activeTab.value === 2 && manualLat.value !== null && manualLon.value !== null) {
    locationStore.setManualLocation(manualLat.value, manualLon.value)
    emit('location-set')
    closeDialog()
  }
}

const closeDialog = () => {
  isVisible.value = false
  resetState()
}

const resetState = () => {
  activeTab.value = 0
  isDetecting.value = false
  locationError.value = null
  detectedLocation.value = null
  citySearch.value = ''
  filteredCities.value = [...popularCities].slice(0, 20)
  selectedCity.value = null
  manualLat.value = null
  manualLon.value = null
}

// Watch for dialog close
watch(isVisible, (newVal) => {
  if (!newVal) {
    resetState()
  }
})
</script>

<style scoped>
.location-dialog-content {
  padding: 1rem 0;
}

.tab-content {
  padding: 1.5rem 0;
}

.instruction {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
}

.full-width-button {
  width: 100%;
  margin-top: 1rem;
}

.error-message,
.detected-info {
  margin: 1rem 0;
}

.privacy-note {
  margin-top: 1.5rem;
}

.privacy-note :deep(.p-message-text) {
  font-size: 0.875rem;
  line-height: 1.5;
}

.search-section {
  margin-bottom: 1.5rem;
}

.full-width {
  width: 100%;
}

.cities-list {
  margin-top: 1rem;
}

.city-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.city-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s;
}

.city-item:hover {
  border-color: var(--primary-color);
  background-color: var(--bg-color);
}

.city-item.selected {
  border-color: var(--primary-color);
  background-color: rgba(44, 95, 45, 0.1);
}

.city-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.city-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.city-country {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.city-coords {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.city-item i {
  color: var(--primary-color);
  font-size: 1.25rem;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.manual-inputs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 600;
  color: var(--text-color);
}

.input-group small {
  color: var(--text-secondary);
}

.manual-preview {
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .city-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
