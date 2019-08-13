export default class Car {
  constructor(xx, yy, speed) {
    this.speed = 1
    this.xx = xx || 0
    this.yy = yy || 0
    this.speed = speed || 1

    this.isBraking = false
    this.trail = []
  }

  tick() {
    this.isBraking = false
    this.yy -= this.speed    
    this.trail.push(this.yy)
  }
}
