# Spec — Flappy Bird Web Game

## 1. Objetivo y Alcance

**Objetivo:** Construir un juego web jugable de Flappy Bird con estética retro, que corre 100% en el cliente (navegador), usando Canvas HTML5 y Next.js (App Router) + TypeScript.

**Incluido:**
- Pájaro controlado por gravedad; salta al click del mouse/touch o barra espaciadora.
- Tuberías verdes con huecos a alturas aleatorias, desplazándose de derecha a izquierda.
- Detección de colisiones con tuberías, suelo y techo.
- Marcador de puntos en vivo.
- Pantalla de Game Over con botón de reinicio.
- Persistencia del mejor puntaje en `localStorage` (acorde al deploy efímero).
- Estilo retro (paleta pixel-art, tipografia monoespaciada, borde pixelado).
- Controles responsivos para escritorio y móvil (touch).

**Fuera de alcance:**
- Sin backend, base de datos ni endpoints API. El juego corre 100% en el cliente.
- Sin multi-usuario, sin clasificaciones en linea, sin cuentas/login.
- Sin assets externos descargables (sprites se dibujan con primitivas de Canvas o inline).
- Sin niveles de dificultad configurables (mecánica clásica única).
- Sin efectos de sonido (salvo si el desarrollador los quiera; no es requerido por el PRD).

**Deployment target:** Railway/contenedor con filesystem efímero → el mejor puntaje se guarda en `localStorage` del navegador (estado solo del cliente, no necesita ser compartido entre dispositivos).

---

## 2. Épicas y Funcionalidades

### E2.1 — Bucle de Juego y Motor de Render
- F1.1 Loop de animación con `requestAnimationFrame` a 60 FPS.
- F1.2 Canvas 2D como superficie de dibujo, dimensiones fijas internas (p.ej. 400×600) escaladas responsivamente al contenedor.
- F1.3 Gestión de estados: `READY` (pantalla de inicio), `PLAYING`, `GAME_OVER`.
- F1.4 Función `reset()` que reinicia todas las variables del juego a su estado inicial.

### E2.2 — Pájaro y Físicas
- F2.1 Entidad `bird` con posición Y, velocidad Y, radio (o alto/alcho de sprite).
- F2.2 Gravedad constante aplicada cada frame: `velocity += gravity`.
- F2.3 Acción de salto (`flap`): al input, `velocity = -flapStrength`.
- F2.4 Rotación visual del pájaro segun `velocity` (punto hacia arriba al saltar, hacia abajo al caer).
- F2.5 Colisión con techo: si `bird.y - bird.radius <= 0` → game over.

### E2.3 — Tuberías (Obstáculos)
- F3.1 Generación de tuberías a intervalos regulares (distancia horizontal fija entre pares).
- F3.2 Cada par tiene un hueco (gap) a altura aleatoria dentro de un rango válido.
- F3.3 Desplazamiento de todas las tuberías a velocidad horizontal constante hacia la izquierda.
- F3.4 Eliminación de tuberías que salen completamente del borde izquierdo.
- F3.5 Dibujo de cada tubería como rectángulo verde con borde pixelado retro (parte superior y parte inferior del hueco).
- F3.6 Deteccion de colisión bird-vs-tubería: si el círculo del pájaro intersecta cualquiera de los dos rectángulos de un par → game over.

### E2.4 — Suelo y Techo
- F4.1 Suelo como rectángulo en la parte inferior del canvas.
- F4.2 Desplazamiento del suelo (scroll horizontal) para dar sensación de movimiento.
- F4.3 Colisión con suelo: si `bird.y + bird.radius >= groundY` → game over.
- F4.4 El techo superior del canvas actúa como límite (ver F2.5).

