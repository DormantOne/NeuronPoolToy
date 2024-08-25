import { useState } from 'react';
import './App.css';
import FrameLimiter from './lib/FrameLimiter';
import './Utils.css';

import { useEffect, useRef } from 'react';

function App() {
  const frameLimiter = new FrameLimiter(60);
  const canvasRef = useRef(null);
  const fpsDisplayRef = useRef(null);

  const BIRD_RADIUS = 15;
  const BIRD_X = 40;

  const PIPE_VELOCITY = 80; //pixels per second leftward moving velocity
  const PIPE_SPACING = 240; //pixels between pipes
  const PIPE_WINDOW_SIZE = 120;
  const PIPE_WINDOW_MIN_DISTANCE = 40;
  const PIPE_WIDTH = 40;

  const numBufferedPipes = Math.ceil(640 / PIPE_SPACING) + 2;
  const minPipeY = PIPE_WINDOW_MIN_DISTANCE + PIPE_WINDOW_SIZE / 2;
  const maxPipeY = 480 - PIPE_WINDOW_MIN_DISTANCE - PIPE_WINDOW_SIZE / 2;

  const GRAVITY_ACCELERATION = 400; //pixels per second squared
  const FLAP_VELOCITY = 200; // pixels per second per full keypress
  // Using acceleration would be relevant if we cared about how long a button is held
  // but this does nto apply to flappy bird

  const gameOverDisplayRef = useRef(null)

  const gameOverRef = useRef(false)

  const scoreRef = useRef(0)

  const scoreDisplayRef = useRef(null)

  const birdStateRef = useRef({
    y: 240,
    yVelocity: 0
  });

  const pipesStateRef = useRef([]);

  function clearPipes() {
    pipesStateRef.current = [];
  }

  function spawnOrReusePipe(xBeyondEdge, existingPipe = null) {
    const pipeY = minPipeY + Math.random() * (maxPipeY - minPipeY);
    const pipeX = 640 + xBeyondEdge;
    if (existingPipe === null) {
      pipesStateRef.current.push({
        x: pipeX,
        y: pipeY,
        scoreable: true
      })
    } else {

      let rightmostPipe = {
        x: 0,
        y: 0
      }

      for (const pipe of pipesStateRef.current) {
        if (pipe.x >= rightmostPipe.x) {
          rightmostPipe = pipe
        }
      }

      existingPipe.x = rightmostPipe.x + PIPE_SPACING;
      existingPipe.y = pipeY
      existingPipe.scoreable = true

    }

  }

  function resetGame() {
    birdStateRef.current.y = 240;
    birdStateRef.current.yVelocity = 0;
    gameOverDisplayRef.current.style.display = "none"
    gameOverRef.current = false
    scoreRef.current = 0
    clearPipes()
    for (let i = 0; i < numBufferedPipes; i++) {
      spawnOrReusePipe(i * PIPE_SPACING, null)
    }
  }

  useEffect(() => {
    resetGame()
  }, [])

  function gameLoop() {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("attempted to perform gameLoop before canvas was mounted");
      window.requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    const deltaTime = frameLimiter.getDeltaTime()
    if (deltaTime === undefined) {
      window.requestAnimationFrame(gameLoop);
      return
    }

    if (fpsDisplayRef.current) {
      fpsDisplayRef.current.textContent = (1.0 / deltaTime).toFixed(3)
    }




    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bird
    // ctx.beginPath();
    // ctx.arc(BIRD_X, birdStateRef.current.y, BIRD_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';  // You can choose the fill color
    // ctx.fill();
    // ctx.closePath();

    ctx.fillRect(BIRD_X - BIRD_RADIUS, birdStateRef.current.y - BIRD_RADIUS, 2 * BIRD_RADIUS, 2 * BIRD_RADIUS)

    // Draw Pipes
    for (const pipe of pipesStateRef.current) {
      // The pipe y is the centerpoit of teh gap (thin air)
      // the pipe x is te center of the pipe on the x axis (halfway through the thickness)
      // Draw the top pipe (above the gap)
      ctx.fillStyle = 'green';
      ctx.fillRect(pipe.x - PIPE_WIDTH / 2, 0, PIPE_WIDTH, pipe.y - PIPE_WINDOW_SIZE / 2);

      // Draw the bottom pipe (below the gap)
      ctx.fillRect(pipe.x - PIPE_WIDTH / 2, pipe.y + PIPE_WINDOW_SIZE / 2, PIPE_WIDTH, canvas.height - pipe.y - PIPE_WINDOW_SIZE / 2);

    }


    //collision check
    if (birdStateRef.current.y >= 480) {
      gameOverRef.current = true
      gameOverDisplayRef.current.style.display = "flex"
    }
    if (birdStateRef.current.y <= 0) {
      gameOverRef.current = true
      gameOverDisplayRef.current.style.display = "flex"
    }

    if (!gameOverRef.current) {
      //physics of the game
      const deltaVelocity = GRAVITY_ACCELERATION * deltaTime;
      birdStateRef.current.yVelocity += deltaVelocity;
      birdStateRef.current.y += birdStateRef.current.yVelocity * deltaTime;
      // move pipes
      for (const pipe of pipesStateRef.current) {
        pipe.x -= PIPE_VELOCITY * deltaTime
        // 2pixel buffer just in case
        if (pipe.x < BIRD_X - BIRD_RADIUS - PIPE_WIDTH / 2) {
          if (pipe.scoreable) {
            scoreRef.current += 1
            scoreDisplayRef.current.textContent = scoreRef.current.toString()
          }
          pipe.scoreable = false
        }
        if (pipe.x < -PIPE_WIDTH / 2 - 2) {

          spawnOrReusePipe(PIPE_SPACING, pipe)
        }

      }
    }

    window.requestAnimationFrame(gameLoop);
  }



  function handleKeyPress(e) {
    if (e.code === 'Space') {
      if (gameOverRef.current) {
        resetGame()
      } else {
        birdStateRef.current.yVelocity -= FLAP_VELOCITY;
      }
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      window.requestAnimationFrame(gameLoop);
    }
  }, [canvasRef.current]);

  return (
    <div className='vstack' style={{
      width: '100%',
      height: "100%"
    }}>
      <div style={{
        flex: 1
      }}></div>
      <div style={{
        position: "relative",
        flex: 0
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
          color: "black",
          fontSize: "16px"
        }} ref={fpsDisplayRef}></div>
        <div style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          color: "blue",
          fontSize: "32px",
          lineHeight: "32px",
          margin: 0,
          padding: 0
        }} ref={scoreDisplayRef}>0</div>
        <div style={{
          display: "none",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }} ref={gameOverDisplayRef}>
          <h1 style={{
            fontSize: "64px",
            fontWeight: "bold",
            color: "red"
          }}>Game Over</h1>

        </div>
      </div>
      <div style={{
        flex: 1
      }}></div>
    </div>
  )
}

export default App