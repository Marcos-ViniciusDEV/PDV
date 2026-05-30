// WebSocket client para conectar ao servidor somente apos configurar o PDV.
let ws: WebSocket | null = null;
let reconnectInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

type PdvConnectionConfig = {
  pdvId: string;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  tokenAutenticacao: string;
  urlBackend?: string | null;
};

async function getPdvConnectionConfig(): Promise<PdvConnectionConfig | null> {
  try {
    const config = await window.electron.sync.getConfig();
    if (!config?.pdvId || !config?.tokenAutenticacao) {
      return null;
    }

    return {
      pdvId: String(config.pdvId),
      empresaNome: config.empresaNome,
      empresaCnpj: config.empresaCnpj,
      tokenAutenticacao: config.tokenAutenticacao,
      urlBackend: config.urlBackend,
    };
  } catch (error) {
    console.warn('PDV ainda nao configurado para WebSocket:', error);
    return null;
  }
}

function buildWsUrl(urlBackend?: string | null) {
  const baseUrl = urlBackend || 'http://localhost:3000';
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/pdv-ws';
  url.search = '';
  return url.toString();
}

export async function connectToServer() {
  const config = await getPdvConnectionConfig();
  if (!config) {
    console.log('PDV sem configuracao local. WebSocket nao sera conectado.');
    scheduleReconnect();
    return;
  }

  await sendHttpHeartbeat(config);
  startHeartbeat(config.pdvId);

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = buildWsUrl(config.urlBackend);

  console.log('Connecting to WebSocket server...');
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Connected to server');

    ws?.send(JSON.stringify({
      type: 'register',
      pdvId: config.pdvId,
      name: `PDV ${config.pdvId}`,
      location: config.empresaNome || config.empresaCnpj || 'Empresa configurada',
      token: config.tokenAutenticacao,
    }));

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
    console.log('Disconnected from server');
    ws = null;

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    scheduleReconnect();
  };
}

function scheduleReconnect() {
  if (!reconnectInterval) {
    reconnectInterval = setInterval(() => {
      console.log('Attempting to connect WebSocket...');
      connectToServer();
    }, 5000);
  }
}

async function sendHttpHeartbeat(config: PdvConnectionConfig) {
  try {
    const baseUrl = config.urlBackend || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/pdv/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.tokenAutenticacao}`,
      },
      body: JSON.stringify({
        pdvId: config.pdvId,
        name: `PDV ${config.pdvId}`,
        location: config.empresaNome || config.empresaCnpj || 'Empresa configurada',
      }),
    });
  } catch (error) {
    console.warn('Falha ao enviar heartbeat HTTP do PDV:', error);
  }
}

function startHeartbeat(pdvId: string) {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        pdvId,
      }));
    }

    getPdvConnectionConfig().then((config) => {
      if (config) sendHttpHeartbeat(config);
    });
  }, 30000);
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
    window.dispatchEvent(new CustomEvent('catalog-update-start'));

    await window.electron.db.saveCatalog(catalog);

    console.log('Catalog loaded successfully', {
      produtos: catalog.produtos?.length || 0,
      usuarios: catalog.usuarios?.length || 0,
    });
  } catch (error) {
    console.error('Failed to load catalog:', error);
    alert('Erro ao carregar catalogo recebido do servidor');
  }
}

if (window.electron?.sync) {
  connectToServer();
}
