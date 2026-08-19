import React, { useState, useEffect } from 'react';
import { X, UploadCloud, List, Users, MessageSquare, ShieldAlert, LogIn, UserCircle, Settings, Mail, Key, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import FileUpload from './FileUpload';
import FileManagement from './FileManagement';
import UserManagement from './UserManagement';
import FeedbackManagement from './FeedbackManagement';
import { AccountSettings } from './AccountSettings';
import { auth } from '../../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { Button } from '../ui/Button';
import type { User } from '../../types';

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
    const [authMode, setAuthMode] = useState<'google' | 'email' | 'bypass'>('google');
    const [email, setEmail] = useState('aborakan8885@gmail.com');
    const [password, setPassword] = useState('');
    const [civilId, setCivilId] = useState('');

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            setIsFirebaseAuthed(!!user);
        });
        
        // Also check if we are in bypass mode
        const bypass = localStorage.getItem('educational_map_bypass_secret');
        if (bypass === '1068575628') {
          setIsFirebaseAuthed(true);
        }

        return () => unsub();
    }, []);

    const handleBypassLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: civilId })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'فشل التحقق من الهوية');
        }

        const { token } = await response.json();
        
        // Sign in with Firebase Custom Token
        // This is the "Hardcoded User" solution - the server grants access based on the ID
        await signInWithCustomToken(auth, token);
        
        localStorage.setItem('educational_map_bypass_secret', civilId);
        
        const appUser: User = {
            id: auth.currentUser?.uid || 'admin-bypass',
            name: 'مدير النظام المعتمد',
            role: 'admin',
            userType: 'employee',
            workEntity: 'الإدارة العامة للتعليم (دخول مباشر)',
            status: 'active',
            email: 'aborakan8885@gmail.com',
            permissions: {
                visibleLayers: ['schools', 'kmz'],
                canViewCoordinates: true,
                canExportReports: true,
                canUseSurroundingAnalysis: true
            }
        };
        localStorage.setItem('educational_map_current_user', JSON.stringify(appUser));
        setIsFirebaseAuthed(true);
      } catch (err: any) {
        console.error("Bypass login error:", err);
        setError(err.message || 'حدث خطأ أثناء الدخول');
      } finally {
        setIsLoading(false);
      }
    };

    const handleEmailSync = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user;
            
            const appUser: User = {
                id: user.uid,
                name: user.displayName || 'مدير النظام السحابي',
                role: user.email === 'aborakan8885@gmail.com' ? 'admin' : 'user',
                userType: 'employee',
                workEntity: user.email === 'aborakan8885@gmail.com' ? 'إدارة النظام السحابية' : 'مستخدم خارجي',
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
        } catch (err: any) {
            console.error("Email sync error:", err);
            let msg = 'فشل الدخول. تأكد من تفعيل (Email/Password) في Firebase ومن صحة البيانات.';
            if (err.code === 'auth/user-not-found') msg = 'المستخدم غير موجود. يرجى إنشاء حساب في Firebase بالبريد المعتمد.';
            if (err.code === 'auth/wrong-password') msg = 'كلمة المرور غير صحيحة.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSync = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
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
        } catch (err: any) {
            console.error("Sync error details:", err);
            const errorCode = err.code || 'unknown';
            const errorMessage = err.message || 'خطأ غير معروف';
            setError(`فشل الاتصال: [${errorCode}] - ${errorMessage}`);
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
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {authMode === 'google' ? (
                        <div className="space-y-4">
                            <Button 
                                onClick={handleGoogleSync}
                                disabled={isLoading}
                                className="bg-primary-dark hover:bg-primary-medium text-white px-12 py-5 rounded-2xl shadow-xl flex items-center justify-center gap-4 font-extrabold transition-all text-lg w-full"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-7 h-7" alt="Google" />
                                )}
                                <span>{isLoading ? 'جاري الاتصال...' : 'تفعيل المزامنة عبر Google'}</span>
                            </Button>
                            
                            <button 
                                onClick={() => setAuthMode('email')}
                                className="text-primary-dark font-bold text-sm hover:underline"
                            >
                                أو استخدم الدخول المباشر بالبريد
                            </button>
                            
                            <button 
                                onClick={() => setAuthMode('bypass')}
                                className="text-gray-500 font-bold text-xs hover:underline block w-full mt-2"
                            >
                                هل تواجه قيوداً في Google؟ استخدم رقم الهوية للتفعيل الفوري
                            </button>
                        </div>
                    ) : authMode === 'email' ? (
                        <form onSubmit={handleEmailSync} className="space-y-4 text-right w-full max-w-md">
                            {/* ... existing email form ... */}
                            {/* I will replace the whole form to be safe */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">البريد الإلكتروني المعتمد</label>
                                <div className="relative">
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-light outline-none font-bold pr-10"
                                        placeholder="example@gmail.com"
                                        required
                                    />
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">كلمة مرور السحابة (Firebase)</label>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-light outline-none font-bold pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                            <Button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5" />}
                                <span>تفعيل المزامنة المباشرة</span>
                            </Button>
                            <button 
                                type="button"
                                onClick={() => setAuthMode('google')}
                                className="w-full text-center text-xs font-bold text-gray-500 hover:text-primary-dark"
                            >
                                العودة لخيار Google
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBypassLogin} className="space-y-4 text-right w-full max-w-md">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs leading-relaxed font-medium mb-4">
                                💡 هذا الخيار يسمح لك بتفعيل لوحة الإدارة والمزامنة السحابية مباشرة باستخدام <strong>رقم الهوية</strong> الخاص بك، لتخطي قيود شاشة موافقة Google.
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهوية (المدير)</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={civilId}
                                        onChange={e => setCivilId(e.target.value)}
                                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-light outline-none font-bold pr-10"
                                        placeholder="106xxxxxxx"
                                        required
                                    />
                                    <ShieldAlert className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                            <Button 
                                type="submit"
                                className="w-full py-4 bg-primary-dark hover:bg-primary-medium text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2"
                            >
                                <ShieldAlert className="h-5 w-5" />
                                <span>تفعيل لوحة الإدارة فوراً</span>
                            </Button>
                            <button 
                                type="button"
                                onClick={() => setAuthMode('google')}
                                className="w-full text-center text-xs font-bold text-gray-500 hover:text-primary-dark"
                            >
                                العودة لخيار Google
                            </button>
                        </form>
                    )}
                </div>
            );
        }

        switch (activeTab) {
            case 'upload': return <FileUpload />;
            case 'manage': return <FileManagement />;
            case 'users': return <UserManagement />;
            case 'feedback': return <FeedbackManagement />;
            case 'account': return <AccountSettings />;
            default: return null;
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
                        <TabButton icon={UploadCloud} text="رفع الملفات" isActive={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
                        <TabButton icon={List} text="إدارة وربط الملفات" isActive={activeTab === 'manage'} onClick={() => setActiveTab('manage')} />
                        <TabButton icon={Users} text="إدارة المستخدمين" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                        <TabButton icon={MessageSquare} text="الملاحظات" isActive={activeTab === 'feedback'} onClick={() => setActiveTab('feedback')} />
                        <TabButton icon={Settings} text="إعدادات الحساب" isActive={activeTab === 'account'} onClick={() => setActiveTab('account')} />
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
