export default class FrameLimiter{
    constructor(fps){
        if(typeof fps !== "number"){
            throw new Error("Please specify a valid fps value.")
        }
        this.startTime = undefined;
        this.fps = fps; 
    }

    getDeltaTime(){
        if(this.startTime === undefined){
            this.startTime = Date.now()
            return undefined
        }
        const elapsedTimeSeconds = (Date.now() - this.startTime)/1000
        if(elapsedTimeSeconds>=1.0/this.fps){
            this.startTime = Date.now()
            return elapsedTimeSeconds
        }
        return undefined
    }

}