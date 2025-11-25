// WebSocket client para conectar ao servidor
let ws: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
const PDV_ID = 'PDV001'; // Hardcoded for now
const PDV_NAME = 'PDV Principal';
const PDV_LOCATION = 'Loja Principal';

export function connectToServer() {
  const wsUrl = `ws://localhost:3000/pdv-ws`;
  
  console.log('Connecting to WebSocket server...');
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('✅ Connected to server');
    
    // Register PDV
    ws?.send(JSON.stringify({
      type: 'register',
      pdvId: PDV_ID,
      name: PDV_NAME,
      location: PDV_LOCATION,
    }));

    // Start heartbeat
    startHeartbeat();

    // Clear reconnect interval
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (error) {
      console.error('Invalid message from server:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('❌ Disconnected from server');
    ws = null;

    // Try to reconnect every 5 seconds
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        console.log('Attempting to reconnect...');
        connectToServer();
      }, 5000);
    }
  };
}

function startHeartbeat() {
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        pdvId: PDV_ID,
      }));
    }
  }, 30000); // Every 30 seconds
}

function handleServerMessage(data: any) {
  console.log('Message from server:', data);

  switch (data.type) {
    case 'connected':
      console.log('Server acknowledged connection');
      break;

    case 'registered':
      console.log('PDV registered successfully');
      break;

    case 'catalog':
      console.log('Received catalog from server');
      handleCatalogReceived(data.data);
      break;

    default:
      console.log('Unknown message type:', data.type);
  }
}

async function handleCatalogReceived(catalog: any) {
  try {
    // Notify UI that update is starting
    window.dispatchEvent(new CustomEvent('catalog-update-start'));

    // Load catalog into localStorage
    await window.electron.db.saveCatalog(catalog);
    
    // Log success
    console.log('Catalog loaded successfully', {
      produtos: catalog.produtos?.length || 0,
      usuarios: catalog.usuarios?.length || 0
    });
  } catch (error) {
    console.error('Failed to load catalog:', error);
    alert('Erro ao carregar catálogo recebido do servidor');
  }
}

// Auto-connect on module load
connectToServer();
