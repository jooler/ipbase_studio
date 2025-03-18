export const useConfig = () => {
  const config = {
    apps: [
      {
        name: '声工坊',
        value: 'voice_studio',
        icon: 'graphic_eq',
        path: '/',
      },
      {
        name: 'SSML编辑器',
        value: 'ssml_editor',
        icon: 'edit_note',
        path: '/ssml-editor',
      },
    ],
  }
  return {
    config,
  }
}
