# IPBase Studio for voice (ipbase-studio)

![image](https://github.com/user-attachments/assets/97b8635a-55ba-4535-97af-00e29eb23417)

# [在线访问](https://studio.yihu.team)

# 项目说明:

这是一个基于 微软 Azure 语音服务 的文字转语音（TTS）前端应用程序，使用 Quasar 框架 构建，支持多种平台的无缝用户体验。应用程序支持以下三种部署模式：

- **单页面应用（SPA）**： 提供快速响应的网页体验，支持动态内容加载。
- **渐进式网页应用（PWA）**： 具备离线功能、推送通知，并在任何设备上提供类似原生应用的体验。
- **Electron：** 支持 Windows、macOS 和 Linux 的桌面应用部署，确保跨平台兼容性。
该应用程序利用强大的 微软 Azure 语音 API，将文字转换为自然流畅的语音，提供高质量且可自定义的语音合成功能。其模块化设计和 Quasar 丰富的 UI 组件确保了简洁、直观且用户友好的界面。

## 主要功能：

- 使用微软 Azure 语音服务实现文字转语音。
- 支持多平台部署（SPA、PWA、Electron）。
- 可自定义语音选项（语言、声音类型、速度、音调）。
- 离线功能（PWA 模式）。
- 跨平台桌面应用兼容性（Electron）。
- 基于 Quasar 框架的响应式现代 UI。
- 该项目非常适合开发者和企业，为其工作流程集成文字转语音功能提供了一个可扩展、跨平台的解决方案。

## 依赖安装

```bash
yarn
# or
npm install
# or
pnpm install
# or
bun install
```

### 启动本地开发环境

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### 格式化代码

```bash
yarn format
# or
npm run format
```

### 编译

```bash
quasar build  // SPA
quasar build -m pwa  // PWA
quasar build -m electron  // Electron
```

### Quasar 更多配置

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).


