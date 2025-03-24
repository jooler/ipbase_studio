<template>
  <q-card bordered style="width: 600px; height: 400px" class="column">
    <q-bar class="transparent border-bottom">
      设置
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
            <q-list class="q-pa-xl">
              <q-item>
                <q-item-section>
                  <q-item-label>Azure 语音服务信息</q-item-label>
                  <q-item-label caption lines="2" class="text-deep-orange"
                    >您可以使用自己的Azure服务，忽略站点的用量限制</q-item-label
                  >
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-input
                    v-model="azureTtsKey"
                    type="text"
                    outlined
                    label="语音服务密钥（Azure TTS Key）"
                    @update:model-value="updateTtsKey(azureTtsKey)"
                  />
                  <q-input
                    v-model="azureTtsRegion"
                    type="text"
                    outlined
                    label="语音服务终结点（Azure TTS Region）"
                    class="q-mt-sm"
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
  await appStore.restoreSettings()
  azureTtsKey.value = appStore.settings?.azureTtsKey
  azureTtsRegion.value = appStore.settings?.azureTtsRegion
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
