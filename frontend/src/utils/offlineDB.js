import localforage from 'localforage';

// 1. Konfigurasi Nama Database Lokal
localforage.config({
  name: 'SesaPOS_DB',
  storeName: 'offline_store' // Nama laci penyimpanannya
});

// ==========================================
// FUNGSI UNTUK MASTER DATA (PRODUK & PASIEN)
// ==========================================
export const saveMasterData = async (key, data) => {
  try {
    await localforage.setItem(key, data);
  } catch (error) {
    console.error(`Gagal menyimpan data ${key} ke lokal:`, error);
  }
};

export const getMasterData = async (key) => {
  try {
    return await localforage.getItem(key);
  } catch (error) {
    console.error(`Gagal mengambil data ${key} dari lokal:`, error);
    return null;
  }
};

// ==========================================
// FUNGSI UNTUK ANTREAN TRANSAKSI KASIR
// ==========================================
export const addTransactionToQueue = async (transaction) => {
  try {
    // Ambil antrean yang sudah ada, atau buat array kosong jika belum ada
    const queue = await localforage.getItem('tx_queue') || [];
    
    // Tambahkan penanda waktu (timestamp lokal) dan ID unik sementara
    const newTx = {
      ...transaction,
      offline_id: `OFF-${Date.now()}`,
      created_at_local: new Date().toISOString()
    };
    
    queue.push(newTx);
    await localforage.setItem('tx_queue', queue);
    return newTx;
  } catch (error) {
    console.error('Gagal memasukkan transaksi ke antrean:', error);
    throw error;
  }
};

export const getQueuedTransactions = async () => {
  try {
    return await localforage.getItem('tx_queue') || [];
  } catch (error) {
    return [];
  }
};

export const clearTransactionQueue = async () => {
  try {
    await localforage.removeItem('tx_queue');
  } catch (error) {
    console.error('Gagal membersihkan antrean:', error);
  }
};