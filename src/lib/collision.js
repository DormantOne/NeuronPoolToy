/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} Rectangle
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @param {Rectangle} rect
 * @returns {Array<Point>}
 */
function rectangleToPoints(rect) {
  return [
    {
      x: rect.x,
      y: rect.y,
    },
    {
      x: rect.x + rect.width,
      y: rect.y,
    },
    {
      x: rect.x + rect.width,
      y: rect.y + rect.height,
    },
    {
      x: rect.x,
      y: rect.y + rect.height,
    },
  ];
}

/**
 * @param {Point} point
 * @param {Rectangle} rect
 */
function pointIsInsideRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 *
 * @param {Rectangle} rect1
 * @param {Rectangle} rect2
 *
 * @returns {boolean}
 */
export function checkRectanglesCollide(rect1, rect2) {
  const rect1Corners = rectangleToPoints(rect1);
  const rect2Corners = rectangleToPoints(rect2);
  for (const corner of rect2Corners) {
    if (pointIsInsideRect(corner, rect1)) {
      return true;
    }
  }
  for (const corner of rect1Corners) {
    if (pointIsInsideRect(corner, rect2)) {
      return true;
    }
  }
  return false;
}
