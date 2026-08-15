
import React, { useState, useMemo } from 'react';
import { Trash2, FileText, Map, Loader2, ChevronDown, ChevronUp, CheckCircle, Target } from 'lucide-react';
import { useData } from '../../App';
import { Button } from '../ui/Button';
import type { FileMapping, FilterColumnMappings } from '../../types';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { MappingConfiguration } from './MappingConfiguration';

// --- START: AUTO-MAPPING HELPERS ---

// Defines which filter fields are applicable for each category for the auto-mapping logic.
const filterFieldsByCategoryForAutoMapping: Record<string, { key: keyof FilterColumnMappings, isMulti: boolean }[]> = {
  schools: [
    { key: 'levelColumn', isMulti: true }, { key: 'governorateColumn', isMulti: true },
    { key: 'districtColumn', isMulti: true },
  ],
};

// Keywords to look for in header names to perform the automatic mapping.
const mappingKeywords: Record<string, string[]> = {
    levelColumn: ['المرحلة', 'المرحله'],
    genderColumn: ['الجنس'],
    governorateColumn: ['المحافظة', 'المحافظه'],
    districtColumn: ['الحي', 'الحى'],
    isPPPColumn: ['ppp', 'المسار', 'مسار'],
    buildingOwnershipColumn: ['ملكية', 'مبنى', 'نوع المبنى'],
    studyTimeColumn: ['فترة', 'الدراسة', 'وقت', 'صباحي', 'مسائي'],
    independenceStatusColumn: ['استقلالية', 'حالة'],
    disabilitySupportColumn: ['اعاقة', 'إعاقة', 'ذوي'],
    specialEducationColumn: ['خاص', 'التعليم الخاص'],
    authorityColumn: ['السلطة', 'سلطه', 'أهلي', 'عالمي', 'اجنبي'],
    curriculumColumn: ['المنهج', 'منهج'],
    ownershipColumn: ['الملكية', 'ملكية'],
    areaColumn: ['المساحة', 'مساحة', 'مساحه'],
    needColumn: ['الاحتياج', 'احتياج'],
    buildingStatusColumn: ['حالة المبنى', 'حاله المبنى', 'مخلاة'],
    projectStatusColumn: ['حالة المشروع', 'حاله المشروع', 'متعثر'],
};

const findHeaderMatch = (headers: string[], keywords: string[]): string | undefined => {
    // Normalize keywords for matching
    const normalizedKeywords = keywords.map(k => k.toLowerCase().replace(/\s/g, ''));
    
    return headers.find(header => {
        // Normalize header for matching
        const normalizedHeader = header.toLowerCase().replace(/\s/g, '');
        return normalizedKeywords.some(keyword => normalizedHeader.includes(keyword));
    });
};

// --- END: AUTO-MAPPING HELPERS ---


