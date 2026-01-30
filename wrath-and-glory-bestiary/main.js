const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Get the data directory path
function getDataPath() {
    const dataPath = path.join(__dirname, 'data');
    console.log(`[Main] Data path: ${dataPath}, isPackaged: ${app.isPackaged}`);
    return dataPath;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#1a1a2e',
        show: false
    });

    mainWindow.loadFile('src/index.html');

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Remove menu bar for cleaner look
    mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers for file operations

// Load game data files
ipcMain.handle('load-game-data', async (event, filename) => {
    try {
        const dataPath = getDataPath();
        const filePath = path.join(dataPath, filename);
        console.log(`[Main] Loading game data: ${filename} from ${filePath}`);

        if (!fs.existsSync(filePath)) {
            console.error(`[Main] File not found: ${filePath}`);
            return null;
        }

        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`[Main] Successfully loaded ${filename}: ${Array.isArray(parsed) ? parsed.length + ' items' : 'object'}`);
        return parsed;
    } catch (error) {
        console.error(`[Main] Error loading ${filename}:`, error);
        return null;
    }
});
