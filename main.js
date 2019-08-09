const WIDTH = 200
const LANES = 4
const HALF_LANE = WIDTH / LANES / 2
const HEIGHT = 600

const CAR_WIDTH = 20
const CAR_HEIGHT = 30
const NUM_INITIAL_CARS = 30

import Car from './car.js'

let CARS = []

document.addEventListener('DOMContentLoaded', main)
function main() {
  for (let i = 0; i < NUM_INITIAL_CARS; i++) {
    let car = randomCar()                  
    CARS.push(car)
  }

  let canvas = document.getElementById('glass')
  let ctx = canvas.getContext('2d')

  canvas.width = WIDTH
  canvas.height = HEIGHT

  ctx.width = WIDTH
  ctx.height = HEIGHT

  setInterval(() => tick(ctx), 1000 / 60)
}

function draw(ctx) {
  ctx.fillStyle = 'gray'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.fillStyle = 'yellow'
  ctx.fillRect(1 * WIDTH / 4, 0, 1, HEIGHT)
  ctx.fillRect(2 * WIDTH / 4, 0, 1, HEIGHT)
  ctx.fillRect(3 * WIDTH / 4, 0, 1, HEIGHT)

  CARS.forEach(car => drawCar(ctx, car))
}

function tick(ctx) {
  CARS.forEach(car => {
    car.tick()
    if (car.yy < -CAR_HEIGHT) {
      CARS.push(randomCar(HEIGHT - CAR_HEIGHT))
    }
  })

  CARS = CARS.filter(car => car.yy > -CAR_HEIGHT) 

  draw(ctx, CARS)
}

function drawCar(ctx, car) {
  ctx.fillRect(car.xx - 10, car.yy, CAR_WIDTH, CAR_HEIGHT)
}

function randomCar(yy) {
  const lanesX = [
    1 * WIDTH / 4 - HALF_LANE,
    2 * WIDTH / 4 - HALF_LANE,
    3 * WIDTH / 4 - HALF_LANE,
    4 * WIDTH / 4 - HALF_LANE,
  ]

  let xx = lanesX[Math.floor(lanesX.length * Math.random())]
  yy = yy || HEIGHT * Math.random()

  // have the car drive between 55-80 MPH scaled to where 10 represents 60 MPH
  let minSpeed = 55
  let maxSpeed = 82
  let speed = (minSpeed + (maxSpeed - minSpeed) * Math.random()) / 10

  const car = new Car(xx, yy, speed)
  return car
}
