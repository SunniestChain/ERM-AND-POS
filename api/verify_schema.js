const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./server/erm.db');

db.all("PRAGMA table_info(product_variants)", (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("Columns in product_variants:");
    rows.forEach(r => console.log(`- ${r.name} (${r.type})`));
});
