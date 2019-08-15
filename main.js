let TICKS = 0

const WIDTH = 200
const NUM_LANES = 4
const HALF_LANE = WIDTH / NUM_LANES / 2
const HEIGHT = 700

const LANES_X = [
  1 * WIDTH / 4 - HALF_LANE,
  2 * WIDTH / 4 - HALF_LANE,
  3 * WIDTH / 4 - HALF_LANE,
  4 * WIDTH / 4 - HALF_LANE,
]

const CAR_WIDTH = 20
const CAR_HEIGHT = 30
const MIN_DISTANCE = CAR_HEIGHT + 8

const SPEED_FACTOR = 20

const SCALE = 5
const ENABLE_RANDOM_WALK = false
let ROAD_CAPACITY = 12
const PERCENT_LANE_CHANGE = .8

let IS_PLAYING = false
let CAR_COUNT = 1

let DRIVING = null

import Car from './car.js'
import Util from './util.js'

let LANES = {}
for (let i = 0; i < NUM_LANES; i++) {
  LANES[i] = []
}

document.addEventListener('DOMContentLoaded', main)

function reset(ctx) {
  LANES = {}
  for (let i = 0; i < NUM_LANES; i++) {
    LANES[i] = []
  }

  for (let i = 0; i < ROAD_CAPACITY; i++) {
    generateCar()
  }

  iterateOverCarsLaneByLane((lane, key) => {
    dedupeLane(key)
    sortLane(lane)
  })

  tick(ctx, true);
  setDriver(ctx)
}

function setDriver(ctx) {
  if (DRIVING) DRIVING.isDriving = false
  DRIVING = LANES[1][LANES[1].length - 1]
  DRIVING.isDriving = true
  draw(ctx)
}

function main() {
  let canvas = document.getElementById('glass')
  let ctx = canvas.getContext('2d')

  canvas.width = WIDTH
  canvas.height = HEIGHT

  ctx.width = WIDTH
  ctx.height = HEIGHT

  reset(ctx)
  document.addEventListener('keyup', (ev) => {
    console.log('key', ev.which)

    let keyCode = document.getElementById('keycode')
    keyCode.textContent = ev.which

    if (ev.which === 32) togglePlayback(ctx)
    if (ev.which === 9) setDriver(ctx) // TAB
    if (ev.which === 82) reverse(ctx)
    if (ev.which === 75 || ev.which === 38) speedUp(ctx) // speedup
    if (ev.which === 74 || ev.which === 40) slowDown(ctx) // slowdown
    if (ev.which === 72 || ev.which === 37) makeTurn(DRIVING, 'left')
    if (ev.which === 76 || ev.which === 39) makeTurn(DRIVING, 'right')
  })
  document.getElementById('playpause').addEventListener('click', () => togglePlayback(ctx))
  document.getElementById('tick').addEventListener('click', () => tick(ctx, true))
  document.addEventListener('mousedown', ev => click(ev, ctx))


  if (ENABLE_RANDOM_WALK) setInterval(randomWalk, 1000) 
  setInterval(() => tick(ctx), 1000 / 60)
}

function click(ev, ctx) {
  const rect = ev.target.getBoundingClientRect();
  const xx = ev.clientX - rect.left;
  const yy = ev.clientY - rect.top;
  selectCar(ctx, xx, yy)
}

function selectCar(ctx, xx, yy) {
  let {car, distance} = getClosestCar(xx, yy)
  if (!car) return
  if (distance > CAR_HEIGHT) return

  car.isSpecial = !car.isSpecial
  car.isDriving = !car.isDriving

  DRIVING = car
  DRIVING.wasEverDriven = true

  console.log(car, car.history)

  draw(ctx, true)
}

function getClosestCar(xx, yy) {
  let minDistance = null
  let closestCar = null
  iterateCars(car => {
    let distance = Util.distance(xx, yy, car.xx, car.yy)
    if (!minDistance || distance < minDistance) {
      minDistance = distance
      closestCar = car
    }
  })
  return {car: closestCar, distance: minDistance}
}

function togglePlayback(ctx) {
  IS_PLAYING = !IS_PLAYING
}

function draw(ctx) {
  ctx.fillStyle = 'gray'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = 'yellow'
  ctx.fillRect(1 * WIDTH / 4, 0, 1, HEIGHT)
  ctx.fillRect(2 * WIDTH / 4, 0, 1, HEIGHT)
  ctx.fillRect(3 * WIDTH / 4, 0, 1, HEIGHT)

  iterateBumperToBumper((car1, car2) => {
    drawCar(ctx, car1)
  })

  iterateBumperToBumper((car1, car2) => {
    if (car1.isSpecial) {
      drawChain(ctx, car1, closestCar(car1, LANES[car1.laneKey], 'forward'))
      drawChain(ctx, car1, closestCar(car1, LANES[car1.laneKey - 1], 'forward'))
      drawChain(ctx, car1, closestCar(car1, LANES[car1.laneKey + 1], 'forward'))
      drawChain(ctx, car1, closestCar(car1, LANES[car1.laneKey - 1], 'backward'))
      drawChain(ctx, car1, closestCar(car1, LANES[car1.laneKey + 1], 'backward'))
    }
  })
}

