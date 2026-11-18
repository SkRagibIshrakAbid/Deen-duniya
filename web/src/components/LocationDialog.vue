<template>
  <Dialog
    v-model:visible="isVisible"
    modal
    header="Set Your Location"
    :style="{ width: '50rem' }"
    :breakpoints="{ '960px': '75vw', '640px': '94vw' }"
  >
    <div class="location-dialog-content">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="auto"><i class="pi pi-compass"></i> Auto-Detect</Tab>
          <Tab value="city"><i class="pi pi-search"></i> Search City</Tab>
          <Tab value="manual"><i class="pi pi-pencil"></i> Manual</Tab>
        </TabList>
        <TabPanels>
          <!-- Auto Detection -->
          <TabPanel value="auto">
            <div class="tab-content">
              <p class="instruction">Allow location access to automatically detect your position.</p>

              <Message v-if="detectError" severity="error" :closable="false" class="error-message">
                {{ detectError }}
              </Message>

              <Message v-if="detectedLocation" severity="success" :closable="false" class="detected-info">
                <strong>{{ detectedLabel }}</strong><br />
                <small>{{ detectedLocation.lat.toFixed(4) }}, {{ detectedLocation.lon.toFixed(4) }}</small>
              </Message>

              <Button
                label="Detect My Location"
                icon="pi pi-map-marker"
                @click="detectLocation"
                :loading="isDetecting"
                class="full-width-button"
              />
            </div>
          </TabPanel>

          <!-- City Search -->
          <TabPanel value="city">
            <div class="tab-content">
              <p class="instruction">Search any city in the world.</p>

              <div class="search-section">
                <IconField class="full-width">
                  <InputIcon :class="isSearching ? 'pi pi-spin pi-spinner' : 'pi pi-search'" />
                  <InputText
                    v-model="citySearch"
                    placeholder="e.g. Dhaka, London, Jakarta..."
                    class="full-width"
                  />
                </IconField>
                <small v-if="searchNotice" class="search-notice">{{ searchNotice }}</small>
              </div>

              <div v-if="cityResults.length > 0" class="city-list">
                <div
                  v-for="city in cityResults"
                  :key="`${city.name}-${city.lat}-${city.lon}`"
                  class="city-item"
                  :class="{ selected: isSelected(city) }"
                  @click="selectedCity = city"
                >
                  <div class="city-info">
                    <span class="city-name">{{ city.name }}</span>
                    <span class="city-country">{{ [city.region, city.country].filter(Boolean).join(', ') }}</span>
                  </div>
                  <div class="city-coords">
                    <small>{{ city.lat.toFixed(2) }}, {{ city.lon.toFixed(2) }}</small>
                  </div>
                  <i v-if="isSelected(city)" class="pi pi-check"></i>
                </div>
              </div>

              <div v-else-if="!isSearching" class="no-results">
                <p>No cities found. Try a different search term.</p>
              </div>
            </div>
          </TabPanel>

          <!-- Manual Coordinates -->
          <TabPanel value="manual">
            <div class="tab-content">
              <p class="instruction">Enter your exact coordinates manually.</p>

              <div class="manual-inputs">
                <div class="input-group">
                  <label for="latitude">Latitude</label>
                  <InputNumber
                    inputId="latitude"
                    v-model="manualLat"
                    :min="-90"
                    :max="90"
                    :minFractionDigits="0"
                    :maxFractionDigits="6"
                    placeholder="e.g., 51.5074"
                    class="full-width"
                  />
                  <small>Range: -90 to 90</small>
                </div>

                <div class="input-group">
                  <label for="longitude">Longitude</label>
                  <InputNumber
                    inputId="longitude"
                    v-model="manualLon"
                    :min="-180"
                    :max="180"
                    :minFractionDigits="0"
                    :maxFractionDigits="6"
                    placeholder="e.g., -0.1278"
                    class="full-width"
                  />
                  <small>Range: -180 to 180</small>
                </div>

                <div class="input-group">
                  <label for="place-name">Place name (optional)</label>
                  <InputText id="place-name" v-model="manualName" placeholder="e.g., Home" class="full-width" />
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Message severity="secondary" :closable="false" class="privacy-note">
        <i class="pi pi-shield"></i>
        <strong>Privacy:</strong> Your location is stored only in this browser. To calculate prayer times,
        its coordinates are sent to the AlAdhan prayer-times API. City search text goes to Open-Meteo, and
        detected coordinates go to BigDataCloud to look up the place name. Nothing is sent anywhere else.
      </Message>
    </div>

    <template #footer>
      <Button label="Cancel" icon="pi pi-times" @click="closeDialog" text />
      <Button label="Save Location" icon="pi pi-check" @click="saveLocation" :disabled="!canSave" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useLocationStore } from '../stores/locationStore'
