import { app, BrowserWindow } from "electron";
import path from "path";
import { initDatabase } from "./db/config";
import { registerIpcHandlers } from "./controllers/ipc.controller";
import { registerCaixaHandlers } from "./controllers/caixa.controller";
import * as syncService from "./services/sync.service";

let mainWindow: BrowserWindow | null = null;



// Desabilitar aceleração de hardware para evitar travamentos e telas pretas
app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true, // Ocultar barra de menu
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: "PDV Offline - Sistema de Vendas",
  });
  
  // Remover menu padrão
  mainWindow.setMenu(null);

  // Carregar a aplicação
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // DevTools pode ser aberto com F12
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }


  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  console.log("[Main] App ready, initializing...");
  


  try {
    // Inicializar banco de dados
    console.log("[Main] Initializing database...");
    await initDatabase();
    console.log("[Main] ✅ Database initialized");

    // Registrar handlers IPC
    console.log("[Main] Registering IPC handlers...");
    registerIpcHandlers();
    registerCaixaHandlers();
    console.log("[Main] ✅ IPC handlers registered");
    console.log("[Main] ✅ IPC handlers registered");

    // Criar janela
    createWindow();

    // Iniciar serviço de sincronização
    console.log("[Main] Starting sync service...");
    await syncService.startSyncService();
    console.log("[Main] ✅ Sync service started");
    
    console.log("[Main] ✅ Application ready");
  } catch (error) {
    console.error("[Main] ❌ Initialization failed:", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  syncService.stopSyncService();
  
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  console.log("[Main] Shutting down...");
  syncService.stopSyncService();
});
