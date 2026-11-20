import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle, loginAnonymously, loginWithEmail } from '../firebase';
import { useStore } from '../store';
import { Coffee, Mail, Lock } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const { user } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'cashier') navigate('/cashier');
      else if (user.role === 'captain') navigate('/captain');
      else navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error(error);
      setError('فشل تسجيل الدخول بحساب جوجل');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error(err);
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    try {
      await loginAnonymously();
      navigate('/');
    } catch (error) {
      console.error(error);
      setError('فشل الدخول كضيف');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-card-bg p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-border-color">
        <div className="w-20 h-20 bg-primary/10 border border-primary rounded-full flex items-center justify-center mx-auto mb-6 text-primary shadow-lg shadow-primary/20">
          <Coffee size={40} />
        </div>
        <h1 className="text-3xl font-bold text-text-light mb-2">كافيه سهرايا</h1>
        <p className="text-text-muted mb-6">مرحباً بك في نظام الطلبات الإلكتروني</p>
        
        {error && (
          <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-dark border border-border-color text-text-light rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:border-primary transition-colors text-right"
              placeholder="البريد الإلكتروني"
              dir="ltr"
            />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-dark border border-border-color text-text-light rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:border-primary transition-colors text-right"
              placeholder="كلمة المرور"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-bg-dark px-4 py-3 rounded-xl hover:bg-[#E5C158] transition-colors font-bold disabled:opacity-50"
          >
            {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-color"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card-bg text-text-muted">أو</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-bg-dark border border-border-color text-text-light px-4 py-3 rounded-xl hover:bg-border-color transition-colors font-medium"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
            تسجيل الدخول بحساب جوجل
          </button>
          
          <button
            onClick={handleGuestLogin}
            type="button"
            className="w-full bg-bg-dark border border-border-color text-text-light px-4 py-3 rounded-xl hover:bg-border-color transition-colors font-medium"
          >
            الدخول كضيف (للطلب السريع)
          </button>
        </div>
      </div>
    </div>
  );
}
