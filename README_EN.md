# IPBase Studio for voice (ipbase-studio)

![image](https://github.com/user-attachments/assets/97b8635a-55ba-4535-97af-00e29eb23417)

# [在线体验](https://studio.yihu.team)

# Project Description:

This is a front-end application for text-to-speech (TTS) conversion based on Microsoft Azure Speech Services. Built using the Quasar Framework, it offers a versatile and seamless user experience across multiple platforms. The application supports three deployment modes:

- **Single-Page Application (SPA)**: Delivers a fast and responsive web experience with dynamic content loading.
- **Progressive Web App (PWA)**: Provides offline capabilities, push notifications, and an app-like experience on any device.
- **Electron**: Enables desktop application deployment for Windows, macOS, and Linux, ensuring cross-platform compatibility.
The application leverages the powerful Microsoft Azure Speech API to convert text into natural-sounding speech, offering high-quality voice synthesis with customizable settings. Its modular design and Quasar's rich UI components ensure a clean, intuitive, and user-friendly interface.

## Key Features:

- Text-to-speech conversion using Microsoft Azure Speech Services.
- Multi-platform support (SPA, PWA, Electron).
- Customizable voice options (language, voice type, speed, pitch).
- Offline functionality (PWA mode).
- Cross-platform desktop compatibility (Electron).
- Responsive and modern UI powered by Quasar Framework.
- This project is ideal for developers and businesses seeking a scalable, cross-platform solution for integrating text-to-speech functionality into their workflows.

## Install the dependencies

```bash
yarn
# or
npm install
# or
pnpm install
# or
bun install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the for production

```bash
quasar build  // SPA
quasar build -m pwa  // PWA
quasar build -m electron  // Electron
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).


