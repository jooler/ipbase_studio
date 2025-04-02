<template>
  <div v-if="short" class="column no-wrap gap-sm q-pa-sm">

    <q-responsive v-if="short.selected?.video_files" :ratio="16 / 9">
      <ArtPlayer class="fit" :src="short.selected.video_files[0].link" :quality :options="{
        fullscreen: false,
        fullscreenWeb: false,
        pip: false,
        setting: false
      }" />
    </q-responsive>
    <q-tabs v-model="tab" align="left" :breakpoint="0" dense>
      <q-tab v-for="i in tabs" :key="i.name" :name="i.name" :label="i.label" />
    </q-tabs>
    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="metadata">
        <q-list dense>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              编号：
            </q-item-section>
            <q-item-section>{{ short.id }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              时间：
            </q-item-section>
            <q-item-section>{{ short.time }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              配音：
            </q-item-section>
            <q-item-section>{{ short.text }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              画面描述：
            </q-item-section>
            <q-item-section>{{ short.description }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              转场：
            </q-item-section>
            <q-item-section>{{ short.transition }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              构图：
            </q-item-section>
            <q-item-section>{{ short.shot_type }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              运镜：
            </q-item-section>
            <q-item-section>{{ short.motion }}</q-item-section>
          </q-item>
          <q-item>
            <q-item-section side top style="width: 6rem;">
              关键词：
            </q-item-section>
            <q-item-section>{{ short.searchKeywords }}</q-item-section>
          </q-item>
        </q-list>
      </q-tab-panel>
      <q-tab-panel name="file">
        <q-list>
          <q-item v-for="i in quality" :key="i.html">
            <q-item-section>{{ i.url.split('/').pop().split('.').slice(0, -1).join('.') }}</q-item-section>
            <q-item-section avatar>
              {{ i.html }}
            </q-item-section>
            <q-item-section side>
              <q-btn color="primary" flat dense label="下载" @click="saveFile(i.url)" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-tab-panel>
    </q-tab-panels>
  </div>
</template>
<script setup>
  import { ref, computed } from 'vue';
  import ArtPlayer from './ArtPlayer.vue'
  import { studioStore } from 'src/stores/stores'

  const tab = ref('file')
  const tabs = [
    {
      name: 'metadata',
      icon: 'mdi-info',
      label: '基础信息'
    },
    {
      name: 'file',
      icon: 'mdi-download',
      label: '资源'
    }
  ]

  const short = computed(() => studioStore.selectedCard)
  const quality = computed(() => {
    return short.value.selected.video_files.map((i, index) =>
    ({
      default: index === 0,
      html: `${i.width}P`,
      url: i.link
    }))
  })

  const saveFile = (url) => {
    let link = document.createElement('a');
    link.href = url;
    link.click();
    link = null
  }
</script>
