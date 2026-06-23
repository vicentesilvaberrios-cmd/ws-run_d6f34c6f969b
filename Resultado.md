# Resultado.md — Flappy Bird Web Game

## Resumen

Se construyó un juego web **Flappy Bird** jugable 100% en el cliente usando **Next.js 14 (App Router) + TypeScript + Canvas HTML5**. No hay backend, base de datos ni endpoints API. El estado del juego vive en memoria (`useRef`) y el mejor puntaje se persiste en `localStorage` del navegador. La estética es retro pixel-art con tipografía `"Press Start 2P"` (Google Fonts) y `imageSmoothingEnabled = false`.

---

## Stack confirmado

| Aspecto | Valor |
|---|---|
| Framework | Next.js `^14.2.35` (App Router) |
| Lenguaje | TypeScript `^5.6.2` |
| UI | React `^18.3.1`, Canvas 2D |
| Persistencia | `localStorage` (clave `flappy_best_score`) |
| Fuente | `"Press Start 2P"` vía Google Fonts, fallback `monospace` |
| Backend | Ninguno (100% client-side) |

---

## Archivos generados

| Archivo | Descripción |
|---|---|
| `package.json` | Dependencias: `next`, `react`, `react-dom`, `typescript`, types. Scripts `dev`/`build`/`start`/`lint`. |
| `tsconfig.json` | Configuración TypeScript del proyecto. |
| `next.config.mjs` | Configuración Next.js. |
| `next-env.d.ts` | Tipos de entorno Next.js. |
| `app/layout.tsx` | Layout raíz: metadata, viewport, importación de fuente `Press Start 2P`, `<html lang="es">`. |
| `app/page.tsx` | Página única en ruta `/` que renderiza `<FlappyBirdGame />` dentro de `<main className="flappy-stage">`. |
| `app/not-found.tsx` | Página 404 con estilo retro y botón "Volver al juego". |
| `app/globals.css` | Design system base + estilos retro del juego: paleta pixel-art, escalado responsivo del canvas (`aspect-ratio: 400/600`), overlays, botones pixel-art, animaciones de parpadeo, soporte `prefers-reduced-motion`. |
| `app/components/FlappyBirdGame.tsx` | **Componente principal** (`"use client"`): toda la lógica del juego. |
| `design/UX_PLAN.md` | Documento de plan UX. |
| `design/UX_GUIDELINES.md` | Guías de diseño UX. |
| `spec.md` | Especificación funcional del proyecto. |
| `plan.json` | Plan de ejecución (backend, frontend, criterios de aceptación). |

---

## Funcionalidad construida por épica/módulo

### E2.1 — Bucle de Juego y Motor de Render
- Loop de animación con `requestAnimationFrame` activo desde el montaje del componente.
- Canvas 2D con dimensiones internas fijas 400×600 escaladas por CSS (`aspect-ratio`).
- Gestión de estados: `READY` (inicio), `PLAYING` (jugando), `GAME_OVER` (fin).
- Función `reset()` que reinicia `bird`, `pipes`, `score`, `frame`, `groundOffset` y `state`.

### E2.2 — Pájaro y Físicas
- Entidad `bird` con `y`, `velocity`, `rotation`.
- Gravedad constante (`0.45`) aplicada cada frame con `MAX_FALL = 10`.
- Acción `flap`: `velocity = -7.5` al input.
- Rotación visual: `-0.4` rad al subir, hasta `+1.2` rad al caer.
- Ala se anima según signo de `velocity`.
- Colisión con techo (`y - radius <= 0`) → Game Over.

### E2.3 — Tuberías
- Generación cada 90 frames (~1.5s a 60fps) desde el borde derecho.
- `gapY` aleatorio dentro del rango válido `[PIPE_MIN_GAP_Y, PIPE_MAX_GAP_Y]`.
- Desplazamiento horizontal constante a `PIPE_SPEED = 2.2`.
- Eliminación de tuberías fuera del borde izquierdo (`x + PIPE_W < -10`).
- Dibujo con primitivas: rectángulo verde, highlight, borde pixelado, "boca" de tubería.
- Colisión círculo-vs-rectángulo (`circleRectCollide`) para tubería superior e inferior.

