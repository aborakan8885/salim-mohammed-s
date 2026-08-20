import type { FileMapping, Feedback } from '../types';
import {
  fetchFilesFromSupabase,
  upsertFileToSupabase,
  deleteFileFromSupabase,
  fetchFeedbackFromSupabase,
  insertFeedbackToSupabase,
  deleteFeedbackFromSupabase,
  uploadFileToSupabaseStorage,
  getSupabaseCredentials
} from './supabase';

const CACHED_FILES_KEY = 'educational_map_cached_files_v2';
const CACHED_FEEDBACK_KEY = 'educational_map_cached_feedback_v2';

/**
 * Get all files: Checks Supabase cloud database first.
 * If Supabase is connected, loads directly from Supabase and updates local cache.
 * Otherwise, loads from client cache.
 */
export async function getAllFiles(): Promise<FileMapping[]> {
  try {
    const supabaseFiles = await fetchFilesFromSupabase();
    if (supabaseFiles !== null) {
      // Save snapshot to local cache for instant load
      try {
        localStorage.setItem(CACHED_FILES_KEY, JSON.stringify(supabaseFiles));
      } catch (e) {
        console.warn("Could not cache full dataset in localStorage (size limit)");
      }
      return supabaseFiles;
    }
  } catch (error) {
    console.warn("Supabase load failed, falling back to cache:", error);
  }

  // Fallback to local client cache
  try {
    const cached = localStorage.getItem(CACHED_FILES_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("Local cache load error:", e);
  }

  return [];
}

/**
 * Save or update file mapping.
 * Writes directly to Supabase cloud and updates local cache.
 */
export async function putFile(file: FileMapping): Promise<void> {
  console.log(">>> [DATABASE] Saving file mapping:", file.filename);

  // 1. Update local cache immediately
  try {
    const cached = localStorage.getItem(CACHED_FILES_KEY);
    let files: FileMapping[] = cached ? JSON.parse(cached) : [];
    const index = files.findIndex(f => f.id === file.id);
    if (index >= 0) {
      files[index] = file;
    } else {
      files.push(file);
    }
    localStorage.setItem(CACHED_FILES_KEY, JSON.stringify(files));
  } catch (e) {
    console.warn("Cache save warning:", e);
  }

  // 2. Sync to Supabase Cloud if configured
  const { isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      await upsertFileToSupabase(file);
      console.log(">>> [SUPABASE] Successfully saved to cloud database.");
    } catch (err: any) {
      console.error(">>> [SUPABASE] Cloud save error:", err);
      throw new Error(`خطأ في حفظ البيانات في سحابة Supabase: ${err.message || ''}`, { cause: err });
    }
  }
}

/**
 * Upload raw file to Supabase storage + save metadata in Supabase database.
 * Completely runs in the client browser - ZERO 405 Express Errors!
 */
export async function uploadFileToServer(file: File, metadata: Partial<FileMapping>): Promise<void> {
  console.log(">>> [DATABASE] Uploading file directly from browser:", file.name);

  let fileUrl: string | undefined = undefined;

  // 1. Try uploading to Supabase Storage if configured
  const { isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      const publicUrl = await uploadFileToSupabaseStorage(file, 'uploads');
      if (publicUrl) {
        fileUrl = publicUrl;
        console.log(">>> [SUPABASE STORAGE] File uploaded, URL:", publicUrl);
      }
    } catch (err) {
      console.warn("Storage upload failed, keeping file data in DB:", err);
    }
  }

  const completeMapping: FileMapping = {
    id: metadata.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    filename: file.name,
    category: metadata.category || 'unassigned',
    fileType: metadata.fileType || 'tabular',
    isBoundaryLayer: Boolean(metadata.isBoundaryLayer),
    latColumn: metadata.latColumn,
    lngColumn: metadata.lngColumn,
    nameColumn: metadata.nameColumn,
    headers: metadata.headers,
    displayColumns: metadata.displayColumns,
    filterMappings: metadata.filterMappings || {},
    data: metadata.data,
    fileContent: metadata.fileContent,
    fileUrl
  };

  // 2. Save file mapping and parsed data
  await putFile(completeMapping);
}

/**
 * Delete file from Supabase Cloud + Local Cache
 */
export async function deleteFile(fileId: string): Promise<void> {
  // 1. Remove from local cache
  try {
    const cached = localStorage.getItem(CACHED_FILES_KEY);
    if (cached) {
      const files: FileMapping[] = JSON.parse(cached);
      const filtered = files.filter(f => f.id !== fileId);
      localStorage.setItem(CACHED_FILES_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error("Local delete error:", e);
  }

  // 2. Delete from Supabase if configured
  const { isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      await deleteFileFromSupabase(fileId);
      console.log(">>> [SUPABASE] Deleted file from cloud.");
    } catch (err: any) {
      console.error(">>> [SUPABASE] Cloud delete error:", err);
      throw err;
    }
  }
}

/**
 * Send Feedback directly to Supabase
 */
export async function sendFeedback(feedback: { name: string; phone?: string; message: string }): Promise<void> {
  const newFeedback: Feedback = {
    id: `fb-${Date.now()}`,
    name: feedback.name,
    phone: feedback.phone || '',
    message: feedback.message,
    createdAt: {
      toDate: () => new Date()
    } as any
  };

  // 1. Cache locally
  try {
    const cached = localStorage.getItem(CACHED_FEEDBACK_KEY);
    const list: Feedback[] = cached ? JSON.parse(cached) : [];
    list.unshift(newFeedback);
    localStorage.setItem(CACHED_FEEDBACK_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Feedback cache error:", e);
  }

  // 2. Insert to Supabase if configured
  const { isConfigured } = getSupabaseCredentials();
  if (isConfigured) {
    try {
      await insertFeedbackToSupabase(newFeedback);
    } catch (err) {
      console.error("Supabase feedback insert error:", err);
    }
  }
}

/**
 * Get all feedbacks from Supabase or Cache
 */
export async function getFeedbacks(): Promise<Feedback[]> {
  try {
    const supabaseFeedback = await fetchFeedbackFromSupabase();
    if (supabaseFeedback !== null) {
      localStorage.setItem(CACHED_FEEDBACK_KEY, JSON.stringify(supabaseFeedback));
      return supabaseFeedback;
    }
  } catch (err) {
    console.warn("Supabase feedback load error:", err);
  }

  try {
    const cached = localStorage.getItem(CACHED_FEEDBACK_KEY);
    if (cached) {
      const list = JSON.parse(cached);
      return list.map((item: any) => ({
        ...item,
        createdAt: item.createdAt?.toDate ? item.createdAt : {
          toDate: () => new Date(item.createdAt || Date.now())
        }
      }));
    }
  } catch (e) {
    console.error("Cache feedback load error:", e);
  }

  return [];
}
