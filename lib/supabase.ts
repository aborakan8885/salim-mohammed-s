import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FileMapping, Feedback, User } from '../types';

// Environment variables
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Local storage key for dynamic configuration if set in admin panel
const STORAGE_SUPABASE_URL_KEY = 'educational_map_supabase_url';
const STORAGE_SUPABASE_KEY_KEY = 'educational_map_supabase_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  // Check URL parameters first for instant cross-device sharing
  let paramUrl = '';
  let paramKey = '';
  if (typeof window !== 'undefined' && window.location) {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      paramUrl = searchParams.get('sb_url') || searchParams.get('supabase_url') || '';
      paramKey = searchParams.get('sb_key') || searchParams.get('supabase_key') || '';
      if (paramUrl && paramKey) {
        saveSupabaseCredentials(paramUrl, paramKey);
      }
    } catch {
      // ignore
    }
  }

  const url = ENV_SUPABASE_URL || paramUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_URL_KEY) : '') || '';
  const anonKey = ENV_SUPABASE_ANON_KEY || paramKey || (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_KEY_KEY) : '') || '';
  const isConfigured = Boolean(url && anonKey && url.startsWith('https://') && anonKey.length > 20);
  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
    if (anonKey) localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, anonKey.trim());
  }
}

let supabaseInstance: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

  if (!supabaseInstance || lastUsedUrl !== url || lastUsedKey !== anonKey) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
  }

  return supabaseInstance;
}

// ----------------------------------------------------
// SQL Schema definition for 1-click execution in Supabase
// ----------------------------------------------------
export const SUPABASE_SQL_SCHEMA = `-- 1. إنشاء جدول الملفات والخرائط (باسم educational_files و files)
CREATE TABLE IF NOT EXISTS public.educational_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'unassigned',
    file_type TEXT NOT NULL,
    is_boundary_layer BOOLEAN DEFAULT FALSE,
    lat_column TEXT,
    lng_column TEXT,
    name_column TEXT,
    headers JSONB,
    display_columns JSONB,
    filter_mappings JSONB,
    data JSONB,
    file_content TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إنشاء جدول files أيضاً لضمان التوافق مع أي استعلام
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'unassigned',
    file_type TEXT NOT NULL,
    is_boundary_layer BOOLEAN DEFAULT FALSE,
    lat_column TEXT,
    lng_column TEXT,
    name_column TEXT,
    headers JSONB,
    display_columns JSONB,
    filter_mappings JSONB,
    data JSONB,
    file_content TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إزالة أي قيود فريدة سابقة قد تمنع رفع عدة ملفات
ALTER TABLE public.educational_files DROP CONSTRAINT IF EXISTS educational_files_category_key;
ALTER TABLE public.educational_files DROP CONSTRAINT IF EXISTS educational_files_filename_key;
ALTER TABLE public.educational_files DROP CONSTRAINT IF EXISTS educational_files_file_type_key;
ALTER TABLE public.educational_files DROP CONSTRAINT IF EXISTS educational_files_category_unique;

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_category_key;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_filename_key;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_file_type_key;
ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_category_unique;

-- 2. إنشاء جدول الملاحظات والمقترحات
CREATE TABLE IF NOT EXISTS public.feedback (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. إنشاء جدول منسوبي الإدارة والمستخدمين
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    civil_id TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    user_type TEXT NOT NULL DEFAULT 'employee',
    work_entity TEXT,
    job_title TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. تفعيل سياسات الأمان (Row Level Security) مع السماح بالقراءة والكتابة للجميع
ALTER TABLE public.educational_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on educational_files" ON public.educational_files;
CREATE POLICY "Allow public read on educational_files" ON public.educational_files FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on educational_files" ON public.educational_files;
CREATE POLICY "Allow public write on educational_files" ON public.educational_files FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read on files" ON public.files;
CREATE POLICY "Allow public read on files" ON public.files FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on files" ON public.files;
CREATE POLICY "Allow public write on files" ON public.files FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read on feedback" ON public.feedback;
CREATE POLICY "Allow public read on feedback" ON public.feedback FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on feedback" ON public.feedback;
CREATE POLICY "Allow public write on feedback" ON public.feedback FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read on users" ON public.users;
CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write on users" ON public.users;
CREATE POLICY "Allow public write on users" ON public.users FOR ALL USING (true);

-- 5. إنشاء مخزن الملفات السحابي (Storage Bucket)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('educational-files', 'educational-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read on storage" ON storage.objects;
CREATE POLICY "Allow public read on storage" ON storage.objects FOR SELECT USING (bucket_id = 'educational-files');
DROP POLICY IF EXISTS "Allow public upload on storage" ON storage.objects;
CREATE POLICY "Allow public upload on storage" ON storage.objects FOR ALL WITH CHECK (bucket_id = 'educational-files');
`;

