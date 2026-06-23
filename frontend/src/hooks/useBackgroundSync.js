import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getQueuedTransactions } from '../utils/offlineDB';
import localforage from 'localforage';

export function useBackgroundSync() {
  const { token } = useAuthStore();
  const isSyncing = useRef(false);

  useEffect(() => {
    const syncTransactions = async () => {
      // Jangan jalan jika sedang offline, tidak ada token, atau sedang proses sinkronisasi
      if (!navigator.onLine || isSyncing.current || !token) return;
      
      try {
        isSyncing.current = true;
        const queue = await getQueuedTransactions();
        
        if (queue.length === 0) {
          isSyncing.current = false;
          return; // Tidak ada yang perlu disinkronkan
        }

        console.log(`[SYNC] Menemukan ${queue.length} transaksi offline. Memulai pengiriman...`);
        
        // Siapkan array untuk menampung transaksi yang gagal terkirim (misal server error)
        const failedQueue = [];

        for (const tx of queue) {
          try {
            // Gandakan data dan hapus jejak lokal sebelum dikirim ke server Vercel
            const payload = { ...tx };
            delete payload.offline_id;
            delete payload.created_at_local;

            await axios.post(`${import.meta.env.VITE_API_URL}/transactions`, payload, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log(`[SYNC] Transaksi ${tx.offline_id} berhasil masuk ke server!`);
          } catch (error) {
            console.error(`[SYNC] Gagal mengirim transaksi ${tx.offline_id}:`, error);
            // Jika gagal, kembalikan ke antrean agar dicoba lagi nanti
            failedQueue.push(tx);
          }
        }

        // Perbarui isi brankas lokal (Hanya sisakan yang gagal terkirim)
        await localforage.setItem('tx_queue', failedQueue);
        
        if (failedQueue.length === 0) {
          console.log('[SYNC] Semua transaksi offline berhasil dibereskan!');
        }

      } catch (error) {
        console.error('[SYNC] Terjadi kesalahan sistem:', error);
      } finally {
        isSyncing.current = false;
      }
    };

    // 1. Coba jalankan sinkronisasi saat aplikasi pertama kali dimuat
    syncTransactions();

    // 2. Pasang telinga! Jalankan otomatis setiap kali internet kembali menyala
    window.addEventListener('online', syncTransactions);
    
    // 3. (Opsional) Coba sapu bersih setiap 1 menit untuk jaga-jaga
    const intervalId = setInterval(syncTransactions, 60000);

    return () => {
      window.removeEventListener('online', syncTransactions);
      clearInterval(intervalId);
    };
  }, [token]);
}