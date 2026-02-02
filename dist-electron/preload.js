"use strict";
const electron = require("electron");
const electronAPI = {
  serial: {
    listPorts: () => electron.ipcRenderer.invoke("serial:list-ports"),
    connect: (portPath, baudRate) => electron.ipcRenderer.invoke("serial:connect", portPath, baudRate),
    disconnect: () => electron.ipcRenderer.invoke("serial:disconnect")
  },
  grbl: {
    send: (command) => electron.ipcRenderer.invoke("grbl:send", command),
    jog: (axis, distance, feedRate) => electron.ipcRenderer.invoke("grbl:jog", axis, distance, feedRate),
    jogCancel: () => electron.ipcRenderer.invoke("grbl:jog-cancel"),
    home: () => electron.ipcRenderer.invoke("grbl:home"),
    unlock: () => electron.ipcRenderer.invoke("grbl:unlock"),
    reset: () => electron.ipcRenderer.invoke("grbl:reset"),
    feedHold: () => electron.ipcRenderer.invoke("grbl:feed-hold"),
    resume: () => electron.ipcRenderer.invoke("grbl:resume"),
    setZero: (axis) => electron.ipcRenderer.invoke("grbl:set-zero", axis),
    goToZero: (axis) => electron.ipcRenderer.invoke("grbl:go-to-zero", axis),
    feedOverride: (value) => electron.ipcRenderer.invoke("grbl:feed-override", value),
    spindleOverride: (value) => electron.ipcRenderer.invoke("grbl:spindle-override", value),
    rapidOverride: (value) => electron.ipcRenderer.invoke("grbl:rapid-override", value),
    startJob: (gcode) => electron.ipcRenderer.invoke("grbl:start-job", gcode),
    stopJob: () => electron.ipcRenderer.invoke("grbl:stop-job"),
    onData: (callback) => {
      const subscription = (_event, data) => callback(data);
      electron.ipcRenderer.on("grbl:data", subscription);
      return () => electron.ipcRenderer.removeListener("grbl:data", subscription);
    },
    onJobProgress: (callback) => {
      const subscription = (_event, progress) => callback(progress);
      electron.ipcRenderer.on("grbl:job-progress", subscription);
      return () => electron.ipcRenderer.removeListener("grbl:job-progress", subscription);
    }
  },
  dialog: {
    openFile: () => electron.ipcRenderer.invoke("dialog:open-file")
  },
  store: {
    get: (key) => electron.ipcRenderer.invoke("store:get", key),
    set: (key, value) => electron.ipcRenderer.invoke("store:set", key, value)
  },
  app: {
    getVersion: () => electron.ipcRenderer.invoke("app:get-version")
  },
  updater: {
    check: () => electron.ipcRenderer.invoke("updater:check"),
    install: () => electron.ipcRenderer.invoke("updater:install"),
    onUpdateAvailable: (callback) => {
      electron.ipcRenderer.on("update-available", callback);
      return () => electron.ipcRenderer.removeListener("update-available", callback);
    },
    onUpdateDownloaded: (callback) => {
      electron.ipcRenderer.on("update-downloaded", callback);
      return () => electron.ipcRenderer.removeListener("update-downloaded", callback);
    },
    onUpdateError: (callback) => {
      const subscription = (_event, error) => callback(error);
      electron.ipcRenderer.on("update-error", subscription);
      return () => electron.ipcRenderer.removeListener("update-error", subscription);
    }
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
