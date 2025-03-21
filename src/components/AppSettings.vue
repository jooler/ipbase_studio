<template>
  <q-card bordered style="width: 600px; height: 400px" class="column">
    <q-bar class="transparent border-bottom">
      <q-space />
      <q-btn dense size="0.5rem" round icon="close" v-close-popup />
    </q-bar>
    <q-splitter v-model="splitterModel" class="q-space">
      <template v-slot:before>
        <q-tabs v-model="tab" vertical>
          <q-tab v-for="i in settings" :key="i.name" :name="i.name" :label="i.label" />
        </q-tabs>
      </template>

      <template v-slot:after>
        <q-tab-panels v-model="tab" animated swipeable vertical>
          <q-tab-panel v-if="tab === 'azure'" name="azure" class="q-pa-none">
            <q-toolbar class="transparent">
              <q-space />
              请设置你的 Azure 语音服务信息
              <q-space />
            </q-toolbar>
            <q-list class="q-pa-xl">
              <q-item>
                <q-item-section>
                  <q-input
                    v-model="azureTtsKey"
                    type="text"
                    label="Azure TTS Key"
                    @update:model-value="updateTtsKey(azureTtsKey)"
                  />
                  <q-input
                    v-model="azureTtsRegion"
                    type="text"
                    label="Azure TTS Region"
                    @update:model-value="updateTtsRegion(azureTtsRegion)"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </q-splitter>
  </q-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import localforage from 'localforage'
import { appStore } from 'src/stores/stores'
import { useTts } from 'src/composeables/azure/useTts'

const { initVoices } = useTts()
const tab = ref('azure')
const splitterModel = ref(20)

const settings = [
  {
    name: 'azure',
    icon: 'mdi-key',
    label: 'Azure',
  },
]

const azureTtsKey = ref('')
const azureTtsRegion = ref('eastasia')

const updateTtsKey = async (value) => {
  await localforage.setItem('azureTtsKey', value)
  await restore()
  await reinit()
}

const updateTtsRegion = async (value) => {
  await localforage.setItem('azureTtsRegion', value)
  await restore()
  await reinit()
}

const restore = async () => {
  appStore.settings.azureTtsKey = await localforage.getItem('azureTtsKey')
  azureTtsKey.value = appStore.settings.azureTtsKey
  appStore.settings.azureTtsRegion =
    (await localforage.getItem('azureTtsRegion')) || appStore.settings.azureTtsRegion
  azureTtsRegion.value = appStore.settings.azureTtsRegion
}

onMounted(async () => {
  await restore()
})

const sstKey = computed(() => appStore.settings?.azureTtsKey)
const sstRegion = computed(() => appStore.settings?.azureTtsRegion)

const reinit = async () => {
  if (sstKey.value && sstRegion.value) {
    await initVoices()
  }
}
</script>
