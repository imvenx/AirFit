export class ArUcoMarkerGenerator {
  private dictionary: number[][]

  constructor() {
    this.dictionary = this.getAruco4x4_50Dictionary()
  }

  private getAruco4x4_50Dictionary(): number[][] {
    return [
      [1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1],
      [1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1],
      [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0],
      [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
      [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0],
      [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0],
      [0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1],
      [0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 0, 0],
      [1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0]
    ]
  }

  drawMarker(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, size: number) {
    if (id < 0 || id >= this.dictionary.length) {
      console.error(`Invalid marker ID: ${id}`)
      return
    }

    const data = this.dictionary[id]
    const cellSize = size / 6
    
    ctx.fillStyle = 'black'
    ctx.fillRect(x, y, size, size)
    
    ctx.fillStyle = 'white'
    ctx.fillRect(x + cellSize, y + cellSize, size - 2 * cellSize, size - 2 * cellSize)
    
    ctx.fillStyle = 'black'
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (data[i * 4 + j] === 1) {
          ctx.fillRect(
            x + cellSize * (j + 1),
            y + cellSize * (i + 1),
            cellSize,
            cellSize
          )
        }
      }
    }
  }

  generateMarkerCanvas(id: number, size: number = 200): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    this.drawMarker(ctx, id, 0, 0, size)
    
    return canvas
  }

  generateMarkerDataURL(id: number, size: number = 200): string {
    const canvas = this.generateMarkerCanvas(id, size)
    return canvas.toDataURL()
  }
}