# TableFlow — opción 4, Sello VIP minimalista

Recursos producidos tomando como referencia la cuarta columna de la comparativa original. **El símbolo SVG es una reconstrucción vectorial aproximada, no una extracción exacta del diseño original rasterizado.** Revisar visualmente y aprobar antes de considerarlo definitivo.

## Archivos
- `logo-primary.svg`: logo completo transparente, monograma TF + arco + estrella + TableFlow y eslogan.
- `logo-compact.svg`: monograma transparente para vistas reducidas.
- `login-background.webp`: fotografía oscura de salón VIP **recortada de una imagen generada nueva**, no del diseño original.
- `icon-email.svg`, `icon-lock.svg`, `icon-eye.svg`: iconos decorativos opcionales, no sustituir componentes funcionales sin comprobar.

## Paleta
- Negro principal: `#0B0B0F`
- Dorado champagne: `#D4AF7C`
- Blanco roto: `#F4EFE6`
- Violeta ambiental opcional: `#3B2A4A`

## Integración
Copiar los archivos en `public/brand/tableflow/` y mantener las rutas de `branding.defaults.ts`. Para el fondo, usar `background-size: cover`, ajustar `background-position` según viewport. No es necesario cambiar la lógica de autenticación. En el login hay que mantener controles y estados realmente funcionales.

## Notas
Las letras del wordmark SVG están escritas como texto SVG con fuentes sans-serif de sistema, no convertidas a contornos. Para identidad final estrictamente igual en todos los dispositivos conviene convertirlas a paths tras escoger una tipografía oficial.
