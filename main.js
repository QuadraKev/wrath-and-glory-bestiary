const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Get the data directory path
function getDataPath() {
    const dataPath = path.join(__dirname, 'data');
    console.log(`[Main] Data path: ${dataPath}, isPackaged: ${app.isPackaged}`);
    return dataPath;
}

// Track if we're force closing (user chose Don't Save or already saved)
let forceClose = false;

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

    // Handle close event to check for unsaved changes
    mainWindow.on('close', async (e) => {
        if (forceClose) {
            return; // Allow close
        }

        // Prevent default close
        e.preventDefault();

        // Ask renderer if there are unsaved changes
        mainWindow.webContents.send('check-unsaved-changes');
    });
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

// Save encounter to file
ipcMain.handle('save-encounter-file', async (event, encounterData, suggestedName) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Encounter',
            defaultPath: suggestedName ? `${suggestedName}.encounter` : 'encounter.encounter',
            filters: [
                { name: 'Encounter Files', extensions: ['encounter'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }

        fs.writeFileSync(result.filePath, JSON.stringify(encounterData, null, 2), 'utf8');
        const fileName = path.basename(result.filePath, '.encounter');
        console.log(`[Main] Encounter saved to: ${result.filePath}`);
        return { success: true, filePath: result.filePath, fileName: fileName };
    } catch (error) {
        console.error('[Main] Error saving encounter:', error);
        return { success: false, error: error.message };
    }
});

// Load encounter from file
ipcMain.handle('load-encounter-file', async (event) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Load Encounter',
            filters: [
                { name: 'Encounter Files', extensions: ['encounter'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        const fileName = path.basename(filePath, '.encounter');
        console.log(`[Main] Encounter loaded from: ${filePath}`);
        return { success: true, data: parsed, fileName: fileName };
    } catch (error) {
        console.error('[Main] Error loading encounter:', error);
        return { success: false, error: error.message };
    }
});

// Save player list to file
ipcMain.handle('save-players-file', async (event, playerData) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Player List',
            defaultPath: 'players.players',
            filters: [
                { name: 'Player List Files', extensions: ['players'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: false, canceled: true };
        }

        fs.writeFileSync(result.filePath, JSON.stringify(playerData, null, 2), 'utf8');
        const fileName = path.basename(result.filePath, '.players');
        console.log(`[Main] Player list saved to: ${result.filePath}`);
        return { success: true, filePath: result.filePath, fileName: fileName };
    } catch (error) {
        console.error('[Main] Error saving player list:', error);
        return { success: false, error: error.message };
    }
});

// Load player list from file
ipcMain.handle('load-players-file', async (event) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Load Player List',
            filters: [
                { name: 'Player List Files', extensions: ['players'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, canceled: true };
        }

        const filePath = result.filePaths[0];
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        const fileName = path.basename(filePath, '.players');
        console.log(`[Main] Player list loaded from: ${filePath}`);
        return { success: true, data: parsed, fileName: fileName };
    } catch (error) {
        console.error('[Main] Error loading player list:', error);
        return { success: false, error: error.message };
    }
});

// Handle response from renderer about unsaved changes
ipcMain.on('unsaved-changes-response', async (event, hasUnsavedChanges, encounterData) => {
    if (!hasUnsavedChanges) {
        // No unsaved changes, just close
        forceClose = true;
        mainWindow.close();
        return;
    }

    // Show Save/Don't Save/Cancel dialog
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes to your encounter.',
        detail: 'Do you want to save before closing?'
    });

    if (result.response === 0) {
        // Save
        const suggestedName = encounterData.settings?.name || 'encounter';
        const saveResult = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Encounter',
            defaultPath: `${suggestedName}.encounter`,
            filters: [
                { name: 'Encounter Files', extensions: ['encounter'] }
            ]
        });

        if (saveResult.canceled || !saveResult.filePath) {
            // User canceled save, don't close
            return;
        }

        try {
            fs.writeFileSync(saveResult.filePath, JSON.stringify(encounterData, null, 2), 'utf8');
            console.log(`[Main] Encounter saved before close: ${saveResult.filePath}`);
            forceClose = true;
            mainWindow.close();
        } catch (error) {
            console.error('[Main] Error saving encounter before close:', error);
            dialog.showErrorBox('Save Error', `Failed to save encounter: ${error.message}`);
        }
    } else if (result.response === 1) {
        // Don't Save - close without saving
        forceClose = true;
        mainWindow.close();
    }
    // Cancel (response === 2) - do nothing, don't close
});
