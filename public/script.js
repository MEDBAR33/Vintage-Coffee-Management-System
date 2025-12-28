// Vintage Coffee Management System - JavaScript

const API_BASE = `${window.location.origin}/api`;
let currentMenu = { coffee: [], snacks: [] };
let currentOrders = [];
let currentInvoices = [];
let selectedItems = [];
let currentUser = null;
let authToken = null;
let pendingOrder = null; // Store order before payment

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    setupAuthEventListeners();
    setupEventListeners();
});

// Authentication Functions
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

async function checkAuthentication() {
    const token = getAuthToken();
    if (!token) {
        showLoginRequired();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            authToken = token;
            setupUIForUser();
            initializeTabs();
            loadInitialData();
        } else {
            setAuthToken(null);
            showLoginRequired();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        setAuthToken(null);
        showLoginRequired();
    }
}

function showLoginRequired() {
    // Hide all tabs and show login prompt
    document.getElementById('staff-tabs-group').style.display = 'none';
    document.getElementById('customer-tabs-group').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('auth-buttons').style.display = 'flex';
}

function setupUIForUser() {
    if (!currentUser) return;
    
    document.getElementById('auth-buttons').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('user-name-display').textContent = `Welcome, ${currentUser.name}`;
    
    // Show appropriate tabs based on role
    if (currentUser.role === 'staff') {
        document.getElementById('staff-tabs-group').style.display = 'flex';
        document.getElementById('customer-tabs-group').style.display = 'none';
        // Activate first staff tab
        const firstStaffTab = document.querySelector('.staff-tab');
        if (firstStaffTab) {
            firstStaffTab.click();
        }
    } else {
        document.getElementById('staff-tabs-group').style.display = 'none';
        document.getElementById('customer-tabs-group').style.display = 'flex';
        // Activate first customer tab
        const firstCustomerTab = document.querySelector('.customer-tab');
        if (firstCustomerTab) {
            firstCustomerTab.click();
        }
    }
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setAuthToken(data.token);
            currentUser = data.user;
            setupUIForUser();
            initializeTabs();
            loadInitialData();
            closeModal('login-modal');
            showNotification('Login successful!', 'success');
            return true;
        } else {
            showNotification(data.error || 'Login failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
        return false;
    }
}

async function signup(name, email, password) {
    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            setAuthToken(data.token);
            currentUser = data.user;
            setupUIForUser();
            initializeTabs();
            loadInitialData();
            closeModal('signup-modal');
            showNotification('Account created successfully!', 'success');
            return true;
        } else {
            showNotification(data.error || 'Signup failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed. Please try again.', 'error');
        return false;
    }
}

function logout() {
    setAuthToken(null);
    currentUser = null;
    selectedItems = [];
    showLoginRequired();
    showNotification('Logged out successfully', 'success');
}

function setupAuthEventListeners() {
    // Login button
    document.getElementById('login-btn').addEventListener('click', () => {
        openModal('login-modal');
    });
    
    // Signup button
    document.getElementById('signup-btn').addEventListener('click', () => {
        openModal('signup-modal');
    });
    
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await login(email, password);
    });
    
    // Signup form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        await signup(name, email, password);
    });
    
    // Switch between login and signup
    document.getElementById('switch-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('login-modal');
        openModal('signup-modal');
    });
    
    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('signup-modal');
        openModal('login-modal');
    });
    
    // Close modals
    document.getElementById('close-login').addEventListener('click', () => closeModal('login-modal'));
    document.getElementById('close-signup').addEventListener('click', () => closeModal('signup-modal'));
    document.getElementById('close-payment').addEventListener('click', () => closeModal('payment-modal'));
    
    // Payment method change
    document.getElementById('payment-method').addEventListener('change', (e) => {
        const cardDetails = document.getElementById('card-details');
        cardDetails.style.display = e.target.value === 'card' ? 'block' : 'none';
    });
    
    // Payment form
    document.getElementById('payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await processPayment();
    });
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function loadInitialData() {
    loadMenu();
    if (currentUser) {
        loadOrders();
        loadInvoices();
        if (currentUser.role === 'customer') {
            loadReviews();
            loadPhotos();
        }
    }
    updateSelectedItemsDisplay();
}

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            btn.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Refresh data when switching tabs
            if (targetTab === 'orders') {
                loadOrders();
            } else if (targetTab === 'my-orders') {
                loadMyOrders();
            } else if (targetTab === 'new-order') {
                loadAvailableItems();
                updateSelectedItemsDisplay();
            } else if (targetTab === 'invoices') {
                loadInvoices();
            } else if (targetTab === 'menu') {
                loadMenu();
            } else if (targetTab === 'reviews') {
                loadReviews();
            } else if (targetTab === 'photos') {
                loadPhotos();
            }
        });
    });
}

