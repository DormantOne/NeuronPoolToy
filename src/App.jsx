import './App.css'
import FrameLimiter from './lib/FrameLimiter';
import './Utils.css'

import { useRef, useEffect } from 'react'

function App() {

  const frameLimiter = new FrameLimiter(60)

  const canvasRef = useRef(null);
  const fpsDisplayRef = useRef(null)

  function gameLoop(){
    const canvas = canvasRef.current;
    if (!canvas){
      console.warn("attempted to perform gameLoop before canvas was mounted");
      window.requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = frameLimiter.getDeltaTime()
    if(deltaTime===undefined){
      window.requestAnimationFrame(gameLoop);
      return
    }

    if(fpsDisplayRef.current){
      fpsDisplayRef.current.textContent=(1.0/deltaTime).toFixed(3)
    }


    window.requestAnimationFrame(gameLoop);
  }

  useEffect(()=>{
    if(canvasRef.current){
      window.requestAnimationFrame(gameLoop);
    }
  },[canvasRef.current]);

  return <div className='vstack' style={{
    width: '100%',
    gap: '16px'
  }}>
    <h1>Neuron Pool Toy</h1>
    <i>Neural Network Powered Automatic Flappy Bird</i>
    <div style={{
      position: "relative"
    }}>
    <canvas ref={canvasRef} style={{
      border: '2px solid black', 
      width: '640px',
      height: '480px'
    }}  width='640' height='480'></canvas>
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      color: "green",
      fontSize: "16px"
    }} ref={fpsDisplayRef}></div>
    </div>

  </div>
}

export default App