// ----------------------------------------------------
// Database Operations (Files & Mappings)
// ----------------------------------------------------

/**
 * Fetch all files directly from Supabase.
 * Checks both 'educational_files' and 'files' tables for 100% compatibility.
 */
export async function fetchFilesFromSupabase(): Promise<FileMapping[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    console.log(">>> [SUPABASE] Fetching live files from cloud database...");

    // 1. Try 'educational_files'
    const { data: eduData, error: eduErr } = await supabase
      .from('educational_files')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Try 'files' table
    const { data: filesData, error: filesErr } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    let rawList: any[] = [];
    if (!eduErr && eduData && eduData.length > 0) {
      rawList = eduData;
    } else if (!filesErr && filesData && filesData.length > 0) {
      rawList = filesData;
    } else if (eduData) {
      rawList = eduData;
    } else if (filesData) {
      rawList = filesData;
    }

    if (!rawList) return [];

    console.log(`>>> [SUPABASE] Successfully retrieved ${rawList.length} files from cloud.`);

    return rawList.map(item => ({
      id: String(item.id),
      filename: item.filename || item.name || 'ملف بدون اسم',
      category: (item.category || 'unassigned') as any,
      fileType: (item.file_type || item.fileType || 'tabular') as any,
      isBoundaryLayer: Boolean(item.is_boundary_layer ?? item.isBoundaryLayer),
      latColumn: item.lat_column || item.latColumn || undefined,
      lngColumn: item.lng_column || item.lngColumn || undefined,
      nameColumn: item.name_column || item.nameColumn || undefined,
      headers: item.headers || undefined,
      displayColumns: item.display_columns || item.displayColumns || undefined,
      filterMappings: item.filter_mappings || item.filterMappings || {},
      data: item.data || undefined,
      fileContent: item.file_content || item.fileContent || undefined,
      fileUrl: item.file_url || item.fileUrl || undefined
    }));
  } catch (err) {
    console.error("Supabase fetchFiles error:", err);
    return null;
  }
}

/**
 * Insert a brand new file row into Supabase.
 * Inserts to both 'educational_files' and 'files' for complete compatibility.
 */
export async function insertFileToSupabase(file: FileMapping): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload = {
      id: file.id,
      filename: file.filename,
      category: file.category || 'unassigned',
      file_type: file.fileType,
      is_boundary_layer: Boolean(file.isBoundaryLayer),
      lat_column: file.latColumn || null,
      lng_column: file.lngColumn || null,
      name_column: file.nameColumn || null,
      headers: file.headers || null,
      display_columns: file.displayColumns || null,
      filter_mappings: file.filterMappings || null,
      data: file.data || null,
      file_content: typeof file.fileContent === 'string' ? file.fileContent : null,
      file_url: (file as any).fileUrl || null
    };

    // Insert into educational_files
    try {
      const { error } = await supabase.from('educational_files').upsert(payload, { onConflict: 'id' });
      if (error) console.warn("Supabase educational_files upsert notice:", error);
    } catch (e) {
      console.warn("educational_files write err:", e);
    }

    // Insert into files table as well
    try {
      const { error } = await supabase.from('files').upsert(payload, { onConflict: 'id' });
      if (error) console.warn("Supabase files upsert notice:", error);
    } catch (e) {
      console.warn("files write err:", e);
    }

    return true;
  } catch (err) {
    console.error("Failed to insert file to Supabase:", err);
    throw err;
  }
}

/**
 * Update an existing file by its unique ID
 */
