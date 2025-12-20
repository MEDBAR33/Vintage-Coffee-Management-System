const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Data files
const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');

// Initialize data directory
async function initializeData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize menu if it doesn't exist
    try {
      await fs.access(MENU_FILE);
    } catch {
      const defaultMenu = {
        coffee: [
          { id: '1', name: 'Classic Espresso', price: 3.50, category: 'coffee', available: true },
          { id: '2', name: 'Vintage Cappuccino', price: 4.25, category: 'coffee', available: true },
          { id: '3', name: 'Old Fashioned Latte', price: 4.50, category: 'coffee', available: true },
          { id: '4', name: 'Retro Americano', price: 3.75, category: 'coffee', available: true },
          { id: '5', name: 'Vintage Mocha', price: 5.00, category: 'coffee', available: true },
          { id: '6', name: 'Classic Macchiato', price: 4.00, category: 'coffee', available: true }
        ],
        snacks: [
          { id: '7', name: 'Vintage Croissant', price: 2.50, category: 'snack', available: true },
          { id: '8', name: 'Classic Muffin', price: 3.00, category: 'snack', available: true },
          { id: '9', name: 'Old Time Cookie', price: 2.25, category: 'snack', available: true },
          { id: '10', name: 'Retro Donut', price: 2.75, category: 'snack', available: true },
          { id: '11', name: 'Classic Brownie', price: 3.50, category: 'snack', available: true },
          { id: '12', name: 'Vintage Cake Slice', price: 4.50, category: 'snack', available: true }
        ]
      };
      await fs.writeFile(MENU_FILE, JSON.stringify(defaultMenu, null, 2));
    }
    
    // Initialize other data files
    for (const file of [ORDERS_FILE, INVOICES_FILE, INVENTORY_FILE]) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify(file === INVENTORY_FILE ? {} : [], null, 2));
      }
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Read data helper
async function readData(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return file === INVENTORY_FILE ? {} : [];
  }
}

// Write data helper
async function writeData(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// API Routes

// Get menu
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await readData(MENU_FILE);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item availability
app.put('/api/menu/:id', async (req, res) => {
  try {
    const menu = await readData(MENU_FILE);
    const { id } = req.params;
    const { available } = req.body;
    
    let found = false;
    for (const category of ['coffee', 'snacks']) {
      const item = menu[category].find(item => item.id === id);
      if (item) {
        item.available = available;
        found = true;
        break;
      }
    }
    
    if (!found) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await writeData(MENU_FILE, menu);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create order
app.post('/api/orders', async (req, res) => {
  try {
    const { items, customerName } = req.body;
    const menu = await readData(MENU_FILE);
    const orders = await readData(ORDERS_FILE);
    
    // Calculate total
    let total = 0;
    const orderItems = items.map(item => {
      const menuItem = [...menu.coffee, ...menu.snacks].find(m => m.id === item.id);
      if (!menuItem) throw new Error(`Item ${item.id} not found`);
      if (!menuItem.available) throw new Error(`Item ${menuItem.name} is not available`);
      
      const subtotal = menuItem.price * item.quantity;
      total += subtotal;
      
      return {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        subtotal: subtotal
      };
    });
    
    const order = {
      id: uuidv4(),
      customerName: customerName || 'Walk-in Customer',
      items: orderItems,
      total: total,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    orders.push(order);
    await writeData(ORDERS_FILE, orders);
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await readData(ORDERS_FILE);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
  try {
    const orders = await readData(ORDERS_FILE);
    const { id } = req.params;
    const { status } = req.body;
    
    const order = orders.find(o => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    order.status = status;
    await writeData(ORDERS_FILE, orders);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const { orderId } = req.body;
    const orders = await readData(ORDERS_FILE);
    const invoices = await readData(INVOICES_FILE);
    
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const invoice = {
      id: uuidv4(),
      orderId: orderId,
      invoiceNumber: `INV-${Date.now()}`,
      customerName: order.customerName,
      items: order.items,
      subtotal: order.total,
      tax: order.total * 0.08, // 8% tax
      total: order.total * 1.08,
      createdAt: new Date().toISOString()
    };
    
    invoices.push(invoice);
    await writeData(INVOICES_FILE, invoices);
    
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await readData(INVOICES_FILE);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const invoices = await readData(INVOICES_FILE);
    const invoice = invoices.find(i => i.id === req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize and start server
initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`Vintage Coffee Management System running on http://localhost:${PORT}`);
  });
});
