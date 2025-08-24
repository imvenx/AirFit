# Quasar App (bubble-bop)

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

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

# BUILD CAPACITOR:

- increase versionCode in build.gradle
- open android studio:
  npx quasar dev -m capacitor -T android
- then build
  npx quasar build -m capacitor -T android
- then on android studio generate signed app bundle

# Generate Icon:

npx @quasar/icongenie generate -i ./playstore/images/test2.png --padding 10