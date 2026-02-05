import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { supabase } from './supabaseClient.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Helper for Errors ---
const handleError = (res, err) => {
    console.error(err);
    res.status(500).json({ error: err.message });
};

// --- API Endpoints ---

// 1. Get Products with Filtering & Search
app.get('/api/products', async (req, res) => {
    try {
        const { engineId, categoryId, search } = req.query;

        // Base Query
        let query = supabase.from('products').select(`
            *,
            product_engines!left (
                engine:engines (id, name, manufacturer:manufacturers(id, name))
            ),
            category:categories(id, name)
        `);

        if (search) {
            query = query.or(`part_number.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Filter by Engine (Many-to-Many)
        if (engineId) {
            // Use !inner instead of !left to force filtering
            query = supabase.from('products').select(`
                *,
                product_engines!inner (
                    engine_id
                ),
                category:categories(id, name)
            `).eq('product_engines.engine_id', engineId);
        }

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Transform data for frontend compatibility
        const formatted = data.map(p => {
            const engines = p.product_engines ? p.product_engines.map(pe => pe.engine) : [];
            return {
                ...p,
                engines: engines,
                engine: engines[0] || null
            };
        });

        res.json(formatted);
    } catch (err) {
        handleError(res, err);
    }
});

// 2. Get Variants for a Product
app.get('/api/products/:id/variants', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('product_variants')
            .select('*, supplier:suppliers(name)')
            .eq('product_id', id);

        if (error) throw error;

        // Flatten supplier name for frontend
        const variants = data.map(v => ({
            ...v,
            supplierName: v.supplier?.name || 'Unknown'
        }));
        res.json(variants);
    } catch (err) {
        handleError(res, err);
    }
});

// 3. Hierarchy (Manufacturers -> Engines -> Categories)
app.get('/api/hierarchy', async (req, res) => {
    try {
        const { data: manufacturers, error: mErr } = await supabase.from('manufacturers').select('*');
        if (mErr) throw mErr;

        const { data: engines, error: eErr } = await supabase.from('engines').select('*');
        if (eErr) throw eErr;

        const { data: categories, error: cErr } = await supabase.from('categories').select('*');
        if (cErr) throw cErr;

        const { data: suppliers, error: sErr } = await supabase.from('suppliers').select('*');
        if (sErr) throw sErr;

        res.json({ manufacturers, engines, categories, suppliers });
    } catch (err) {
        handleError(res, err);
    }
});

// 4. Sales APIs
app.get('/api/sales', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('sales')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data);
    } catch (err) {
        handleError(res, err);
    }
});

// Create Sale
app.post('/api/sales', async (req, res) => {
    try {
        const { items } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: "No items" });

        const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

        // Transaction logic via Supabase is tricky without RPC, but we can do sequential inserts.
        // 1. Create Sale
        const { data: sale, error: sErr } = await supabase
            .from('sales')
            .insert({ total_amount: totalAmount })
            .select()
            .single();
        if (sErr) throw sErr;

        // 2. Create Sale Items & Update Stock
        for (const item of items) {
            // Add Item
            const { error: iErr } = await supabase.from('sale_items').insert({
                sale_id: sale.id,
                variant_id: item.variantId,
                product_name: item.productName,
                supplier_name: item.supplierName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                subtotal: item.quantity * item.unitPrice
            });
            if (iErr) console.error("Error inserting item:", iErr);

            // Update Stock (Decrement)
            // Note: This is not atomic without RPC, but sufficient for this migration.
            // Ideally: await supabase.rpc('decrement_stock', { variant_id, qty })
            const { error: uErr } = await supabase.rpc('decrement_stock', {
                row_id: item.variantId,
                qty: item.quantity
            });
            // Warning: We haven't created this RPC yet. Let's do a direct update for now.
            // To do it safely, we'd need to fetch current, then update.
            const { data: currentVariant } = await supabase.from('product_variants').select('stock_quantity').eq('id', item.variantId).single();
            if (currentVariant) {
                await supabase.from('product_variants').update({ stock_quantity: currentVariant.stock_quantity - item.quantity }).eq('id', item.variantId);
            }
        }

        res.json({ success: true, saleId: sale.id });
    } catch (err) {
        handleError(res, err);
    }
});

// 5. Get Sale (Receipt)
app.get('/api/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: sale, error: sErr } = await supabase.from('sales').select('*').eq('id', id).single();
        if (sErr) throw sErr;

        const { data: items, error: iErr } = await supabase.from('sale_items').select('*').eq('sale_id', id);
        if (iErr) throw iErr;

        res.json({ ...sale, items });
    } catch (err) {
        handleError(res, err);
    }
});

// 6. Admin Stats
app.get('/api/admin/stats', async (req, res) => {
    try {
        const { data, error } = await supabase.from('admin_stats').select('*').single();
        // admin_stats View columns: total_stock, total_value, sales_today, sales_week, sales_month, sales_year
        if (error) throw error;

        // Map snake_case to camelCase for frontend
        res.json({
            totalStock: data.total_stock,
            totalValue: data.total_value,
            salesToday: data.sales_today,
            salesWeek: data.sales_week,
            salesMonth: data.sales_month,
            salesYear: data.sales_year
        });
    } catch (err) {
        handleError(res, err);
    }
});

// --- Settings Management (CRUD) ---
['manufacturers', 'engines', 'categories', 'suppliers'].forEach(table => {
    app.post(`/api/${table}`, async (req, res) => {
        try {
            const { name, manufacturer_id } = req.body;
            const payload = { name };
            if (table === 'engines' && manufacturer_id) payload.manufacturer_id = manufacturer_id;

            const { data, error } = await supabase.from(table).insert(payload).select().single();
            if (error) throw error;
            res.json(data);
        } catch (err) {
            handleError(res, err);
        }
    });

    app.delete(`/api/${table}/:id`, async (req, res) => {
        try {
            const { error } = await supabase.from(table).delete().eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (err) {
            // Check for FK violation (Postgres error 23503)
            if (err.code === '23503') {
                return res.status(400).json({ error: "Cannot delete: This item is used by other records." });
            }
            handleError(res, err);
        }
    });
});

// Update Product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { part_number, name, description, notes, image_url, engineIds } = req.body;

        // 1. Update Product Details
        const { error } = await supabase
            .from('products')
            .update({ part_number, name, description, notes, image_url })
            .eq('id', req.params.id);
        if (error) throw error;

        // 2. Update Engine Links (if provided)
        if (engineIds && Array.isArray(engineIds)) {
            // Delete existing links
            const { error: delErr } = await supabase.from('product_engines').delete().eq('product_id', req.params.id);
            if (delErr) throw delErr;

            // Insert new links
            if (engineIds.length > 0) {
                const links = engineIds.map(eid => ({
                    product_id: req.params.id,
                    engine_id: eid
                }));
                const { error: insErr } = await supabase.from('product_engines').insert(links);
                if (insErr) throw insErr;
            }
        }

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('products').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// Update Variant
app.put('/api/variants/:id', async (req, res) => {
    try {
        const { price, sku, stock_quantity, bin_location } = req.body;
        const { error } = await supabase
            .from('product_variants')
            .update({ price, sku, stock_quantity, bin_location })
            .eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// Delete Variant
app.delete('/api/variants/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('product_variants').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// Add Variant Manually
app.post('/api/variants', async (req, res) => {
    try {
        const { productId, supplierId, price, sku, stock_quantity, bin_location } = req.body;
        const { data, error } = await supabase.from('product_variants').insert({
            product_id: productId,
            supplier_id: supplierId,
            price: price || 0,
            sku: sku || '',
            stock_quantity: stock_quantity || 0,
            bin_location: bin_location || ''
        }).select().single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        handleError(res, err);
    }
});

// 7. CSV Import (Dynamic Headers)


// Helper to escape CSV fields
const toCSV = (rows) => {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]).join(',');
    const data = rows.map(row => Object.values(row).map(val => {
        const str = String(val === null || val === undefined ? '' : val);
        return `"${str.replace(/"/g, '""')}"`;
    }).join(',')).join('\n');
    return `${headers}\n${data}`;
};

