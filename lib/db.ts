import { 
    collection, 
    getDocs, 
    setDoc, 
    deleteDoc, 
    doc,
    Bytes
} from 'firebase/firestore';
import { db } from './firebase';
import type { FileMapping } from '../types';

const COLLECTION_NAME = 'files';

/**
 * Converts a FileMapping to a Firestore-compatible object.
 * Handles ArrayBuffer conversion to Firestore Bytes.
 */
function toFirestore(file: FileMapping): any {
    const data = { ...file };
    if (data.fileContent instanceof ArrayBuffer) {
        data.fileContent = Bytes.fromUint8Array(new Uint8Array(data.fileContent)) as any;
    }
    return data;
}

/**
 * Converts a Firestore document back to a FileMapping.
 * Handles Bytes conversion back to ArrayBuffer if necessary.
 */
function fromFirestore(data: any): FileMapping {
    if (data.fileContent && typeof data.fileContent === 'object' && 'toUint8Array' in data.fileContent) {
        data.fileContent = data.fileContent.toUint8Array().buffer;
    }
    return data as FileMapping;
}

export async function getAllFiles(): Promise<FileMapping[]> {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs.map(doc => fromFirestore(doc.data()));
    } catch (error) {
        console.error("Firestore getAll error:", error);
        throw error;
    }
}

export async function putFile(file: FileMapping): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, file.id);
        await setDoc(docRef, toFirestore(file));
    } catch (error) {
        console.error("Firestore put error:", error);
        throw error;
    }
}

export async function deleteFile(fileId: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, fileId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Firestore delete error:", error);
        throw error;
    }
}