// Load Menu
async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        currentMenu = await response.json();
        displayMenu();
    } catch (error) {
        console.error('Error loading menu:', error);
        showNotification('Error loading menu', 'error');
    }
}

function displayMenu() {
    const coffeeContainer = document.getElementById('coffee-items');
    const snackContainer = document.getElementById('snack-items');
    
    coffeeContainer.innerHTML = '';
    snackContainer.innerHTML = '';
    
    currentMenu.coffee.forEach(item => {
        coffeeContainer.appendChild(createMenuItemCard(item));
    });
    
    currentMenu.snacks.forEach(item => {
        snackContainer.appendChild(createMenuItemCard(item));
    });
}

function createMenuItemCard(item) {
    const card = document.createElement('div');
    card.className = `menu-item-card ${!item.available ? 'unavailable' : ''}`;
    
    card.innerHTML = `
        <div class="menu-item-image">
            <img src="${item.image || 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(item.name)}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300x200/6B4423/F5E6D3?text=' + encodeURIComponent('${item.name}')">
        </div>
        <div class="menu-item-info">
            <div class="menu-item-name">${item.name}</div>
            <div class="menu-item-price">$${item.price.toFixed(2)}</div>
            <button class="menu-item-toggle ${item.available ? 'available' : ''}" 
                    onclick="toggleItemAvailability('${item.id}')">
                ${item.available ? 'Available' : 'Unavailable'}
            </button>
        </div>
    `;
    
    return card;
}

