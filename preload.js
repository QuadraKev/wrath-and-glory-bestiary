const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('api', {
    // Game data loading
    loadGameData: (filename) => ipcRenderer.invoke('load-game-data', filename),

    // Encounter file operations
    saveEncounterFile: (encounterData, suggestedName) => ipcRenderer.invoke('save-encounter-file', encounterData, suggestedName),
    loadEncounterFile: () => ipcRenderer.invoke('load-encounter-file'),

    // Player list file operations
    savePlayersFile: (playerData) => ipcRenderer.invoke('save-players-file', playerData),
    loadPlayersFile: () => ipcRenderer.invoke('load-players-file'),

    // Close confirmation
    onCheckUnsavedChanges: (callback) => ipcRenderer.on('check-unsaved-changes', callback),
    respondUnsavedChanges: (hasChanges, encounterData) => ipcRenderer.send('unsaved-changes-response', hasChanges, encounterData)
});