### E2.4 — Suelo y Techo
- Suelo como rectángulo marrón (`#8B5E3C`) de 80px en la parte inferior.
- Scroll horizontal animado con patrón de líneas diagonales.
- Colisión con suelo (`y + radius >= GROUND_Y`) → Game Over.
- Techo como límite superior del canvas.

### E2.5 — Puntuación
- Contador `score` inicia en 0.
- Incremento +1 al pasar el centro del par de tuberías (`x + PIPE_W < BIRD_X` y `!passed`).
- Marcador renderizado en canvas durante `PLAYING` y `GAME_OVER`.
- `bestScore` leído de `localStorage` (`flappy_best_score`) al montar.
- Actualización de `bestScore` y `localStorage` al pasar a `GAME_OVER` si `score > bestScore`.
- Badge "¡Nuevo récord!" mostrado en Game Over si corresponde.

### E2.6 — Inputs y Controles Responsivos
- **Escritorio**: `Space` (keydown, `preventDefault`, sin repetición) y `mousedown` en el canvas disparan `flap`.
- **Móvil**: `touchstart` en el canvas dispara `flap`.
- En `READY`, cualquier input inicia el juego y ejecuta un `flap` inicial.
- En `GAME_OVER`, botón "RETRY" (click/touch/Enter/Space) ejecuta `reset()`. También `Space` global reinicia.
- Canvas escala con CSS (`aspect-ratio: 400/600`, `max-height: 100dvh`, `image-rendering: pixelated`).
- `touch-action: none` en el canvas para evitar gestos nativos.

### E2.7 — Estilo Retro
- Paleta retro: cielo `#70c5ce`, tuberías `#5fa83d`, pájaro `#ffdf00` con borde `#1a1a1a`, suelo `#8B5E3C`.
- Tipografía `"Press Start 2P"` para marcador y textos, con fallback `monospace`.
- `imageSmoothingEnabled = false` y `image-rendering: pixelated` en CSS.
- Pantalla de inicio: "FLAPPY BIRD" + "Press Space / Tap to Start" + récord si existe.
- Pantalla de Game Over: "GAME OVER" + score + bestScore + badge récord + botón "RETRY".

### Accesibilidad
- `aria-live="polite"` para anunciar puntos y récord a lectores de pantalla.
- `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby` en overlays.
- `role="application"` y `aria-label` descriptivo en el canvas.
- Auto-focus del botón "RETRY" al entrar en Game Over.
- `prefers-reduced-motion` desactiva animaciones de parpadeo.
- Foco visible (`:focus-visible`) con outline blanco.

---

## Cómo correrlo

```bash
npm install
npm run dev      # desarrollo → http://localhost:3000
npm run build    # build de producción
npm start        # servidor de producción
npm run lint     # linter
```

**Requisito**: Next.js `^14.2.35` (ya fijado en `package.json`) para evitar CVEs que bloquean deploy en Railway.

---

## Criterios de aceptación — Estado

### E2.1 — Bucle de Juego y Motor de Render
- ✅ CA-1.1 Canvas se renderiza y el loop está activo al cargar.
- ✅ CA-1.2 El juego arranca en `READY` con pantalla de inicio.
- ✅ CA-1.3 `reset()` restablece `score=0`, `pipes=[]`, `bird` en posición inicial y `gameState`.

### E2.2 — Pájaro y Físicas
- ✅ CA-2.1 Pájaro cae por gravedad de forma continua cada frame.
- ✅ CA-2.2 Space/click/touch → velocity negativa inmediata.
- ✅ CA-2.3 Colisión con techo → `GAME_OVER`.
- ✅ CA-2.4 Rotación visual según velocity (arriba al subir, abajo al caer).

### E2.3 — Tuberías
- ✅ CA-3.1 Pares de tuberías aparecen periódicamente desde la derecha.
- ✅ CA-3.2 `gapY` aleatorio distinto entre pares.
- ✅ CA-3.3 Desplazamiento izquierdo a velocidad constante.
- ✅ CA-3.4 Tuberías fuera del borde izquierdo se eliminan.
- ✅ CA-3.5 Colisión círculo-vs-rectángulo con tubería superior/inferior → `GAME_OVER`.