async function toggleItemAvailability(itemId) {
    if (!authToken || currentUser?.role !== 'staff') {
        showNotification('Staff access required', 'error');
        return;
    }
    
    try {
        const item = [...currentMenu.coffee, ...currentMenu.snacks].find(i => i.id === itemId);
        if (!item) return;
        
        const response = await fetch(`${API_BASE}/menu/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ available: !item.available })
        });
        
        if (response.ok) {
            currentMenu = await response.json();
            displayMenu();
            showNotification(`Item ${!item.available ? 'made available' : 'marked unavailable'}`, 'success');
        }
    } catch (error) {
        console.error('Error toggling availability:', error);
        showNotification('Error updating item', 'error');
    }
}

// Load Orders
async function loadOrders() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        currentOrders = await response.json();
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Error loading orders', 'error');
    }
}

function displayOrders() {
    const container = document.getElementById('orders-list');
    container.innerHTML = '';
    
    if (currentOrders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--element-maroon); font-family: \'Vivaldi\', \'Edwardian Script ITC\', \'Great Vibes\', cursive; font-size: 1.2rem; padding: 20px;">No orders yet</p>';
        return;
    }
    
    // Sort orders by date (newest first)
    const sortedOrders = [...currentOrders].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    sortedOrders.forEach(order => {
        container.appendChild(createOrderCard(order, false));
    });
}

// Load customer's own orders
async function loadMyOrders() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const myOrders = await response.json();
        displayMyOrders(myOrders);
    } catch (error) {
        console.error('Error loading my orders:', error);
        showNotification('Error loading orders', 'error');
    }
}

function displayMyOrders(orders) {
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--element-maroon); font-family: \'Vivaldi\', \'Edwardian Script ITC\', \'Great Vibes\', cursive; font-size: 1.2rem; padding: 20px;">No orders yet. Place your first order!</p>';
        return;
    }
    
    // Sort orders by date (newest first)
    const sortedOrders = [...orders].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    sortedOrders.forEach(order => {
        container.appendChild(createOrderCard(order, true));
    });
}

function createOrderCard(order, isCustomerView = false) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const date = new Date(order.createdAt).toLocaleString();
    
    card.innerHTML = `
        <div class="order-header">
            <div>
                <div class="order-id">Order #${order.id.substring(0, 8)}</div>
                ${!isCustomerView ? `<div class="order-customer">Customer: ${order.customerName}</div>` : ''}
                <div class="order-customer" style="font-size: 0.9rem; color: rgba(107, 68, 35, 0.7);">${date}</div>
            </div>
            <div class="order-status ${order.status}">${order.status}</div>
        </div>
        <div class="order-items">
            ${order.items.map(item => `
                <div class="order-item">
                    <span>${item.name} x${item.quantity}</span>
                    <span>$${item.subtotal.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-total-section">
            Total: $${order.total.toFixed(2)}
        </div>
        ${!isCustomerView ? `
            <div class="order-actions">
                ${order.status !== 'completed' ? `
                    <button class="btn btn-primary btn-small" onclick="updateOrderStatus('${order.id}', 'preparing')">
                        Mark Preparing
                    </button>
                    <button class="btn btn-primary btn-small" onclick="updateOrderStatus('${order.id}', 'completed')">
                        Mark Completed
                    </button>
                ` : ''}
                <button class="btn btn-secondary btn-small" onclick="generateInvoice('${order.id}')">
                    Generate Invoice
                </button>
            </div>
        ` : ''}
    `;
    
    return card;
}

async function updateOrderStatus(orderId, status) {
    if (!authToken || currentUser?.role !== 'staff') {
        showNotification('Staff access required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadOrders();
            showNotification('Order status updated', 'success');
        }
    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Error updating order', 'error');
    }
}

// New Order
async function loadAvailableItems() {
    try {
        const response = await fetch(`${API_BASE}/menu`);
        const menu = await response.json();
        displayAvailableItems(menu);
    } catch (error) {
        console.error('Error loading available items:', error);
        showNotification('Error loading items', 'error');
    }
}

function displayAvailableItems(menu) {
    const container = document.getElementById('available-items');
    container.innerHTML = '';
    
    const allItems = [...menu.coffee, ...menu.snacks].filter(item => item.available);
    
    allItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'available-item';
        itemDiv.innerHTML = `
            <div class="available-item-image">
                <img src="${item.image || 'https://via.placeholder.com/200x150?text=' + encodeURIComponent(item.name)}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/200x150/6B4423/F5E6D3?text=' + encodeURIComponent('${item.name}')">
            </div>
            <div class="available-item-name">${item.name}</div>
            <div class="available-item-price">$${item.price.toFixed(2)}</div>
        `;
        itemDiv.addEventListener('click', () => addItemToOrder(item));
        container.appendChild(itemDiv);
    });
}

function addItemToOrder(item) {
    const existingItem = selectedItems.find(i => i.id === item.id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        selectedItems.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1
        });
    }
    
    updateSelectedItemsDisplay();
}

function updateSelectedItemsDisplay() {
    const container = document.getElementById('selected-items');
    const totalElement = document.getElementById('order-total');
    
    if (selectedItems.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--vintage-cream); padding: 40px 20px; margin: 0; font-family: \'Vivaldi\', \'Edwardian Script ITC\', \'Great Vibes\', cursive; font-size: 1.2rem;">No selected items</p>';
        totalElement.textContent = '0.00';
        return;
    }
    
    container.innerHTML = selectedItems.map(item => `
        <div class="selected-item">
            <div>
                <strong>${item.name}</strong> - $${item.price.toFixed(2)} each
            </div>
            <div class="selected-item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="decreaseQuantity('${item.id}')">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity('${item.id}')">+</button>
                </div>
                <button class="remove-item" onclick="removeItem('${item.id}')">Remove</button>
            </div>
        </div>
    `).join('');
    
    const total = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalElement.textContent = total.toFixed(2);
}

