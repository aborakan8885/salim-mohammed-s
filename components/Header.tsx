import React from 'react';
import { MapPin, User as UserIcon, LogIn, LogOut, Settings, ShieldCheck, EyeOff } from 'lucide-react';
import { Button } from './ui/Button';
import type { User as UserType } from '../types';
import { MinistryLogo } from './MinistryLogo';

interface HeaderProps {
  user: UserType | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onAdminPanelClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLoginClick, onLogoutClick, onAdminPanelClick }) => {
  return (
    <header className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-primary-dark shadow-lg z-30 shrink-0 border-b-4 border-primary-light">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
        {/* Top bar row on mobile: Logo + Auth actions */}
        <div className="w-full md:w-auto flex items-center justify-between gap-2">
          {/* Official Ministry of Education Logo Badge */}
          <MinistryLogo />

          {/* User actions on small screens */}
          <div className="flex md:hidden items-center gap-1.5" dir="rtl">
            {user ? (
              <>
                <div className="bg-white/10 px-2 py-1 rounded-lg border border-white/20 text-white text-right max-w-[130px] truncate">
                  <div className="flex items-center gap-1 text-[11px] font-bold truncate">
                    {user.role === 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                    {user.userType === 'employee' && user.role !== 'admin' && <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    {user.userType === 'beneficiary' && <EyeOff className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    <span className="truncate">{user.name}</span>
                  </div>
                </div>
                {user.role === 'admin' && (
                  <Button onClick={onAdminPanelClick} variant="ghost" size="sm" className="p-1.5 text-xs text-white hover:bg-white/10" title="لوحة التحكم">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button onClick={onLogoutClick} variant="ghost" size="sm" className="p-1.5 text-xs text-red-200 hover:text-white hover:bg-red-500/20" title="تغيير الحساب">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={onLoginClick} variant="primary" size="sm" className="gap-1 bg-primary-light text-primary-dark font-extrabold text-xs px-2.5 py-1">
                <LogIn className="h-3.5 w-3.5" />
                <span>الدخول</span>
              </Button>
            )}
          </div>
        </div>

        {/* Centered Title */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-white text-center">
          <MapPin className="h-5 w-5 sm:h-7 sm:w-7 text-primary-light shrink-0" />
          <div>
            <h1 className="text-sm sm:text-lg md:text-xl font-bold tracking-tight leading-tight">
              الخارطة التعليمية للقبول
              <span className="text-xs font-normal text-primary-light/80 mr-1.5">v2.0</span>
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-300 hidden sm:block">
              الإدارة العامة للتعليم بمنطقة المدينة المنورة
            </p>
          </div>
        </div>

        {/* Desktop Left Auth Actions */}
        <div className="hidden md:flex items-center justify-end gap-3 shrink-0" dir="rtl">
          {user ? (
            <>
              {/* User Mode Badge */}
              <div className="flex flex-col items-start bg-white/10 px-3 py-1 rounded-xl border border-white/20 text-white text-right">
                <div className="flex items-center gap-1.5">
                  {user.role === 'admin' && <ShieldCheck className="h-4 w-4 text-blue-400" />}
                  {user.userType === 'employee' && user.role !== 'admin' && <ShieldCheck className="h-4 w-4 text-emerald-400" />}
                  {user.userType === 'beneficiary' && <EyeOff className="h-4 w-4 text-amber-400" />}
                  <span className="text-xs font-bold">{user.name}</span>
                </div>
                <span className="text-[10px] text-gray-300 font-medium">
                  {user.role === 'admin' && 'مسؤول النظام'}
                  {user.userType === 'employee' && user.role !== 'admin' && `منسوبي الإدارة (${user.civilId ? 'سجل: ' + user.civilId : 'مفعل'})`}
                  {user.userType === 'beneficiary' && 'مستفيد (بدون إحداثيات)'}
                </span>
              </div>

              {user.role === 'admin' && (
                <Button onClick={onAdminPanelClick} variant="ghost" size="sm" className="gap-1.5 text-xs text-white hover:bg-white/10">
                  <Settings className="h-4 w-4" />
                  <span>لوحة التحكم</span>
                </Button>
              )}
              <Button onClick={onLogoutClick} variant="ghost" size="sm" className="gap-1 text-xs text-red-200 hover:text-white hover:bg-red-500/20">
                <LogOut className="h-4 w-4" />
                <span>تغيير الحساب</span>
              </Button>
            </>
          ) : (
            <Button onClick={onLoginClick} variant="primary" size="sm" className="gap-2 bg-primary-light hover:bg-primary-medium text-primary-dark font-extrabold shadow-md">
              <LogIn className="h-4 w-4" />
              <span>تسجيل الدخول / اختيار الحساب</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