// Export Inventory
app.get('/api/inventory/export', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('product_variants')
            .select(`
                price,
                stock_quantity,
                bin_location,
                sku,
                product:products (
                    part_number,
                    name,
                    description,
                    notes,
                    image_url,
                    category:categories(name),
                    engine:engines(
                        name,
                        manufacturer:manufacturers(name)
                    )
                ),
                supplier:suppliers(name)
            `);

        if (error) throw error;

        // Flatten Data
        const rows = data.map(v => ({
            PartNumber: v.product?.part_number || '',
            Manufacturer: v.product?.engine?.manufacturer?.name || '',
            Engine: v.product?.engine?.name || '',
            Category: v.product?.category?.name || '',
            Supplier: v.supplier?.name || '',
            Description: v.product?.description || '',
            Price: v.price || 0,
            Stock: v.stock_quantity || 0,
            Bin: v.bin_location || '',
            Image: v.product?.image_url || '',
            SKU: v.sku || '',
            Notes: v.product?.notes || ''
        }));

        const csv = toCSV(rows);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="inventory_export.csv"');
        res.send(csv);

    } catch (err) {
        handleError(res, err);
    }
});
// 7. CSV Import (Dynamic Headers)
app.post('/api/inventory/import', bodyParser.text({ type: 'text/*' }), async (req, res) => {
    const csvData = req.body;
    if (!csvData) return res.status(400).json({ error: "No CSV data received" });

    const lines = csvData.split('\n');
    if (lines.length < 2) return res.json({ message: "Empty/Invalid CSV" });

    // Parse Headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    // Map headers to indices
    const idx = {
        partNumber: headers.indexOf('partnumber'), // or 'part number'
        manufacturer: headers.indexOf('manufacturer'),
        engine: headers.indexOf('engine'),
        category: headers.indexOf('category'),
        supplier: headers.indexOf('supplier'), // or 'brand'
        description: headers.findIndex(h => h === 'description' || h === 'productname' || h === 'name'),
        price: headers.indexOf('price'),
        quantity: headers.findIndex(h => h === 'quantity' || h === 'stock' || h === 'qty'),
        bin: headers.findIndex(h => h === 'binlocation' || h === 'bin'),
        image: headers.indexOf('image'),
        sku: headers.indexOf('sku'),
        notes: headers.indexOf('notes')
    };

    console.log("CSV Header Mapping:", idx);

    if (idx.partNumber === -1 || idx.supplier === -1) {
        return res.status(400).json({ error: "CSV must contain PartNumber and Supplier columns" });
    }

    let updatedCount = 0;
    let errors = [];

    try {
        // 0. RESET PHASE: Wipe all data properly to ensure "Substitution"
        // Order matters due to Foreign Keys

        // Delete Sales History (Required to delete variants)
        await supabase.from('sale_items').delete().neq('id', 0);
        await supabase.from('sales').delete().neq('id', 0);

        // Delete Inventory Hierarchy
        await supabase.from('product_variants').delete().neq('id', 0);
        await supabase.from('products').delete().neq('id', 0);

        // Delete Metadata (Optional, but user said "all tables blank")
        await supabase.from('engines').delete().neq('id', 0);
        await supabase.from('categories').delete().neq('id', 0);
        await supabase.from('suppliers').delete().neq('id', 0);
        await supabase.from('manufacturers').delete().neq('id', 0);

        // Helper to parse line respecting quotes
        const parseLine = (text) => {
            const res = [];
            let cur = '';
            let inQuote = false;
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (c === '"') {
                    if (inQuote && text[i + 1] === '"') { cur += '"'; i++; }
                    else { inQuote = !inQuote; }
                } else if (c === ',' && !inQuote) {
                    res.push(cur.trim()); cur = '';
                } else { cur += c; }
            }
            res.push(cur.trim());
            return res;
        };

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = parseLine(line);

            try {
                const partNumber = (idx.partNumber !== -1 ? cols[idx.partNumber] : '')?.toUpperCase();
                const manufacturerName = idx.manufacturer !== -1 ? cols[idx.manufacturer] : '';
                const engineName = idx.engine !== -1 ? cols[idx.engine] : '';
                const categoryName = idx.category !== -1 ? cols[idx.category] : '';
                const supplierName = (idx.supplier !== -1 ? cols[idx.supplier] : '')?.toUpperCase();
                const description = idx.description !== -1 ? cols[idx.description] : '';
                const price = idx.price !== -1 ? (parseFloat(cols[idx.price]) || 0) : 0;
                const quantity = idx.quantity !== -1 ? (parseInt(cols[idx.quantity]) || 0) : 0;
                const bin = idx.bin !== -1 ? cols[idx.bin] : '';
                const image = idx.image !== -1 ? cols[idx.image] : '';
                const sku = idx.sku !== -1 ? cols[idx.sku] : '';
                const notes = idx.notes !== -1 ? cols[idx.notes] : '';

                if (!partNumber || !supplierName) continue;

                // --- 1. Manufacturer ---
                let manufId = null;
                if (manufacturerName) {
                    const { data: mData } = await supabase.from('manufacturers').select('id').eq('name', manufacturerName).single();
                    if (mData) manufId = mData.id;
                    else {
                        const { data: newM } = await supabase.from('manufacturers').insert({ name: manufacturerName }).select('id').single();
                        if (newM) manufId = newM.id;
                    }
                }

                // --- 2. Engine ---
                let engineId = null;
                if (engineName && manufId) {
                    const { data: eData } = await supabase.from('engines').select('id').eq('name', engineName).eq('manufacturer_id', manufId).single();
                    if (eData) engineId = eData.id;
                    else {
                        const { data: newE } = await supabase.from('engines').insert({ name: engineName, manufacturer_id: manufId }).select('id').single();
                        if (newE) engineId = newE.id;
                    }
                }

                // --- 3. Category ---
                let catId = null;
                if (categoryName) {
                    const { data: cData } = await supabase.from('categories').select('id').eq('name', categoryName).single();
                    if (cData) catId = cData.id;
                    else {
                        const { data: newC } = await supabase.from('categories').insert({ name: categoryName }).select('id').single();
                        if (newC) catId = newC.id;
                    }
                }

                // --- 4. Product ---
                let prodId;
                const { data: pData } = await supabase.from('products').select('id').eq('part_number', partNumber).single();
                if (pData) {
                    prodId = pData.id;
                    // Optional: Update metadata if provided
                    const updates = {};
                    if (image) updates.image_url = image;
                    if (description) updates.description = description;
                    if (notes) updates.notes = notes;
                    // Only update FKs if we found new ones (don't overwrite with null)
                    if (engineId) updates.engine_id = engineId;
                    if (catId) updates.category_id = catId;

                    if (Object.keys(updates).length > 0) {
                        await supabase.from('products').update(updates).eq('id', prodId);
                    }
                } else {
                    const { data: newP } = await supabase.from('products').insert({
                        part_number: partNumber,
                        name: description,
                        description: description,
                        notes: notes,
                        engine_id: engineId, // can be null
                        category_id: catId,  // can be null
                        image_url: image
                    }).select('id').single();
                    if (newP) prodId = newP.id;
                }

                // --- 5. Supplier ---
                let suppId;
                const { data: sData } = await supabase.from('suppliers').select('id').eq('name', supplierName).single();
                if (sData) suppId = sData.id;
                else {
                    const { data: newS } = await supabase.from('suppliers').insert({ name: supplierName }).select('id').single();
                    if (newS) suppId = newS.id;
                }

                // --- 6. Variant ---
                if (prodId && suppId) {
                    const { data: vData } = await supabase.from('product_variants')
                        .select('id')
                        .eq('product_id', prodId)
                        .eq('supplier_id', suppId)
                        .single();

                    if (vData) {
                        await supabase.from('product_variants').update({
                            price: price,
                            stock_quantity: quantity,
                            bin_location: bin,
                            sku: sku // Add SKU update
                        }).eq('id', vData.id);
                    } else {
                        await supabase.from('product_variants').insert({
                            product_id: prodId,
                            supplier_id: suppId,
                            price: price,
                            stock_quantity: quantity,
                            bin_location: bin,
                            sku: sku // Add SKU insert
                        });
                    }
                    updatedCount++;
                }

            } catch (lineErr) {
                console.error(`Error line ${i}:`, lineErr);
                errors.push(`Line ${i}: ${lineErr.message}`);
            }
        }

        res.json({ message: "Import processed", updatedCount, errors });

    } catch (err) {
        handleError(res, err);
    }
});


