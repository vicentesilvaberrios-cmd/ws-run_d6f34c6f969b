"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constantes del juego ───────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 600;
const GROUND_H = 80;
const GROUND_Y = CANVAS_H - GROUND_H;

const BIRD_X = 100;
const BIRD_R = 14;
const BIRD_W = 24;
const BIRD_H = 20;

const GRAVITY = 0.45;
const FLAP_STRENGTH = -7.5;
const MAX_FALL = 10;

const PIPE_W = 52;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.2;
const PIPE_SPAWN_FRAMES = 90; // ~1.5s a 60fps
const PIPE_MIN_GAP_Y = 80 + PIPE_GAP / 2;
const PIPE_MAX_GAP_Y = GROUND_Y - 40 - PIPE_GAP / 2;

const GROUND_SCROLL_SPEED = PIPE_SPEED;

const STORAGE_KEY = "flappy_best_score";

// Paleta retro
const COLORS = {
  sky: "#70c5ce",
  cloud: "#a0e0e8",
  bird: "#ffdf00",
  birdBorder: "#1a1a1a",
  birdWing: "#f5a623",
  birdEye: "#ffffff",
  birdPupil: "#1a1a1a",
  pipe: "#5fa83d",
  pipeBorder: "#3d7a26",
  pipeLight: "#7fcf4f",
  pipeDark: "#3d7a26",
  ground: "#8B5E3C",
  groundBorder: "#6B4423",
  groundLine: "#A0735A",
  text: "#ffffff",
  textShadow: "#1a1a1a",
};

type GameState = "READY" | "PLAYING" | "GAME_OVER";

interface Bird {
  y: number;
  velocity: number;
  rotation: number;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface GameRef {
  bird: Bird;
  pipes: Pipe[];
  score: number;
  frame: number;
  groundOffset: number;
  state: GameState;
}

function randGapY(): number {
  return Math.floor(Math.random() * (PIPE_MAX_GAP_Y - PIPE_MIN_GAP_Y + 1)) + PIPE_MIN_GAP_Y;
}

function initialState(): GameRef {
  return {
    bird: { y: CANVAS_H * 0.42, velocity: 0, rotation: 0 },
    pipes: [],
    score: 0,
    frame: 0,
    groundOffset: 0,
    state: "READY",
  };
}

// ─── Dibujo ──────────────────────────────────────────────────────────
function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Nubes decorativas
  ctx.fillStyle = COLORS.cloud;
  drawPixelCloud(ctx, 60, 80, 24);
  drawPixelCloud(ctx, 300, 120, 20);
  drawPixelCloud(ctx, 200, 60, 18);
}

function drawPixelCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.fillRect(cx - r, cy, r * 2, r);
  ctx.fillRect(cx - r / 2, cy - r / 2, r, r);
  ctx.fillRect(cx + r / 4, cy - r / 2, r / 2, r / 2);
}

function drawBird(ctx: CanvasRenderingContext2D, bird: Bird) {
  ctx.save();
  ctx.translate(BIRD_X, bird.y);
  ctx.rotate(bird.rotation);

  // Cuerpo
  ctx.fillStyle = COLORS.bird;
  ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);

  // Borde
  ctx.strokeStyle = COLORS.birdBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);

  // Ala
  ctx.fillStyle = COLORS.birdWing;
  const wingY = bird.velocity < 0 ? -BIRD_H / 2 - 4 : BIRD_H / 2 - 8;
  ctx.fillRect(-BIRD_W / 2 + 2, wingY, 10, 6);
  ctx.strokeRect(-BIRD_W / 2 + 2, wingY, 10, 6);

  // Ojo
  ctx.fillStyle = COLORS.birdEye;
  ctx.fillRect(BIRD_W / 2 - 8, -BIRD_H / 2 + 2, 6, 6);
  ctx.fillStyle = COLORS.birdPupil;
  ctx.fillRect(BIRD_W / 2 - 6, -BIRD_H / 2 + 4, 3, 3);

  // Pico
  ctx.fillStyle = COLORS.birdWing;
  ctx.fillRect(BIRD_W / 2 - 2, -2, 6, 5);
  ctx.strokeRect(BIRD_W / 2 - 2, -2, 6, 5);

  ctx.restore();
}

