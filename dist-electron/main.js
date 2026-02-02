"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const electron = require("electron");
const electronUpdater = require("electron-updater");
const path = require("path");
const serialport = require("serialport");
const require$$0 = require("stream");
const ElectronStore = require("electron-store");
var dist$1 = {};
var dist = {};
Object.defineProperty(dist, "__esModule", { value: true });
dist.DelimiterParser = void 0;
const stream_1 = require$$0;
class DelimiterParser extends stream_1.Transform {
  constructor({ delimiter, includeDelimiter = false, ...options }) {
    super(options);
    __publicField(this, "includeDelimiter");
    __publicField(this, "delimiter");
    __publicField(this, "buffer");
    if (delimiter === void 0) {
      throw new TypeError('"delimiter" is not a bufferable object');
    }
    if (delimiter.length === 0) {
      throw new TypeError('"delimiter" has a 0 or undefined length');
    }
    this.includeDelimiter = includeDelimiter;
    this.delimiter = Buffer.from(delimiter);
    this.buffer = Buffer.alloc(0);
  }
  _transform(chunk, encoding, cb) {
    let data = Buffer.concat([this.buffer, chunk]);
    let position;
    while ((position = data.indexOf(this.delimiter)) !== -1) {
      this.push(data.slice(0, position + (this.includeDelimiter ? this.delimiter.length : 0)));
      data = data.slice(position + this.delimiter.length);
    }
    this.buffer = data;
    cb();
  }
  _flush(cb) {
    this.push(this.buffer);
    this.buffer = Buffer.alloc(0);
    cb();
  }
}
dist.DelimiterParser = DelimiterParser;
Object.defineProperty(dist$1, "__esModule", { value: true });
var ReadlineParser_1 = dist$1.ReadlineParser = void 0;
const parser_delimiter_1 = dist;
class ReadlineParser extends parser_delimiter_1.DelimiterParser {
  constructor(options) {
    const opts = {
      delimiter: Buffer.from("\n", "utf8"),
      encoding: "utf8",
      ...options
    };
    if (typeof opts.delimiter === "string") {
      opts.delimiter = Buffer.from(opts.delimiter, opts.encoding);
    }
    super(opts);
  }
}
ReadlineParser_1 = dist$1.ReadlineParser = ReadlineParser;
class SerialManager {
  constructor() {
    this.port = null;
    this.parser = null;
    this.dataCallback = null;
  }
  async listPorts() {
    const ports = await serialport.SerialPort.list();
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer,
      serialNumber: port.serialNumber,
      pnpId: port.pnpId,
      locationId: port.locationId,
      friendlyName: port.friendlyName,
      vendorId: port.vendorId,
      productId: port.productId
    }));
  }
  async connect(portPath, baudRate = 115200) {
    var _a;
    if ((_a = this.port) == null ? void 0 : _a.isOpen) {
      await this.disconnect();
    }
    return new Promise((resolve, reject) => {
      this.port = new serialport.SerialPort({
        path: portPath,
        baudRate,
        dataBits: 8,
        parity: "none",
        stopBits: 1,
        autoOpen: false
      });
      this.parser = this.port.pipe(new ReadlineParser_1({ delimiter: "\r\n" }));
      this.parser.on("data", (data) => {
        if (this.dataCallback) {
          this.dataCallback(data);
        }
      });
      this.port.on("error", (err) => {
        console.error("Serial port error:", err);
      });
      this.port.on("close", () => {
        console.log("Serial port closed");
      });
      this.port.open((err) => {
        if (err) {
          reject(new Error(`Failed to open port: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }
  async disconnect() {
    return new Promise((resolve) => {
      var _a;
      if ((_a = this.port) == null ? void 0 : _a.isOpen) {
        this.port.close(() => {
          this.port = null;
          this.parser = null;
          resolve();
        });
      } else {
        this.port = null;
        this.parser = null;
        resolve();
      }
    });
  }
  write(data) {
    var _a;
    if (!((_a = this.port) == null ? void 0 : _a.isOpen)) {
      return false;
    }
    this.port.write(data);
    return true;
  }
  writeRaw(data) {
    var _a;
    if (!((_a = this.port) == null ? void 0 : _a.isOpen)) {
      return false;
    }
    this.port.write(Buffer.from(data));
    return true;
  }
  onData(callback) {
    this.dataCallback = callback;
  }
  isConnected() {
    var _a;
    return ((_a = this.port) == null ? void 0 : _a.isOpen) ?? false;
  }
  getPortPath() {
    var _a;
    return ((_a = this.port) == null ? void 0 : _a.path) ?? null;
  }
}
class GrblController {
  constructor(serial, dataCallback) {
    this.statusPollInterval = null;
    this.currentStatus = null;
    this.commandQueue = [];
    this.isProcessingQueue = false;
    this.jobLines = [];
    this.jobCurrentLine = 0;
    this.jobStartTime = 0;
    this.isJobRunning = false;
    this.jobProgressCallback = null;
    this.pendingCommands = 0;
    this.MAX_BUFFER_COMMANDS = 4;
    this.serial = serial;
    this.dataCallback = dataCallback;
    this.serial.onData(this.handleData.bind(this));
  }
  handleData(data) {
    if (data.startsWith("<") && data.endsWith(">")) {
      this.currentStatus = this.parseStatus(data);
      this.dataCallback(this.currentStatus);
    } else if (data === "ok") {
      this.pendingCommands = Math.max(0, this.pendingCommands - 1);
      this.processJobQueue();
    } else if (data.startsWith("error:")) {
      this.pendingCommands = Math.max(0, this.pendingCommands - 1);
      console.error("GRBL Error:", data);
    } else if (data.startsWith("ALARM:")) {
      console.error("GRBL Alarm:", data);
    } else if (data.startsWith("[")) {
      console.log("GRBL Message:", data);
    } else if (data.startsWith("Grbl")) {
      console.log("GRBL Version:", data);
    }
  }
  parseStatus(data) {
    const content = data.slice(1, -1);
    const parts = content.split("|");
    const status = {
      state: parts[0] || "Unknown",
      machinePosition: { x: 0, y: 0, z: 0 },
      workPosition: { x: 0, y: 0, z: 0 },
      feedRate: 0,
      spindleSpeed: 0,
      buffer: { planner: 0, rx: 0 },
      overrides: { feed: 100, rapid: 100, spindle: 100 },
      pins: ""
    };
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith("MPos:")) {
        const coords = part.slice(5).split(",").map(Number);
        status.machinePosition = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 };
      } else if (part.startsWith("WPos:")) {
        const coords = part.slice(5).split(",").map(Number);
        status.workPosition = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 };
      } else if (part.startsWith("WCO:")) {
        const coords = part.slice(4).split(",").map(Number);
        status.workPosition = {
          x: status.machinePosition.x - (coords[0] || 0),
          y: status.machinePosition.y - (coords[1] || 0),
          z: status.machinePosition.z - (coords[2] || 0)
        };
      } else if (part.startsWith("Bf:")) {
        const buffer = part.slice(3).split(",").map(Number);
        status.buffer = { planner: buffer[0] || 0, rx: buffer[1] || 0 };
      } else if (part.startsWith("FS:")) {
        const fs = part.slice(3).split(",").map(Number);
        status.feedRate = fs[0] || 0;
        status.spindleSpeed = fs[1] || 0;
      } else if (part.startsWith("F:")) {
        status.feedRate = Number(part.slice(2)) || 0;
      } else if (part.startsWith("Ov:")) {
        const ov = part.slice(3).split(",").map(Number);
        status.overrides = { feed: ov[0] || 100, rapid: ov[1] || 100, spindle: ov[2] || 100 };
      } else if (part.startsWith("Pn:")) {
        status.pins = part.slice(3);
      }
    }
    return status;
  }
  startStatusPolling(intervalMs = 100) {
    this.stopStatusPolling();
    this.statusPollInterval = setInterval(() => {
      this.serial.write("?");
    }, intervalMs);
  }
  stopStatusPolling() {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
  }
  async send(command) {
    const trimmed = command.trim();
    if (!trimmed) {
      return { success: false, error: "Empty command" };
    }
    const sent = this.serial.write(trimmed + "\n");
    if (sent) {
      this.pendingCommands++;
      return { success: true };
    }
    return { success: false, error: "Failed to send command" };
  }
  async jog(axis, distance, feedRate) {
    const command = `$J=G91 ${axis.toUpperCase()}${distance} F${feedRate}`;
    return this.send(command);
  }
  async jogCancel() {
    const sent = this.serial.writeRaw([133]);
    return sent ? { success: true } : { success: false, error: "Failed to cancel jog" };
  }
  async home() {
    return this.send("$H");
  }
  async unlock() {
    return this.send("$X");
  }
  async reset() {
    const sent = this.serial.writeRaw([24]);
    return sent ? { success: true } : { success: false, error: "Failed to reset" };
  }
  async feedHold() {
    const sent = this.serial.write("!");
    return sent ? { success: true } : { success: false, error: "Failed to feed hold" };
  }
  async resume() {
    const sent = this.serial.write("~");
    return sent ? { success: true } : { success: false, error: "Failed to resume" };
  }
  async setZero(axis) {
    const axisUpper = axis.toUpperCase();
    if (axisUpper === "ALL") {
      return this.send("G10 L20 P1 X0 Y0 Z0");
    }
    return this.send(`G10 L20 P1 ${axisUpper}0`);
  }
  async goToZero(axis) {
    const axisUpper = axis.toUpperCase();
    if (axisUpper === "ALL") {
      return this.send("G0 X0 Y0 Z0");
    }
    return this.send(`G0 ${axisUpper}0`);
  }
  async setFeedOverride(value) {
    let command;
    if (value === 100) {
      command = 144;
    } else if (value > 100) {
      const increments = Math.floor((value - 100) / 10);
      for (let i = 0; i < increments; i++) {
        this.serial.writeRaw([145]);
      }
      return { success: true };
    } else {
      const decrements = Math.floor((100 - value) / 10);
      for (let i = 0; i < decrements; i++) {
        this.serial.writeRaw([146]);
      }
      return { success: true };
    }
    const sent = this.serial.writeRaw([command]);
    return sent ? { success: true } : { success: false, error: "Failed to set feed override" };
  }
  async setSpindleOverride(value) {
    let command;
    if (value === 100) {
      command = 153;
    } else if (value > 100) {
      const increments = Math.floor((value - 100) / 10);
      for (let i = 0; i < increments; i++) {
        this.serial.writeRaw([154]);
      }
      return { success: true };
    } else {
      const decrements = Math.floor((100 - value) / 10);
      for (let i = 0; i < decrements; i++) {
        this.serial.writeRaw([155]);
      }
      return { success: true };
    }
    const sent = this.serial.writeRaw([command]);
    return sent ? { success: true } : { success: false, error: "Failed to set spindle override" };
  }
  async setRapidOverride(value) {
    let command;
    if (value === 100) {
      command = 149;
    } else if (value === 50) {
      command = 150;
    } else if (value === 25) {
      command = 151;
    } else {
      return { success: false, error: "Rapid override must be 25, 50, or 100" };
    }
    const sent = this.serial.writeRaw([command]);
    return sent ? { success: true } : { success: false, error: "Failed to set rapid override" };
  }
  async startJob(gcode, progressCallback) {
    if (this.isJobRunning) {
      return { success: false, error: "Job already running" };
    }
    this.jobLines = gcode.filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(";") && !trimmed.startsWith("(");
    });
    if (this.jobLines.length === 0) {
      return { success: false, error: "No valid G-code lines" };
    }
    this.jobCurrentLine = 0;
    this.jobStartTime = Date.now();
    this.isJobRunning = true;
    this.jobProgressCallback = progressCallback;
    this.pendingCommands = 0;
    this.processJobQueue();
    return { success: true };
  }
  processJobQueue() {
    if (!this.isJobRunning) return;
    while (this.pendingCommands < this.MAX_BUFFER_COMMANDS && this.jobCurrentLine < this.jobLines.length) {
      const line = this.jobLines[this.jobCurrentLine];
      this.serial.write(line + "\n");
      this.pendingCommands++;
      this.jobCurrentLine++;
      if (this.jobProgressCallback) {
        const elapsed = Date.now() - this.jobStartTime;
        const percentComplete = this.jobCurrentLine / this.jobLines.length * 100;
        const estimatedTotal = elapsed / (percentComplete / 100);
        const estimatedRemaining = estimatedTotal - elapsed;
        this.jobProgressCallback({
          currentLine: this.jobCurrentLine,
          totalLines: this.jobLines.length,
          percentComplete,
          elapsedTime: elapsed,
          estimatedRemaining: isFinite(estimatedRemaining) ? estimatedRemaining : 0
        });
      }
    }
    if (this.jobCurrentLine >= this.jobLines.length && this.pendingCommands === 0) {
      this.isJobRunning = false;
      this.jobProgressCallback = null;
    }
  }
  async stopJob() {
    this.isJobRunning = false;
    this.jobLines = [];
    this.jobCurrentLine = 0;
    this.jobProgressCallback = null;
    this.pendingCommands = 0;
    await this.feedHold();
    setTimeout(() => this.reset(), 100);
    return { success: true };
  }
  getStatus() {
    return this.currentStatus;
  }
  isRunning() {
    return this.isJobRunning;
  }
}
const defaultSettings = {
  connection: {
    defaultBaudRate: 115200,
    statusPollInterval: 100,
    connectionTimeout: 5e3
  },
  machine: {
    maxTravel: { x: 300, y: 300, z: 100 },
    softLimits: true,
    homingEnabled: true
  },
  display: {
    units: "mm",
    decimalPlaces: 3,
    theme: "dark"
  },
  jogPresets: [0.1, 1, 10, 100],
  defaultFeedRate: 1e3,
  macros: [
    {
      id: "home",
      name: "Home All",
      gcode: "$H",
      category: "Setup"
    },
    {
      id: "unlock",
      name: "Unlock",
      gcode: "$X",
      category: "Setup"
    },
    {
      id: "park",
      name: "Park",
      gcode: "G53 G0 Z-5\nG53 G0 X-5 Y-5",
      category: "Movement"
    },
    {
      id: "spindle-warmup",
      name: "Spindle Warmup",
      gcode: "M3 S1000\nG4 P30\nM3 S5000\nG4 P30\nM3 S10000\nG4 P60\nM5",
      category: "Spindle"
    }
  ],
  workCoordinates: [
    { id: "G54", name: "G54 - Default", offset: { x: 0, y: 0, z: 0 } },
    { id: "G55", name: "G55", offset: { x: 0, y: 0, z: 0 } },
    { id: "G56", name: "G56", offset: { x: 0, y: 0, z: 0 } },
    { id: "G57", name: "G57", offset: { x: 0, y: 0, z: 0 } },
    { id: "G58", name: "G58", offset: { x: 0, y: 0, z: 0 } },
    { id: "G59", name: "G59", offset: { x: 0, y: 0, z: 0 } }
  ],
  recentFiles: []
};
class Store {
  constructor() {
    this.store = new ElectronStore({
      defaults: defaultSettings,
      name: "cncraft-settings"
    });
  }
  get(key) {
    return this.store.get(key);
  }
  set(key, value) {
    this.store.set(key, value);
  }
  getAll() {
    return this.store.store;
  }
  reset() {
    this.store.clear();
  }
  addRecentFile(filePath) {
    const recent = this.get("recentFiles");
    const filtered = recent.filter((f) => f !== filePath);
    filtered.unshift(filePath);
    this.set("recentFiles", filtered.slice(0, 10));
  }
  addMacro(macro) {
    const macros = this.get("macros");
    macros.push(macro);
    this.set("macros", macros);
  }
  updateMacro(id, updates) {
    const macros = this.get("macros");
    const index = macros.findIndex((m) => m.id === id);
    if (index !== -1) {
      macros[index] = { ...macros[index], ...updates };
      this.set("macros", macros);
    }
  }
  deleteMacro(id) {
    const macros = this.get("macros");
    this.set("macros", macros.filter((m) => m.id !== id));
  }
  updateWorkCoordinate(id, updates) {
    const coords = this.get("workCoordinates");
    const index = coords.findIndex((c) => c.id === id);
    if (index !== -1) {
      coords[index] = { ...coords[index], ...updates };
      this.set("workCoordinates", coords);
    }
  }
}
let mainWindow = null;
let serialManager;
let grblController = null;
let store;
const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0f0f1a",
    titleBarStyle: "hiddenInset",
    frame: process.platform === "darwin" ? true : true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  checkForUpdates();
}
function checkForUpdates() {
  if (!isDev) {
    electronUpdater.autoUpdater.checkForUpdatesAndNotify();
  }
}
function setupAutoUpdater() {
  electronUpdater.autoUpdater.on("update-available", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-available");
  });
  electronUpdater.autoUpdater.on("update-downloaded", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-downloaded");
  });
  electronUpdater.autoUpdater.on("error", (err) => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("update-error", err.message);
  });
}
function setupIPC() {
  electron.ipcMain.handle("serial:list-ports", async () => {
    return serialManager.listPorts();
  });
  electron.ipcMain.handle("serial:connect", async (_, portPath, baudRate) => {
    try {
      await serialManager.connect(portPath, baudRate);
      grblController = new GrblController(serialManager, (data) => {
        mainWindow == null ? void 0 : mainWindow.webContents.send("grbl:data", data);
      });
      grblController.startStatusPolling();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("serial:disconnect", async () => {
    grblController == null ? void 0 : grblController.stopStatusPolling();
    grblController = null;
    await serialManager.disconnect();
    return { success: true };
  });
  electron.ipcMain.handle("grbl:send", async (_, command) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.send(command);
  });
  electron.ipcMain.handle("grbl:jog", async (_, axis, distance, feedRate) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.jog(axis, distance, feedRate);
  });
  electron.ipcMain.handle("grbl:jog-cancel", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.jogCancel();
  });
  electron.ipcMain.handle("grbl:home", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.home();
  });
  electron.ipcMain.handle("grbl:unlock", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.unlock();
  });
  electron.ipcMain.handle("grbl:reset", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.reset();
  });
  electron.ipcMain.handle("grbl:feed-hold", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.feedHold();
  });
  electron.ipcMain.handle("grbl:resume", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.resume();
  });
  electron.ipcMain.handle("grbl:set-zero", async (_, axis) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.setZero(axis);
  });
  electron.ipcMain.handle("grbl:go-to-zero", async (_, axis) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.goToZero(axis);
  });
  electron.ipcMain.handle("grbl:feed-override", async (_, value) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.setFeedOverride(value);
  });
  electron.ipcMain.handle("grbl:spindle-override", async (_, value) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.setSpindleOverride(value);
  });
  electron.ipcMain.handle("grbl:rapid-override", async (_, value) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.setRapidOverride(value);
  });
  electron.ipcMain.handle("grbl:start-job", async (_, gcode) => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.startJob(gcode, (progress) => {
      mainWindow == null ? void 0 : mainWindow.webContents.send("grbl:job-progress", progress);
    });
  });
  electron.ipcMain.handle("grbl:stop-job", async () => {
    if (!grblController) {
      return { success: false, error: "Not connected" };
    }
    return grblController.stopJob();
  });
  electron.ipcMain.handle("dialog:open-file", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "G-Code Files", extensions: ["nc", "gcode", "ngc", "tap", "txt"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return result;
  });
  electron.ipcMain.handle("store:get", async (_, key) => {
    return store.get(key);
  });
  electron.ipcMain.handle("store:set", async (_, key, value) => {
    store.set(key, value);
    return { success: true };
  });
  electron.ipcMain.handle("app:get-version", async () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("updater:check", async () => {
    if (!isDev) {
      return electronUpdater.autoUpdater.checkForUpdates();
    }
    return null;
  });
  electron.ipcMain.handle("updater:install", async () => {
    electronUpdater.autoUpdater.quitAndInstall();
  });
}
electron.app.whenReady().then(() => {
  store = new Store();
  serialManager = new SerialManager();
  setupIPC();
  setupAutoUpdater();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  grblController == null ? void 0 : grblController.stopStatusPolling();
  serialManager == null ? void 0 : serialManager.disconnect();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
