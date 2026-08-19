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
 * Converts a FileMapping to a Firestore-compatible object.
 * We remove the 'data' array to store it separately in a sub-collection.
 */
function toFirestore(file: FileMapping): any {
    const { data, ...metadata } = file;
    const docData = { ...metadata };
    if (docData.fileContent instanceof ArrayBuffer) {
        docData.fileContent = Bytes.fromUint8Array(new Uint8Array(docData.fileContent)) as any;
    }
    return docData;
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
    try {
        const fileRef = doc(db, COLLECTION_NAME, file.id);
        const { data } = file;
        
        // 1. Save metadata
        await setDoc(fileRef, toFirestore(file));
        
        // 2. If tabular data exists, save rows in sub-collection using batches for efficiency
        if (data && data.length > 0) {
            const rowsRef = collection(db, COLLECTION_NAME, file.id, 'rows');
            
            // Delete existing rows first to avoid orphans on update
            const existingRows = await getDocs(rowsRef);
            if (!existingRows.empty) {
                let deleteBatch = writeBatch(db);
                existingRows.docs.forEach((d, index) => {
                    deleteBatch.delete(d.ref);
                    if ((index + 1) % 500 === 0) { // Firestore batch limit is 500
                        deleteBatch.commit();
                        deleteBatch = writeBatch(db);
                    }
                });
                await deleteBatch.commit();
            }

            // Upload new rows in batches
            let batch = writeBatch(db);
            for (let i = 0; i < data.length; i++) {
                const rowDoc = doc(rowsRef); // Auto-generated ID
                batch.set(rowDoc, data[i]);
                
                if ((i + 1) % 500 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
            await batch.commit();
        }
    } catch (error) {
        console.error("Firestore put error:", error);
        throw error;
    }
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
