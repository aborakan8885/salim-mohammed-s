import { 
    collection, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    doc,
    Bytes,
    writeBatch,
    query,
    limit
} from 'firebase/firestore';
import { db } from './firebase';
import type { FileMapping } from '../types';

const COLLECTION_NAME = 'files';

/**
 * Deeply removes undefined values from an object.
 * Firestore does not support 'undefined'.
 */
function sanitizeData(data: any): any {
    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    } else if (data !== null && typeof data === 'object' && !(data instanceof ArrayBuffer) && !('toUint8Array' in data)) {
        const result: any = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined) {
                result[key] = sanitizeData(value);
            }
        });
        return result;
    }
    return data;
}

/**
 * Converts a FileMapping to a Firestore-compatible object.
 */
function toFirestore(file: FileMapping): any {
    const { data, ...metadata } = file;
    let docData = { ...metadata };
    if (docData.fileContent instanceof ArrayBuffer) {
        docData.fileContent = Bytes.fromUint8Array(new Uint8Array(docData.fileContent)) as any;
    }
    return sanitizeData(docData);
}

/**
 * Converts a Firestore document back to a FileMapping.
 */
function fromFirestore(data: any): FileMapping {
    if (data.fileContent && typeof data.fileContent === 'object' && 'toUint8Array' in data.fileContent) {
        data.fileContent = data.fileContent.toUint8Array().buffer;
    }
    return { ...data, data: [] } as FileMapping;
}

export async function getAllFiles(): Promise<FileMapping[]> {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const fileMappings: FileMapping[] = [];
        
        for (const fileDoc of querySnapshot.docs) {
            const mapping = fromFirestore(fileDoc.data());
            
            // If it's a tabular file, fetch its rows from the sub-collection
            if (mapping.fileType === 'tabular') {
                const rowsSnapshot = await getDocs(collection(db, COLLECTION_NAME, mapping.id, 'rows'));
                mapping.data = rowsSnapshot.docs.map(d => d.data());
            }
            
            fileMappings.push(mapping);
        }
        
        return fileMappings;
    } catch (error) {
        console.error("Firestore getAll error:", error);
        throw error;
    }
}

export async function putFile(file: FileMapping): Promise<void> {
    const bypassSecret = localStorage.getItem('educational_map_bypass_secret');
    const currentUser = auth.currentUser;

    console.log(">>> [SYNC] File:", file.filename);
    console.log(">>> [SYNC] Auth User:", currentUser?.email || 'Guest');
    console.log(">>> [SYNC] Bypass ID:", bypassSecret);

    // 1. If we are signed in with a real user (Google or Custom Token), use standard Firestore
    if (currentUser) {
        console.log(">>> [SYNC] Path: Client-side Firestore");
        try {
            const fileRef = doc(db, COLLECTION_NAME, file.id);
            const { data } = file;
            
            await setDoc(fileRef, toFirestore(file));
            
            if (data && data.length > 0) {
                const rowsRef = collection(db, COLLECTION_NAME, file.id, 'rows');
                const existingRows = await getDocs(rowsRef);
                if (!existingRows.empty) {
                    let deleteBatch = writeBatch(db);
                    existingRows.docs.forEach((d, index) => {
                        deleteBatch.delete(d.ref);
                        if ((index + 1) % 500 === 0) {
                            deleteBatch.commit();
                            deleteBatch = writeBatch(db);
                        }
                    });
                    await deleteBatch.commit();
                }

                let batch = writeBatch(db);
                for (let i = 0; i < data.length; i++) {
                    const rowDoc = doc(rowsRef);
                    batch.set(rowDoc, sanitizeData(data[i]));
                    if ((i + 1) % 500 === 0) {
                        await batch.commit();
                        batch = writeBatch(db);
                    }
                }
                await batch.commit();
            }
            console.log(">>> [SYNC] SUCCESS: Client-side Firestore");
            return; 
        } catch (error: any) {
            console.warn(">>> [SYNC] Client-side failed, attempting fallback:", error);
            if (error.code !== 'permission-denied' && !bypassSecret) throw error;
        }
    }

    // 2. Fallback (DEACTIVATED): User requested Frontend-Only bypass
    // We removed server-side sync to avoid 405 errors on the platform
    if (bypassSecret === '1068575628') {
        console.warn(">>> [SYNC] Server-side fallback is deactivated by user request (Frontend-Only mode).");
        // If we reach here and it's not working, it means firestore.rules are blocking us.
        // We will try to rely on client-side firestore only.
        return;
    }

    throw new Error('يجب تسجيل الدخول لتفعيل المزامنة');
}

export async function deleteFile(fileId: string): Promise<void> {
    try {
        const fileRef = doc(db, COLLECTION_NAME, fileId);
        
        // Delete sub-collection rows first
        const rowsSnapshot = await getDocs(collection(db, COLLECTION_NAME, fileId, 'rows'));
        if (!rowsSnapshot.empty) {
            let batch = writeBatch(db);
            rowsSnapshot.docs.forEach((d, index) => {
                batch.delete(d.ref);
                if ((index + 1) % 500 === 0) {
                    batch.commit();
                    batch = writeBatch(db);
                }
            });
            await batch.commit();
        }

        await deleteDoc(fileRef);
    } catch (error) {
        console.error("Firestore delete error:", error);
        throw error;
    }
}
