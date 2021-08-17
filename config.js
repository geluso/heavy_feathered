export const WIDTH = 200
export const NUM_LANES = 4
export const HALF_LANE = WIDTH / NUM_LANES / 2
export const HEIGHT = 700

export const HONK_DELAY_MIN = 50
export const HONK_DELAY_RANGE = 250

export const LANES_X = [
  1 * WIDTH / 4 - HALF_LANE,
  2 * WIDTH / 4 - HALF_LANE,
  3 * WIDTH / 4 - HALF_LANE,
  4 * WIDTH / 4 - HALF_LANE,
]

export const CAR_WIDTH = 20
export const CAR_HEIGHT = 30
export const MIN_DISTANCE = CAR_HEIGHT + 16

export const SPEED_FACTOR = 15
export const MIN_SPEED = 0
export const LOW_SPEED = 50
export const MAX_SPEED = 180
export const MIN_INITIAL_SPEED = 50
export const MAX_INITIAL_SPEED = 82

export const SCALE = 5
export const PERCENT_LANE_CHANGE = .2

export const CENTER_XX = 75
export const CENTER_YY = 600

export let ROAD_CAPACITY = 26
export const ENABLE_RANDOM_WALK = false
export const HONK_RADIUS = CAR_HEIGHT * 7

export const IS_CHECKING_FOR_OVERLAPS = false