### E2.4 — Suelo y Techo
- ✅ CA-4.1 Suelo dibujado como rectángulo marrón en la parte inferior.
- ✅ CA-4.2 Suelo con scroll horizontal animado.
- ✅ CA-4.3 Colisión con suelo → `GAME_OVER`.

### E2.5 — Puntuación
- ✅ CA-5.1 Marcador empieza en 0, visible durante `PLAYING`.
- ✅ CA-5.2 +1 al pasar el centro de un par sin colisión.
- ✅ CA-5.3 `bestScore` leído de `localStorage` al montar.
- ✅ CA-5.4 Actualización de `localStorage` y `bestScore` si `score > bestScore`.
- ✅ CA-5.5 Game Over muestra `score` y `bestScore`.

### E2.6 — Inputs y Controles
- ✅ CA-6.1 `Space` (keydown, `preventDefault`, sin repetición) ejecuta `flap`.
- ✅ CA-6.2 Click del mouse en el canvas ejecuta `flap`.
- ✅ CA-6.3 `touchstart` en el canvas ejecuta `flap`.
- ✅ CA-6.4 En `READY`, cualquier input arranca el juego con `flap` inicial.
- ✅ CA-6.5 Botón "RETRY" reinicia el juego a `READY`.
- ✅ CA-6.6 Canvas escala responsivamente sin deformar la relación de aspecto.

### E2.7 — Estilo Retro
- ✅ CA-7.1 Paleta retro (cielo azul, tuberías verdes, pájaro amarillo, suelo marrón).
- ✅ CA-7.2 Tipografía `"Press Start 2P"` / `monospace`.
- ✅ CA-7.3 `imageSmoothingEnabled = false` y bordes pixelados.
- ✅ CA-7.4 Pantalla de inicio con "FLAPPY BIRD" y "Press Space / Tap to Start".
- ✅ CA-7.5 Pantalla de Game Over con "GAME OVER", `score`, `bestScore` y botón "RETRY".

---

## Flujo de usuario crítico

**Flujo #1 — Camino feliz**: Abrir app → ver pantalla de inicio → Space/click/touch → jugar, sumar puntos al pasar tuberías → colisionar → ver Game Over con score y bestScore → botón "RETRY" → reiniciar. ✅ Cubierto.

**Flujo #2 — Persistencia de bestScore**: Jugar, superar récord → se escribe `localStorage` → recargar → récord persiste. ✅ Cubierto.

---

## Pendientes / Limitaciones reales

1. **Sin efectos de sonido**: La spec lo marca como fuera de alcance (opcional). No se implementaron.
2. **Sin niveles de dificultad**: Mecánica clásica única, acorde a la spec.
3. **Sin assets externos**: Todos los sprites se dibujan con primitivas de Canvas (rectángulos), no se cargan imágenes.
4. **`localStorage` en modo privado**: Si el navegador bloquea `localStorage`, el `bestScore` no persiste (manejado con `try/catch`, el juego sigue funcionando).
5. **Sin tests automatizados**: No se encontraron archivos de test en el workspace.
6. **Doble disparo pointer/click**: Se maneja con `suppressClickRef` para evitar que `pointerdown` + `click` sintético disparen dos `flap`, pero en navegadores sin soporte de Pointer Events podría haber edge cases.
7. **Canvas no soportado**: Se muestra mensaje de fallback si `getContext("2d")` retorna null.
8. **Sin deploy configurado**: No hay `Dockerfile` ni `railway.json`/`Procfile` en el workspace, aunque `package.json` tiene los scripts necesarios para deploy en Railway.

---

## Conclusión

El proyecto cumple con todos los criterios de aceptación definidos en la spec. El juego es completamente funcional: bucle de juego a 60fps, físicas del pájaro, tuberías con huecos aleatorios, colisiones, puntuación, persistencia de récord en `localStorage`, controles de escritorio y móvil, escalado responsivo y estética retro pixel-art. No hay backend ni dependencias externas más allá de Next.js/React y la fuente de Google Fonts.
