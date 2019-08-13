export default class Car {
  constructor(xx, yy, speed, color) {
    this.speed = 1
    this.xx = xx || 0
    this.yy = yy || 0
    this.speed = speed || 1
    this.color = color || 'yellow'

    this.isBraking = false
    this.history = []
  }

  tick() {
    this.isBraking = false
    this.yy -= this.speed    
  }
}
