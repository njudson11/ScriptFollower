// electron-main.js
import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  win.loadFile('dist/index.html') // Make sure to build your Vue app first!
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})