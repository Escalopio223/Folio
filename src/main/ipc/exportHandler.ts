import { ipcMain, BrowserWindow } from 'electron'

export function registerExportHandlers(): void {
  ipcMain.handle('export:htmlToPdfBuffer', async (_event, html: string): Promise<Uint8Array> => {
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: {
        sandbox: true,
        contextIsolation: true
      }
    })

    try {
      const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      await pdfWin.loadURL(encodedHtml)

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: {
          top: 0.75,
          bottom: 0.75,
          left: 0.85,
          right: 0.85
        }
      })

      return new Uint8Array(pdfBuffer)
    } finally {
      if (!pdfWin.isDestroyed()) {
        pdfWin.destroy()
      }
    }
  })
}

