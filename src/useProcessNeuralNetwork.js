/**
 * plays a dual role. first role is that it computes the neural network and 
 * determines if it should flap or not. the second role is to draw the neural
 * network visualization on the canvas we provided. 
 * 
 * @remarks
 * we express this function as a react hook so that we can incorporate the
 * React `useRef` to store state
 */
export default function useProcessNeuralNetwork(){
    /**
     * @param {number} deltaTime - the amount of time elapsed since last frame
     * @param {number} birdPosition -
     * y / vertical position of bird from 0-480
     * 0 is top of gamefield and increases downwards to 480
     * @param {velocity} birdVelocity - 
     * bird velocity positive - means going toward bottom of gamefield ie falling
     * bird velocity negative - means going up ie lifting up
     * 
     * @param {Array<Array<boolean>>} sensorArray - 
     * represents visual field of the bird
     * 
     * @param {number} lastFitnessLevel -
     * fitness level at frame prior to this one
     * 
     * @remarks - for the time being this is equal to total elapsed time, 
     * but in the future may introduce more complex fitness functions
     * 
     * @param {CanvasRenderingContext2D} neuralNetworkCtx -
     * this is the drawing handle for the neural network visualization canvas
     * 
     * @param {number} canvasWidth - 
     * this is the current width of the visualization canvas
     * 
     * @param {number} canvasHeight - 
     * this is the current height of the visualization canvas
     * 
     * @returns {boolean} - whether to flap or not on the given game frame
     * 
     */
    function processNeuralNetwork(
        deltaTime,
        birdPosition,
        birdVelocity,
        sensorArray,
        lastFitnessLevel,
        neuralNetworkCtx,
        canvasWidth,
        canvasHeight
    ){

        return true;

    }
    return processNeuralNetwork
}
