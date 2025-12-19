# ☕ Old Time Coffee Management System

A fully functional vintage-themed coffee shop management system with smooth transitions and animations. This system automates coffee shop operations including menu management, order processing, inventory tracking, and invoice generation.

## Features

- **Menu Management**: Manage coffee types and snacks with availability toggles
- **Order Processing**: Create new orders, track order status, and manage customer requests
- **Invoice Generation**: Automatically generate invoices for completed orders
- **Vintage Design**: Beautiful vintage aesthetic with warm colors and smooth animations
- **Real-time Updates**: Instant updates across all sections

## Tech Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Data Storage**: JSON files (easily upgradeable to a database)
- **Styling**: Custom vintage-themed CSS with animations

## Installation

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)
   - Version 14.x or higher recommended

2. **Install Dependencies**
   ```bash
   npm install
   ```

## Running the Application

1. **Start the Server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. **Access the Application**
   - Open your browser and navigate to: `http://localhost:3000`
   - The management system interface will load automatically

## Using JetBrains IDEs

### WebStorm (Recommended)
1. Open the project folder in WebStorm
2. Open the terminal in WebStorm (View → Tool Windows → Terminal)
3. Run `npm install` to install dependencies
4. Run `npm start` to start the server
5. Click the URL in the terminal output or open `http://localhost:3000` in your browser

### IntelliJ IDEA Ultimate
1. Open the project folder in IntelliJ IDEA
2. Install Node.js plugin if not already installed (File → Settings → Plugins)
3. Configure Node.js interpreter (File → Settings → Languages & Frameworks → Node.js)
4. Open terminal and run `npm install`
5. Run `npm start` to start the server

## Project Structure

```
Vintage/
├── server.js              # Express server and API routes
├── package.json           # Node.js dependencies
├── data/                  # Data storage (created automatically)
│   ├── menu.json         # Menu items (coffee and snacks)
│   ├── orders.json       # Order records
│   ├── invoices.json     # Invoice records
│   └── inventory.json    # Inventory data
└── public/               # Frontend files
    ├── index.html        # Main HTML file
    ├── styles.css        # Vintage-themed styles
    └── script.js         # Frontend JavaScript
```

## API Endpoints

- `GET /api/menu` - Get all menu items
- `PUT /api/menu/:id` - Update menu item availability
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Generate invoice for an order
- `GET /api/invoices/:id` - Get specific invoice

## Default Menu Items

### Coffee
- Classic Espresso - $3.50
- Vintage Cappuccino - $4.25
- Old Fashioned Latte - $4.50
- Retro Americano - $3.75
- Vintage Mocha - $5.00
- Classic Macchiato - $4.00

### Snacks
- Vintage Croissant - $2.50
- Classic Muffin - $3.00
- Old Time Cookie - $2.25
- Retro Donut - $2.75
- Classic Brownie - $3.50
- Vintage Cake Slice - $4.50

## Usage Guide

1. **Menu Management**: Toggle item availability by clicking the "Available/Unavailable" button
2. **Create Order**: Select items from the menu, adjust quantities, and submit
3. **Manage Orders**: Update order status (pending → preparing → completed)
4. **Generate Invoices**: Create invoices for completed orders and view them

## Design Features

- Vintage color scheme with warm browns and cream tones
- Smooth CSS animations and transitions
- Responsive design for various screen sizes
- Elegant typography using Playfair Display and Lora fonts
- Animated header patterns and hover effects

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions, please check the code comments or create an issue in your repository.
