const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'erm.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Initialize Database Schema
db.serialize(() => {
  // 1. Users (Simple Text Password as requested)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'admin'
  )`);

  // 2. Manufacturers (Cummins, Cat, Detroit)
  db.run(`CREATE TABLE IF NOT EXISTS manufacturers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);

  // 3. Engines (ISX, C15, DD15) - Linked to Manufacturer
  db.run(`CREATE TABLE IF NOT EXISTS engines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manufacturer_id INTEGER,
    name TEXT,
    FOREIGN KEY(manufacturer_id) REFERENCES manufacturers(id)
  )`);

  // 4. Categories (Gaskets, Pistons)
  db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);

  // 5. Suppliers (The "10 shared brands" like McBee, PAI)
  db.run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  )`);

  // 6. Products (Master Definition)
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    engine_id INTEGER,
    category_id INTEGER,
    part_number TEXT,
    name TEXT,
    description TEXT,
    notes TEXT,
    image_url TEXT,
    FOREIGN KEY(engine_id) REFERENCES engines(id),
    FOREIGN KEY(category_id) REFERENCES categories(id)
  )`);

  // 7. Product Variants (Specific Brand Pricing)
  db.run(`CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    supplier_id INTEGER,
    sku TEXT,
    price REAL,
    stock_quantity INTEGER DEFAULT 0,
    bin_location TEXT DEFAULT '',
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
  )`);

  // 8. Sales (Tickets)
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount REAL
  )`);

  // 9. Sale Items
  db.run(`CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    variant_id INTEGER,
    product_name TEXT, 
    supplier_name TEXT,
    quantity INTEGER,
    unit_price REAL,
    subtotal REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(variant_id) REFERENCES product_variants(id)
  )`);

  // --- MIGRATIONS (For existing databases) ---
  // Add image_url to products if missing
  db.all("PRAGMA table_info(products)", (err, rows) => {
    if (!err && rows) {
      const hasImage = rows.some(r => r.name === 'image_url');
      if (!hasImage) {
        console.log("Migrating: Adding image_url to products");
        db.run("ALTER TABLE products ADD COLUMN image_url TEXT");
      }
    }
  });

  // Add stock_quantity and bin_location to product_variants if missing
  db.all("PRAGMA table_info(product_variants)", (err, rows) => {
    if (!err && rows) {
      const hasStock = rows.some(r => r.name === 'stock_quantity');
      const hasBin = rows.some(r => r.name === 'bin_location');
      if (!hasStock) {
        console.log("Migrating: Adding stock_quantity to product_variants");
        db.run("ALTER TABLE product_variants ADD COLUMN stock_quantity INTEGER DEFAULT 0");
      }
      if (!hasBin) {
        console.log("Migrating: Adding bin_location to product_variants");
        db.run("ALTER TABLE product_variants ADD COLUMN bin_location TEXT DEFAULT ''");
      }
    }
  });
});

// Seed Initial Data if empty
db.serialize(() => {
  db.get("SELECT count(*) as count FROM users", (err, row) => {
    if (row.count === 0) {
      console.log("Seeding initial data...");

      // Admin User
      db.run(`INSERT INTO users (username, password) VALUES ('admin', 'admin')`);

      // Manufacturers
      db.run(`INSERT INTO manufacturers (name) VALUES ('Cummins'), ('Caterpillar'), ('Detroit Diesel')`);

      // Suppliers (Common brands)
      db.run(`INSERT INTO suppliers (name) VALUES ('McBee'), ('PAI'), ('IPD'), ('KMP'), ('Clevite'), ('FP Diesel'), ('Maxiforce'), ('OEM'), ('Interstate-McBee'), ('Excel')`);

      // Categories
      db.run(`INSERT INTO categories (name) VALUES ('Gaskets'), ('Pistons'), ('Injectors'), ('Bearings'), ('Valves')`);

      // Helper to link Engine
      const insertEngine = (manufName, engineName) => {
        db.get("SELECT id FROM manufacturers WHERE name = ?", [manufName], (err, row) => {
          if (row) db.run(`INSERT INTO engines (manufacturer_id, name) VALUES (?, ?)`, [row.id, engineName]);
        });
      };

      // Set timeout to ensure manufacturers exist
      setTimeout(() => {
        insertEngine('Cummins', 'ISX15');
        insertEngine('Cummins', 'N14');
        insertEngine('Caterpillar', 'C15');
        insertEngine('Caterpillar', '3406E');
        insertEngine('Detroit Diesel', 'DD15');
        insertEngine('Detroit Diesel', 'Series 60');
      }, 1000);

    }
  });
});

module.exports = db;
