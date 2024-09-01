import { useState } from "react";
import "./App.css";
import FrameLimiter from "./lib/FrameLimiter";
import "./Utils.css";

import { useEffect, useRef } from "react";

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
  // but this does not apply to flappy bird

  const gameOverDisplayRef = useRef(null);

  const gameOverRef = useRef(true);

  const birdStateRef = useRef({
    y: 240,
    yVelocity: 0,
  });

  const pipesStateRef = useRef([]);

  const hasStartedRef = useRef(false);

  // we need refs to track state of the metrics
  // we need separate refs to html to change ui

  const metricsStateRef = useRef({
    score: 0,
    bestScore: 0,
    timeSurvived: 0,
    bestTimeSurvived: 0,
    ceilingHits: 0,
    floorHits: 0,
    barHits: 0,
  });

  const metricsTableScoreRef = useRef(null);
  const metricsTableBestScoreRef = useRef(null);
  const metricsTableTimeSurvivedRef = useRef(null);
  const metricsTableBestTimeSurvivedRef = useRef(null);
  const metricsTableCeilingHitsRef = useRef(null);
  const metricsTableFloorHitsRef = useRef(null);
  const metricsTableBarHitsRef = useRef(null);

  function updateMetricsTableInUI() {
    const score = metricsStateRef.current.score;
    const bestScore = metricsStateRef.current.bestScore;
    const timeSurvived = metricsStateRef.current.timeSurvived;
    const bestTimeSurvived = metricsStateRef.current.bestTimeSurvived;
    const ceilingHits = metricsStateRef.current.ceilingHits;
    const floorHits = metricsStateRef.current.floorHits;
    const barHits = metricsStateRef.current.barHits;

    metricsTableScoreRef.current.textContent = score.toString();
    metricsTableBestScoreRef.current.textContent = bestScore.toString();
    metricsTableTimeSurvivedRef.current.textContent = timeSurvived.toFixed(3);
    metricsTableBestTimeSurvivedRef.current.textContent =
      bestTimeSurvived.toFixed(3);
    metricsTableCeilingHitsRef.current.textContent = ceilingHits.toString();
    metricsTableFloorHitsRef.current.textContent = floorHits.toString();
    metricsTableBarHitsRef.current.textContent = barHits.toString();
  }

  function checkMetricName(metricName) {
    if (!Object.keys(metricsStateRef.current).includes(metricName)) {
      throw new Error(`
Invalid metric name: '${metricName}'. Check for typos in your code.
Available Metrics:
${Object.keys(metricsStateRef.current).join(", ")}
        `);
    }
  }

  /**
   *
   * @param {string} metricName
   *
   * @returns {number}
   */
  function getMetric(metricName) {
    checkMetricName(metricName);
    return metricsStateRef.current[metricName];
  }

  /**
   *
   * @param {string} metricName
   * @param {number} value
   */
  function setMetricAndUpdateUI(metricName, value) {
    checkMetricName(metricName);
    metricsStateRef.current[metricName] = value;
    updateMetricsTableInUI();
  }

  function incrementScore() {
    setMetricAndUpdateUI("score", getMetric("score") + 1);
  }

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
        scoreable: true,
      });
    } else {
      let rightmostPipe = {
        x: 0,
        y: 0,
      };

      for (const pipe of pipesStateRef.current) {
        if (pipe.x >= rightmostPipe.x) {
          rightmostPipe = pipe;
        }
      }

      existingPipe.x = rightmostPipe.x + PIPE_SPACING;
      existingPipe.y = pipeY;
      existingPipe.scoreable = true;
    }
  }

  function resetGame() {
    hasStartedRef.current = true;
    gameOverDisplayRef.current.style.display = "none";
    gameOverDisplayRef.current.textContent = "Game Over";
    gameOverDisplayRef.current.style.color = "red";
    birdStateRef.current.y = 240;
    birdStateRef.current.yVelocity = 0;
    gameOverDisplayRef.current.style.display = "none";
    gameOverRef.current = false;
    setMetricAndUpdateUI("score", 0);
    clearPipes();
    for (let i = 0; i < numBufferedPipes; i++) {
      spawnOrReusePipe(i * PIPE_SPACING, null);
    }
  }

  function setGameOver() {
    gameOverRef.current = true;
    gameOverDisplayRef.current.style.display = "flex";
  }

  function gameLoop() {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("attempted to perform gameLoop before canvas was mounted");
      window.requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    const deltaTime = frameLimiter.getDeltaTime();
    if (deltaTime === undefined) {
      window.requestAnimationFrame(gameLoop);
      return;
    }

    if (fpsDisplayRef.current) {
      fpsDisplayRef.current.textContent = (1.0 / deltaTime).toFixed(3);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bird
    // ctx.beginPath();
    // ctx.arc(BIRD_X, birdStateRef.current.y, BIRD_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = "red"; // You can choose the fill color
    // ctx.fill();
    // ctx.closePath();

    ctx.fillRect(
      BIRD_X - BIRD_RADIUS,
      birdStateRef.current.y - BIRD_RADIUS,
      2 * BIRD_RADIUS,
      2 * BIRD_RADIUS
    );

    // Draw Pipes
    for (const pipe of pipesStateRef.current) {
      // The pipe y is the centerpoit of teh gap (thin air)
      // the pipe x is te center of the pipe on the x axis (halfway through the thickness)
      // Draw the top pipe (above the gap)
      ctx.fillStyle = "green";
      ctx.fillRect(
        pipe.x - PIPE_WIDTH / 2,
        0,
        PIPE_WIDTH,
        pipe.y - PIPE_WINDOW_SIZE / 2
      );

      // Draw the bottom pipe (below the gap)
      ctx.fillRect(
        pipe.x - PIPE_WIDTH / 2,
        pipe.y + PIPE_WINDOW_SIZE / 2,
        PIPE_WIDTH,
        canvas.height - pipe.y - PIPE_WINDOW_SIZE / 2
      );
    }

    //collision check
    if (birdStateRef.current.y >= 480) {
      setGameOver();
    }
    if (birdStateRef.current.y <= 0) {
      setGameOver();
    }

    // pipe collision check

    for (const pipe of pipesStateRef.current) {
      // first, check if pipe has any chance to be relevant
      if (
        pipe.x + PIPE_WIDTH / 2 >= BIRD_X - BIRD_RADIUS &&
        pipe.x - PIPE_WIDTH / 2 <= BIRD_X + BIRD_RADIUS
      ) {
        // then check if bird is outside window
        if (
          !(
            birdStateRef.current.y - BIRD_RADIUS >=
              pipe.y - PIPE_WINDOW_SIZE / 2 &&
            birdStateRef.current.y + BIRD_RADIUS <=
              pipe.y + PIPE_WINDOW_SIZE / 2
          )
        ) {
          setGameOver();
          break;
        }
      }
    }

    if (!gameOverRef.current) {
      //physics of the game
      const deltaVelocity = GRAVITY_ACCELERATION * deltaTime;
      birdStateRef.current.yVelocity += deltaVelocity;
      birdStateRef.current.y += birdStateRef.current.yVelocity * deltaTime;
      // move pipes
      for (const pipe of pipesStateRef.current) {
        pipe.x -= PIPE_VELOCITY * deltaTime;
        // 2pixel buffer just in case
        if (pipe.x < BIRD_X - BIRD_RADIUS - PIPE_WIDTH / 2) {
          if (pipe.scoreable) {
            incrementScore();
          }
          pipe.scoreable = false;
        }
        if (pipe.x < -PIPE_WIDTH / 2 - 2) {
          spawnOrReusePipe(PIPE_SPACING, pipe);
        }
      }
    }

    window.requestAnimationFrame(gameLoop);
  }

  function handleKeyPress(e) {
    if (e.code === "Space") {
      if (gameOverRef.current) {
        resetGame();
      } else {
        birdStateRef.current.yVelocity -= FLAP_VELOCITY;
      }
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  useEffect(() => {
    if (canvasRef.current) {
      window.requestAnimationFrame(gameLoop);
    }
  }, [canvasRef.current]);

  return (
    <div
      className="hstack"
      style={{
        width: "100%",
        height: "100%",
        padding: "4px",
        gap: "4px",
      }}
    >
      <div
        className="vispanel vispanel-neuralnet"
        style={{
          flex: 1,
        }}
      ></div>

      <div
        className="vstack"
        style={{
          width: "100%",
          height: "100%",
          flex: 0,
        }}
      >
        <div
          style={{
            flex: 1,
          }}
        ></div>
        <div
          style={{
            position: "relative",
            flex: 0,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              border: "2px solid black",
              width: "640px",
              height: "480px",
            }}
            width="640"
            height="480"
          ></canvas>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              color: "black",
              fontSize: "16px",
            }}
            ref={fpsDisplayRef}
          ></div>

          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <h1
              style={{
                fontSize: "64px",
                fontWeight: "bold",
                color: "blue",
              }}
              ref={gameOverDisplayRef}
            >
              Press Space to Play
            </h1>
          </div>
        </div>
        <div
          style={{
            flex: 1,
          }}
        ></div>
      </div>
      <div
        className="vispanel vispanel-metrics vstack"
        style={{
          flex: 1,
        }}
      >
        {/* 
        will put table here - the table will have score, time elapsed, 
        distance to nearest pipe, survival time, best time survived
        */}
        <table>
          <thead>
            <tr>
              <th>Metric Name</th>
              <th>Metric Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Score (# pipes)</td>
              <td ref={metricsTableScoreRef}>0</td>
            </tr>
            <tr>
              <td>Best Score (# pipes)</td>
              <td ref={metricsTableBestScoreRef}>0</td>
            </tr>
            <tr>
              <td>Time Survived (s)</td>
              <td ref={metricsTableTimeSurvivedRef}>0</td>
            </tr>
            <tr>
              <td>Best Time Survived (s)</td>
              <td ref={metricsTableBestTimeSurvivedRef}>0</td>
            </tr>
            <tr>
              <td>Ceiling Hits</td>
              <td ref={metricsTableCeilingHitsRef}>0</td>
            </tr>
            <tr>
              <td>Floor Hits</td>
              <td ref={metricsTableFloorHitsRef}>0</td>
            </tr>
            <tr>
              <td>Bar Hits</td>
              <td ref={metricsTableBarHitsRef}>0</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
