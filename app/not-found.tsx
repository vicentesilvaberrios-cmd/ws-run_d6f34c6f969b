export default function NotFound() {
  return (
    <main className="flappy-stage">
      <div className="flappy-canvas-wrap">
        <div className="flappy-overlay" role="dialog" aria-labelledby="nf-title">
          <div className="flappy-card">
            <h2 id="nf-title">Página no encontrada</h2>
            <p className="flappy-hint">La página que buscas no existe.</p>
            <a href="/" className="btn-start">
              Volver al juego
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