function increaseQuantity(itemId) {
    const item = selectedItems.find(i => i.id === itemId);
    if (item) {
        item.quantity++;
        updateSelectedItemsDisplay();
    }
}

function decreaseQuantity(itemId) {
    const item = selectedItems.find(i => i.id === itemId);
    if (item) {
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            removeItem(itemId);
        }
        updateSelectedItemsDisplay();
    }
}

function removeItem(itemId) {
    selectedItems = selectedItems.filter(i => i.id !== itemId);
    updateSelectedItemsDisplay();
}

async function submitOrder() {
    if (!currentUser) {
        showNotification('Please login to place an order', 'error');
        openModal('login-modal');
        return;
    }
    
    if (selectedItems.length === 0) {
        showNotification('Please select at least one item', 'error');
        return;
    }
    
    const customerName = document.getElementById('customer-name').value.trim() || currentUser.name;
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                customerName,
                items: selectedItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                }))
            })
        });
        
        if (response.ok) {
            const order = await response.json();
            pendingOrder = order;
            // Open payment modal instead of completing order
            showPaymentModal(order);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error creating order', 'error');
        }
    } catch (error) {
        console.error('Error submitting order:', error);
        showNotification('Error creating order', 'error');
    }
}

async function generateInvoice(orderId) {
    if (!authToken || currentUser?.role !== 'staff') {
        showNotification('Staff access required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ orderId })
        });
        
        if (response.ok) {
            const invoice = await response.json();
            showNotification('Invoice generated successfully!', 'success');
            loadInvoices();
            showInvoiceModal(invoice);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Error generating invoice', 'error');
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
        showNotification('Error generating invoice', 'error');
    }
}

// Load Invoices
async function loadInvoices() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        currentInvoices = await response.json();
        displayInvoices();
    } catch (error) {
        console.error('Error loading invoices:', error);
        showNotification('Error loading invoices', 'error');
    }
}

function displayInvoices() {
    const container = document.getElementById('invoices-list');
    container.innerHTML = '';
    
    if (currentInvoices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--element-maroon); font-family: \'Vivaldi\', \'Edwardian Script ITC\', \'Great Vibes\', cursive; font-size: 1.2rem; padding: 20px;">No invoices yet</p>';
        return;
    }
    
    // Sort invoices by date (newest first)
    const sortedInvoices = [...currentInvoices].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    sortedInvoices.forEach(invoice => {
        container.appendChild(createInvoiceCard(invoice));
    });
}

function createInvoiceCard(invoice) {
    const card = document.createElement('div');
    card.className = 'invoice-card';
    card.onclick = () => showInvoiceModal(invoice);
    
    const date = new Date(invoice.createdAt).toLocaleString();
    
    card.innerHTML = `
        <div class="invoice-header">
            <div>
                <div class="invoice-number">${invoice.invoiceNumber}</div>
                <div class="order-customer">${invoice.customerName}</div>
                <div class="order-customer" style="font-size: 0.9rem; color: rgba(107, 68, 35, 0.7);">${date}</div>
            </div>
            <div class="invoice-total">$${invoice.total.toFixed(2)}</div>
        </div>
    `;
    
    return card;
}

