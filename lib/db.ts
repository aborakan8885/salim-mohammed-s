import type { FileMapping } from '../types';

/**
 * Local DB Implementation using Server API
 */

export async function getAllFiles(): Promise<FileMapping[]> {
    try {
        const response = await fetch('/api/files');
        if (!response.ok) throw new Error('Failed to load files from local DB');
        return await response.json();
    } catch (error) {
        console.error("Local DB getAll error:", error);
        // Fallback to empty list if server is unreachable
        return [];
    }
}

export async function putFile(file: FileMapping): Promise<void> {
    const bypassSecret = localStorage.getItem('educational_map_bypass_secret') || '1068575628';

    console.log(">>> [LOCAL DB] Syncing file:", file.filename);

    try {
        const response = await fetch('/api/admin/sync-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: bypassSecret,
                type: 'file',
                file: file // Send the whole object
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `فشل المزامنة المحلية (Status: ${response.status})`);
        }
        console.log(">>> [LOCAL DB] SUCCESS: File synced.");
    } catch (error: any) {
        console.error(">>> [LOCAL DB] Sync Error:", error);
        throw error;
    }
}

export async function uploadFileToServer(file: File, metadata: Partial<FileMapping>): Promise<void> {
    const bypassSecret = localStorage.getItem('educational_map_bypass_secret') || '1068575628';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('secret', bypassSecret);
    formData.append('metadata', JSON.stringify(metadata));

    try {
        const response = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `فشل رفع الملف (Status: ${response.status})`);
        }
        console.log(">>> [LOCAL DB] SUCCESS: File uploaded to server.");
    } catch (error: any) {
        console.error(">>> [LOCAL DB] Upload Error:", error);
        throw error;
    }
}

export async function deleteFile(fileId: string): Promise<void> {
    const bypassSecret = localStorage.getItem('educational_map_bypass_secret') || '1068575628';
    try {
        const response = await fetch(`/api/admin/files/${fileId}?secret=${bypassSecret}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Delete failed');
    } catch (error) {
        console.error("Local DB delete error:", error);
        throw error;
    }
}

// Support for feedback
export async function sendFeedback(feedback: any): Promise<void> {
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedback)
        });
        if (!response.ok) throw new Error('Feedback failed');
    } catch (error) {
        console.error("Feedback error:", error);
        throw error;
    }
}

export async function getFeedbacks(): Promise<any[]> {
    const bypassSecret = localStorage.getItem('educational_map_bypass_secret') || '1068575628';
    try {
        const response = await fetch(`/api/admin/feedback?secret=${bypassSecret}`);
        if (!response.ok) throw new Error('Failed to load feedback');
        return await response.json();
    } catch (error) {
        console.error("Get feedback error:", error);
        return [];
    }
}
