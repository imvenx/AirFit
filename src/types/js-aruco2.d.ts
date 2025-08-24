declare module 'js-aruco2' {
  export interface MarkerCorner {
    x: number
    y: number
  }

  export interface Marker {
    id: number
    corners: MarkerCorner[]
  }

  export class Detector {
    constructor()
    detect(imageData: ImageData): Marker[]
  }

  const AR: {
    Detector: typeof Detector
  }

  export default AR
}