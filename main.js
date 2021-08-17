let TICKS = 0

let IS_PLAYING = true
let IS_DRAWING_PROXIMITY_MESH = false
let CAR_COUNT = 1

let DRIVER = null
let IS_ACCELERATING = false
let KEYBOARD = {}

let IS_MOUSE_DOWN = false;
let SELECTED_CAR = false;
let MOUSE_XX = 0;
let MOUSE_YY = 0;

import * as Constants from './config.js'
import Car from './car.js'
import * as Util from './util.js'

let LANES = {}
for (let i = 0; i < Constants.NUM_LANES; i++) {
  LANES[i] = []
}

let CTX = null

document.addEventListener('DOMContentLoaded', main)

function reset() {
  LANES = {}
  for (let i = 0; i < Constants.NUM_LANES; i++) {
    LANES[i] = []
  }

  for (let i = 0; i < Constants.ROAD_CAPACITY; i++) {
    generateCar()
  }

  iterateOverCarsLaneByLane((lane, key) => {
    dedupeLane(key)
    sortLane(lane)
  })

  setDriver()
  tick(true);
}

function setDriver() {
  if (DRIVER) DRIVER.isDriving = false
  let all = Object.values(LANES).flat()
  DRIVER = all.reduce((car1, car2) => car1.yy > car2.yy ? car1 : car2)
  DRIVER.isDriving = true
  DRIVER.wasEverDriven = true
  DRIVER.personality = 'player'
  draw()
}

function main() {
  let canvas = document.getElementById('glass')
  CTX = canvas.getContext('2d')

  canvas.width = Constants.WIDTH
  canvas.height = Constants.HEIGHT

  CTX.width = Constants.WIDTH
  CTX.height = Constants.HEIGHT

  reset()

  document.addEventListener('keydown', (ev) => {
    KEYBOARD[ev.which] = true
    if (ev.which === 75 || ev.which === 38) {
      IS_ACCELERATING = true
    }
  })

  document.addEventListener('keyup', (ev) => {
    KEYBOARD[ev.which] = false
    if (ev.which === 75 || ev.which === 38) {
      IS_ACCELERATING = false
    }
  })

  document.addEventListener('keydown', (ev) => {
    console.log('key', ev.which)

    let keyCode = document.getElementById('keycode')
    keyCode.textContent = ev.which

    if (ev.which === 32) honk(DRIVER)
    if (ev.which === 9) setDriver() // TAB
    if (ev.which === 82) reverse()
    if (ev.which === 88) IS_DRAWING_PROXIMITY_MESH = !IS_DRAWING_PROXIMITY_MESH
    if (ev.which === 75 || ev.which === 38 || ev.which === 87) speedUp() // speedup
    if (ev.which === 74 || ev.which === 40 || ev.which === 83) slowDown() // slowdown
    if (ev.which === 72 || ev.which === 37 || ev.which === 65) makeTurn(DRIVER, 'left')
    if (ev.which === 76 || ev.which === 39 || ev.which === 68) makeTurn(DRIVER, 'right')
  })
  document.getElementById('playpause').addEventListener('click', () => togglePlayback())
  document.getElementById('tick').addEventListener('click', () => tick(true))
  document.getElementById('prev').addEventListener('click', prevHistory)
  document.getElementById('next').addEventListener('click', nextHistory)
  document.addEventListener('mousedown', click)
  document.addEventListener('mousemove', drag)
  document.addEventListener('mouseup', release)


  if (Constants.ENABLE_RANDOM_WALK) setInterval(randomWalk, 1000) 
  setInterval(() => tick(), 1000 / 60)
}

function click(ev) {
  IS_MOUSE_DOWN = true;

  const rect = ev.target.getBoundingClientRect();
  const xx = ev.clientX - rect.left;
  const yy = ev.clientY - rect.top;
  console.log('rect', xx, yy, rect)

  MOUSE_XX = ev.clientX - rect.left;
  MOUSE_YY = ev.clientY - rect.top;

  selectCar(xx, yy)
}

function drag(ev) {
  if (!IS_MOUSE_DOWN) return console.log('mouse not down');
  if (!SELECTED_CAR) return console.log('car not selected');

  const rect = ev.target.getBoundingClientRect();
  MOUSE_XX = ev.clientX - rect.left;
  MOUSE_YY = ev.clientY - rect.top;
  console.log("line to")
  drawLiner()
}

function drawLiner() {
  const carYY = Constants.CENTER_YY + (SELECTED_CAR.yy - DRIVER.yy)
  CTX.strokeStyle = SELECTED_CAR.color;
  CTX.fillStyle = SELECTED_CAR.color;
  CTX.beginPath();
  CTX.moveTo(SELECTED_CAR.xx, carYY);
  CTX.lineTo(MOUSE_XX, MOUSE_YY);
  CTX.closePath();
  CTX.stroke();
}

