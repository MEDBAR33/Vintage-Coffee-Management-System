const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Staff only middleware
function staffOnly(req, res, next) {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

// Data files
const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

const JWT_SECRET = process.env.JWT_SECRET || 'vintage_coffee_secret_key_2024';

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
    for (const file of [ORDERS_FILE, INVOICES_FILE, INVENTORY_FILE, PAYMENTS_FILE, REVIEWS_FILE]) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify(file === INVENTORY_FILE ? {} : [], null, 2));
      }
    }

    // Initialize users file with default staff account
    try {
      await fs.access(USERS_FILE);
    } catch {
      const hashedPassword = await bcrypt.hash('Heaven2825F', 10);
      const defaultUsers = [
        {
          id: uuidv4(),
          email: 'K.Heaven@gmail.com',
          password: hashedPassword,
          role: 'staff',
          name: 'Staff Member',
          createdAt: new Date().toISOString()
        }
      ];
      await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Read data helper
async function readData(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    if (!data || data.trim() === '') {
      console.warn(`File ${file} is empty, returning default value`);
      return file === INVENTORY_FILE ? {} : [];
    }
    const parsed = JSON.parse(data);
    // Ensure we return an array for user files
    if (file === USERS_FILE && !Array.isArray(parsed)) {
      console.error('Users file is not an array, returning empty array');
      return [];
    }
    return parsed;
  } catch (error) {
    console.error(`Error reading file ${file}:`, error.message);
    return file === INVENTORY_FILE ? {} : [];
  }
}

// Write data helper
async function writeData(file, data) {
  try {
    await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote data to ${file}`);
  } catch (error) {
    console.error(`Error writing file ${file}:`, error.message);
    throw error;
  }
}

// API Routes

// Authentication Routes
// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const users = await readData(USERS_FILE);
    console.log('Signup attempt for email:', email);
    console.log('Current users count:', users.length);
    
    // Check if user already exists (case-insensitive)
    const normalizedEmail = email.toLowerCase().trim();
    if (users.find(u => u.email && u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'customer',
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeData(USERS_FILE, users);
    console.log('User saved successfully. Total users:', users.length);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const users = await readData(USERS_FILE);
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Login attempt for email:', normalizedEmail);
    console.log('Users in database:', users.length);
    
    // Find user with case-insensitive email comparison
    const user = users.find(u => u.email && u.email.toLowerCase().trim() === normalizedEmail);
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', user.email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment Routes
// Process payment
app.post('/api/payments/process', authenticateToken, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;
    
    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Order ID and amount are required' });
    }

    const orders = await readData(ORDERS_FILE);
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const payments = await readData(PAYMENTS_FILE);
    const payment = {
      id: uuidv4(),
      orderId: orderId,
      userId: req.user.id,
      amount: amount,
      paymentMethod: paymentMethod || 'card',
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    payments.push(payment);
    await writeData(PAYMENTS_FILE, payments);

    // Update order status
    order.status = 'paid';
    await writeData(ORDERS_FILE, orders);

    res.json({
      success: true,
      payment,
      message: 'Payment processed successfully. Note: The coffee shop is still under construction.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reviews Routes
// Get reviews
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await readData(REVIEWS_FILE);
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create review (authenticated customers only)
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Only customers can leave reviews' });
    }

    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    const reviews = await readData(REVIEWS_FILE);
    const review = {
      id: uuidv4(),
      userId: req.user.id,
      userName: user.name,
      rating: rating,
      comment: comment || '',
      createdAt: new Date().toISOString()
    };

    reviews.push(review);
    await writeData(REVIEWS_FILE, reviews);

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get menu
app.get('/api/menu', async (req, res) => {
  try {
    const menu = await readData(MENU_FILE);
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item availability (staff only)
app.put('/api/menu/:id', authenticateToken, staffOnly, async (req, res) => {
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

// Create order (authenticated users only)
app.post('/api/orders', authenticateToken, async (req, res) => {
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
    
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    const order = {
      id: uuidv4(),
      userId: req.user.id,
      customerName: customerName || user.name || 'Customer',
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

// Get all orders (staff) or user's orders (customer)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const orders = await readData(ORDERS_FILE);
    
    // Staff can see all orders, customers only see their own
    if (req.user.role === 'staff') {
      res.json(orders);
    } else {
      const userOrders = orders.filter(o => o.userId === req.user.id);
      res.json(userOrders);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (staff only)
app.put('/api/orders/:id', authenticateToken, staffOnly, async (req, res) => {
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

// Generate invoice (staff only)
app.post('/api/invoices', authenticateToken, staffOnly, async (req, res) => {
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

// Get all invoices (staff) or user's invoices (customer)
app.get('/api/invoices', authenticateToken, async (req, res) => {
  try {
    const invoices = await readData(INVOICES_FILE);
    const orders = await readData(ORDERS_FILE);
    
    if (req.user.role === 'staff') {
      res.json(invoices);
    } else {
      // Filter invoices for user's orders
      const userOrderIds = orders.filter(o => o.userId === req.user.id).map(o => o.id);
      const userInvoices = invoices.filter(inv => userOrderIds.includes(inv.orderId));
      res.json(userInvoices);
    }
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