function drawPipe(ctx: CanvasRenderingContext2D, pipe: Pipe) {
  const gapTop = pipe.gapY - PIPE_GAP / 2;
  const gapBottom = pipe.gapY + PIPE_GAP / 2;

  // Tubería superior
  drawPipeRect(ctx, pipe.x, 0, PIPE_W, gapTop);
  // Tubería inferior
  drawPipeRect(ctx, pipe.x, gapBottom, PIPE_W, GROUND_Y - gapBottom);
}

function drawPipeRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  if (h <= 0) return;

  ctx.fillStyle = COLORS.pipe;
  ctx.fillRect(x, y, w, h);

  // Highlight izquierdo
  ctx.fillStyle = COLORS.pipeLight;
  ctx.fillRect(x + 3, y, 6, h);

  // Borde
  ctx.strokeStyle = COLORS.pipeBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Cap superior/inferior (la "boca" de la tubería)
  const capH = 20;
  const capX = x - 3;
  const capW = w + 6;

  // Determinar si la boca va arriba o abajo del rectángulo
  if (y === 0) {
    // Tubería superior: la boca va abajo
    const capY = y + h - capH;
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(capX, capY, capW, capH);
    ctx.fillStyle = COLORS.pipeLight;
    ctx.fillRect(capX + 3, capY, 6, capH);
    ctx.strokeRect(capX, capY, capW, capH);
  } else {
    // Tubería inferior: la boca va arriba
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(capX, y, capW, capH);
    ctx.fillStyle = COLORS.pipeLight;
    ctx.fillRect(capX + 3, y, 6, capH);
    ctx.strokeRect(capX, y, capW, capH);
  }
}

function drawGround(ctx: CanvasRenderingContext2D, offset: number) {
  // Suelo
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, GROUND_H);

  // Borde superior
  ctx.strokeStyle = COLORS.groundBorder;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.stroke();

  // Líneas diagonales animadas (scroll)
  ctx.fillStyle = COLORS.groundLine;
  const tileW = 24;
  const startX = -(offset % tileW);
  for (let x = startX; x < CANVAS_W; x += tileW) {
    ctx.fillRect(x, GROUND_Y + 4, 12, 4);
    ctx.fillRect(x + 6, GROUND_Y + 14, 12, 4);
    ctx.fillRect(x, GROUND_Y + 24, 12, 4);
  }

  // Borde inferior
  ctx.fillStyle = COLORS.groundBorder;
  ctx.fillRect(0, CANVAS_H - 3, CANVAS_W, 3);
}

function drawScore(ctx: CanvasRenderingContext2D, score: number) {
  ctx.save();
  ctx.font = "24px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = COLORS.textShadow;
  ctx.fillText(`Puntos: ${score}`, CANVAS_W / 2 + 2, 32);
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`Puntos: ${score}`, CANVAS_W / 2, 30);
  ctx.restore();
}

// ─── Colisiones ─────────────────────────────────────────────────────
// Colisión círculo (pájaro) vs rectángulo (tubería)
function circleRectCollide(cx: number, cy: number, r: number, rx: number, ry: number, rw: number, rh: number): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < r * r;
}

function checkCollision(bird: Bird, pipes: Pipe[]): boolean {
  // Techo
  if (bird.y - BIRD_R <= 0) return true;
  // Suelo
  if (bird.y + BIRD_R >= GROUND_Y) return true;

  // Tuberías: colisión círculo del pájaro (BIRD_R) vs rectángulo de cada tubería
  for (const pipe of pipes) {
    const gapTop = pipe.gapY - PIPE_GAP / 2;
    const gapBottom = pipe.gapY + PIPE_GAP / 2;

    // Tubería superior: rectángulo de (0,0) a (PIPE_W, gapTop)
    if (circleRectCollide(BIRD_X, bird.y, BIRD_R, pipe.x, 0, PIPE_W, gapTop)) return true;
    // Tubería inferior: rectángulo de (gapBottom, GROUND_Y) con altura (GROUND_Y - gapBottom)
    if (circleRectCollide(BIRD_X, bird.y, BIRD_R, pipe.x, gapBottom, PIPE_W, GROUND_Y - gapBottom)) return true;
  }
  return false;
}