function release(ev) {
  IS_MOUSE_DOWN = false;
  SELECTED_CAR = false;
  IS_ACCELERATING = false;

  const rect = ev.target.getBoundingClientRect();
  const xx = ev.clientX - rect.left;
  const yy = ev.clientY - rect.top;
}

function selectCar(xx, yy) {
  let {car, distance} = getClosestCar(xx, yy)
  console.log(car, distance)
  if (!car) return
  if (distance > Constants.CAR_HEIGHT) return console.log("dist > HEIGHT", distance)

  SELECTED_CAR = car

  console.log(car, car.history)

  draw(true)
}

function getClosestCar(xx, yy) {
  let minDistance = null
  let closestCar = null
  iterateCars(car => {
    let yy1 = Constants.CENTER_YY + (car.yy - DRIVER.yy)
    console.log(xx, yy, car.xx, yy1)
    let distance = Util.distance(xx, yy, car.xx, yy1)
    if (!minDistance || distance < minDistance) {
      minDistance = distance
      closestCar = car
    }
  })
  return {car: closestCar, distance: minDistance}
}

function getNearbyCars(car) {
  let nearby = collectCars(car2 => {
    let distance = Util.distance(car.xx, car.yy, car2.xx, car2.yy)
    return distance < Constants.HONK_RADIUS
  })
  return nearby
}

function togglePlayback() {
  IS_PLAYING = !IS_PLAYING
}

