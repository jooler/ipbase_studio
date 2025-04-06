<template>
  <q-table
    flat
    square
    :rows="rows"
    :columns="columns"
    row-key="name"
    virtual-scroll
    v-model:pagination="pagination"
    :rows-per-page-options="[0]"
    class="shadow-0 transparent"
  >
    <template v-slot:body="props">
      <q-tr :props="props" :class="activeItem?.id === props.row.id ? 'bg-primary text-white' : ''">
        <q-td
          key="thumbnial"
          :props="props"
          class="cursor-pointer"
          @click="clickItem(props.row.id)"
        >
          <q-img
            v-if="props.row.thumbnial"
            :src="props.row.thumbnial"
            :ratio="16 / 9"
            width="80px"
            spinner-color="primary"
            spinner-size="82px"
          />
        </q-td>
        <q-td key="id" :props="props">
          {{ props.row.id }}
        </q-td>
        <q-td key="time" :props="props">
          {{ props.row.time }}
        </q-td>
        <q-td key="text" :props="props">
          {{ props.row.text }}
        </q-td>
        <q-td key="description" :props="props">
          {{ props.row.description }}
        </q-td>
        <q-td key="transition" :props="props">
          {{ props.row.transition }}
        </q-td>
        <q-td key="shot_type" :props="props">
          {{ props.row.shot_type }}
        </q-td>
        <q-td key="motion" :props="props">
          {{ props.row.motion }}
        </q-td>
        <q-td key="searchKeywords" :props="props">
          {{ props.row.searchKeywords }}
        </q-td>
      </q-tr>
    </template>
  </q-table>
</template>
<script setup>
import { ref, computed } from 'vue'
const { storyboardCards, activeItem } = defineProps(['storyboardCards', 'activeItem'])

const emit = defineEmits(['clickItem'])
const clickItem = (id) => {
  const card = storyboardCards.find((i) => i.id === id)
  emit('clickItem', card)
}
const pagination = ref({
  rowsPerPage: 0,
})
const columns = [
  {
    name: 'thumbnial',
    align: 'center',
    label: '参考',
    field: (row) => row.thumbnial,
    sortable: false,
  },
  {
    name: 'id',
    required: true,
    label: '编号',
    align: 'left',
    field: (row) => row.id,
    sortable: false,
  },
  { name: 'time', align: 'center', label: '时间', field: (row) => row.time, sortable: false },
  { name: 'text', align: 'left', label: '配音', field: (row) => row.text, sortable: false },
  {
    name: 'description',
    align: 'left',
    label: '画面描述',
    field: (row) => row.description,
    sortable: false,
  },
  {
    name: 'transition',
    align: 'center',
    label: '转场',
    field: (row) => row.transition,
    sortable: false,
  },
  {
    name: 'shot_type',
    align: 'center',
    label: '构图',
    field: (row) => row.shot_type,
    sortable: false,
  },
  { name: 'motion', align: 'center', label: '运镜', field: (row) => row.motion, sortable: false },
  {
    name: 'searchKeywords',
    align: 'left',
    label: '关键词',
    field: (row) => row.searchKeywords,
    sortable: false,
  },
]
const rows = computed(() => {
  return storyboardCards.map((i) => ({
    id: i.id,
    thumbnial: i.selected?.image || (i.videos && i.videos.length > 0 ? i.videos[0]?.image : null),
    time: i.time,
    text: i.text,
    description: i.description,
    transition: i.transition,
    shot_type: i.shot_type,
    motion: i.motion,
    searchKeywords: i.searchKeywords,
  }))
})

//   "id": "scene1",
//   "time": "00:00-00:10",
//   "text": "清晨五点，当城市还在沉睡时",
//   "description": "高空俯视镜头拍摄黎明时分的城市天际线，街道空无一人，楼宇轮廓逐渐清晰，晨雾在楼宇间流动",
//   "transition": "淡入",
//   "shot_type": "大全景",
//   "motion": "缓慢右移",
//   "searchKeywords": "city dawn, empty streets, morning mist, skyscrapers",
</script>
