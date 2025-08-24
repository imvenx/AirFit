interface FloatingText {
  id: string
  text: string
  x: number
  y: number
  color: string
  fontSize: number
  opacity: number
  velocity: { x: number, y: number }
  life: number
  maxLife: number
}

export class FloatingTextManager {
  private floatingTexts: FloatingText[] = []

  add(text: string, x: number, y: number, color: string = '#FFD700', fontSize: number = 32) {
    const floatingText: FloatingText = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      x,
      y,
      color,
      fontSize,
      opacity: 1,
      velocity: { x: Math.random() * 40 - 20, y: -60 },
      life: 0,
      maxLife: 1500
    }
    this.floatingTexts.push(floatingText)
  }

  update(deltaTime: number) {
    this.floatingTexts = this.floatingTexts.filter(text => {
      text.life += deltaTime
      text.x += text.velocity.x * (deltaTime / 1000)
      text.y += text.velocity.y * (deltaTime / 1000)
      text.opacity = Math.max(0, 1 - (text.life / text.maxLife))

      return text.life < text.maxLife
    })
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.floatingTexts.forEach(text => {
      ctx.save()
      ctx.globalAlpha = text.opacity
      ctx.font = `bold ${text.fontSize}px Arial`
      ctx.fillStyle = text.color
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.scale(-1, 1)
      ctx.strokeText(text.text, -text.x, text.y)
      ctx.fillText(text.text, -text.x, text.y)

      ctx.restore()
    })
  }

  clear() {
    this.floatingTexts = []
  }
}