const FileManagement: React.FC = () => {
    const { 
        fileMappings, 
        isLoading: isContextLoading, 
        deleteFileAndUpdateState, 
        updateFileAndUpdateState,
        setBoundaryLayerAndUpdateState
    } = useData();
    
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const [fileToDelete, setFileToDelete] = useState<FileMapping | null>(null);
    const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

    const toggleExpand = (fileId: string) => {
        setExpandedFileId(prev => (prev === fileId ? null : fileId));
    };

    const handleConfirmDelete = async () => {
        if (!fileToDelete) return;

        setIsUpdating(fileToDelete.id);
        try {
            await deleteFileAndUpdateState(fileToDelete.id);
        } catch (error) {
            console.error("Failed to delete file:", error);
            alert("حدث خطأ أثناء حذف الملف.");
        } finally {
            setIsUpdating(null);
            setFileToDelete(null);
        }
    };

    const handleCategoryChange = async (fileId: string, newCategory: FileMapping['category']) => {
        const fileToUpdate = fileMappings[fileId];
        if (!fileToUpdate) return;
        
        setIsUpdating(fileId);
        
        const updatedFile = { ...fileToUpdate, category: newCategory };

        // --- AUTOMATIC MAPPING LOGIC ---
        if (newCategory !== 'unassigned' && fileToUpdate.fileType === 'tabular' && fileToUpdate.headers) {
            const headers = fileToUpdate.headers;
            const newFilterMappings: FilterColumnMappings = {};
            
            // Auto-map filter columns
            const fieldsToMap = filterFieldsByCategoryForAutoMapping[newCategory] || [];
            for (const field of fieldsToMap) {
                const keywords = mappingKeywords[field.key];
                if (!keywords) continue;
                
                const foundHeader = findHeaderMatch(headers, keywords);
                if (foundHeader) {
                    // FIX: Use a type assertion to work around TypeScript's limitation in correlating
                    // the 'isMulti' flag with the specific property type of FilterColumnMappings.
                    (newFilterMappings as any)[field.key] = field.isMulti ? [foundHeader] : foundHeader;
                }
            }
            updatedFile.filterMappings = newFilterMappings;

            // Auto-map core columns (Lat, Lng, Name)
            const latHeader = findHeaderMatch(headers, ['lat', 'latitude', 'y', 'العرض', 'عرض']);
            const lngHeader = findHeaderMatch(headers, ['lng', 'lon', 'long', 'longitude', 'x', 'الطول', 'طول']);
            const nameHeader = findHeaderMatch(headers, ['name', 'الاسم', 'اسم']);
            
            if (latHeader) updatedFile.latColumn = latHeader;
            if (lngHeader) updatedFile.lngColumn = lngHeader;
            if (nameHeader) updatedFile.nameColumn = nameHeader;
        }
        // --- END OF AUTOMATIC MAPPING LOGIC ---

        try {
            await updateFileAndUpdateState(updatedFile);
        } catch (error) {
            console.error("Failed to update file category:", error);
            alert("حدث خطأ أثناء تحديث فئة الملف.");
        } finally {
            setIsUpdating(null);
        }
    };

    const handleCoordinateChange = async (fileId: string, field: 'latColumn' | 'lngColumn' | 'nameColumn', value: string) => {
        const fileToUpdate = fileMappings[fileId];
        if (!fileToUpdate) return;
        
        setIsUpdating(fileId);
        const updatedFile = { ...fileToUpdate, [field]: value || undefined };
        
        try {
            await updateFileAndUpdateState(updatedFile);
        } catch (error) {
            console.error(`Failed to update file ${field}:`, error);
            alert("حدث خطأ أثناء تحديث أعمدة الإحداثيات.");
        } finally {
            setIsUpdating(null);
        }
    };

    const handleSaveMappings = async (updatedFile: FileMapping) => {
        setIsUpdating(updatedFile.id);
        try {
            await updateFileAndUpdateState(updatedFile);
            setExpandedFileId(null);
        } catch (error) {
             console.error("Failed to save mappings:", error);
            alert("حدث خطأ أثناء حفظ الربط.");
        } finally {
            setIsUpdating(null);
        }
    }

    // FIX: Cast Object.values(fileMappings) to FileMapping[] to ensure correctly typed elements for the sort and subsequent maps.
    const sortedFiles = useMemo(() => 
        (Object.values(fileMappings) as FileMapping[]).sort((a, b) => a.filename.localeCompare(b.filename)),
        [fileMappings]
    );

    return (
        <div>
            <h3 className="text-xl font-bold text-primary-dark mb-4">إدارة وربط الملفات</h3>
            <div className="p-4 bg-white rounded-lg border">
                {isContextLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-light" />
                        <span className="mr-3 text-gray-600">جاري تحميل الملفات...</span>
                    </div>
                ) : sortedFiles.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 font-semibold text-gray-600">اسم الملف</th>
                                    <th className="px-4 py-2 font-semibold text-gray-600">الفئة</th>
                                    <th className="px-4 py-2 font-semibold text-gray-600">استخدام كحدود</th>
                                    <th className="px-4 py-2 font-semibold text-gray-600">الحالة</th>
                                    <th className="px-4 py-2 font-semibold text-gray-600 text-center">ربط الأعمدة</th>
                                    <th className="px-4 py-2 font-semibold text-gray-600 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {sortedFiles.map(file => (
                                    <React.Fragment key={file.id}>
                                        <tr className={isUpdating === file.id ? 'opacity-50' : ''}>
                                            <td className="px-4 py-3 text-gray-800 font-medium flex items-center gap-2">
                                                {file.fileType === 'tabular' ? <FileText className="h-4 w-4 text-gray-400" /> : <Map className="h-4 w-4 text-gray-400" />}
                                                {file.filename}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 w-48">
                                                <select
                                                    value={file.category}
                                                    onChange={(e) => handleCategoryChange(file.id, e.target.value as FileMapping['category'])}
                                                    disabled={isUpdating === file.id}
                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-light bg-white disabled:bg-gray-100"
                                                >
                                                    <option value="unassigned">-- اختر فئة --</option>
                                                    <option value="schools">المدارس</option>
                                                    <option value="kmz">ملف KMZ (طبقة)</option>
                                                </select>
                                                {file.category !== 'unassigned' && file.fileType === 'tabular' && file.headers && (
                                                    <div className="mt-2 p-2 border border-dashed border-gray-200 rounded bg-gray-50 text-xs space-y-1.5">
                                                        <div className="font-semibold text-gray-700">أعمدة الإحداثيات:</div>
                                                        <div className="space-y-1">
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 block">خط العرض (Lat):</span>
                                                                <select
                                                                    value={file.latColumn || ''}
                                                                    onChange={(e) => handleCoordinateChange(file.id, 'latColumn', e.target.value)}
                                                                    disabled={isUpdating === file.id}
                                                                    className="w-full text-xs p-1 border rounded bg-white"
                                                                >
                                                                    <option value="">-- خط العرض --</option>
                                                                    {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 block">خط الطول (Lng):</span>
                                                                <select
                                                                    value={file.lngColumn || ''}
                                                                    onChange={(e) => handleCoordinateChange(file.id, 'lngColumn', e.target.value)}
                                                                    disabled={isUpdating === file.id}
                                                                    className="w-full text-xs p-1 border rounded bg-white"
                                                                >
                                                                    <option value="">-- خط الطول --</option>
                                                                    {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 block">اسم الموقع:</span>
                                                                <select
                                                                    value={file.nameColumn || ''}
                                                                    onChange={(e) => handleCoordinateChange(file.id, 'nameColumn', e.target.value)}
                                                                    disabled={isUpdating === file.id}
                                                                    className="w-full text-xs p-1 border rounded bg-white"
                                                                >
                                                                    <option value="">-- اسم الموقع --</option>
                                                                    {file.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 w-48 text-center">
                                                {(file.fileType === 'kmz' || file.fileType === 'kml' || file.fileType === 'geojson' || file.fileType === 'json' || !!file.fileContent) && (
                                                    file.isBoundaryLayer ? (
                                                         <span className="flex items-center justify-center gap-1.5 text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                                            <CheckCircle className="h-4 w-4" />
                                                            طبقة الحدود
                                                        </span>
                                                    ) : (
                                                        <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => setBoundaryLayerAndUpdateState(file.id)} disabled={isUpdating === file.id}>
                                                            <Target className="h-4 w-4" />
                                                            تعيين
                                                        </Button>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {file.category !== 'unassigned' ? 
                                                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">مرتبط</span> :
                                                    <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">غير مرتبط</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {file.fileType === 'tabular' && file.category !== 'unassigned' && (
                                                    <Button size="sm" variant="ghost" className="text-primary-dark hover:bg-primary-dark/10 gap-1" onClick={() => toggleExpand(file.id)} disabled={isUpdating === file.id}>
                                                        {expandedFileId === file.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        <span>{expandedFileId === file.id ? 'إغلاق' : 'فتح'}</span>
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center">
                                                    {isUpdating === file.id ? (
                                                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                                                    ) : (
                                                        <Button variant="secondary" size="sm" className="bg-red-50 text-red-600 hover:bg-red-100" onClick={() => setFileToDelete(file)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedFileId === file.id && (
                                            <tr>
                                                <td colSpan={6} className="p-0">
                                                    <MappingConfiguration
                                                        key={file.id}
                                                        file={file}
                                                        onSave={handleSaveMappings}
                                                        onCancel={() => setExpandedFileId(null)}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">
                        لم يتم رفع أي ملفات حتى الآن. ابدأ برفع ملف من قسم "رفع الملفات".
                    </p>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!fileToDelete}
                onClose={() => setFileToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="تأكيد الحذف"
                message={`هل أنت متأكد من رغبتك في حذف الملف "${fileToDelete?.filename}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                isConfirming={isUpdating === fileToDelete?.id}
            />
        </div>
    );
};

export default FileManagement;
