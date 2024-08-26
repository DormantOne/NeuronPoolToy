/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y 
 */

/**
 * @typedef {object} Rectangle
 * @property {number} x
 * @property {number} y 
 * @property {number} w 
 * @property {number} h 
 */

/**
 * @param {Rectangle} rect 
 * @returns {Array<Point>}
 */
function rectangleToPoints(rect) {
    return [
        {
            x: rect.x,
            y: rect.y
        },
        {
            x: rect.x + rect.w,
            y: rect.y
        },
        {
            x: rect.x + rect.w,
            y: rect.y + rect.y
        },
        {
            x: rect.x,
            y: rect.y + rect.h
        }
    ]
}

/**
 * @param {Point} point 
 * @param {Rectangle} rect 
 */
function pointIsInsideRect(point, rect) {
    return point.x >= rect.x && point.x <= (rect.x + rect.w) && point.y >= rect.y && point.y <= (rect.y + rect.h)
}

/**
 * 
 * @param {Rectangle} rect1 
 * @param {Rectangle} rect2
 * 
 * @returns bool 
 */
export function checkRectanglesCollide(rect1, rect2) {
    const rect2Corners = rectangleToPoints(rect2)
    for (const corner of rect2Corners) {
        if(pointIsInsideRect(corner,rect1)){
            return true
        }
    }
    return false
}