import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FileMapping, Feedback, User } from '../types';

// Environment variables
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Local storage key for dynamic configuration if set in admin panel
const STORAGE_SUPABASE_URL_KEY = 'educational_map_supabase_url';
const STORAGE_SUPABASE_KEY_KEY = 'educational_map_supabase_key';

export function getSupabaseCredentials(): { url: string; anonKey: string; isConfigured: boolean } {
  const url = ENV_SUPABASE_URL || localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || '';
  const anonKey = ENV_SUPABASE_ANON_KEY || localStorage.getItem(STORAGE_SUPABASE_KEY_KEY) || '';
  const isConfigured = Boolean(url && anonKey && url.startsWith('https://') && anonKey.length > 20);
  return { url, anonKey, isConfigured };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (url) localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
  if (anonKey) localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, anonKey.trim());
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
export const SUPABASE_SQL_SCHEMA = `-- 1. إنشاء جدول الملفات والخرائط
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

-- 4. تفعيل سياسات الأمان (Row Level Security) مع السماح بالقراءة والكتابة
ALTER TABLE public.educational_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on educational_files" ON public.educational_files FOR SELECT USING (true);
CREATE POLICY "Allow public write on educational_files" ON public.educational_files FOR ALL USING (true);

CREATE POLICY "Allow public read on feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Allow public insert on feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on feedback" ON public.feedback FOR DELETE USING (true);

CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public write on users" ON public.users FOR ALL USING (true);

-- 5. إنشاء مخزن الملفات السحابي (Storage Bucket)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('educational-files', 'educational-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read on storage" ON storage.objects FOR SELECT USING (bucket_id = 'educational-files');
CREATE POLICY "Allow public upload on storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'educational-files');
CREATE POLICY "Allow public delete on storage" ON storage.objects FOR DELETE USING (bucket_id = 'educational-files');
`;

// ----------------------------------------------------
// Database Operations (Files & Mappings)
// ----------------------------------------------------

export async function fetchFilesFromSupabase(): Promise<FileMapping[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('educational_files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn("Supabase fetch files warning:", error);
      return null;
    }

    if (!data) return [];

    return data.map(item => ({
      id: item.id,
      filename: item.filename,
      category: item.category as any,
      fileType: item.file_type as any,
      isBoundaryLayer: item.is_boundary_layer,
      latColumn: item.lat_column || undefined,
      lngColumn: item.lng_column || undefined,
      nameColumn: item.name_column || undefined,
      headers: item.headers || undefined,
      displayColumns: item.display_columns || undefined,
      filterMappings: item.filter_mappings || {},
      data: item.data || undefined,
      fileContent: item.file_content || undefined,
      fileUrl: item.file_url || undefined
    }));
  } catch (err) {
    console.error("Supabase fetchFiles error:", err);
    return null;
  }
}

export async function upsertFileToSupabase(file: FileMapping): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload = {
      id: file.id,
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

    const { error } = await supabase
      .from('educational_files')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }

    return true;
  } catch (err) {
    console.error("Failed to upsert file to Supabase:", err);
    throw err;
  }
}

export async function deleteFileFromSupabase(fileId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('educational_files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Failed to delete file from Supabase:", err);
    throw err;
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