function closestCar(car, lane, direction) {
  if (!lane) return

  let minDistance = NaN
  let closest = null
  lane.forEach(car2 => {
    if (direction === 'forward') {
      if (car2.yy < car.yy) {
        let distance = Math.abs(car2.yy - car.yy)
        if (closest === null || distance < minDistance) {
          minDistance = distance
          closest = car2
        }
      }
    } else if (direction === 'backward') {
      if (car2.yy > car.yy) {
        let distance = Math.abs(car2.yy - car.yy)
        if (closest === null || distance < minDistance) {
          minDistance = distance
          closest = car2
        }
      }
    } 
  })

  return closest
}

function drawChain(ctx, car1, car2) {
  if (!car2) return

  ctx.strokeStyle = car1.color
  ctx.fillStyle = car1.color
  ctx.beginPath()
  ctx.moveTo(car1.xx, car1.yy)
  ctx.lineTo(car2.xx, car2.yy)
  ctx.closePath()
  ctx.stroke()
}

function generateCar(yy) {
  let {car, laneKey} = randomCar(yy)

  let lane = LANES[laneKey]
  let lastCar = lane[lane.length - 1]
  if (lastCar) {
    let distance = Math.abs(car.yy - lastCar.yy)
    if (distance > MIN_DISTANCE) {
      lane.push(car)
    }
  } else {
    lane.push(car)
  }

  sortLane(lane)
}

function tick(ctx, isForced) {
  TICKS++
  if (!isForced && !IS_PLAYING) return

  iterateBumperToBumper((car1, car2) => {
    let initialYY = car1.yy
    car1.tick()
    car1.isBraking = false

    // has the car gone off the top of the screen?
    if (car1.yy < -CAR_HEIGHT) {
      car1.isToBeDeleted = 'off top of screen'
    } else if (car2) {
      // is the car so close to another it should break?
      let distance = Math.abs(car1.yy - car2.yy)
  
      //if (distance < 5) debugger

      if (distance < MIN_DISTANCE) {
        car1.yy = initialYY + car1.speed / 2
        car1.isBraking = true
        car1.isDisplayingBradking = true
        setTimeout(() => {
          car1.isDisplayingBradking = false
        }, 600)
  
        car2.yy += 1
      }
    } else if (car1.wantsToTurn) {
      makeTurn(car1, car1.wantsToTurn)
    // prevent cars that have been driven from making autonomous lane changes again
    } else if (DRIVING && !DRIVING.wasEverDriven && !car1.isMakingTurn && Math.random() < PERCENT_LANE_CHANGE) {
      makeTurn(car1)
    }
  })

  if (totalCars() < ROAD_CAPACITY) {
    generateCar(HEIGHT + CAR_HEIGHT)
  }   

  filterCars(car => {
    return !car.isToBeDeleted
  }) 

  draw(ctx)
}

function randomWalk() {
  let scale = Math.random() * SCALE
  let upOrDown = Math.random() < .5 ? 1 : -1
  ROAD_CAPACITY = Math.max(1, ROAD_CAPACITY + upOrDown * scale)
}

