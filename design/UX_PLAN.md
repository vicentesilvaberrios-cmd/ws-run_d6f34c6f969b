# Plan UX — Flappy Bird (Web, Canvas)

> Juego de una sola pantalla con tres estados (`READY` / `PLAYING` / `GAME_OVER`) superpuestos sobre el mismo canvas. Sin backend, sin rutas adicionales.

## 0. Principios rectores
- **Idioma:** todo el copy visible en **español**, sin jerga técnica (nada de "API", "submit", "estado", etc.).
- **Design system:** reutilizar `.btn`, `.btn-primary`, `.card`, `.badge`, `.kpi`, `.empty-state` y tokens (`--brand`, `--sp-*`) del baseline; añadir **solo** las clases retro estrictamente necesarias en `globals.css`.
- **Estética:** pixel-art retro (paleta fija, `imageSmoothingEnabled = false`, tipografía `"Press Start 2P"` + fallback `monospace`).
- **a11y:** overlays HTML para los estados de inicio y fin (mejor que texto en canvas); teclado, mouse, touch; foco visible; `prefers-reduced-motion` respetado.

---

## 1. Pantalla única — `app/page.tsx` (ruta `/`)

- **Objetivo:** entregar el juego completo, listo para jugar, en una sola vista.
- **Componente:** `<FlappyBirdGame />` (client component), centrado en el viewport.
- **Layout:**
  - Contenedor `.flappy-stage` (`display:flex; align-items:center; justify-content:center; height:100dvh; width:100vw; overflow:hidden`).
  - Canvas interno **400×600** con `aspect-ratio: 400/600`, `height: 100%`, `max-width: 100%` (letterbox horizontal en pantallas anchas).
  - Fondo retro de cielo (color plano o tileable) detrás del canvas.
- **Metadata (`app/layout.tsx`):** título "Flappy Bird — Juego retro", descripción "Salta, esquiva tuberías y consigue la mejor marca".
- **Layout raíz:** fuente `"Press Start 2P"` importada en `<head>`; `body { overflow:hidden; background: <cielo>; font-family: "Press Start 2P", monospace; }`.

---

## 2. Estado READY — Pantalla de inicio

- **Objetivo:** invitar al usuario a jugar con un solo input.
- **Render:** overlay HTML semitransparente sobre el canvas (no texto dentro del canvas) para accesibilidad.
- **Estructura del overlay:**
  - `<h1>` "**FLAPPY BIRD**" (pixel grande, centrado).
  - `<p>` "**Presiona Espacio o toca la pantalla para empezar**".
  - Indicador de "Mejor marca" si `bestScore > 0`: "Tu récord: **N** puntos".
- **Animación:** pájaro del canvas flotando (idle); texto de la instrucción con **parpadeo sutil** (1 Hz). Desactivar bajo `prefers-reduced-motion`.
- **Inputs (cualquiera inicia el juego):**
  - Tecla `Space` (`keydown`, `preventDefault` para evitar scroll).
  - `click` sobre el canvas / overlay.
  - `touchstart` sobre el canvas / overlay.
  - En todos los casos: `READY → PLAYING` + flap inicial.
- **a11y:** overlay con `role="dialog" aria-labelledby="flappy-title" aria-describedby="flappy-hint"`; botón oculto `<button class="sr-only">Comenzar partida</button>` que recibe foco al montar.

---

## 3. Estado PLAYING — Partida activa

- **Objetivo:** jugar; el canvas muestra pájaro, tuberías, suelo y marcador.
- **Render:** solo canvas. **Sin** overlays.
- **Marcador (HUD):**
  - Texto grande "**Puntos: N**" en la parte superior central del canvas (dibujado con `fillText` en el propio canvas, fuente `"Press Start 2P"`).
  - No persistente en pantalla: cuando el juego termina, se muestra completo en Game Over.
- **Inputs:** los mismos que en READY (Space / click / touch) → ejecutan `flap` (`velocity = -flapStrength`).
- **Sin barras de progreso, sin menús:** la partida se vive dentro del canvas.

---

## 4. Estado GAME_OVER — Pantalla de fin

- **Objetivo:** mostrar resultado, mejor marca y permitir reiniciar.
- **Render:** overlay HTML centrado sobre canvas congelado.
- **Estructura del overlay (`.card` retro):**
  - `<h2>` "**Fin de la partida**" (no "Game Over crudo"; sí допустимо el trofeo/emoji pixel si se quiere).
  - Bloque `.kpi`:
    - `.value` = "**Puntos: N**" (esta partida).
    - `.label` = "Esta partida".
  - Bloque `.kpi`:
    - `.value` = "**Mejor marca: M**".
    - `.label` = "Tu récord personal".
  - **Si** `score > bestScore` previo: `.badge .badge-ok` "¡Nuevo récord!".
  - Botón `.btn .btn-primary .btn-block` "**Volver a jugar**" (RETRY).
- **Comportamiento del botón:**
  - `click` / `touchstart` / `Enter` / `Space` → ejecuta `reset()` → vuelve a `READY` (o `PLAYING` directo, según F6.4).
- **a11y:**
  - Overlay `role="dialog" aria-modal="true" aria-labelledby="go-title" aria-describedby="go-summary"`.
  - **Foco automático** al botón "Volver a jugar" al entrar en `GAME_OVER` (`element.focus()`).
  - Texto oculto adicional para lectores de pantalla: "Has conseguido N puntos. Tu mejor marca es M. Pulsa Volver a jugar para reiniciar."

---

## 5. Marcador y mejor marca (`localStorage`)