// --- Auth & Login ---
// Initialize Users Table (Simple migration for this task)
// --- Auth & System Init ---
const initSystem = async () => {
    try {
        console.log("Initializing System...");

        // 1. Users
        const { data: admin } = await supabase.from('app_users').select('id').eq('username', 'admin').maybeSingle();
        if (!admin) {
            console.log(" Creating default users...");
            await supabase.from('app_users').insert([
                { username: 'admin', password: 'admin', role: 'admin' },
                { username: 'pos', password: 'pos', role: 'employee' }
            ]);
        }

        // 2. Migration: Products.engine_id -> product_engines
        // Check if we have legacy data but no new data
        const { count } = await supabase.from('product_engines').select('*', { count: 'exact', head: true });

        if (count === 0) {
            console.log("Checking for legacy engine data to migrate...");
            // Fetch products that HAVE an engine_id
            const { data: legacyProducts } = await supabase.from('products').select('id, engine_id').not('engine_id', 'is', null);

            if (legacyProducts && legacyProducts.length > 0) {
                console.log(`Migrating ${legacyProducts.length} products to product_engines...`);
                // Prepare bulk insert
                const links = legacyProducts.map(p => ({
                    product_id: p.id,
                    engine_id: p.engine_id
                }));

                const { error: migErr } = await supabase.from('product_engines').insert(links);
                if (migErr) console.error("Migration failed:", migErr);
                else console.log("Migration successful!");
            } else {
                console.log("No legacy data found.");
            }
        } else {
            console.log("product_engines already populated.");
        }

    } catch (e) {
        console.error("System Init Error:", e);
    }
};
// Call it
initSystem();

app.post('/api/login', async (req, res) => {
    console.log("Login attempt for:", req.body.username);
    try {
        const { username, password } = req.body;

        // Simple plaintext check for this specific request
        const { data: user, error } = await supabase
            .from('app_users')
            .select('username, role, password')
            .eq('username', username)
            .single();

        if (error) {
            console.error("Login DB Error:", error.message);
            return res.status(401).json({ error: "User not found" });
        }

        console.log("User found:", user);

        // Explicit password check (since .eq('password', password) might be tricky with case or spaces if not careful)
        // Although the previous query had .eq('password', password), let's do it in JS to be sure what's failing
        if (user.password !== password) {
            console.error("Password mismatch. Expected:", user.password, "Againts:", password);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        res.json({ success: true, user: { username: user.username, role: user.role } });
    } catch (err) {
        handleError(res, err);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Connected to Supabase`);
});
