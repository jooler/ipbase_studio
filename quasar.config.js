// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers'
import { fileURLToPath } from 'node:url'
import path from 'path'
// import { VueMcp } from 'vite-plugin-vue-mcp'
// import { loadEnv } from 'vite'

export default defineConfig((ctx) => {
  // Load env file based on mode
  // https://vitejs.dev/guide/env-and-mode.html
  // const env = loadEnv(ctx.mode, process.cwd(), '')

  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: ['i18n', 'fingerprint', 'axios', 'service', 'file-manager'],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      // extendViteConf (viteConf) {},
      // viteVuePluginOptions: {},
      extendViteConf(viteConf) {
        viteConf.esbuild = {
          drop: ['console', 'debugger'],
        }
      },

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.modeName === 'ssr',

            // you need to set i18n resource including paths !
            include: [fileURLToPath(new URL('./src/i18n', import.meta.url))],
          },
        ],

        [
          'vite-plugin-checker',
          {
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],

        // [
        //   VueMcp,
        //   {
        //     host: 'localhost',
        //     port: 3039,
        //     printUrls: true,
        //   },
        // ],
      ],
      // vitePluginOptions: {
      //   // Ensures SharedArrayBuffer works in production build
      //   optimizeDeps: {
      //     include: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
      //   },
      // },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      // open: true, // opens browser window automatically
      // port: 9000,
      // proxy: {
      //   '/__mcp': {
      //     target: 'http://localhost:3039',
      //     changeOrigin: true,
      //     ws: true,
      //   },
      // },
      // https: true,
      // key: fs.readFileSync('/Volumes/StoragePool/www/server.key'),
      // cert: fs.readFileSync('/Volumes/StoragePool/www/server.crt'),
      // ca: fs.readFileSync('/Volumes/StoragePool/www/ca.crt'),

      headers: {
        // 'Cross-Origin-Opener-Policy': 'same-origin',
        // 'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // Vite specific config for SharedArrayBuffer (optional but recommended)
      // vitePluginOptions: {
      //   // Ensures SharedArrayBuffer works in dev mode
      //   optimizeDeps: {
      //     include: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
      //   },
      // },
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {
        dark: true,
      },

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: [
        'Notify',
        'Meta',
        'Dark',
        'Dialog',
        'AppVisibility',
        'Platform',
        'Screen',
        'Loading',
        'LoadingBar',
      ],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render', // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: false,
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW', // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      // extendElectronMainConf (esbuildConf) {},
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ['electron-preload'],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'builder', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration
        appId: 'com.ipbase.studio',
        productName: 'ipbase_studio',
        copyright: 'Copyright © 2024 IPBase',
        asar: true,
        protocols: {
          name: 'ipbase-protocol',
          schemes: ['ipbase', 'wss', 'ws'],
        },
        // files: [
        //   'dist/electron/**/*'
        // ],
        dmg: {
          contents: [
            {
              x: 130,
              y: 220,
            },
            {
              x: 410,
              y: 220,
              type: 'link',
              path: '/Applications',
            },
          ],
        },
        mac: {
          icon: fileURLToPath(new URL('./src-electron/icons/icon.icns', import.meta.url)),
          target: ['dmg'],
          identity: null, // 跳过签名步骤
        },
        win: {
          artifactName: '${productName}-${version}.${ext}',
          target: [
            {
              target: 'nsis',
              arch: ['x64'],
            },
          ],
          // target: "msi",
          icon: fileURLToPath(new URL('./src-electron/icons/icon.ico', import.meta.url)),
          requestedExecutionLevel: 'requireAdministrator',
        },

        linux: {
          target: [
            // 'AppImage',
            'rpm',
            // 'deb',
            // {
            //   target: 'flatpak',
            //   arch: ['x64'],
            // },
          ],
          category: 'Development',
          maintainer: 'auxcc <jerr@foxmail.com>',
          vendor: 'IPBase',
          synopsis: 'IPBase Desktop Application',
          extraResources: ['--input-charset=UTF8'],
        },
        flatpak: {
          base: 'org.electronjs.Electron2.BaseApp',
          baseVersion: '22.08',
          runtime: 'org.freedesktop.Platform',
          runtimeVersion: '22.08',
          sdk: 'org.freedesktop.Sdk',
          finishArgs: [
            '--share=network',
            '--share=ipc',
            '--socket=x11',
            '--socket=wayland',
            '--device=dri',
          ],
        },
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: [],
    },

    vite: {
      worker: {
        format: 'es', // 使用 ES 模块格式
        plugins: [], // 如果需要在 worker 中使用其他插件
      },
      plugins: [],
      resolve: {
        alias: {
          '@': path.join(__dirname, './src'),
        },
      },
    },
  }
})