import { popularCities, searchCities } from '../utils/cities'
import { searchPlaces, reverseGeocode } from '../services/geocodingService'

import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Message from 'primevue/message'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['update:visible', 'location-set'])

const locationStore = useLocationStore()

const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const DEFAULT_CITIES = popularCities.slice(0, 20)

const activeTab = ref('auto')

// Auto-detect
const isDetecting = ref(false)
const detectError = ref(null)
const detectedLocation = ref(null) // { lat, lon, city, country }

// City search
const citySearch = ref('')
const cityResults = ref(DEFAULT_CITIES)
const selectedCity = ref(null)
const isSearching = ref(false)
const searchNotice = ref('')
let searchTimer = null
let searchController = null

// Manual
const manualLat = ref(null)
const manualLon = ref(null)
const manualName = ref('')

const detectedLabel = computed(() => {
  const d = detectedLocation.value
  if (!d) return ''
  return d.city ? `Detected: ${[d.city, d.country].filter(Boolean).join(', ')}` : 'Location detected'
})

const canSave = computed(() => {
  if (activeTab.value === 'auto') return detectedLocation.value !== null
  if (activeTab.value === 'city') return selectedCity.value !== null
  return manualLat.value !== null && manualLon.value !== null
})

const isSelected = (city) =>
  selectedCity.value?.lat === city.lat && selectedCity.value?.lon === city.lon

// Methods
const detectLocation = async () => {
  isDetecting.value = true
  detectError.value = null
  detectedLocation.value = null

  try {
    const { latitude, longitude } = await locationStore.requestGeolocation()
    const place = await reverseGeocode(latitude, longitude)
    detectedLocation.value = { lat: latitude, lon: longitude, ...place }
  } catch (error) {
    detectError.value = error.message
  } finally {
    isDetecting.value = false
  }
}

const runSearch = async (query) => {
  searchController?.abort()
  searchController = new AbortController()
  isSearching.value = true
  searchNotice.value = ''
  try {
    cityResults.value = await searchPlaces(query, { signal: searchController.signal })
  } catch (error) {
    if (error.name === 'AbortError') return
    // Offline or service unavailable: fall back to the built-in list
    cityResults.value = searchCities(query)
    searchNotice.value = 'Online search is unavailable, showing built-in cities.'
  } finally {
    isSearching.value = false
  }
}

watch(citySearch, (value) => {
  clearTimeout(searchTimer)
  const query = value.trim()
  if (query.length < 2) {
    searchController?.abort()
    isSearching.value = false
    searchNotice.value = ''
    cityResults.value = query ? searchCities(query) : DEFAULT_CITIES
    return
  }
  searchTimer = setTimeout(() => runSearch(query), 350)
})

const saveLocation = () => {
  if (!canSave.value) return

  if (activeTab.value === 'auto') {
    const d = detectedLocation.value
    locationStore.setLocation({
      lat: d.lat,
      lon: d.lon,
      cityName: d.city || 'My Location',
      countryName: d.country,
      type: 'auto'
    })
  } else if (activeTab.value === 'city') {
    const c = selectedCity.value
    locationStore.setLocation({
      lat: c.lat,
      lon: c.lon,
      cityName: c.name,
      countryName: c.country,
      tz: c.timezone,
      type: 'city'
    })
  } else {
    locationStore.setLocation({
      lat: manualLat.value,
      lon: manualLon.value,
      cityName: manualName.value.trim(),
      type: 'manual'
    })
  }

  emit('location-set')
  closeDialog()
}

const closeDialog = () => {
  isVisible.value = false
}

const resetState = () => {
  activeTab.value = 'auto'
  isDetecting.value = false
  detectError.value = null
  detectedLocation.value = null
  citySearch.value = ''
  cityResults.value = DEFAULT_CITIES
  selectedCity.value = null
  searchNotice.value = ''
  manualLat.value = null
  manualLon.value = null
  manualName.value = ''
}

watch(isVisible, (open) => {
  if (!open) resetState()
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

.search-notice {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-secondary);
}

.city-list {
  max-height: 22rem;
  overflow-y: auto;
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
