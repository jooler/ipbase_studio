<template>
  <q-input v-model="keyword" type="text" label="Label" />
  <q-select v-model="type" :options="types" label="Type" filled />
  <q-btn v-if="tab === 'images'" @click="handleQueryImages">Search</q-btn>
  <q-btn v-if="tab === 'videos'" @click="handleQueryVideos">Search Videos</q-btn>
  <q-btn v-if="tab === 'images'" @click="loadMoreImages">Load More</q-btn>
  <q-btn v-if="tab === 'videos'" @click="loadMoreVideos">Load More</q-btn>
  <q-tabs v-model="tab" class="text-teal">
    <q-tab v-for="tab in tabs" :key="tab.value" :name="tab.value" :label="tab.label" />
  </q-tabs>
  <q-tab-panels v-model="tab" animated>
    <q-tab-panel name="images">
      <div class="row items-center gap-sm">
        <q-img
          v-for="pic in pics"
          :key="pic.id"
          :src="pic.src.small"
          spinner-color="primary"
          spinner-size="82px"
          style="width: 100px; height: 100px"
          class="radius-xs border"
        />
      </div>
    </q-tab-panel>
    <q-tab-panel name="videos">
      <div class="column">
        <div class="row items-center gap-sm">
          <q-img
            v-for="video in videos"
            :key="video.id"
            :src="video.image"
            spinner-color="primary"
            spinner-size="82px"
            style="width: 100px; height: 100px"
            class="radius-xs border cursor-pointer"
            @click="handleVideoClick(video)"
          />
        </div>

        <q-responsive v-if="video" :ratio="16 / 9" class="full-width">
          <ArtPlayer
            :src="video.video_files[0].link"
            :poster="video.image"
            :autoplay="false"
            class="fit"
          />
        </q-responsive>
      </div>
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup>
import { ref } from 'vue'
import { usePexels } from 'src/composeables/usePexels'
import ArtPlayer from 'src/components/ArtPlayer.vue'

const tab = ref('images')
const tabs = ref([
  { label: 'Images', value: 'images' },
  { label: 'Videos', value: 'videos' },
])
const { queryImages, queryVideos } = usePexels()

const keyword = ref('')
const color = ref('red')
const locale = ref('zh-CN')
const page = ref(1)
const perPage = ref(10)
const videoPage = ref(1)
const videoPerPage = ref(10)

const type = ref({ label: 'Search', value: 'search' }) // curated, search
const types = ref([
  { label: 'Curated', value: 'curated' },
  { label: 'Search', value: 'search' },
])

const pics = ref([])
const videos = ref([])
const video = ref(null)
const handleVideoClick = (v) => {
  video.value = v
}
const handleQueryImages = async () => {
  const params = {
    query: keyword.value,
    color: color.value,
    locale: locale.value,
    page: page.value,
    per_page: perPage.value,
  }
  const res = await queryImages(type.value.value, params)
  console.log(res)
  if (res.data?.photos) {
    pics.value.push(...res.data.photos)
  }
}
const handleQueryVideos = async () => {
  const params = {
    query: keyword.value,
    color: color.value,
    locale: locale.value,
    page: videoPage.value,
    per_page: videoPerPage.value,
  }
  const res = await queryVideos(params)
  console.log('videos', res)
  if (res.data?.videos) {
    videos.value.push(...res.data.videos)
  }
}

const loadMoreImages = async () => {
  page.value++
  await handleQueryImages()
}
const loadMoreVideos = async () => {
  videoPage.value++
  await handleQueryVideos()
}
</script>