export async function updateFileInSupabase(file: FileMapping): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload = {
      filename: file.filename,
      category: file.category,
      file_type: file.fileType,
      is_boundary_layer: Boolean(file.isBoundaryLayer),
      lat_column: file.latColumn || null,
      lng_column: file.lngColumn || null,
      name_column: file.nameColumn || null,
      headers: file.headers || null,
      display_columns: file.displayColumns || null,
      filter_mappings: file.filterMappings || null,
      data: file.data || null,
      file_content: typeof file.fileContent === 'string' ? file.fileContent : null,
      file_url: (file as any).fileUrl || null
    };

    await supabase.from('educational_files').update(payload).eq('id', file.id);
    await supabase.from('files').update(payload).eq('id', file.id);

    return true;
  } catch (err) {
    console.error("Failed to update file in Supabase:", err);
    throw err;
  }
}

export async function upsertFileToSupabase(file: FileMapping): Promise<boolean> {
  return insertFileToSupabase(file);
}

export async function deleteFileFromSupabase(fileId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    await supabase.from('educational_files').delete().eq('id', fileId);
    await supabase.from('files').delete().eq('id', fileId);
    return true;
  } catch (err) {
    console.error("Failed to delete file from Supabase:", err);
    throw err;
  }
}

/**
 * Realtime subscription to any changes on the files database
 */
export function subscribeToFilesChanges(onChanged: () => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  try {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'educational_files' },
        () => {
          console.log(">>> [REALTIME] Supabase educational_files table changed! Refreshing UI...");
          onChanged();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files' },
        () => {
          console.log(">>> [REALTIME] Supabase files table changed! Refreshing UI...");
          onChanged();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.warn("Realtime subscription setup failed:", e);
    return () => {};
  }
}

// ----------------------------------------------------
// Feedback Operations
// ----------------------------------------------------

export async function fetchFeedbackFromSupabase(): Promise<Feedback[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map(item => ({
      id: item.id,
      name: item.name,
      phone: item.phone || '',
      message: item.message,
      createdAt: {
        toDate: () => new Date(item.created_at)
      } as any
    }));
  } catch (err) {
    console.warn("Supabase fetchFeedback error:", err);
    return null;
  }
}

export async function insertFeedbackToSupabase(fb: { id?: string; name: string; phone?: string; message: string }): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload = {
      id: fb.id || `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: fb.name,
      phone: fb.phone || null,
      message: fb.message
    };

    const { error } = await supabase.from('feedback').insert(payload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Supabase insertFeedback error:", err);
    throw err;
  }
}

export async function deleteFeedbackFromSupabase(feedbackId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('feedback').delete().eq('id', feedbackId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Supabase deleteFeedback error:", err);
    throw err;
  }
}

// ----------------------------------------------------
// Users Operations
// ----------------------------------------------------

export async function fetchUsersFromSupabase(): Promise<User[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    if (!data || data.length === 0) return null;

    return data.map(item => ({
      id: item.id,
      civilId: item.civil_id,
      name: item.name,
      role: item.role as any,
      userType: item.user_type as any,
      workEntity: item.work_entity,
      jobTitle: item.job_title,
      phone: item.phone,
      status: item.status as any,
      permissions: item.permissions || {
        visibleLayers: ['schools', 'kmz'],
        canViewCoordinates: true,
        canExportReports: true,
        canUseSurroundingAnalysis: true
      },
      createdAt: item.created_at
    }));
  } catch (err) {
    console.warn("Supabase fetchUsers error:", err);
    return null;
  }
}

export async function upsertUserToSupabase(user: User): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload = {
      id: user.id,
      civil_id: user.civilId || null,
      name: user.name,
      role: user.role,
      user_type: user.userType || 'employee',
      work_entity: user.workEntity || null,
      job_title: user.jobTitle || null,
      phone: user.phone || null,
      status: user.status || 'active',
      permissions: user.permissions || null
    };

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Supabase upsertUser error:", err);
    throw err;
  }
}

export async function deleteUserFromSupabase(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Supabase deleteUser error:", err);
    throw err;
  }
}

// ----------------------------------------------------
// Storage Operations
// ----------------------------------------------------

export async function uploadFileToSupabaseStorage(file: File, path: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const bucketName = 'educational-files';
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `${path}/${cleanFileName}`.replace(/\/+/g, '/');

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn("Supabase storage upload error:", error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Failed to upload to Supabase storage:", err);
    return null;
  }
}
