const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bey360Desktop", {
  getVersion: () => ipcRenderer.invoke("desktop:get-version"),
  toggleFullScreen: () => ipcRenderer.invoke("desktop:toggle-fullscreen"),
});
