const WIDTH = 200
const NUM_LANES = 4
const HALF_LANE = WIDTH / NUM_LANES / 2
const HEIGHT = 600

const CAR_WIDTH = 20
const CAR_HEIGHT = 30
const MIN_DISTANCE = CAR_HEIGHT + 8

const SPEED_FACTOR = 20

const NUM_INITIAL_CARS = 30

let IS_PLAYING = false
let CAR_COUNT = 1

import Car from './car.js'

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

  for (let i = 0; i < NUM_INITIAL_CARS; i++) {
    generateCar()
  }

  iterateOverCarsLaneByLane((lane, key) => {
    lane.sort(compareLanePosition)  
    dedupeLane(key)
  })

  tick(ctx, true);
}

function main() {
  let canvas = document.getElementById('glass')
  let ctx = canvas.getContext('2d')

  canvas.width = WIDTH
  canvas.height = HEIGHT

  ctx.width = WIDTH
  ctx.height = HEIGHT

  reset(ctx)
  document.addEventListener('keypress', () => togglePlayback(ctx))

  setInterval(() => tick(ctx), 1000 / 60)
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

  iterateCar(car => drawCar(ctx, car))
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
}

function tick(ctx, isForced) {
  if (!isForced && !IS_PLAYING) return

  iterateBumperToBumper((car1, car2) => {
    let initialYY = car1.yy
    car1.tick()

    console.log('car12', car1.number, car2 && car2.number, car1.yy, car2 && car2.yy)

    // is the car so close to another it should break?
    if (car2) {
      let distance = Math.abs(car1.yy - car2.yy)
      if (distance < MIN_DISTANCE) {
        car1.yy = initialYY
        car1.isBraking = true
      }
    }

    // has the car gone off the top of the screen?
    if (car1.yy < -CAR_HEIGHT) {
      car1.isToBeDeleted = true
    }
  })

  if (totalCars() < NUM_INITIAL_CARS) {
    generateCar(HEIGHT - CAR_HEIGHT)
  }   

  filterCars(car => !car.isToBeDeleted) 

  draw(ctx)
}

function drawCar(ctx, car) {
  ctx.fillStyle = 'yellow'
  ctx.fillRect(car.xx - 10, car.yy, CAR_WIDTH, CAR_HEIGHT)
  ctx.fillText('' + car.number, car.xx + 10, car.yy)

  if (car.isBraking) {
    ctx.fillStyle = 'red'
    ctx.fillRect(car.xx - CAR_WIDTH / 2,                car.yy + CAR_HEIGHT - 3, 3, 3)
    ctx.fillRect(car.xx - CAR_WIDTH / 2+ CAR_WIDTH - 3, car.yy + CAR_HEIGHT - 3, 3, 3)
  }
}

function randomCar(yy) {
  const lanesX = [
    1 * WIDTH / 4 - HALF_LANE,
    2 * WIDTH / 4 - HALF_LANE,
    3 * WIDTH / 4 - HALF_LANE,
    4 * WIDTH / 4 - HALF_LANE,
  ]

  let laneKey = Math.floor(lanesX.length * Math.random())
  let xx = lanesX[laneKey]
  yy = yy || HEIGHT * Math.random()

  // have the car drive between 55-80 MPH scaled to where 10 represents 60 MPH
  let minSpeed = 55
  let maxSpeed = 82
  let speed = (minSpeed + (maxSpeed - minSpeed) * Math.random()) / SPEED_FACTOR

  const car = new Car(xx, yy, speed)
  car.number = CAR_COUNT++
  return {car, laneKey}
}

function compareLanePosition(car1, car2) {
  return car2.yy - car1.yy
}

function dedupeLane(laneKey) {
  let lane = LANES[laneKey]
  for (let i = 0; i < lane.length - 1; i++) {
    let thisCar = lane[i]
    let nextCar = lane[i + 1]

    let distance = Math.abs(thisCar.yy - nextCar.yy)
    if (distance < CAR_HEIGHT) {
      thisCar.isToBeDeleted = true
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

function iterateCar(cb) {
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
