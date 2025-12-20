// Vintage Coffee Management System - JavaScript

const API_BASE = `${window.location.origin}/api`;
let currentMenu = { coffee: [], snacks: [] };
let currentOrders = [];
let currentInvoices = [];
let selectedItems = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    loadMenu();
    loadOrders();
    loadInvoices();
    setupEventListeners();
    // Initialize selected items display
    updateSelectedItemsDisplay();
});

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
            document.getElementById(targetTab).classList.add('active');
            
            // Refresh data when switching tabs
            if (targetTab === 'orders') {
                loadOrders();
            } else if (targetTab === 'new-order') {
                loadAvailableItems();
                updateSelectedItemsDisplay();
            } else if (targetTab === 'invoices') {
                loadInvoices();
            } else if (targetTab === 'menu') {
                loadMenu();
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
    try {
        const item = [...currentMenu.coffee, ...currentMenu.snacks].find(i => i.id === itemId);
        if (!item) return;
        
        const response = await fetch(`${API_BASE}/menu/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
    try {
        const response = await fetch(`${API_BASE}/orders`);
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
        container.appendChild(createOrderCard(order));
    });
}

function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    
    const date = new Date(order.createdAt).toLocaleString();
    
    card.innerHTML = `
        <div class="order-header">
            <div>
                <div class="order-id">Order #${order.id.substring(0, 8)}</div>
                <div class="order-customer">Customer: ${order.customerName}</div>
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
    `;
    
    return card;
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
    if (selectedItems.length === 0) {
        showNotification('Please select at least one item', 'error');
        return;
    }
    
    const customerName = document.getElementById('customer-name').value.trim() || 'Walk-in Customer';
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            showNotification('Order created successfully!', 'success');
            selectedItems = [];
            document.getElementById('customer-name').value = '';
            updateSelectedItemsDisplay();
            
            // Switch to orders tab
            document.querySelector('[data-tab="orders"]').click();
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
    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    try {
        const response = await fetch(`${API_BASE}/invoices`);
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

// Setup Event Listeners
function setupEventListeners() {
    // Submit order button
    document.getElementById('submit-order').addEventListener('click', submitOrder);
    
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
