import React, { useState, useEffect } from 'react';
import { X, UploadCloud, List, Users, MessageSquare, ShieldAlert, LogIn } from 'lucide-react';
import { Card } from '../ui/Card';
import FileUpload from './FileUpload';
import FileManagement from './FileManagement';
import UserManagement from './UserManagement';
import FeedbackManagement from './FeedbackManagement';
import { auth } from '../../lib/firebase';
import { Button } from '../ui/Button';

interface AdminPanelProps {
  onClose: () => void;
  onOpenAuth?: () => void;
}

type AdminTab = 'upload' | 'manage' | 'users' | 'feedback';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onOpenAuth }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('upload');
    const [isFirebaseAuthed, setIsFirebaseAuthed] = useState<boolean>(!!auth.currentUser);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            setIsFirebaseAuthed(!!user);
        });
        return () => unsub();
    }, []);

    const renderContent = () => {
        if (!isFirebaseAuthed) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-white rounded-xl">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 border-4 border-amber-100">
                        <ShieldAlert className="h-10 w-10 text-amber-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">مطلوب مصادقة سحابية</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-8 text-sm leading-relaxed">
                        عذراً، للوصول إلى أدوات الرفع والإدارة المتقدمة وضمان مزامنة البيانات مع بقية المستخدمين، يجب تسجيل الدخول باستخدام <strong>حساب Google المعتمد</strong>.
                    </p>
                    <Button 
                        onClick={() => { onClose(); onOpenAuth?.(); }}
                        className="bg-primary-dark hover:bg-primary-medium text-white px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-bold transition-all"
                    >
                        <LogIn className="h-5 w-5" />
                        الذهاب لتسجيل الدخول السحابي
                    </Button>
                </div>
            );
        }

        switch (activeTab) {
            case 'upload':
                return <FileUpload />;
            case 'manage':
                return <FileManagement />;
            case 'users':
                return <UserManagement />;
            case 'feedback':
                return <FeedbackManagement />;
            default:
                return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose} dir="rtl">
            <Card className="w-full max-w-6xl bg-gray-100 shadow-2xl relative flex flex-col h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex items-center justify-between border-b-4 border-primary-light bg-primary-dark rounded-t-lg shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white">لوحة التحكم</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-white hover:bg-white/20 transition-colors" aria-label="إغلاق">
                        <X className="h-5 w-5" />
                    </button>
                </header>
                <main className="flex-1 flex overflow-hidden">
                    <nav className="w-60 bg-white p-4 border-l space-y-2">
                        <TabButton
                            icon={UploadCloud}
                            text="رفع الملفات"
                            isActive={activeTab === 'upload'}
                            onClick={() => setActiveTab('upload')}
                        />
                        <TabButton
                            icon={List}
                            text="إدارة وربط الملفات"
                            isActive={activeTab === 'manage'}
                            onClick={() => setActiveTab('manage')}
                        />
                        <TabButton
                            icon={Users}
                            text="إدارة المستخدمين"
                            isActive={activeTab === 'users'}
                            onClick={() => setActiveTab('users')}
                        />
                        <TabButton
                            icon={MessageSquare}
                            text="الملاحظات"
                            isActive={activeTab === 'feedback'}
                            onClick={() => setActiveTab('feedback')}
                        />
                    </nav>
                    <div className="flex-1 p-6 overflow-y-auto bg-gray-50 custom-scrollbar">
                        {renderContent()}
                    </div>
                </main>
            </Card>
        </div>
    );
};

const TabButton: React.FC<{ text: string, icon: React.ElementType, isActive: boolean, onClick: () => void }> = ({ text, icon: Icon, isActive, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-lg text-right transition-colors ${isActive ? 'bg-primary-light/10 text-primary-dark' : 'text-gray-600 hover:bg-gray-100'}`}>
        <Icon className="h-5 w-5" />
        <span>{text}</span>
    </button>
);

export default AdminPanel;