### E2.5 — Puntuación
- F5.1 Contador entero `score`, inicia en 0.
- F5.2 Incremento de `score` en +1 cuando el pájaro pasa el centro horizontal de un par de tuberías (sin colisión).
- F5.3 Renderizado del marcador en pantalla durante `PLAYING` y `GAME_OVER`.
- F5.4 Persistencia de `bestScore` en `localStorage` clave `flappy_best_score`.
- F5.5 Al finalizar una partida, si `score > bestScore`, actualizar `bestScore` y `localStorage`.
- F5.6 Mostrar `bestScore` en pantalla de Game Over.

### E2.6 — Inputs y Controles Responsivos
- F6.1 Escritorio: `Space` (keydown) y click de mouse en el canvas disparan `flap`.
- F6.2 Móvil: `touchstart` en el canvas dispara `flap`.
- F6.3 En estado `READY`, cualquier input inicia el juego (`PLAYING`) y ejecuta un `flap` inicial.
- F6.4 En estado `GAME_OVER`, el botón de reinicio (click/touch) ejecuta `reset()` y vuelve a `READY` o `PLAYING` directo.
- F6.5 El canvas escala con CSS para ocupar el alto del viewport manteniendo la relación de aspecto (letterbox si hace falta).

### E2.7 — Estilo Retro
- F7.1 Paleta de colores retro (cielo azul claro, tuberías verde pixeladas, pájaro amarillo con borde negro, suelo marrón).
- F7.2 Tipografia monoespaciada/pixel para el marcador y textos (p.ej. `"Press Start 2P"` via Google Fonts o fallback `monospace`).
- F7.3 Bordes pixelados: dibujar con `imageSmoothingEnabled = false` y usar líneas de 2px sin anti-alias.
- F7.4 Pantalla de inicio con texto "FLAPPY BIRD" + "Press Space / Tap to Start".
- F7.5 Pantalla de Game Over con "GAME OVER", `score` actual, `bestScore`, y botón "RETRY".

---

## 3. Modelo de Datos

El juego no requiere base de datos. Todo el estado es en memoria dentro del componente, con un único dato persistente en `localStorage`.

### Entidad: Bird (estado en memoria)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `x` | `number` | Posición horizontal fija (centro del canvas). |
| `y` | `number` | Posición vertical actual. |
| `velocity` | `number` | Velocidad vertical actual. |
| `radius` | `number` | Radio para colisión (o alto del sprite). |
| `rotation` | `number` | Ángulo de rotación visual (derivable de `velocity`). |

### Entidad: Pipe (estado en memoria, array de pares activos)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `x` | `number` | Posición horizontal del par. |
| `gapY` | `number` | Posición vertical del centro del hueco. |
| `gapHeight` | `number` | Alto del hueco (fijo). |
| `passed` | `boolean` | `true` si el pájaro ya pasó este par (para no sumar doble). |

### Estado Global del Juego (en memoria, `useRef` o `useState`-like)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `gameState` | `'READY' \| 'PLAYING' \| 'GAME_OVER'` | Estado actual. |
| `score` | `number` | Puntaje actual. |
| `bestScore` | `number` | Mejor puntaje (cargado de localStorage). |
| `pipes` | `Pipe[]` | Tuberías activas. |
| `bird` | `Bird` | Instancia del pájaro. |
| `frame` | `number` | Contador de frames (para intervalos de spawn). |

### Persistencia (localStorage)
| Clave | Tipo | Descripción |
|-------|------|-------------|
| `flappy_best_score` | `number` (stringificado) | Mejor puntaje histórico del jugador en este navegador. |

**Sin relaciones entre entidades** (no es una DB relacional; son structs en memoria del juego).

---

