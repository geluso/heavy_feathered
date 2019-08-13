export default class Rectangle {
  constructor(topLeft, topRight, botLeft, botRight) {
    this.topLeft = topLeft                                                
    this.topRight = topRight
    this.botLeft = botLeft
    this.botRight = botRight
  }

  // https://stackoverflow.com/a/306332
  contains(other) {
    if (this.X1 < other.X2 && this.X2 > other.X1 &&
        this.Y1 > other.Y2 && this.Y2 < other.Y1) {
    }
  }
}
