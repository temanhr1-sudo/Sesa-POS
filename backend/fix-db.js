const db = require('./config/db');

const fixDatabase = async () => {
  try {
    console.log('Membuka gembok database...');
    
    // Memperpanjang kapasitas kolom sku dan barcode menjadi 100 karakter
    await db.query('ALTER TABLE products ALTER COLUMN sku TYPE VARCHAR(100);');
    await db.query('ALTER TABLE products ALTER COLUMN barcode TYPE VARCHAR(100);');
    
    console.log('✅ BERHASIL! Kapasitas karakter SKU dan Barcode sudah diperbesar.');
    process.exit(0);
  } catch (error) {
    console.error('❌ GAGAL:', error.message);
    process.exit(1);
  }
};

fixDatabase();