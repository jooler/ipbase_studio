import { ref } from 'vue'
export const useStudio = () => {
  const storyboardCards = ref([])
  const selectedCard = ref(null)
  const runMode = ref('tts') // tts, storyboard

  return {
    storyboardCards,
    selectedCard,
    runMode,
  }
}
