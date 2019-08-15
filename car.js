import * as Constants from './config.js'

export default class Car {
  constructor(xx, yy, speed, color) {
    this.speed = 1
    this.xx = xx || 0
    this.yy = yy || 0
    this.speed = speed || 1
    this.color = color || 'yellow'

    this.personality = 'nuetral'
    this.isBraking = false
    this.history = []
  }

  tick() {
    if (this.personality === 'aggressive') {
      if (this.isBraking) {
        this.wantsToTurn = true
      } else {
        this.speed += 1
      }
    }
  
    this.isBraking = false
    this.yy -= (this.speed / Constants.SPEED_FACTOR)
  }
}

Car.personalities = [
  'nuetral',
  'player',
  'aggressive',
  'slow',
  'follower',
  'left-laner',
]
