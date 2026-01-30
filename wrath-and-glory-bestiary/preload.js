const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('api', {
    // Game data loading
    loadGameData: (filename) => ipcRenderer.invoke('load-game-data', filename)
});
