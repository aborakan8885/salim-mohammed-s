import React, { useState } from 'react';
import { X, UploadCloud, List, Users, MessageSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import FileUpload from './FileUpload';
import FileManagement from './FileManagement';
import UserManagement from './UserManagement';
import FeedbackManagement from './FeedbackManagement';

interface AdminPanelProps {
  onClose: () => void;
}

type AdminTab = 'upload' | 'manage' | 'users' | 'feedback';

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('upload');

    const renderContent = () => {
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
