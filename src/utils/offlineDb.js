// =====================================================================
// 📦 SYNCHRONISATION HORS-LIGNE & PERSISTANCE DES DONNÉES INDEXEDDB
// =====================================================================
// Fournit une couche de résilience pour le stockage du panier, la mise
// en cache du catalogue, et la file d'attente des requêtes de checkout.
// =====================================================================

const DB_NAME = 'BoutiqueLocaleOffline';
const DB_VERSION = 1;

export const initOfflineDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => {
      console.error("IndexedDB error:", e);
      reject(e);
    };

    request.onsuccess = (e) => {
      resolve(e.target.result);
    };

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Stockage local du catalogue consulté
      if (!db.objectStoreNames.contains('produits')) {
        db.createObjectStore('produits', { keyPath: 'id' });
      }
      
      // Sauvegarde résiliente du panier courant
      if (!db.objectStoreNames.contains('panier')) {
        db.createObjectStore('panier', { keyPath: 'idUnique' });
      }
      
      // File d'attente Background Sync pour soumissions hors-ligne
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    };
  });
};

// --- MÉTHODES D'ACCÈS GÉNÉRIQUES (CRUD INDEXEDDB) ---

export const setItemOffline = async (storeName, item) => {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error(`Erreur d'écriture dans IndexedDB [${storeName}]:`, err);
  }
};

export const getAllItemsOffline = async (storeName) => {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error(`Erreur de lecture dans IndexedDB [${storeName}]:`, err);
    return [];
  }
};

export const deleteItemOffline = async (storeName, key) => {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error(`Erreur de suppression dans IndexedDB [${storeName}]:`, err);
  }
};

export const clearStoreOffline = async (storeName) => {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.error(`Erreur de vidage dans IndexedDB [${storeName}]:`, err);
  }
};

export const queueRequestForSync = async (payload) => {
  const syncId = 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  await setItemOffline('syncQueue', {
    id: syncId,
    ...payload,
    queued_at: new Date().toISOString()
  });
  console.log("📨 Commande mise en attente (Hors-ligne). Elle sera synchronisée dès le retour du réseau.");
};