// ─── Componente ─────────────────────────────────────────────────────
export default function FlappyBirdGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const gameRef = useRef<GameRef>(initialState());
  const rafRef = useRef<number>(0);
  const bestScoreRef = useRef<number>(0);

  const [uiState, setUiState] = useState<GameState>("READY");
  const [uiScore, setUiScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [canvasSupported, setCanvasSupported] = useState(true);

  // Cargar bestScore de localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n >= 0) {
          setBestScore(n);
          bestScoreRef.current = n;
        }
      }
    } catch {
      // localStorage no disponible (modo privado) → bestScore = 0
    }
  }, []);

  // Inicializar canvas y game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCanvasSupported(false);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    ctxRef.current = ctx;

    const loop = () => {
      const g = gameRef.current;

      // ── Update ──
      if (g.state === "PLAYING") {
        g.frame++;

        // Físicas del pájaro
        g.bird.velocity = Math.min(g.bird.velocity + GRAVITY, MAX_FALL);
        g.bird.y += g.bird.velocity;

        // Rotación según velocidad
        if (g.bird.velocity < 0) {
          g.bird.rotation = -0.4;
        } else {
          g.bird.rotation = Math.min(g.bird.rotation + 0.05, 1.2);
        }

        // Generar tuberías
        if (g.frame % PIPE_SPAWN_FRAMES === 0) {
          g.pipes.push({ x: CANVAS_W, gapY: randGapY(), passed: false });
        }

        // Mover tuberías
        for (const p of g.pipes) {
          p.x -= PIPE_SPEED;
        }

        // Sumar puntos
        for (const p of g.pipes) {
          if (!p.passed && p.x + PIPE_W < BIRD_X) {
            p.passed = true;
            g.score++;
            setUiScore(g.score);
          }
        }

        // Eliminar tuberías fuera
        g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -10);

        // Scroll del suelo
        g.groundOffset += GROUND_SCROLL_SPEED;

        // Colisiones
        if (checkCollision(g.bird, g.pipes)) {
          g.state = "GAME_OVER";
          setUiState("GAME_OVER");

          // Actualizar bestScore
          if (g.score > bestScoreRef.current) {
            bestScoreRef.current = g.score;
            setBestScore(g.score);
            setIsNewRecord(true);
            try {
              localStorage.setItem(STORAGE_KEY, String(g.score));
            } catch {
              // No se puede persistir, pero el juego sigue
            }
          } else {
            setIsNewRecord(false);
          }
        }
      } else if (g.state === "READY") {
        // Pájaro flotando suavemente
        g.bird.y = CANVAS_H * 0.42 + Math.sin(g.frame * 0.06) * 8;
        g.bird.rotation = 0;
        g.frame++;
        g.groundOffset += GROUND_SCROLL_SPEED * 0.5;
      }

      // ── Render ──
      drawBackground(ctx);
      drawGround(ctx, g.groundOffset);

      // Dibujar tuberías (entre fondo y pájaro)
      for (const p of g.pipes) {
        drawPipe(ctx, p);
      }

      drawBird(ctx, g.bird);

      if (g.state === "PLAYING" || g.state === "GAME_OVER") {
        drawScore(ctx, g.score);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ─── Acciones ──
  const flap = useCallback(() => {
    const g = gameRef.current;
    if (g.state === "READY") {
      g.state = "PLAYING";
      g.bird.velocity = FLAP_STRENGTH;
      setUiState("PLAYING");
    } else if (g.state === "PLAYING") {
      g.bird.velocity = FLAP_STRENGTH;
    }
  }, []);

  const reset = useCallback(() => {
    const g = gameRef.current;
    const newG = initialState();
    g.bird = newG.bird;
    g.pipes = newG.pipes;
    g.score = newG.score;
    g.frame = newG.frame;
    g.groundOffset = newG.groundOffset;
    g.state = "READY";
    setUiScore(0);
    setIsNewRecord(false);
    setUiState("READY");
  }, []);

  // ─── Inputs globales ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // Si el foco está en un botón, dejar que su propio onKeyDown lo maneje
        const target = e.target as HTMLElement;
        if (target && target.tagName === "BUTTON") return;
        e.preventDefault();
        if (e.repeat) return;
        const g = gameRef.current;
        if (g.state === "GAME_OVER") {
          // Space en Game Over → reiniciar
          reset();
        } else {
          flap();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flap, reset]);

  // ─── Click/touch en canvas ──
  const handlePointer = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const g = gameRef.current;
      if (g.state === "GAME_OVER") return; // usar botón
      flap();
    },
    [flap]
  );

  // ─── Auto-focus del botón retry ──
  const retryBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (uiState === "GAME_OVER" && retryBtnRef.current) {
      retryBtnRef.current.focus();
    }
  }, [uiState]);

  // Guard para evitar doble disparo (pointerdown + click sintético)
  const suppressClickRef = useRef(false);

  if (!canvasSupported) {
    return (
      <div className="flappy-canvas-wrap">
        <p className="flappy-no-canvas">
          Tu navegador no soporta Canvas. Prueba con otro navegador.
        </p>
      </div>
    );
  }

  return (
    <div className="flappy-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        role="application"
        onMouseDown={handlePointer}
        onTouchStart={handlePointer}
        aria-label="Área de juego Flappy Bird. Pulsa Espacio, haz clic o toca para que el pájaro salte"
      />

      {/* HUD accesible: anuncia puntos y récord a lectores de pantalla en todo momento */}
      <span aria-live="polite" className="sr-only">
        {uiState === "PLAYING" || uiState === "GAME_OVER"
          ? `Puntos: ${uiScore}. Tu récord: ${bestScore} puntos.`
          : uiState === "READY" && bestScore > 0
            ? `Tu récord: ${bestScore} puntos.`
            : ""}
      </span>

      {/* Overlay READY */}
      {uiState === "READY" && (
        <div
          className="flappy-overlay"
          role="dialog"
          aria-labelledby="flappy-title"
          aria-describedby="flappy-hint"
          onMouseDown={handlePointer}
          onTouchStart={handlePointer}
        >
          <h2 id="flappy-title">FLAPPY BIRD</h2>
          <p id="flappy-hint" className="flappy-hint">
            Press Space / Tap to Start
          </p>
          {bestScore > 0 && (
            <p className="flappy-record">Tu récord: {bestScore} puntos</p>
          )}
          <button
            className="btn-start"
            onPointerDown={(e) => { e.preventDefault(); suppressClickRef.current = true; flap(); }}
            onClick={() => {
              if (suppressClickRef.current) { suppressClickRef.current = false; return; }
              flap();
            }}
            onKeyDown={(e) => {
              if (e.code === "Space" || e.code === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                flap();
              }
            }}
          >
            Comenzar
          </button>
        </div>
      )}

      {/* Overlay GAME_OVER */}
      {uiState === "GAME_OVER" && (
        <div
          className="flappy-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="go-title"
          aria-describedby="go-summary"
        >
          <div className="flappy-card">
            <h2 id="go-title">GAME OVER</h2>
            {isNewRecord && (
              <span className="flappy-new-record" role="status" aria-live="polite">
                ¡Nuevo récord!
              </span>
            )}
            <div className="flappy-kpis">
              <div className="flappy-kpi">
                <span className="value">Puntos: {uiScore}</span>
                <span className="label">Esta partida</span>
              </div>
              <div className="flappy-kpi">
                <span className="value">Mejor marca: {bestScore}</span>
                <span className="label">Tu récord personal</span>
              </div>
            </div>
            <p id="go-summary" className="sr-only">
              Has conseguido {uiScore} puntos. Tu mejor marca es {bestScore}. Pulsa RETRY para jugar otra vez. También puedes pulsar Espacio para reiniciar.
            </p>
            <button
              ref={retryBtnRef}
              className="btn-retry"
              onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); suppressClickRef.current = true; reset(); }}
              onClick={() => {
                if (suppressClickRef.current) { suppressClickRef.current = false; return; }
                reset();
              }}
              onKeyDown={(e) => {
                if (e.code === "Space" || e.code === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  reset();
                }
              }}
            >
              RETRY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
