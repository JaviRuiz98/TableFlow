# TableFlow — empaquetado nativo (Capacitor)

El mismo código Angular/Ionic se empaqueta para Android e iOS con Capacitor.

> **Branding nativo:** `appName` / cadenas Android-iOS siguen siendo «Sala Chocolatte» y `appId` `com.salachocolatte.app` hasta autorización de rebranding visual/nativo. El producto de software es TableFlow; el `webDir` de build permanece `dist/discoteca/browser` (clave Angular legacy).

## Requisitos

- Node.js 22
- Android: Android Studio + SDK + JDK compatible con el AGP de Capacitor
- iOS: macOS + Xcode

## Primera instalación

1. Configura `.env` con `SUPABASE_URL` y `SUPABASE_ANON_KEY` (públicos).
2. `npm ci`
3. `npm run build`

### Android (una vez)

```bash
npm run android:add
npm run native:assets
npm run native:sync
npm run android:open
```

### iOS (una vez, macOS)

```bash
npm run ios:add
npm run native:assets
npm run native:sync
npm run ios:open
```

## Flujo habitual

Tras cambios Angular, **no** recrees `android/` / `ios/`:

```bash
npm run native:build
```

## Identidad nativa (conservada)

| Campo | Valor actual | Notas |
|-------|--------------|-------|
| App name | Sala Chocolatte | UI store / launcher |
| App ID | `com.salachocolatte.app` | No cambiar sin autorización |
| Web output | `dist/discoteca/browser` | Coincide con `angular.json` → `outputPath` |

Iconos: `resources/icon.svg` / `resources/icon.png` vía `npm run native:assets`.

## Actualización completa

```bash
npm run native:update
```

Compila Angular, sincroniza Capacitor y regenera iconos/splash.
