import "./App.css";
import FrameLimiter from "./lib/FrameLimiter";
import "./Utils.css";
import { checkRectanglesCollide } from "./lib/collision";

import { useEffect, useRef } from "react";

import useProcessNeuralNetwork from "./useProcessNeuralNetwork";

/**
 * @typedef {object} Pipe - datastructure for the pipe
 * @property {number} x - x coordinate for center of pipe
 * @property {number} y - y coordinate for center of gap
 * @property {boolean} scoreable -
 * this will be true if the pipe center has not yet passed the bird
 * used primarily to allow pipes to not need to be ordered when stored
 */

/**
 * @typedef {object} Size - size of an html element
 * @property {number} width - width of element
 * @property {number} height - height of element
 */

function App() {
  const frameLimiter = new FrameLimiter(60);
  const canvasRef = useRef(null);
  const neuralNetworkCanvasRef = useRef(null);

  function onResize() {
    const canvasElement = neuralNetworkCanvasRef.current;
    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      console.log("neuralnetwork canvas width", rect.width);
      console.log("neuralnetwork canvas height", rect.height);
      canvasElement.width = rect.width;
      canvasElement.height = rect.height;
    } else {
      console.log(
        "page resize listener called before neural network canvas element mounted."
      );
    }
  }

  useEffect(() => {
    console.log("attaching resize listener...");
    window.addEventListener("resize", onResize);
    return () => {
      console.log("removing resize listener...");
      window.removeEventListener("resize", onResize);
    };
  }, [neuralNetworkCanvasRef.current, onResize]);

  const BIRD_RADIUS = 15;
  const BIRD_X = 40;
  const PIPE_VELOCITY = 80; //pixels per second leftward moving velocity
  const PIPE_SPACING = 200; //pixels between pipes
  const PIPE_WINDOW_SIZE = 140;
  const PIPE_WINDOW_MIN_DISTANCE = 40;
  const PIPE_WIDTH = 40;

  const SENSOR_SQUARE_SIZE = 20;

  const numBufferedPipes = Math.ceil(640 / PIPE_SPACING) + 2;
  const minPipeY = PIPE_WINDOW_MIN_DISTANCE + PIPE_WINDOW_SIZE / 2;
  const maxPipeY = 480 - PIPE_WINDOW_MIN_DISTANCE - PIPE_WINDOW_SIZE / 2;

  const GRAVITY_ACCELERATION = 250; //pixels per second squared
  const FLAP_VELOCITY = 100; // pixels per second per full keypress
  // Using acceleration would be relevant if we cared about how long a button is held
  // but this does not apply to flappy bird

  const gameOverDisplayRef = useRef(null);

  const gameOverRef = useRef(true);

  const birdStateRef = useRef({
    y: 240,
    yVelocity: 0,
  });

  /**
   * @type {import('react').MutableRefObject<Array<Pipe>>}
   */
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

  const numSquaresX = Math.floor(640 / SENSOR_SQUARE_SIZE);
  const numSquaresY = Math.floor(480 / SENSOR_SQUARE_SIZE);

  const sensorGridRef = useRef(
    new Array(numSquaresY).fill(false).map(() => {
      return new Array(numSquaresX).fill(false);
    })
  );

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

  function updateBestScore() {
    const previousBestScore = getMetric("bestScore");
    const currentScore = getMetric("score");
    if (currentScore > previousBestScore) {
      setMetricAndUpdateUI("bestScore", currentScore);
    }
  }

  function incrementScore() {
    setMetricAndUpdateUI("score", getMetric("score") + 1);
    updateBestScore();
  }

  function addElapstedTime(deltaTimeSeconds) {
    const currentTimeSurvived = getMetric("timeSurvived");
    const newTimeSurvived = currentTimeSurvived + deltaTimeSeconds;
    const currentBestTimeSurvived = getMetric("bestTimeSurvived");

    setMetricAndUpdateUI("timeSurvived", newTimeSurvived);

    if (newTimeSurvived > currentBestTimeSurvived) {
      setMetricAndUpdateUI("bestTimeSurvived", newTimeSurvived);
    }
  }

  function incrementCeilingHits() {
    setMetricAndUpdateUI("ceilingHits", getMetric("ceilingHits") + 1);
  }

  function incrementFloorHits() {
    setMetricAndUpdateUI("floorHits", getMetric("floorHits") + 1);
  }

  function incrementBarHits() {
    setMetricAndUpdateUI("barHits", getMetric("barHits") + 1);
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
    setMetricAndUpdateUI("timeSurvived", 0);
    clearPipes();
    for (let sgIndexY = 0; sgIndexY < numSquaresY; sgIndexY++) {
      for (let sgIndexX = 0; sgIndexX < numSquaresX; sgIndexX++) {
        sensorGridRef.current[sgIndexY][sgIndexX] = false;
      }
    }
    for (let i = 0; i < numBufferedPipes; i++) {
      spawnOrReusePipe(i * PIPE_SPACING, null);
    }
  }

  function setGameOver() {
    gameOverRef.current = true;
    gameOverDisplayRef.current.style.display = "flex";
  }

  /**
   * given the state of the pipes on the playfield
   * simulate visual sensors by computing where pipes a grid of
   * square sensored regions based off the current pipe state
   *
   * @remarks
   * first we determine the sensor size as pipe width / SENSORS_PER_PIPE
   * for now will let it be 2 to reduce data size but 3 may be more effective
   * then we round down the pixel size of each sensor square
   * then we round down the playfield size so we have an even number of squares
   * this means that a few pixels on bottom edge or right edge may not be accounted for
   */
  function computeAndDrawVisualSensorData(ctx) {
    for (let sgIndexY = 0; sgIndexY < numSquaresY; sgIndexY++) {
      for (let sgIndexX = 0; sgIndexX < numSquaresX; sgIndexX++) {
        sensorGridRef.current[sgIndexY][sgIndexX] = false;
      }
    }

    // at this point we have an empty sensor grid - all set to false
    // goal number 2 is to loop through each pipe state and 'draw it'
    // onto the grid
    // the naive way is to go through each pipe and see the sensor
    // instead we need to focus on each pipe - focus on region.

    // extract the state of the pipes from the current game state
    const pipesState = pipesStateRef.current;

    // loop through each pipe
    for (const pipe of pipesState) {
      const pipeX = pipe.x;
      const pipeY = pipe.y;
      const scoreable = pipe.scoreable;
      if (!scoreable) {
        continue;
      }
      // goal - narrow down region of sensors that will matter
      // will use ceiling and floor functions
      // pipe will have affect on sensor no greater than its leftmost point
      const leftSearchBorder = pipeX - PIPE_WIDTH / 2;
      const rightSearchBorder = pipeX + PIPE_WIDTH / 2;
      const bufferedLeftSearchBorder =
        Math.floor(leftSearchBorder / SENSOR_SQUARE_SIZE) * SENSOR_SQUARE_SIZE;
      const bufferedRightSearchBorder =
        Math.ceil(rightSearchBorder / SENSOR_SQUARE_SIZE) * SENSOR_SQUARE_SIZE;
      const sensorGridSearchRegionXIndexStartInclusive =
        bufferedLeftSearchBorder / SENSOR_SQUARE_SIZE; //we know it will be whole #
      const sensorGridSearchRegionXIndexEndInclusive =
        bufferedRightSearchBorder / SENSOR_SQUARE_SIZE;
      const sensorGridSearchRegionYIndexStartInclusive = 0;
      const sensorGridSearchRegionYIndexEndInclusive = numSquaresY - 1;
      // goal - we want to do a 2 d loop through our search region -
      // from zero to the full size of the thing
      for (
        let searchIndexY = sensorGridSearchRegionYIndexStartInclusive;
        searchIndexY <= sensorGridSearchRegionYIndexEndInclusive;
        searchIndexY++
      ) {
        for (
          let searchIndexX = sensorGridSearchRegionXIndexStartInclusive;
          searchIndexX <= sensorGridSearchRegionXIndexEndInclusive;
          searchIndexX++
        ) {
          const sensorSquareTopLeftSpatialX = searchIndexX * SENSOR_SQUARE_SIZE;
          const sensorSquareTopLeftSpatialY = searchIndexY * SENSOR_SQUARE_SIZE;
          const sensorSquareWidth = SENSOR_SQUARE_SIZE;
          const sensorSquareHeight = SENSOR_SQUARE_SIZE;
          const pipeTopSectionTopLeftSpatialX = pipeX - PIPE_WIDTH / 2;
          const pipeTopSectionTopLeftSpatialY = 0;
          const pipeTopSectionWidth = PIPE_WIDTH;
          const pipeTopSectionHeight = pipeY - PIPE_WINDOW_SIZE / 2;
          const pipeBottomSectionTopLeftSpatialX = pipeX - PIPE_WIDTH / 2;
          const pipeBottomSectionTopLeftSpatialY = pipeY + PIPE_WINDOW_SIZE / 2;
          const pipeBottomSectionWidth = PIPE_WIDTH;
          const pipeBottomSectionHeight = 480 - pipeY - PIPE_WINDOW_SIZE / 2;

          const sensorSquareRect = {
            x: sensorSquareTopLeftSpatialX,
            y: sensorSquareTopLeftSpatialY,
            width: sensorSquareWidth,
            height: sensorSquareHeight,
          };

          const pipeTopSectionRect = {
            x: pipeTopSectionTopLeftSpatialX,
            y: pipeTopSectionTopLeftSpatialY,
            width: pipeTopSectionWidth,
            height: pipeTopSectionHeight,
          };

          const pipeBottomSectionRect = {
            x: pipeBottomSectionTopLeftSpatialX,
            y: pipeBottomSectionTopLeftSpatialY,
            width: pipeBottomSectionWidth,
            height: pipeBottomSectionHeight,
          };

          function drawDebugRectForCollisions(r, fs) {
            ctx.strokeStyle = "1px solid black";
            ctx.fillStyle = fs;
            ctx.fillRect(r.x, r.y, r.width, r.height);
            ctx.strokeRect(r.x, r.y, r.width, r.height);
          }

          drawDebugRectForCollisions(
            sensorSquareRect,
            "rgba(128,255,255,0.25)"
          );

          if (
            checkRectanglesCollide(sensorSquareRect, pipeTopSectionRect) ||
            checkRectanglesCollide(sensorSquareRect, pipeBottomSectionRect)
          ) {
            sensorGridRef.current[searchIndexY][searchIndexX] = true;
          }
        }
      }
    }

    for (let sgIndexY = 0; sgIndexY < numSquaresY; sgIndexY++) {
      for (let sgIndexX = 0; sgIndexX < numSquaresX; sgIndexX++) {
        if (!sensorGridRef.current[sgIndexY][sgIndexX]) {
          continue;
        }
        const topLeftSpatialX = sgIndexX * SENSOR_SQUARE_SIZE;
        const topLeftSpatialY = sgIndexY * SENSOR_SQUARE_SIZE;
        ctx.fillStyle = "rgba(255,128,128,0.25)";
        ctx.fillRect(
          topLeftSpatialX,
          topLeftSpatialY,
          SENSOR_SQUARE_SIZE,
          SENSOR_SQUARE_SIZE
        );
      }
    }
  }

  function flapOrRestartGame() {
    if (gameOverRef.current) {
      resetGame();
    } else {
      birdStateRef.current.yVelocity -= FLAP_VELOCITY;
    }
  }

  const processNeuralNetwork = useProcessNeuralNetwork();

  function gameLoop() {
    const canvas = canvasRef.current;
    const neuralNetworkCanvas = neuralNetworkCanvasRef.current;
    if (!canvas) {
      console.warn("attempted to perform gameLoop before canvas was mounted");
      window.requestAnimationFrame(gameLoop);
      return;
    }

    if (!neuralNetworkCanvas) {
      console.warn(
        "attempted to perform gameLoop before neural networkcanvas was mounted"
      );
      window.requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    const neuralNetworkCtx = neuralNetworkCanvas.getContext("2d");
    const deltaTime = frameLimiter.getDeltaTime();
    if (deltaTime === undefined) {
      window.requestAnimationFrame(gameLoop);
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameOverRef.current) {
      computeAndDrawVisualSensorData(ctx);
    }

    const shouldFlap = processNeuralNetwork(
      deltaTime,
      birdStateRef.current.y,
      birdStateRef.current.yVelocity,
      sensorGridRef.current,
      getMetric("timeSurvived"),
      neuralNetworkCtx,
      neuralNetworkCanvasRef.current.width,
      neuralNetworkCanvasRef.current.height
    );
    flapOrRestartGame();
    console.log("should flap", shouldFlap);

    // Draw bird

    ctx.fillStyle = "red";

    ctx.fillRect(
      BIRD_X - BIRD_RADIUS,
      birdStateRef.current.y - BIRD_RADIUS,
      2 * BIRD_RADIUS,
      2 * BIRD_RADIUS
    );

    for (const pipe of pipesStateRef.current) {
      ctx.fillStyle = "rgba(255,128,255)";
      ctx.fillRect(
        pipe.x - PIPE_WIDTH / 2,
        0,
        PIPE_WIDTH,
        pipe.y - PIPE_WINDOW_SIZE / 2
      );

      ctx.fillStyle = "rgba(255,255,128)";

      ctx.fillRect(
        pipe.x - PIPE_WIDTH / 2,
        pipe.y + PIPE_WINDOW_SIZE / 2,
        PIPE_WIDTH,
        canvas.height - pipe.y - PIPE_WINDOW_SIZE / 2
      );
    }

    if (!gameOverRef.current) {
      addElapstedTime(deltaTime);
    }

    //collision check
    if (birdStateRef.current.y >= 480) {
      if (!gameOverRef.current) {
        incrementFloorHits();
      }
      setGameOver();
    }
    if (birdStateRef.current.y <= 0) {
      if (!gameOverRef.current) {
        incrementCeilingHits();
      }
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
          if (!gameOverRef.current) {
            incrementBarHits();
          }
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

  useEffect(() => {
    if (canvasRef.current && neuralNetworkCanvasRef.current) {
      window.requestAnimationFrame(gameLoop);
    }
  }, [canvasRef.current, neuralNetworkCanvasRef.current]);

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
      >
        <canvas
          width={0}
          height={0}
          className="neural-network-canvas"
          ref={neuralNetworkCanvasRef}
        ></canvas>
      </div>

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
        <table className="metrics-table">
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
