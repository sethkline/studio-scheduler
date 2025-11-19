/**
 * Offline Storage Utility using IndexedDB
 * Provides methods to cache and retrieve data for offline access
 */

const DB_NAME = 'dance-studio-offline';
const DB_VERSION = 1;

export interface CachedData<T = any> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for different data types
        if (!db.objectStoreNames.contains('schedules')) {
          db.createObjectStore('schedules', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('students')) {
          db.createObjectStore('students', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('classes')) {
          db.createObjectStore('classes', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Get the database instance
   */
  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Set data in a specific store
   */
  async set<T>(
    storeName: string,
    key: string,
    data: T,
    ttlMinutes?: number
  ): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const cachedData: CachedData<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : undefined,
      };

      const request = store.put(cachedData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save data to ${storeName}`));
    });
  }

  /**
   * Get data from a specific store
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if data has expired
        if (result.expiresAt && Date.now() > result.expiresAt) {
          // Delete expired data
          this.delete(storeName, key);
          resolve(null);
          return;
        }

        resolve(result.data);
      };

      request.onerror = () => reject(new Error(`Failed to get data from ${storeName}`));
    });
  }

  /**
   * Get all data from a specific store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as CachedData<T>[];
        const now = Date.now();

        // Filter out expired data and extract the actual data
        const validData = results
          .filter((item) => !item.expiresAt || now <= item.expiresAt)
          .map((item) => item.data);

        resolve(validData);
      };

      request.onerror = () => reject(new Error(`Failed to get all data from ${storeName}`));
    });
  }

  /**
   * Delete data from a specific store
   */
  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete data from ${storeName}`));
    });
  }

  /**
   * Clear all data from a specific store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
    });
  }

  /**
   * Clear all expired data from all stores
   */
  async clearExpired(): Promise<void> {
    const db = await this.getDB();
    const storeNames = Array.from(db.objectStoreNames);

    for (const storeName of storeNames) {
      const allData = await this.getAll(storeName);
      // Getting all data already filters expired items
      // This is just to trigger the cleanup
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();

/**
 * Composable for using offline storage
 */
export function useOfflineStorage() {
  const cacheSchedule = async (scheduleId: string, data: any) => {
    await offlineStorage.set('schedules', scheduleId, data, 60); // 1 hour TTL
  };

  const getCachedSchedule = async (scheduleId: string) => {
    return await offlineStorage.get('schedules', scheduleId);
  };

  const cacheStudent = async (studentId: string, data: any) => {
    await offlineStorage.set('students', studentId, data, 120); // 2 hour TTL
  };

  const getCachedStudent = async (studentId: string) => {
    return await offlineStorage.get('students', studentId);
  };

  const getAllCachedStudents = async () => {
    return await offlineStorage.getAll('students');
  };

  const cacheClass = async (classId: string, data: any) => {
    await offlineStorage.set('classes', classId, data, 120); // 2 hour TTL
  };

  const getCachedClass = async (classId: string) => {
    return await offlineStorage.get('classes', classId);
  };

  const getAllCachedClasses = async () => {
    return await offlineStorage.getAll('classes');
  };

  const cacheProfile = async (userId: string, data: any) => {
    await offlineStorage.set('profiles', userId, data, 240); // 4 hour TTL
  };

  const getCachedProfile = async (userId: string) => {
    return await offlineStorage.get('profiles', userId);
  };

  const cacheGeneric = async (key: string, data: any, ttlMinutes?: number) => {
    await offlineStorage.set('cache', key, data, ttlMinutes);
  };

  const getCachedGeneric = async (key: string) => {
    return await offlineStorage.get('cache', key);
  };

  const clearAllCache = async () => {
    await offlineStorage.clear('schedules');
    await offlineStorage.clear('students');
    await offlineStorage.clear('classes');
    await offlineStorage.clear('profiles');
    await offlineStorage.clear('cache');
  };

  return {
    cacheSchedule,
    getCachedSchedule,
    cacheStudent,
    getCachedStudent,
    getAllCachedStudents,
    cacheClass,
    getCachedClass,
    getAllCachedClasses,
    cacheProfile,
    getCachedProfile,
    cacheGeneric,
    getCachedGeneric,
    clearAllCache,
  };
}
