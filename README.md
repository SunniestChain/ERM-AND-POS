# ERM & POS System

A comprehensive Engine Rebuild Management (ERM) and Point of Sale (POS) system built with React, Node.js, and SQLite.

## Project Structure

- **Frontend**: Vite + React (`src/`)
- **Backend**: Node.js + Express (`server/`)
- **Database**: SQLite (`server/erm.db`)

## How to Run

You will need two terminal windows open.

### 1. Start the Backend Server
This handles the database and API requests.

```bash
cd server
node index.js
```
*Expected Output:* `Server running on http://localhost:3000`

### 2. Start the Frontend Application
This runs the user interface.

```bash
# In a new terminal window, from the project root:
npm run dev
```
*Expected Output:* `Local: http://localhost:5174/` or similar.

## Accessing the App

Open your browser and navigate to the URL shown in the frontend terminal (usually `http://localhost:5174/`).

**Default Login:**
- Username: `admin`
- Password: `admin`

## Features

- **Dashboard**: Browse products by Manufacturer -> Engine -> Category.
- **Product Editor**: Manage master product data and brand-specific variants.
- **Inventory**: Track Stock Quantity and Bin Locations.
- **Management Console**: Add Manufacturers, Engines, Categories, and Suppliers.