function draw() {
  CTX.fillStyle = 'gray'
  CTX.fillRect(0, 0, Constants.WIDTH, Constants.HEIGHT)

  CTX.fillStyle = 'yellow'
  drawLaneStripes(1 * Constants.WIDTH / 4)
  drawLaneStripes(2 * Constants.WIDTH / 4)
  drawLaneStripes(3 * Constants.WIDTH / 4)

  iterateBumperToBumper((car1, car2) => {
    drawCar(car1)
  })

  iterateBumperToBumper((car1, car2) => {
    if (IS_DRAWING_PROXIMITY_MESH || car1.isSpecial) {
      drawChain(car1, closestCar(car1, LANES[car1.laneKey], 'forward'))
      drawChain(car1, closestCar(car1, LANES[car1.laneKey - 1], 'forward'))
      drawChain(car1, closestCar(car1, LANES[car1.laneKey + 1], 'forward'))
      drawChain(car1, closestCar(car1, LANES[car1.laneKey - 1], 'backward'))
      drawChain(car1, closestCar(car1, LANES[car1.laneKey + 1], 'backward'))
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

function drawChain(car1, car2) {
  if (!car2) return


  let yy1 = Constants.CENTER_YY + (car1.yy - DRIVER.yy)
  let yy2 = Constants.CENTER_YY + (car2.yy - DRIVER.yy)

  if (Math.abs(yy1 - yy2) > 4 * Constants.CAR_HEIGHT) {
    return
  }

  CTX.strokeStyle = car1.color
  CTX.fillStyle = car1.color
  CTX.beginPath()
  CTX.moveTo(car1.xx, yy1)
  CTX.lineTo(car2.xx, yy2)
  CTX.closePath()
  CTX.stroke()
}

function generateCar(yy) {
  let {car, laneKey} = randomCar(yy)

  let lane = LANES[laneKey]
  let lastCar = lane[lane.length - 1]
  if (lastCar) {
    let distance = Math.abs(car.yy - lastCar.yy)
    if (distance > Constants.MIN_DISTANCE) {
      lane.push(car)
    }
  } else {
    lane.push(car)
  }

  sortLane(lane)
  return car
}

function tick(isForced) {
  if (!IS_PLAYING) return 
  if (Constants.IS_CHECKING_FOR_OVERLAPS) isOverlap()

  TICKS++
  if (!isForced && !IS_PLAYING) return

  if (IS_ACCELERATING) {
    DRIVER.speed += .3
  } else if (!IS_ACCELERATING && DRIVER.speed > Constants.LOW_SPEED) {
    DRIVER.speed -= .2
  }
  DRIVER.speed = Util.clamp(0, DRIVER.speed, Constants.MAX_SPEED)
  displaySpeed()

  iterateBumperToBumper((car1, car2) => {
    let initialYY = car1.yy
    car1.tick()

    // has the car gone off the top of the screen?
    if (isCarOffScreen(car1)) {
      car1.isToBeDeleted = 'off top of screen'
    } else if (car1.wantsToTurn) {
      makeTurn(car1, car1.wantsToTurn)
    } else if (car2) {
      // is the car so close to another it should break?
      let distance = Math.abs(car1.yy - car2.yy)
  
      if (car1.yy > car2.yy && distance < Constants.MIN_DISTANCE) {
        car1.speed = car2.speed

        car1.isBraking = true
        car1.isDisplayingBraking = true

        if (car1.wasHonked) {
          setTimeout(() => honk(car1), Math.random() * Constants.HONK_DELAY_MIN + Constants.HONK_DELAY_RANGE)
          car1.wasHonked = false
        }

        setTimeout(() => {
          car1.isDisplayingBraking = false
        }, 600)
      }
    }
  })

  if (totalCars() < Constants.ROAD_CAPACITY) {
    if (carsInTopRegion() < 6) {
      let newCar = generateCar(DRIVER.yy - Constants.HEIGHT)
      newCar.speed = DRIVER.speed * .6 + Math.random() * DRIVER.speed * .4
    } else {
      generateCar(DRIVER.yy + (Constants.HEIGHT - Constants.CENTER_YY))
    }

    iterateOverCarsLaneByLane((lane, key) => {
      dedupeLane(key)
      sortLane(lane)
    })
  }   

  filterCars(car => {
    return !car.isToBeDeleted
  }) 

  if (IS_HISTORY_ENABLED) {
    save()
  }
  draw()
}

function randomWalk() {
  let scale = Math.random() * Constants.SCALE
  let upOrDown = Math.random() < .5 ? 1 : -1
  Constants.ROAD_CAPACITY = Math.max(1, Constants.ROAD_CAPACITY + upOrDown * scale)
}

function drawCar(car) {
  let xx = car.xx
  let yy = car.yy

  if (car === DRIVER) {
    yy = Constants.CENTER_YY
  } else {
    yy = Constants.CENTER_YY + (car.yy - DRIVER.yy)
  }

  CTX.fillStyle = car.color
  CTX.fillRect(xx - 10, yy, Constants.CAR_WIDTH, Constants.CAR_HEIGHT)

  CTX.fillStyle = 'black'
  CTX.fillText('' + car.number + '\n' + Math.round(car.speed), xx + 10, yy)

  CTX.fillStyle = 'rgb(34,192,240)'
  CTX.fillRect(xx - Constants.CAR_WIDTH / 2 + 2, yy + 2, Constants.CAR_WIDTH - 4, 6)

  // left headlight
  CTX.fillStyle = car.isSpecial ? 'yellow' : 'white'
  CTX.beginPath()
  CTX.moveTo(xx - Constants.CAR_WIDTH / 2 + 4, yy + 4)
  CTX.lineTo(xx - Constants.CAR_WIDTH / 2 + 4 - 5, yy - 10 + 4)
  CTX.lineTo(xx - Constants.CAR_WIDTH / 2 + 4 + 5, yy - 10 + 4)
  CTX.closePath()
  CTX.fill()

  // right headlight
  CTX.fillStyle = car.isSpecial ? 'yellow' : 'white'
  CTX.beginPath()
  CTX.moveTo(xx + Constants.CAR_WIDTH / 2 - 4, yy + 4)
  CTX.lineTo(xx + Constants.CAR_WIDTH / 2 - 4 - 5, yy - 10 + 4)
  CTX.lineTo(xx + Constants.CAR_WIDTH / 2 - 4 + 5, yy - 10 + 4)
  CTX.closePath()
  CTX.fill()

  if (car.isBraking || car.isDisplayingBradking) {
    CTX.fillStyle = 'red'
    CTX.fillRect(xx - Constants.CAR_WIDTH / 2,                yy + Constants.CAR_HEIGHT - 3, 3, 3)
    CTX.fillRect(xx - Constants.CAR_WIDTH / 2+ Constants.CAR_WIDTH - 3, yy + Constants.CAR_HEIGHT - 3, 3, 3)
  }

  if (car.isDriving) {
    CTX.strokeStyle = 'yellow'
    CTX.beginPath();
    CTX.arc(xx, yy + Constants.CAR_HEIGHT / 2, Constants.CAR_HEIGHT * 1.2, 0, 2 * Math.PI);
    CTX.stroke();
  }
}

function randomCar(yy) {
  let laneKey = Math.floor(Constants.LANES_X.length * Math.random())
  let xx = Constants.LANES_X[laneKey]
  yy = yy || Constants.HEIGHT * Math.random()

  // have the car drive between 55-80 MPH scaled to where 10 represents 60 MPH
  let spread = Constants.MAX_INITIAL_SPEED - Constants.MIN_SPEED
  let speed = Constants.MIN_SPEED + (spread) * Math.random()

  let rr = Math.floor(255 * Math.random())
  let gg = Math.floor(255 * Math.random())
  let bb = Math.floor(255 * Math.random())
  let color = `rgb(${rr},${gg},${bb})`


  const car = new Car(xx, yy, speed, color)

  if (Math.random() < .1) {
    car.personality = 'aggressive'    
    car.color = 'red'
  }

  car.laneKey = laneKey
  car.number = CAR_COUNT++

  return {car, laneKey}
}

function dedupeLane(laneKey) {
  let lane = LANES[laneKey]
  for (let i = 0; i < lane.length - 1; i++) {
    let thisCar = lane[i]
    let nextCar = lane[i + 1]

    let distance = Math.abs(thisCar.yy - nextCar.yy)
    if (distance < Constants.CAR_HEIGHT) {
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

function collectCars(test) {
  let collection = []
  iterateCars(car => {
    if (test(car)) {
      collection.push(car)
    }
  })
  return collection
}

function totalCars() {
  let sum = 0
  iterateOverCarsLaneByLane(lane => sum += lane.length)
  return sum
}

function makeTurn(car, direction) {
  if (!car) return

  let isLeft = Math.random() < .4
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
  car.turnedRecently = true

  setTimeout(() => car.turnedRecently = false, 1500)

  let timerId = setInterval(() => {
    car.xx += dx
    let isDone = Math.abs(car.xx - Constants.LANES_X[newLaneKey]) < 8
    if (isDone) {
      car.isMakingTurn = false
      car.xx = Constants.LANES_X[newLaneKey]
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
    if (distance < Constants.MIN_DISTANCE) {
      return false
    }
  }
  return true
}

function speedUp() {
  if (!DRIVER) return
  DRIVER.speed += 1
  DRIVER.speed = Util.clamp(0, DRIVER.speed, Constants.MAX_SPEED)
  displaySpeed()
}

function slowDown() {
  if (!DRIVER) return
  DRIVER.speed -= 1
  DRIVER.speed = Util.clamp(0, DRIVER.speed, Constants.MAX_SPEED)
  displaySpeed()
}

function reverse() {
  if (!DRIVER) return
  DRIVER.speed *= -1
  displaySpeed()
}


function displaySpeed() {
  let speed = document.getElementById('speed')
  speed.textContent = Math.round(DRIVER.speed) + ' MPH'
}

function honk(fromCar) {
  let neighbors = getNearbyCars(fromCar).filter(car => {
    return (car.yy + Constants.CAR_HEIGHT) < fromCar.yy
  })

  neighbors.forEach(car => {
    car.wasHonked = true

    if (car.laneKey === DRIVER.laneKey) {
      // attempt to make a turn
      makeTurn(car, 'right')
    }

    if (!car.isMakingTurn) {
      if (car.yy > DRIVER.yy) {    
        car.speed += Math.random() * .4
      } else {
        car.speed -= Math.random() * .4
      }
    }
  })

  let audio = document.createElement('audio')
  audio.src = 'horn.wav'
  audio.play()
}

function isCarOffScreen(car) {
  // if the car is below the current car it's impossible
  // for it to be off screen
  if (Math.abs(DRIVER.yy - car.yy) > Constants.HEIGHT) return true
  if (car.yy > DRIVER.yy) return false
}

function carsInTopRegion() {
  let total = 0
  iterateCars(car => {
    let distance = DRIVER.yy - car.yy
    if (distance > 500) {
      total++
    }
  })
  return total
}

function drawLaneStripes(xx) {
  CTX.fillStyle = 'yellow'  

  for (let yy = -100; yy < Constants.HEIGHT + 100; yy += 50) {
    CTX.fillRect(xx, yy - DRIVER.yy % 50, 2, 18)  
  }
  drawLiner()
}

function isOverlap() {
  let all = Object.values(LANES).flat()
  for (let car1 of all) {
    for (let car2 of all) {
      let dx = Math.abs(car1.xx - car2.xx)
      let dy = Math.abs(car1.yy - car2.yy)

      if (car1 !== car2 && (dx < Constants.CAR_WIDTH && dy < Constants.CAR_HEIGHT)) {
        console.log('overlap', car1.number, car2.number, {dx,dy}, car1, car2)
      }
    }
  }
}

let IS_HISTORY_ENABLED = false
let HISTORY = []
let HISTORY_INDEX = 0

function save() {
  HISTORY.push(JSON.stringify(LANES))
  HISTORY_INDEX = HISTORY.length - 1
  document.getElementById('history-point').textContent = '@' + HISTORY_INDEX 
}


function prevHistory() {
  HISTORY_INDEX = Math.max(HISTORY_INDEX - 1, 0)
  seeHistory()
}

function nextHistory() {
  HISTORY_INDEX = Math.min(HISTORY_INDEX + 1, HISTORY.length - 1)
  seeHistory()
}

function seeHistory() {
  LANES = JSON.parse(HISTORY[HISTORY_INDEX])
  for (let i = 0; i < Constants.NUM_LANES; i++) {
    LANES[i] = LANES[i].map(car => {
      let cc = new Car()
      for (let prop in car) {
        cc[prop] = car[prop]
      }
      return cc
    })
  }
  
  document.getElementById('history-point').textContent = '@' + HISTORY_INDEX 
  draw()
}
