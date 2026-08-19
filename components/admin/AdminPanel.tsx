import React, { useState, useEffect } from 'react';
import { X, UploadCloud, List, Users, MessageSquare, ShieldAlert, LogIn, UserCircle, Settings } from 'lucide-react';
import { Card } from '../ui/Card';
import FileUpload from './FileUpload';
import FileManagement from './FileManagement';
import UserManagement from './UserManagement';
import FeedbackManagement from './FeedbackManagement';
import { AccountSettings } from './AccountSettings';
import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Button } from '../ui/Button';
import type { User } from '../../types';
import { Loader2, AlertCircle } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
  onOpenAuth?: () => void;
}

type AdminTab = 'upload' | 'manage' | 'users' | 'feedback' | 'account';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, onOpenAuth }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('upload');
    const [isFirebaseAuthed, setIsFirebaseAuthed] = useState<boolean>(!!auth.currentUser);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            setIsFirebaseAuthed(!!user);
        });
        return () => unsub();
    }, []);

    const handleGoogleSync = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Map Firebase user to App User
            const appUser: User = {
                id: user.uid,
                name: user.displayName || 'مدير النظام الرئيسي',
                role: user.email === 'aborakan8885@gmail.com' ? 'admin' : 'user',
                userType: 'employee',
                workEntity: user.email === 'aborakan8885@gmail.com' ? 'الإدارة العامة للتعليم' : 'مستخدم خارجي',
                status: 'active',
                email: user.email || undefined,
                permissions: {
                    visibleLayers: ['schools', 'kmz'],
                    canViewCoordinates: user.email === 'aborakan8885@gmail.com',
                    canExportReports: true,
                    canUseSurroundingAnalysis: true
                }
            };
            
            localStorage.setItem('educational_map_current_user', JSON.stringify(appUser));
            // Auth change will trigger re-render via useEffect unsub
        } catch (err: any) {
            console.error("Sync error:", err);
            setError('فشل الاتصال بالسحابة. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (!isFirebaseAuthed) {
            return (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center bg-white rounded-xl shadow-inner border-2 border-dashed border-gray-100">
                    <div className="w-24 h-24 bg-primary-light/10 rounded-3xl flex items-center justify-center mb-8 border-4 border-primary-light/20 shadow-lg shadow-primary-light/5">
                        <UploadCloud className="h-12 w-12 text-primary-dark" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-4">تفعيل المزامنة السحابية</h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-10 text-sm leading-relaxed font-medium">
                        أنت الآن مسجل كمسؤول محلي. لكي تظهر الملفات التي ترفعها لجميع المستخدمين الآخرين، يجب تفعيل <strong>مزامنة Google السحابية</strong> ببريدك المعتمد.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <Button 
                        onClick={handleGoogleSync}
                        disabled={isLoading}
                        className="bg-primary-dark hover:bg-primary-medium text-white px-12 py-5 rounded-2xl shadow-xl flex items-center gap-4 font-extrabold transition-all text-lg min-w-[280px]"
                    >
                        {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-7 h-7" alt="Google" />
                        )}
                        <span>{isLoading ? 'جاري الاتصال...' : 'تفعيل المزامنة مع السحابة'}</span>
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
            case 'account':
                return <AccountSettings />;
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
                        <TabButton
                            icon={Settings}
                            text="إعدادات الحساب"
                            isActive={activeTab === 'account'}
                            onClick={() => setActiveTab('account')}
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
