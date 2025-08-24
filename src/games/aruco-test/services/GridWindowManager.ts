export class GridWindowManager {
  private gridWindow: Window | null = null

  constructor(private gridSize: number = 10) {}

  openWindow(): boolean {
    try {
      this.gridWindow = window.open('', 'Interactive Grid', 'width=800,height=600')

      if (!this.gridWindow) {
        console.error('Failed to open grid window - popup blocked?')
        return false
      }

      this.setupGridWindow()
      return true
    } catch (error) {
      console.error('Error opening grid window:', error)
      return false
    }
  }

  closeWindow() {
    if (this.gridWindow && !this.gridWindow.closed) {
      this.gridWindow.close()
    }
    this.gridWindow = null
  }

  updateGrid(illuminatedCells: number[]) {
    if (!this.gridWindow || this.gridWindow.closed) {
      return false
    }

    try {
      (this.gridWindow as any).updateGrid(illuminatedCells)
      return true
    } catch (error) {
      console.warn('Grid window communication error:', error)
      return false
    }
  }

  isOpen(): boolean {
    return this.gridWindow !== null && !this.gridWindow.closed
  }

  private setupGridWindow() {
    if (!this.gridWindow) return

    const htmlContent = this.generateGridHTML()
    this.gridWindow.document.write(htmlContent)
    this.gridWindow.document.close()
  }

  private generateGridHTML(): string {
    const totalCells = this.gridSize * this.gridSize

    return `
      <html>
        <head>
          <title>Interactive Grid</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: black; 
              font-family: Arial, sans-serif;
            }
            h2 {
              color: white;
              text-align: center;
              margin-bottom: 20px;
            }
            #grid { 
              display: grid; 
              grid-template-columns: repeat(${this.gridSize}, 1fr);
              grid-template-rows: repeat(${this.gridSize}, 1fr);
              gap: 2px; 
              width: 500px; 
              height: 500px; 
              margin: 0 auto;
              border: 2px solid #666;
            }
            .cell { 
              background: #333; 
              border: 1px solid #666; 
              transition: all 0.2s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #666;
            }
            .cell.lit { 
              background: cyan; 
              box-shadow: 0 0 10px cyan; 
              color: black;
              font-weight: bold;
            }
            .info {
              color: white;
              text-align: center;
              margin-top: 20px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <h2>Interactive Grid (${this.gridSize}x${this.gridSize})</h2>
          <div id="grid"></div>
          <div class="info">
            Move your hand in front of the camera to see cells light up!
          </div>
          
          <script>
            const grid = document.getElementById('grid');
            const cells = [];
            
            // Create grid cells
            for (let i = 0; i < ${totalCells}; i++) {
              const cell = document.createElement('div');
              cell.className = 'cell';
              cell.textContent = i;
              grid.appendChild(cell);
              cells.push(cell);
            }
            
            // Global function to update grid
            window.updateGrid = function(litCells) {
              cells.forEach((cell, i) => {
                if (litCells.includes(i)) {
                  cell.classList.add('lit');
                } else {
                  cell.classList.remove('lit');
                }
              });
            };
            
            // Handle window close
            window.addEventListener('beforeunload', function() {
              console.log('Grid window closing');
            });
          </script>
        </body>
      </html>
    `
  }
}