## 4. Rutas / Páginas (App Router)

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/` | `app/page.tsx` | Página única que renderiza el componente `<FlappyBirdGame />` y el canvas. Contiene el layout centrado, fondo retro y el canvas escalado. |

**No hay más páginas.** El juego es una sola pantalla con estados internos (`READY`/`PLAYING`/`GAME_OVER`) superpuestos sobre el mismo canvas.

---

## 5. Endpoints API

**No requiere endpoints API.** El juego corre 100% en el cliente. No hay backend, base de datos ni servidor.

> Nota de arquitectura: Toda la lógica de juego (físicas, colisiones, render) vive en un componente cliente React (`"use client"`) que manipula el `<canvas>` vía `useRef`. El mejor puntaje se persiste en `localStorage` del navegador. No se necesita `fetch`, ni API routes, ni Server Actions.

---

## 6. Criterios de Aceptación por Épica

### E2.1 — Bucle de Juego y Motor de Render
- [ ] CA-1.1 Al cargar la página, el canvas se renderiza y el loop de animación está activo.
- [ ] CA-1.2 El juego arranca en estado `READY` y muestra la pantalla de inicio.
- [ ] CA-1.3 `reset()` restablece `score=0`, `pipes=[]`, `bird` en posición inicial y `gameState` cambia correctamente.

### E2.2 — Pájaro y Físicas
- [ ] CA-2.1 El pájaro cae por gravedad de forma continua y visible cada frame.
- [ ] CA-2.2 Al presionar Space / click / touch, el pájaro sube inmediatamente (velocity negativa).
- [ ] CA-2.3 Si el pájaro toca el techo (`y - radius <= 0`), el estado pasa a `GAME_OVER`.
- [ ] CA-2.4 El pájaro rota visualmente según su velocidad (subiendo → puntiaguido arriba, cayendo → puntiagudo abajo).

### E2.3 — Tuberías
- [ ] CA-3.1 Los pares de tuberías aparecen periódicamente desde el borde derecho.
- [ ] CA-3.2 Cada par tiene un hueco a una altura aleatoria distinta (verificar que `gapY` varía entre pares).
- [ ] CA-3.3 Las tuberías se desplazan hacia la izquierda a velocidad constante.
- [ ] CA-3.4 Las tuberías que salen del borde izquierdo se eliminan del array `pipes`.
- [ ] CA-3.5 Si el círculo del pájaro intersecta la tubería superior o inferior de cualquier par → `GAME_OVER`.

### E2.4 — Suelo y Techo
- [ ] CA-4.1 El suelo se dibuja como rectángulo marrón en la parte inferior.
- [ ] CA-4.2 El suelo se desplaza horizontalmente (animación de scroll).
- [ ] CA-4.3 Si el pájaro toca el suelo → `GAME_OVER`.

### E2.5 — Puntuación
- [ ] CA-5.1 El marcador empieza en 0 y se muestra en pantalla durante `PLAYING`.
- [ ] CA-5.2 Al pasar el centro de un par de tuberías sin colisión, `score` incrementa en 1.
- [ ] CA-5.3 `bestScore` se lee de `localStorage` al montar el componente.
- [ ] CA-5.4 Al pasar a `GAME_OVER`, si `score > bestScore`, se actualiza `localStorage` y `bestScore`.
- [ ] CA-5.5 En la pantalla de Game Over se muestra `score` y `bestScore`.

### E2.6 — Inputs y Controles
- [ ] CA-6.1 En escritorio, `Space` (keydown) ejecuta `flap` (no se repite mientras se mantiene).
- [ ] CA-6.2 En escritorio, click del mouse en el canvas ejecuta `flap`.
- [ ] CA-6.3 En móvil, `touchstart` en el canvas ejecuta `flap`.
- [ ] CA-6.4 En `READY`, cualquier input arranca el juego y hace un `flap` inicial.
- [ ] CA-6.5 En `GAME_OVER`, el botón "RETRY" reinicia el juego a `READY` o `PLAYING`.
- [ ] CA-6.6 El canvas escala responsivamente sin deformar la relación de aspecto.

### E2.7 — Estilo Retro
- [ ] CA-7.1 La paleta de colores es retro (cielo azul, tuberías verde, pájaro amarillo, suelo marrón).
- [ ] CA-7.2 La tipografia del marcador y textos es monoespaciada/pixel (`"Press Start 2P"` o `monospace`).
- [ ] CA-7.3 `imageSmoothingEnabled = false` y bordes pixelados visibles.
- [ ] CA-7.4 La pantalla de inicio muestra "FLAPPY BIRD" y "Press Space / Tap to Start".
- [ ] CA-7.5 La pantalla de Game Over muestra "GAME OVER", `score`, `bestScore` y botón "RETRY".

---

## 7. Flujos de Usuario Críticos

### Flujo #1 — Jugador nuevo: camino feliz de inicio a Game Over y reinicio
**Rol:** Jugador (cualquier usuario, no requiere login).

1. El usuario abre la app → navega a `/` → ve la página con el canvas centrado y la **pantalla de inicio** (`READY`): texto "FLAPPY BIRD" y "Press Space / Tap to Start".
2. El usuario **presiona Space** (o hace click/touch en el canvas).
3. El estado cambia a `PLAYING`. El pájaro ejecuta un `flap` inicial y empieza a caer por gravedad. Las tuberías empiezan a generarse y desplazarse.
4. El usuario presiona Space/click/touch repetidamente para mantener al pájaro en el aire, esquivando las tuberías por los huecos.
5. Cada vez que el pájaro pasa el centro de un par de tuberías, el **marcador incrementa +1** y se muestra en pantalla.
6. El usuario sigue jugando hasta que el pájaro **colisiona** con una tubería, el suelo o el techo.
7. El estado cambia a `GAME_OVER`. Se dibuja la **pantalla de Game Over**: "GAME OVER", `score` actual, `bestScore` (leído de localStorage, actualizado si corresponde) y botón **"RETRY"**.
8. El usuario hace click/touch en el botón "RETRY" → `reset()` se ejecuta → el estado vuelve a `READY` (o `PLAYING` directo si el input también cuenta como flap inicial).
9. El bucle se repite. El mejor puntaje persiste entre sesiones en el mismo navegador.

> **Criterio de aceptación explícito del flujo central:** Un usuario debe poder abrir la app, empezar a jugar con Space/click/touch, sumar puntos al pasar tuberías, perder por colisión, ver su score y bestScore en Game Over, y reiniciar — todo en una sola sesión sin recargar la página. Si este flujo no se completa, el juego es un FRACASO.

### Flujo #2 — Mejora del bestScore persistente
1. El usuario juega y obtiene un `score` mayor que el `bestScore` anterior.
2. Al pasar a `GAME_OVER`, el componente actualiza `bestScore` y escribe `flappy_best_score` en `localStorage`.
3. El usuario recarga la página (o cierra y reabre la app).
4. Al montar el componente, `bestScore` se lee de `localStorage` y se muestra en la pantalla de inicio/Game Over.
5. El `bestScore` se mantiene entre sesiones del mismo navegador.

---

## 8. Notas de Implementación

- **Componente cliente:** `FlappyBirdGame` debe declarar `"use client"` arriba del archivo (usa `useRef`, `useEffect`, `requestAnimationFrame`, `addEventListener`).
- **Canvas ref:** Un `useRef<HTMLCanvasElement>` y un `useRef<CanvasRenderingContext2D>` (o obtener el context en el `useEffect` del mount).
- **Game loop:** Un `useEffect` que monta el `requestAnimationFrame` loop y lo limpia en unmount. El estado del juego (bird, pipes, score, gameState) debe vivir en `useRef` (mutable, no dispara re-renders) para evitar jank; solo se actualiza UI de React (overlay de textos) si se desea, o se dibuja todo en el canvas.
- **Escalado responsivo:** El canvas interno es de tamaño fijo (p.ej. 400×600). CSS escala el elemento con `width: auto; height: 100%; max-width: 100%` manteniendo `aspect-ratio`.
- **Prevención de scroll en Space:** `e.preventDefault()` en el keydown de Space para que no scrollee la página.
- **No usar `localStorage` en el servidor:** Next.js puede intentar renderizar en SSR; `localStorage` solo se accede dentro de `useEffect` (cliente).
