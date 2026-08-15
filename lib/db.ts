import type { FileMapping } from '../types';

const DB_NAME = 'educationalMapDB';
const STORE_NAME = 'files';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        // If a connection is already open, resolve with it.
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            db.onclose = () => {
                // When the connection is closed, nullify the global db instance.
                // This ensures the next call to getDB will open a new connection.
                db = null;
            };
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject("خطأ في فتح قاعدة البيانات IndexedDB.");
        };

        request.onblocked = (event) => {
            // This event fires if an older version of the DB is still open,
            // typically in another tab, preventing the new connection from opening.
            console.warn("IndexedDB connection blocked. Please close other tabs with this app open.");
            reject("فشل الاتصال بقاعدة البيانات لأنها مفتوحة في علامة تبويب أخرى. الرجاء إغلاق علامات التبويب الأخرى وإعادة المحاولة.");
        };
    });
}

export async function getAllFiles(): Promise<FileMapping[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            console.error("IndexedDB getAll error:", request.error);
            reject(request.error);
        };
    });
}

/**
 * Helper function that returns a promise which resolves or rejects when a transaction is complete.
 * This is the most reliable way to wait for an IndexedDB operation to be fully committed.
 * @param transaction The IDBTransaction to wait for.
 */
function transactionPromise(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}


/**
 * Puts (creates or updates) a file mapping in the database.
 * This version creates a transaction, issues a put request, and then awaits a promise
 * that only resolves when the transaction is fully complete, ensuring data is saved.
 * @param file The FileMapping object to save.
 */
export async function putFile(file: FileMapping): Promise<void> {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(file);
    return transactionPromise(transaction);
}


/**
 * Deletes a file mapping from the database by its ID.
 * This robust version creates a transaction, issues a delete request, and then awaits a promise
 * that only resolves when the transaction is fully complete. This guarantees the deletion
 * is committed before the function returns.
 * @param fileId The ID of the file to delete.
 */
export async function deleteFile(fileId: string): Promise<void> {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(fileId);
    return transactionPromise(transaction);
}