- **Clave:** `flappy_best_score` (número stringificado).
- **Lectura:** en `useEffect` de mount (cliente, nunca en SSR). Si falla o no existe → `bestScore = 0` silencioso.
- **Escritura:** al pasar a `GAME_OVER`, **solo si** `score > bestScore` → actualizar estado + `localStorage.setItem`.
- **Mostrar mejor marca:**
  - En READY (si `> 0`): bajo la instrucción de inicio.
  - En GAME_OVER: siempre.
  - **Nunca** durante `PLAYING` (distrae).

---

## 6. Estados de carga, vacío y error

- **Cargando:** flash inicial mínimo. Si el canvas aún no montó: texto pequeño "Cargando partida…" (`.empty-state`) detrás del canvas; desaparece al primer frame.
- **Vacío:** no aplica (es un juego, siempre hay partida disponible).
- **Error:** no hay errores de red. **Si `localStorage` falla** (modo privado del navegador) → seguir jugando con `bestScore = 0` en memoria, sin `.alert` visible (sería ruido).
- **Sin permisos / sin canvas:** el `<canvas>` degradaría a un mensaje "Tu navegador no soporta Canvas. Prueba con otro navegador." (`.alert .alert-error`).

---

## 7. Inputs y controles (resumen unificado)

| Input | READY | PLAYING | GAME_OVER |
|---|---|---|---|
| `Space` (keydown) | Inicia partida + flap inicial | Flap | Reinicia (si foco en botón) |
| Click en canvas / overlay | Inicia + flap | Flap | (ignorar; usar botón) |
| `touchstart` en canvas / overlay | Inicia + flap | Flap | (usar botón) |
| Click / Enter en botón "Volver a jugar" | — | — | Reinicia |

- `preventDefault()` siempre en `keydown` de `Space` (evitar scroll).
- No repeat: si `Space` se mantiene pulsado, solo se cuenta el primer `keydown`.

---

## 8. Responsive

- **Mobile-first:** el canvas ocupa `height: 100dvh; max-width: calc(100dvh * (400/600))` para mantener ratio.
- **Tablets / desktop:** si ancho > alto útil, el canvas se centra con letterbox (fondo retro a ambos lados).
- **Tipografía de overlays:** `clamp(0.75rem, 2.5vw, 1.125rem)` para que escale sin pixelar demasiado.
- **Botones:** alto mínimo 40px (objetivo táctil) — `.btn` ya lo cumple.
- **Orientación:** funciona portrait y landscape; en landscape muy bajo, el canvas reduce su alto para dejar sitio al overlay.

---

## 9. Accesibilidad

- **Estructura:** overlays con `role="dialog"`, títulos con `id` + `aria-labelledby`, descripción con `aria-describedby`.
- **Foco:**
  - READY: foco en `<button class="sr-only">Comenzar partida</button>`.
  - GAME_OVER: foco en "Volver a jugar".
  - `:focus-visible` visible con `outline` retro (no `none`).
- **Contraste:** overlays con fondo semitransparente oscuro (`rgba(0,0,0,.55)`) + texto blanco/amarillo para AAA sobre cualquier escenario.
- **Movimiento reducido:** `@media (prefers-reduced-motion: reduce)` → desactivar parpadeo del texto de inicio, rotación del pájaro (queda recto), y velocidad de scroll del suelo (reducida).
- **Color:** nunca comunicar estado solo por color; el "Nuevo récord" usa `.badge-ok` (texto + icono/emoji).
- **Teclado:** todo el flujo (READY → flap → GAME_OVER → retry) es operable solo con teclado.

---

## 10. Estilo retro (guía visual, no código)

- **Paleta sugerida (constantes del juego):**
  - Cielo: `#70c5ce`
  - Tuberías: `#5fa83d` con borde `#3d7a26`
  - Pájaro: `#ffdf00` con borde `#1a1a1a` y ojo blanco
  - Suelo: `#ded895` con borde `#c4a86a`
  - Texto overlay: `#ffffff` sobre fondo `rgba(0,0,0,.55)`
- **Tipografía:** `"Press Start 2P"`, fallback `monospace`, `letter-spacing: 0` para look pixel.
- **Bordes:** `imageSmoothingEnabled = false`; rectángulos sólidos; sin gradientes.

---

## 11. Consistencia entre pantallas

- **Mismo overlay** (mismo `.card`, mismo botón, mismo patrón) para READY y GAME_OVER.
- **Mismo copy** para "Mejor marca" en ambas pantallas.
- **Misma paleta y tipografía** en todos los textos visibles (HTML + canvas).
- **Mismo input** (Space / click / touch) en los tres estados, con la misma prevención de scroll.

---

## 12. Checklist de copy en español (referencia rápida)

| Contexto | Texto |
|---|---|
| Título app (metadata) | "Flappy Bird — Juego retro" |
| Título READY (h1) | "FLAPPY BIRD" |
| Hint READY | "Presiona Espacio o toca la pantalla para empezar" |
| Récord en READY | "Tu récord: N puntos" |
| Título GAME OVER (h2) | "Fin de la partida" |
| KPI GAME OVER 1 | "Puntos: N" / "Esta partida" |
| KPI GAME OVER 2 | "Mejor marca: M" / "Tu récord personal" |
| Badge nuevo récord | "¡Nuevo récord!" |
| Botón retry | "Volver a jugar" |
| Cargando | "Cargando partida…" |
| Sin canvas | "Tu navegador no soporta Canvas. Prueba con otro navegador." |
| Botón sr-only READY | "Comenzar partida" |