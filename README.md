# AI Studio for voice (ai-studio)

A Quasar Project

## Install the dependencies

```bash
yarn
# or
npm install
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

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

## Environment Variables

This project uses environment variables through `.env` files. To set up your environment:

1. Copy `.env.example` to `.env`
2. Modify the values in `.env` as needed for your environment
3. The application will load these variables during development and build

Available environment variables:

- `API_URL`: The base URL for API requests
- `APP_NAME`: The name of the application
- `APP_MODE`: The current mode (development, production, etc.)

To use environment variables in your components:

```js
// Access environment variables in Vue components
const apiUrl = import.meta.env.API_URL
```
