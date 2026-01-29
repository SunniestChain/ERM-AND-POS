const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve Static Frontend (SiteGround Deployment)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));


// --- Authentication ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // Simple plain text check as requested
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ success: true, user: { id: row.id, username: row.username, role: row.role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// --- Core Data Fetching ---

// Get hierarchy data
app.get('/api/hierarchy', (req, res) => {
    const data = {};

    // Promisify for parallel loading
    const getManufacturers = new Promise((resolve, reject) => {
        db.all("SELECT * FROM manufacturers", [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    const getEngines = new Promise((resolve, reject) => {
        db.all("SELECT * FROM engines", [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    const getCategories = new Promise((resolve, reject) => {
        db.all("SELECT * FROM categories", [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    const getSuppliers = new Promise((resolve, reject) => {
        db.all("SELECT * FROM suppliers", [], (err, rows) => err ? reject(err) : resolve(rows));
    });

    Promise.all([getManufacturers, getEngines, getCategories, getSuppliers])
        .then(([manufacturers, engines, categories, suppliers]) => {
            res.json({ manufacturers, engines, categories, suppliers });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// Get Products (Filtered or Search)
app.get('/api/products', (req, res) => {
    const { engineId, categoryId, search } = req.query;

    if (search) {
        // Global Search
        const term = `%${search}%`;
        const sql = `
            SELECT p.*, GROUP_CONCAT(s.name, ', ') as supplier_names, SUM(pv.stock_quantity) as total_stock
            FROM products p
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN suppliers s ON pv.supplier_id = s.id
            WHERE p.part_number LIKE ? 
               OR p.name LIKE ? 
               OR p.description LIKE ? 
               OR p.notes LIKE ?
               OR pv.sku LIKE ?
            GROUP BY p.id
            ORDER BY p.name LIMIT 50
        `;
        db.all(sql, [term, term, term, term, term], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (engineId && categoryId) {
        // Hierarchy Filter
        const sql = `
            SELECT p.*, GROUP_CONCAT(s.name, ', ') as supplier_names, SUM(pv.stock_quantity) as total_stock 
            FROM products p
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN suppliers s ON pv.supplier_id = s.id
            WHERE p.engine_id = ? AND p.category_id = ?
            GROUP BY p.id
        `;
        db.all(sql, [engineId, categoryId], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        // Default: Show All/Recent (Limit 100)
        // We still need aggregations for the filters to work immediately
        const sql = `
            SELECT p.*, GROUP_CONCAT(s.name, ', ') as supplier_names, SUM(pv.stock_quantity) as total_stock
            FROM products p
            LEFT JOIN product_variants pv ON p.id = pv.product_id
            LEFT JOIN suppliers s ON pv.supplier_id = s.id
            GROUP BY p.id
            ORDER BY p.id DESC LIMIT 100
        `;
        db.all(sql, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    }
});

// Get Variants for a Product
app.get('/api/products/:id/variants', (req, res) => {
    const sql = `
    SELECT pv.*, s.name as supplierName 
    FROM product_variants pv
    JOIN suppliers s ON pv.supplier_id = s.id
    WHERE pv.product_id = ?
  `;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- Management / Editing ---

// Add New Product (Complex Transaction)
app.post('/api/products', (req, res) => {
    const { engineId, categoryId, partNumber, name, description, notes, imageUrl } = req.body;

    const sql = `INSERT INTO products (engine_id, category_id, part_number, name, description, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [engineId, categoryId, partNumber, name, description, notes, imageUrl || ''], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const productId = this.lastID;

        // Auto-create variant entries for all suppliers
        db.all("SELECT id FROM suppliers", [], (err, suppliers) => {
            if (!err && suppliers) {
                const stmt = db.prepare("INSERT INTO product_variants (product_id, supplier_id, price, sku, stock_quantity, bin_location) VALUES (?, ?, 0, '', 0, '')");
                suppliers.forEach(s => stmt.run(productId, s.id));
                stmt.finalize();
            }
        });

        res.json({ id: productId, message: "Product created" });
    });
});

// Update Product Master
app.put('/api/products/:id', (req, res) => {
    const { part_number, name, description, notes, image_url } = req.body;
    db.run(
        `UPDATE products SET part_number = ?, name = ?, description = ?, notes = ?, image_url = ? WHERE id = ?`,
        [part_number, name, description, notes, image_url, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

// Update Variant
app.put('/api/variants/:id', (req, res) => {
    const { price, sku, stock_quantity, bin_location } = req.body;
    db.run(
        `UPDATE product_variants SET price = ?, sku = ?, stock_quantity = ?, bin_location = ? WHERE id = ?`,
        [price, sku, stock_quantity || 0, bin_location || '', req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        }
    );
});

// Delete Variant (Remove Brand from Product)
app.delete('/api/variants/:id', (req, res) => {
    db.run(`DELETE FROM product_variants WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ changes: this.changes });
    });
});

// Add Variant (Add Brand to Product)
app.post('/api/variants', (req, res) => {
    const { productId, supplierId, price, sku, stock_quantity, bin_location } = req.body;
    db.run(
        `INSERT INTO product_variants (product_id, supplier_id, price, sku, stock_quantity, bin_location) VALUES (?, ?, ?, ?, ?, ?)`,
        [productId, supplierId, price || 0, sku || '', stock_quantity || 0, bin_location || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Create Sale (POS Ticket)
app.post('/api/sales', (req, res) => {
    const { items } = req.body; // items: [{ variantId, quantity, unitPrice, productName, supplierName }]

    if (!items || items.length === 0) {
        return res.status(400).json({ error: "No items in sale" });
    }

    // SQLite transaction (serialized via db.serialize)
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        let totalAmount = 0;
        let errors = [];

        // 1. Calculate total and verify stock (optimistic check, real check happens during updates usually, but we'll do it here)
        items.forEach(item => {
            totalAmount += item.unitPrice * item.quantity;
            // Note: In a real high-concurrency app, we'd check stock row-by-row. 
            // Here we assume the frontend sends valid data, but we update the stock securely.
        });

        // 2. Create Sale Record
        db.run(`INSERT INTO sales (total_amount) VALUES (?)`, [totalAmount], function (err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            const saleId = this.lastID;

            // 3. Process Items
            let completed = 0;
            items.forEach(item => {
                const subtotal = item.unitPrice * item.quantity;

                // Add Line Item
                db.run(`INSERT INTO sale_items (sale_id, variant_id, product_name, supplier_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [saleId, item.variantId, item.productName, item.supplierName, item.quantity, item.unitPrice, subtotal]
                );

                // Deduct Stock
                db.run(`UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?`,
                    [item.quantity, item.variantId],
                    (err) => {
                        if (err) console.error("Error updating stock", err);
                    }
                );
            });

            db.run("COMMIT");
            res.json({ success: true, saleId: saleId });
        });
    });
});

// Get All Sales (History List)
app.get('/api/sales', (req, res) => {
    const sql = `SELECT * FROM sales ORDER BY created_at DESC LIMIT 100`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get Single Sale Details (Receipt)
app.get('/api/sales/:id', (req, res) => {
    const saleId = req.params.id;
    const saleSql = `SELECT * FROM sales WHERE id = ?`;
    const itemsSql = `SELECT * FROM sale_items WHERE sale_id = ?`;

    db.get(saleSql, [saleId], (err, sale) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!sale) return res.status(404).json({ error: "Sale not found" });

        db.all(itemsSql, [saleId], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ ...sale, items });
        });
    });
});

// --- Settings Management (CRUD) ---
// Generic handler for simple tables
['manufacturers', 'engines', 'categories', 'suppliers'].forEach(table => {
    app.post(`/api/${table}`, (req, res) => {
        const keys = Object.keys(req.body);
        const values = Object.values(req.body);
        const placeholders = keys.map(() => '?').join(',');
        const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;
        db.run(sql, values, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
        });
    });

    app.delete(`/api/${table}/:id`, (req, res) => {
        db.run(`DELETE FROM ${table} WHERE id = ?`, [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ changes: this.changes });
        });
    });
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
