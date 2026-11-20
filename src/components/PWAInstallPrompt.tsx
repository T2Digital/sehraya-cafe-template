import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if Already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS specific check
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };
    
    // Show manual prompt for iOS if not standalone
    if (isIos() && !isStandalone) {
      setTimeout(() => setIsVisible(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      // Must be iOS or unsupported browser
      toast.success('لتثبيت التطبيق، اضغط على زر المشاركة ثم "الإضافة إلى الشاشة الرئيسية"', { duration: 5000 });
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-card-bg border border-border-color p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in-up" dir="rtl">
      <div className="w-12 h-12 bg-primary/20 text-primary rounded-xl flex items-center justify-center shrink-0">
        <Download size={24} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-text-light">تثبيت التطبيق</h4>
        <p className="text-xs text-text-muted mt-1">قم بتثبيت التطبيق للوصول السريع والعمل المباشر والسريع.</p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button onClick={handleInstallClick} className="bg-primary text-bg-dark text-sm px-3 py-1.5 rounded-lg font-bold hover:bg-[#cfa858]">تثبيت</button>
        <button onClick={() => setIsVisible(false)} className="bg-bg-dark text-text-muted text-sm px-3 py-1.5 rounded-lg hover:text-text-light">لاحقاً</button>
      </div>
    </div>
  );
}
