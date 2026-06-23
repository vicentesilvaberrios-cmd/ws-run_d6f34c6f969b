import FlappyBirdGame from "./components/FlappyBirdGame";

export default function Page() {
  return (
    <main className="flappy-stage">
      <h1 className="sr-only">Flappy Bird</h1>
      <FlappyBirdGame />
    </main>
  );
}