function showInvoiceModal(invoice) {
    const modal = document.getElementById('invoice-modal');
    const details = document.getElementById('invoice-details');
    
    details.innerHTML = `
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <div class="invoice-details-item">
            <strong>Customer:</strong> ${invoice.customerName}
        </div>
        <div class="invoice-details-item">
            <strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleString()}
        </div>
        <div class="invoice-details-item">
            <strong>Items:</strong>
            <div style="margin-top: 10px;">
                ${invoice.items.map(item => `
                    <div class="order-item">
                        <span>${item.name} x${item.quantity}</span>
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="invoice-details-item">
            <div class="order-item">
                <span><strong>Subtotal:</strong></span>
                <span>$${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="order-item">
                <span><strong>Tax (8%):</strong></span>
                <span>$${invoice.tax.toFixed(2)}</span>
            </div>
            <div class="order-item" style="font-size: 1.2rem; margin-top: 10px;">
                <span><strong>Total:</strong></span>
                <span><strong>$${invoice.total.toFixed(2)}</strong></span>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// Payment Functions
function showPaymentModal(order) {
    const paymentSummary = document.getElementById('payment-summary');
    paymentSummary.innerHTML = `
        <div class="payment-order-summary">
            <h3>Order Summary</h3>
            <div class="order-items-summary">
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>${item.name} x ${item.quantity}</span>
                        <span>$${(item.subtotal).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <div style="border-top: 2px solid var(--element-maroon); margin-top: 15px; padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 1.3rem; font-weight: bold;">
                    <span>Total:</span>
                    <span>$${order.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    `;
    openModal('payment-modal');
}

async function processPayment() {
    if (!pendingOrder) {
        showNotification('No pending order found', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    
    try {
        const response = await fetch(`${API_BASE}/payments/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                orderId: pendingOrder.id,
                amount: pendingOrder.total,
                paymentMethod: paymentMethod
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeModal('payment-modal');
            // Show under construction message
            showNotification('Payment processed successfully! However, the coffee shop is still under construction. We will notify you when your order is ready.', 'success');
            
            // Clear order form
            selectedItems = [];
            document.getElementById('customer-name').value = '';
            updateSelectedItemsDisplay();
            pendingOrder = null;
            
            // Reload orders
            loadOrders();
        } else {
            showNotification(data.error || 'Payment failed', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('Payment processing failed. Please try again.', 'error');
    }
}

// Reviews Functions
async function loadReviews() {
    try {
        const response = await fetch(`${API_BASE}/reviews`);
        const reviews = await response.json();
        displayReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
    }
}

function displayReviews(reviews) {
    const container = document.getElementById('reviews-list');
    if (!container) return;
    
    if (reviews.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--element-maroon); padding: 40px 20px;">No reviews yet. Be the first to leave one!</p>';
        return;
    }
    
    // Sort reviews by date (newest first)
    const sortedReviews = [...reviews].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    container.innerHTML = sortedReviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <div class="review-author">${review.userName}</div>
                <div class="review-rating">
                    ${'⭐'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                </div>
                <div class="review-date">${new Date(review.createdAt).toLocaleDateString()}</div>
            </div>
            ${review.comment ? `<div class="review-comment">${review.comment}</div>` : ''}
        </div>
    `).join('');
}

// Submit review
async function submitReview() {
    if (!authToken) {
        showNotification('Please login to submit a review', 'error');
        return;
    }
    
    if (currentUser?.role === 'staff') {
        showNotification('Only customers can leave reviews', 'error');
        return;
    }
    
    const rating = parseInt(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value.trim();
    
    if (!rating || rating < 1 || rating > 5) {
        showNotification('Please select a valid rating', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ rating, comment })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Review submitted successfully!', 'success');
            // Clear the form
            document.getElementById('review-rating').value = '5';
            document.getElementById('review-comment').value = '';
            // Reload reviews to show the new one
            loadReviews();
        } else {
            showNotification(data.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('Error submitting review. Please try again.', 'error');
    }
}

// Photos Functions
function loadPhotos() {
    const container = document.getElementById('photos-gallery');
    if (!container) return;
    
    // Vintage coffee shop photos (placeholder URLs - you can replace with actual photos)
    const photos = [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&h=600&fit=crop'
    ];
    
    container.innerHTML = photos.map((photo, index) => `
        <div class="photo-item">
            <img src="${photo}" alt="Coffee Shop Photo ${index + 1}" loading="lazy">
        </div>
    `).join('');
}

// Setup Event Listeners
function setupEventListeners() {
    // Submit order button
    document.getElementById('submit-order').addEventListener('click', submitOrder);
    
    // Submit review button
    const submitReviewBtn = document.getElementById('submit-review');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', submitReview);
    }
    
    // Modal close
    const modal = document.getElementById('invoice-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-family: 'Lora', serif;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}
