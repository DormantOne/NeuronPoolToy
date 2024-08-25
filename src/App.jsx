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

  const GRAVITY_ACCELERATION = 400; //pixels per second squared
  const FLAP_VELOCITY = 150; // pixels per second per full keypress
  // Using acceleration would be relevant if we cared about how long a button is held
  // but this does nto apply to flappy bird

  const gameOverDisplayRef = useRef(null)

  const gameOverRef = useRef(false)

  const birdStateRef = useRef({
    y: 240,
    yVelocity: 0
  });



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
    ctx.beginPath();
    ctx.arc(BIRD_X, birdStateRef.current.y, BIRD_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';  // You can choose the fill color
    ctx.fill();
    ctx.closePath();

    //collision check
    if (birdStateRef.current.y >= 480) {
      gameOverRef.current=true
      gameOverDisplayRef.current.style.display="flex"
    }
    if (birdStateRef.current.y <= 0) {
      gameOverRef.current=true
      gameOverDisplayRef.current.style.display="flex"
    }

    if (!gameOverRef.current) {
      //physics of the game
      const deltaVelocity = GRAVITY_ACCELERATION * deltaTime;
      birdStateRef.current.yVelocity += deltaVelocity;
      birdStateRef.current.y += birdStateRef.current.yVelocity * deltaTime;
    }

    window.requestAnimationFrame(gameLoop);
  }



  function handleKeyPress(e) {
    if (e.code === 'Space') {
      if(gameOverRef.current){
        birdStateRef.current.y = 240;
        birdStateRef.current.yVelocity = 0;
        gameOverDisplayRef.current.style.display="none"
        gameOverRef.current = false
      }else{
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
    </div>
  )
}

export default App