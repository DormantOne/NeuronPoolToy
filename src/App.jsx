import './App.css'
import FrameLimiter from './lib/FrameLimiter';
import './Utils.css'

import { useRef, useEffect, useState } from 'react'

function App() {
  const frameLimiter = new FrameLimiter(60)
  const canvasRef = useRef(null);
  const fpsDisplayRef = useRef(null)

  const [bird, setBird] = useState({ y: 240, velocity: 0 });
  const [pipes, setPipes] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lastPipeSpawn, setLastPipeSpawn] = useState(0);

  const gravity = 1000; // pixels per second squared
  const jumpStrength = -400; // pixels per second
  const pipeWidth = 50;
  const pipeGap = 150;
  const pipeSpeed = 200; // pixels per second
  const pipeSpawnInterval = 1.5; // seconds

  function gameLoop(){
    const canvas = canvasRef.current;
    if (!canvas){
      console.warn("attempted to perform gameLoop before canvas was mounted");
      window.requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    const deltaTime = frameLimiter.getDeltaTime()
    if(deltaTime===undefined){
      window.requestAnimationFrame(gameLoop);
      return
    }

    if(fpsDisplayRef.current){
      fpsDisplayRef.current.textContent=(1.0/deltaTime).toFixed(3)
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game state
    if (!gameOver) {
      // Update bird position
      setBird(prevBird => ({
        y: prevBird.y + prevBird.velocity * deltaTime,
        velocity: prevBird.velocity + gravity * deltaTime
      }));

      // Generate new pipes
      setLastPipeSpawn(prevTime => {
        const newTime = prevTime + deltaTime;
        if (newTime >= pipeSpawnInterval) {
          const newPipeY = Math.random() * (canvas.height - pipeGap - 100) + 50;
          setPipes(prevPipes => [...prevPipes, { x: canvas.width, y: newPipeY }]);
          return 0;
        }
        return newTime;
      });

      // Move pipes
      setPipes(prevPipes => 
        prevPipes.map(pipe => ({ ...pipe, x: pipe.x - pipeSpeed * deltaTime }))
          .filter(pipe => pipe.x > -pipeWidth)
      );

      // Check for collisions
      const birdRect = { x: 50, y: bird.y, width: 30, height: 30 };
      pipes.forEach(pipe => {
        const upperPipeRect = { x: pipe.x, y: 0, width: pipeWidth, height: pipe.y };
        const lowerPipeRect = { x: pipe.x, y: pipe.y + pipeGap, width: pipeWidth, height: canvas.height - pipe.y - pipeGap };

        if (
          checkCollision(birdRect, upperPipeRect) ||
          checkCollision(birdRect, lowerPipeRect) ||
          bird.y < 0 ||
          bird.y + 30 > canvas.height
        ) {
          setGameOver(true);
        }
      });

      // Update score
      pipes.forEach(pipe => {
        if (pipe.x + pipeWidth < 50 && pipe.x + pipeWidth + pipeSpeed * deltaTime >= 50) {
          setScore(prevScore => prevScore + 1);
        }
      });
    }

    // Draw bird
    ctx.fillStyle = 'yellow';
    ctx.fillRect(50, bird.y, 30, 30);

    // Draw pipes
    ctx.fillStyle = 'green';
    pipes.forEach(pipe => {
      ctx.fillRect(pipe.x, 0, pipeWidth, pipe.y);
      ctx.fillRect(pipe.x, pipe.y + pipeGap, pipeWidth, canvas.height - pipe.y - pipeGap);
    });

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${score}`, 10, 30);

    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '48px Arial';
      ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
    }

    window.requestAnimationFrame(gameLoop);
  }

  function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  function handleKeyPress(e) {
    if (e.code === 'Space' && !gameOver) {
      setBird(prevBird => ({ ...prevBird, velocity: jumpStrength }));
    } else if (e.code === 'Space' && gameOver) {
      setGameOver(false);
      setBird({ y: 240, velocity: 0 });
      setPipes([]);
      setScore(0);
      setLastPipeSpawn(0);
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameOver]);

  useEffect(() => {
    if (canvasRef.current) {
      window.requestAnimationFrame(gameLoop);
    }
  }, [canvasRef.current]);

  return (
    <div className='vstack' style={{
      width: '100%',
      gap: '16px'
    }}>
      <h1>Flappy Bird Game</h1>
      <i>Press Space to jump/restart</i>
      <div style={{
        position: "relative"
      }}>
        <canvas ref={canvasRef} style={{
          border: '2px solid black', 
          width: '640px',
          height: '480px'
        }} width='640' height='480'></canvas>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          color: "green",
          fontSize: "16px"
        }} ref={fpsDisplayRef}></div>
      </div>
    </div>
  )
}

export default App