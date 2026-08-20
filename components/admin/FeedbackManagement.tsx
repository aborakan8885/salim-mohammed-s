import React, { useState, useEffect } from 'react';
import { MessageSquare, Download, Trash2, Search, Calendar, User, Smartphone, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Feedback } from '../../types';
import { Button } from '../ui/Button';
import { ConfirmationModal } from '../modals/ConfirmationModal';
import { getFeedbacks } from '../../lib/db';
import { deleteFeedbackFromSupabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

const FeedbackManagement: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);

    const loadFeedbacks = async () => {
        setLoading(true);
        try {
            const data = await getFeedbacks();
            setFeedbacks(data);
        } catch (err) {
            console.error("Failed to load feedbacks:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFeedbacks();
    }, []);

    const handleDeleteConfirm = async () => {
        if (!feedbackToDelete?.id) return;
        try {
            await deleteFeedbackFromSupabase(feedbackToDelete.id);
            setFeedbacks(prev => prev.filter(f => f.id !== feedbackToDelete.id));
            setFeedbackToDelete(null);
        } catch (error) {
            console.error("Error deleting feedback:", error);
            // Also update local list if offline
            setFeedbacks(prev => prev.filter(f => f.id !== feedbackToDelete.id));
            setFeedbackToDelete(null);
        }
    };

    const exportToExcel = () => {
        const exportData = feedbacks.map(f => ({
            'الاسم': f.name,
            'رقم التواصل': f.phone || 'غير مدخل',
            'الملاحظة': f.message,
            'التاريخ': f.createdAt?.toDate ? f.createdAt.toDate().toLocaleString('ar-SA') : 'غير متوفر'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "الملاحظات");
        
        // Add RTL support to the sheet
        if(!ws['!cols']) ws['!cols'] = [];
        ws['!dir'] = 'rtl';

        XLSX.writeFile(wb, `ملاحظات_المستفيدين_${new Date().toLocaleDateString('ar-EG')}.xlsx`);
    };

    const filteredFeedbacks = feedbacks.filter(f => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            f.name.toLowerCase().includes(q) ||
            (f.phone && f.phone.includes(q)) ||
            f.message.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-5" dir="rtl">
            {/* Header section */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-primary-dark flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary-medium" />
                        <span>إدارة ملاحظات ومقترحات المستفيدين</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">الاطلاع على جميع الملاحظات المرسلة من قبل مستخدمي النظام وتصديرها</p>
                </div>

                <div className="flex gap-2">
                    <Button 
                        onClick={exportToExcel} 
                        disabled={feedbacks.length === 0}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-sm"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        تصدير ملف Excel
                    </Button>
                </div>
            </div>

            {/* Filters and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">إجمالي الملاحظات</span>
                    <span className="text-lg font-black text-primary-dark">{feedbacks.length}</span>
                </div>
                <div className="relative md:col-span-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="بحث في الأسماء، الأرقام، أو محتوى الملاحظة..."
                        className="w-full pl-3 pr-9 py-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary-light focus:outline-none"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* Feedback List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-medium border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                        <p className="mt-4 text-gray-500 font-bold">جاري تحميل الملاحظات...</p>
                    </div>
                ) : filteredFeedbacks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right">
                            <thead className="bg-gray-100/80 border-b border-gray-200 text-gray-700 uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3">المستفيد / التاريخ</th>
                                    <th className="px-4 py-3">نص الملاحظة</th>
                                    <th className="px-4 py-3 text-center">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredFeedbacks.map((f) => (
                                    <tr key={f.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-4 py-3 align-top w-64">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                                        <User className="h-3.5 w-3.5" />
                                                    </div>
                                                    <span className="font-bold text-gray-900">{f.name}</span>
                                                </div>
                                                {f.phone && (
                                                    <div className="flex items-center gap-2 text-gray-500 font-mono text-[10px]">
                                                        <Smartphone className="h-3 w-3" />
                                                        <span>{f.phone}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{f.createdAt?.toDate ? f.createdAt.toDate().toLocaleString('ar-SA') : 'قيد المعالجة...'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
                                                {f.message}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-center w-24">
                                            <button
                                                onClick={() => setFeedbackToDelete(f)}
                                                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-colors"
                                                title="حذف الملاحظة"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-bold">لا توجد أي ملاحظات أو مقترحات حالياً.</p>
                    </div>
                )}
            </div>

            <ConfirmationModal
                isOpen={!!feedbackToDelete}
                onClose={() => setFeedbackToDelete(null)}
                onConfirm={handleDeleteConfirm}
                title="تأكيد حذف الملاحظة"
                message={`هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.`}
            />
        </div>
    );
};

export default FeedbackManagement;
