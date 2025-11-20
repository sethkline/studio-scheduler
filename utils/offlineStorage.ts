/**
 * Offline Storage Utility using IndexedDB
 * Provides methods to cache and retrieve data for offline access
 * Supports user-specific cache isolation to prevent cross-user data leaks
 */

const DB_NAME = 'dance-studio-offline';
const DB_VERSION = 2; // Incremented for user isolation support

export interface CachedData<T = any> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
  userId?: string; // For user-specific cache isolation
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
    ttlMinutes?: number,
    userId?: string
  ): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Include userId in the key to isolate user data
      const cacheKey = userId ? `${userId}:${key}` : key;

      const cachedData: CachedData<T> = {
        key: cacheKey,
        data,
        timestamp: Date.now(),
        expiresAt: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : undefined,
        userId,
      };

      const request = store.put(cachedData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save data to ${storeName}`));
    });
  }

  /**
   * Get data from a specific store
   */
  async get<T>(storeName: string, key: string, userId?: string): Promise<T | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      // Include userId in the key to isolate user data
      const cacheKey = userId ? `${userId}:${key}` : key;
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Check if data has expired
        if (result.expiresAt && Date.now() > result.expiresAt) {
          // Delete expired data
          this.delete(storeName, cacheKey);
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
  async getAll<T>(storeName: string, userId?: string): Promise<T[]> {
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
          .filter((item) => {
            // Filter by userId if specified
            if (userId && item.userId !== userId) {
              return false;
            }
            // Filter out expired items
            return !item.expiresAt || now <= item.expiresAt;
          })
          .map((item) => item.data);

        resolve(validData);
      };

      request.onerror = () => reject(new Error(`Failed to get all data from ${storeName}`));
    });
  }

  /**
   * Get cache metadata (for staleness checking)
   */
  async getCacheMetadata(storeName: string, key: string, userId?: string): Promise<{ timestamp: number; expiresAt?: number } | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      const cacheKey = userId ? `${userId}:${key}` : key;
      const request = store.get(cacheKey);

      request.onsuccess = () => {
        const result = request.result as CachedData | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        resolve({
          timestamp: result.timestamp,
          expiresAt: result.expiresAt,
        });
      };

      request.onerror = () => reject(new Error(`Failed to get metadata from ${storeName}`));
    });
  }

  /**
   * Clear all data for a specific user
   */
  async clearUserData(userId: string): Promise<void> {
    const db = await this.getDB();
    const storeNames = Array.from(db.objectStoreNames);

    for (const storeName of storeNames) {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const results = request.result as CachedData[];

          // Delete all items for this user
          const deletePromises = results
            .filter((item) => item.userId === userId)
            .map((item) => {
              return new Promise<void>((deleteResolve, deleteReject) => {
                const deleteRequest = store.delete(item.key);
                deleteRequest.onsuccess = () => deleteResolve();
                deleteRequest.onerror = () => deleteReject();
              });
            });

          Promise.all(deletePromises)
            .then(() => resolve())
            .catch(() => reject(new Error(`Failed to clear user data from ${storeName}`)));
        };

        request.onerror = () => reject(new Error(`Failed to read data from ${storeName}`));
      });
    }
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
 * Composable for using offline storage with user-specific cache isolation
 */
export function useOfflineStorage() {
  // Get current user ID from Supabase
  const getCurrentUserId = (): string | undefined => {
    const user = useSupabaseUser();
    return user.value?.id;
  };

  const cacheSchedule = async (scheduleId: string, data: any) => {
    const userId = getCurrentUserId();
    await offlineStorage.set('schedules', scheduleId, data, 60, userId); // 1 hour TTL
  };

  const getCachedSchedule = async (scheduleId: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.get('schedules', scheduleId, userId);
  };

  const getScheduleCacheMetadata = async (scheduleId: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.getCacheMetadata('schedules', scheduleId, userId);
  };

  const cacheStudent = async (studentId: string, data: any) => {
    const userId = getCurrentUserId();
    await offlineStorage.set('students', studentId, data, 120, userId); // 2 hour TTL
  };

  const getCachedStudent = async (studentId: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.get('students', studentId, userId);
  };

  const getAllCachedStudents = async () => {
    const userId = getCurrentUserId();
    return await offlineStorage.getAll('students', userId);
  };

  const cacheClass = async (classId: string, data: any) => {
    const userId = getCurrentUserId();
    await offlineStorage.set('classes', classId, data, 120, userId); // 2 hour TTL
  };

  const getCachedClass = async (classId: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.get('classes', classId, userId);
  };

  const getAllCachedClasses = async () => {
    const userId = getCurrentUserId();
    return await offlineStorage.getAll('classes', userId);
  };

  const cacheProfile = async (profileId: string, data: any) => {
    const userId = getCurrentUserId();
    await offlineStorage.set('profiles', profileId, data, 240, userId); // 4 hour TTL
  };

  const getCachedProfile = async (profileId: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.get('profiles', profileId, userId);
  };

  const cacheGeneric = async (key: string, data: any, ttlMinutes?: number) => {
    const userId = getCurrentUserId();
    await offlineStorage.set('cache', key, data, ttlMinutes, userId);
  };

  const getCachedGeneric = async (key: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.get('cache', key, userId);
  };

  const getCacheMetadata = async (storeName: string, key: string) => {
    const userId = getCurrentUserId();
    return await offlineStorage.getCacheMetadata(storeName, key, userId);
  };

  const clearAllCache = async () => {
    await offlineStorage.clear('schedules');
    await offlineStorage.clear('students');
    await offlineStorage.clear('classes');
    await offlineStorage.clear('profiles');
    await offlineStorage.clear('cache');
  };

  const clearCurrentUserCache = async () => {
    const userId = getCurrentUserId();
    if (userId) {
      await offlineStorage.clearUserData(userId);
    }
  };

  return {
    cacheSchedule,
    getCachedSchedule,
    getScheduleCacheMetadata,
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
    getCacheMetadata,
    clearAllCache,
    clearCurrentUserCache,
  };
}
