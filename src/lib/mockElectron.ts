// Mock do window.electron para funcionar no navegador
const mockDb = {
  getProducts: async () => {
    const data = localStorage.getItem("pdv_products");
    return data ? JSON.parse(data) : [];
  },

  getUsers: async () => {
    const data = localStorage.getItem("pdv_users");
    const users = data ? JSON.parse(data) : [];
    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }));
  },

  validateUser: async (email: string, password: string) => {
    const data = localStorage.getItem("pdv_users");
    const users = data ? JSON.parse(data) : [];
    const user = users.find((u: any) => u.email === email);

    if (!user) {
      // If admin user is missing but credentials are correct, create it
      if (email === "admin@pdv.com" && password === "admin123") {
        const adminUser = {
          id: 1,
          name: "Admin",
          email: "admin@pdv.com",
          password_hash: "admin123",
          role: "admin",
        };
        users.push(adminUser);
        localStorage.setItem("pdv_users", JSON.stringify(users));
        return {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        };
      }
      return null;
    }

    // Allow admin123 for admin user regardless of stored hash in mock mode
    if (email === "admin@pdv.com" && password === "admin123") {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }

    if (user.password_hash === password) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }

    return null;
  },

  saveOrder: async (order: any) => {
    const data = localStorage.getItem("pdv_orders");
    const orders = data ? JSON.parse(data) : [];

    const newOrder = {
      ...order,
      uuid: order.uuid || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      sync_status: "pending",
    };

    orders.push(newOrder);
    localStorage.setItem("pdv_orders", JSON.stringify(orders));

    return newOrder.uuid;
  },

  saveCashMovement: async (movement: any) => {
    const data = localStorage.getItem("pdv_cash_movements");
    const movements = data ? JSON.parse(data) : [];

    const newMovement = {
      ...movement,
      uuid: movement.uuid || crypto.randomUUID(),
      created_at: new Date().toISOString(),
      sync_status: "pending",
    };

    movements.push(newMovement);
    localStorage.setItem("pdv_cash_movements", JSON.stringify(movements));

    return newMovement.uuid;
  },

  getPendingOrders: async () => {
    const data = localStorage.getItem("pdv_orders");
    const orders = data ? JSON.parse(data) : [];
    return orders.filter((o: any) => o.sync_status === "pending");
  },

  getCashBalance: async () => {
    const data = localStorage.getItem("pdv_cash_movements");
    const movements = data ? JSON.parse(data) : [];

    return movements.reduce((balance: number, mov: any) => {
      if (mov.type === "ABERTURA" || mov.type === "REFORCO") {
        return balance + mov.amount;
      } else if (mov.type === "SANGRIA" || mov.type === "FECHAMENTO") {
        return balance - mov.amount;
      }
      return balance;
    }, 0);
  },

  saveCatalog: async (data: any) => {
    // Carregar produtos
    localStorage.setItem("pdv_products", JSON.stringify(data.produtos || []));

    // Carregar usuários
    const users = (data.usuarios || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password_hash: u.passwordHash,
      role: u.role,
    }));
    localStorage.setItem("pdv_users", JSON.stringify(users));

    console.log(`Saved ${data.produtos?.length || 0} products and ${users.length} users`);
  },
};

const mockSync = {
  loadCatalog: async () => {
    console.log("Mock: Loading catalog...");
    return true;
  },
  syncNow: async () => {
    console.log("Sync started");
  },
  getStatus: async () => ({
    isOnline: true,
    lastSync: new Date().toISOString(),
  }),
};

// Inicializar dados de exemplo
if (!localStorage.getItem("pdv_users")) {
  localStorage.setItem(
    "pdv_users",
    JSON.stringify([
      {
        id: 1,
        name: "Admin",
        email: "admin@pdv.com",
        password_hash: "admin123",
        role: "admin",
      },
    ])
  );
}

if (!localStorage.getItem("pdv_products")) {
  localStorage.setItem("pdv_products", JSON.stringify([]));
}

if (!localStorage.getItem("pdv_orders")) {
  localStorage.setItem("pdv_orders", JSON.stringify([]));
}

if (!localStorage.getItem("pdv_cash_movements")) {
  localStorage.setItem("pdv_cash_movements", JSON.stringify([]));
}

// Expor globalmente
// Expor globalmente apenas se não estiver no Electron
if (!(window as any).electron) {
  console.log("Initializing mock electron for browser environment");
  (window as any).electron = {
    db: mockDb,
    sync: mockSync,
  };
} else {
  console.log("Electron environment detected, skipping mock initialization");
}

export {};
