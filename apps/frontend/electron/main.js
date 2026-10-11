const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const DEV = process.env.NODE_ENV !== 'production'
const DEV_URL = 'http://localhost:3000'

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 680,
    title: "DMF Records — Fly Hoolie ENT Co.",
    icon: path.join(__dirname, '../public/logo.png'),
    backgroundColor: '#080b14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    show: false,
  })

  // Show once ready to avoid white flash
  win.once('ready-to-show', () => {
    win.show()
    if (DEV) win.webContents.openDevTools({ mode: 'detach' })
  })

  if (DEV) {
    win.loadURL(DEV_URL).catch(() => {
      console.error('Could not connect to dev server at', DEV_URL)
      console.error('Make sure `npm start` is running in another terminal.')
    })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Open external links in the system browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' } }
    return { action: 'allow' }
  })

  return win
}

// Remove default menu in production
if (!DEV) Menu.setApplicationMenu(null)

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