function drawCar(ctx, car) {
  ctx.fillStyle = car.color
  ctx.fillRect(car.xx - 10, car.yy, CAR_WIDTH, CAR_HEIGHT)

  ctx.fillStyle = 'black'
  ctx.fillText('' + car.number + '\n' + car.laneKey, car.xx + 10, car.yy)

  ctx.fillStyle = 'rgb(34,192,240)'
  ctx.fillRect(car.xx - CAR_WIDTH / 2 + 2, car.yy + 2, CAR_WIDTH - 4, 6)

  // left headlight
  ctx.fillStyle = car.isSpecial ? 'yellow' : 'white'
  ctx.beginPath()
  ctx.moveTo(car.xx - CAR_WIDTH / 2 + 4, car.yy + 4)
  ctx.lineTo(car.xx - CAR_WIDTH / 2 + 4 - 5, car.yy - 10 + 4)
  ctx.lineTo(car.xx - CAR_WIDTH / 2 + 4 + 5, car.yy - 10 + 4)
  ctx.closePath()
  ctx.fill()

  // right headlight
  ctx.fillStyle = car.isSpecial ? 'yellow' : 'white'
  ctx.beginPath()
  ctx.moveTo(car.xx + CAR_WIDTH / 2 - 4, car.yy + 4)
  ctx.lineTo(car.xx + CAR_WIDTH / 2 - 4 - 5, car.yy - 10 + 4)
  ctx.lineTo(car.xx + CAR_WIDTH / 2 - 4 + 5, car.yy - 10 + 4)
  ctx.closePath()
  ctx.fill()

  if (car.isBraking || car.isDisplayingBradking) {
    ctx.fillStyle = 'red'
    ctx.fillRect(car.xx - CAR_WIDTH / 2,                car.yy + CAR_HEIGHT - 3, 3, 3)
    ctx.fillRect(car.xx - CAR_WIDTH / 2+ CAR_WIDTH - 3, car.yy + CAR_HEIGHT - 3, 3, 3)
  }

  if (car.isDriving) {
    ctx.strokeStyle = 'yellow'
    ctx.beginPath();
    ctx.arc(car.xx, car.yy + CAR_HEIGHT / 2, CAR_HEIGHT * 1.2, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

function randomCar(yy) {
  let laneKey = Math.floor(LANES_X.length * Math.random())
  let xx = LANES_X[laneKey]
  yy = yy || HEIGHT * Math.random()

  // have the car drive between 55-80 MPH scaled to where 10 represents 60 MPH
  let minSpeed = 55
  let maxSpeed = 82
  let speed = (minSpeed + (maxSpeed - minSpeed) * Math.random()) / SPEED_FACTOR

  let rr = Math.floor(255 * Math.random())
  let gg = Math.floor(255 * Math.random())
  let bb = Math.floor(255 * Math.random())
  let color = `rgb(${rr},${gg},${bb})`

  const car = new Car(xx, yy, speed, color)
  car.laneKey = laneKey
  car.number = CAR_COUNT++

  car.isSpecial = Math.random() < .1
  return {car, laneKey}
}

function dedupeLane(laneKey) {
  let lane = LANES[laneKey]
  for (let i = 0; i < lane.length - 1; i++) {
    let thisCar = lane[i]
    let nextCar = lane[i + 1]

    let distance = Math.abs(thisCar.yy - nextCar.yy)
    if (distance < CAR_HEIGHT) {
      thisCar.isToBeDeleted = 'deduping lane'
    }
  }

  LANES[laneKey] = lane.filter(car => !car.isToBeDeleted)
}

function iterateOverCarsLaneByLane(cb) {
  for (let key in LANES) {
    cb(LANES[key], key)
  }
}

function iterateBumperToBumper(cb) {
  iterateOverCarsLaneByLane((lane, laneKey) => {
    for (let i = lane.length - 1; i >= 0; i--) {
      let thisCar = lane[i]
      let nextCar = lane[i - 1]
      cb(thisCar, nextCar, i, i - 1)
    }
  })
}

function iterateCars(cb) {
  iterateBumperToBumper(car => cb(car))
}

function filterCars(test) {
  iterateOverCarsLaneByLane((lane, laneKey) => {
    LANES[laneKey] = lane.filter(test)
  })
}

function totalCars() {
  let sum = 0
  iterateOverCarsLaneByLane(lane => sum += lane.length)
  return sum
}

function makeTurn(car, direction) {
  if (!car) return

  let isLeft = Math.random() < .7
  if (direction) {
    isLeft = direction === 'left'
    car.wantsToTurn = direction
  }

  let newLaneKey = car.laneKey - 1
  let dx = -4
  if (!isLeft) {
    newLaneKey = car.laneKey + 1
    dx *= -1
  }

  // don't change lanes off the road
  if (newLaneKey < 0) return
  if (newLaneKey >= Object.keys(LANES).length) return

  // check to see if there's a car in the other lane
  if (!isSafe(car, newLaneKey)) return

  car.isMakingTurn = true
  car.history.push(`${TICKS} from ${car.laneKey} to ${newLaneKey}`)
  car.wantsToTurn = undefined
  let timerId = setInterval(() => {
    car.xx += dx
    let isDone = Math.abs(car.xx - LANES_X[newLaneKey]) < 8
    if (isDone) {
      car.isMakingTurn = false
      car.xx = LANES_X[newLaneKey]
      clearInterval(timerId)

      let oldLane = LANES[car.laneKey]
      let newLane = LANES[newLaneKey]
      car.laneKey = newLaneKey

      let index = oldLane.indexOf(car) 
      oldLane.splice(index, 1)

      newLane.push(car)
      sortLane(newLane)
    }
  }, 1000 / 30) 
}

function sortLane(lane) {
  lane.sort((car1, car2) => car1.yy - car2.yy)
}

// msmog: mirror, signal, mirror, over-the-shoulder, go
function isSafe(car, newLaneKey) {
  for (let otherCar of LANES[newLaneKey]) {
    let distance = Math.abs(car.yy - otherCar.yy)
    if (distance < MIN_DISTANCE * 1.2) {
      return false
    }
  }
  return true
}

function speedUp() {
  if (!DRIVING) return
  DRIVING.speed += 1
  displaySpeed()
}

function slowDown() {
  if (!DRIVING) return
  DRIVING.speed -= 1
  displaySpeed()
}

function reverse() {
  if (!DRIVING) return
  DRIVING.speed *= -1
  displaySpeed()
}


function displaySpeed() {
  let speed = document.getElementById('speed')
  speed.textContent = DRIVING.speed + ' MPH'
}
