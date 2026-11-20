import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Smartphone, Banknote, CreditCard, Upload, CheckCircle2, AlertCircle, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, loginAnonymously } from '../firebase';
import { uploadToImgBB } from '../lib/upload';
import { motion, AnimatePresence } from 'framer-motion';

const WALLET_PROVIDERS = [
  { id: 'vodafone', name: 'فودافون كاش', color: 'bg-red-600', code: '*9*7*' },
  { id: 'orange', name: 'أورنج كاش', color: 'bg-orange-500', code: '*115*1*' },
  { id: 'etisalat', name: 'اتصالات كاش', color: 'bg-green-600', code: '*777*1*' },
  { id: 'we', name: 'وي باي', color: 'bg-purple-600', code: '*999*1*' },
];

export function PaymentScreen() {
  const { tableNumber } = useParams();
  const navigate = useNavigate();
  const { orders, payments, user, settings } = useStore();
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'mobile_wallet' | 'instapay' | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Recipient info from settings
  const walletNumber = settings?.walletNumber || ""; 
  const instapayNumber = settings?.instapayNumber || "";
  const instapayLink = settings?.instapayLink || "";

  const tableOrders = orders.filter(o => o.tableNumber === tableNumber && !['completed', 'cancelled'].includes(o.status));
  const tableTotal = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const tablePayments = payments.filter(p => p.tableNumber === tableNumber && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = tableTotal - tablePayments;

  useEffect(() => {
    if (remainingBalance > 0) {
      setAmount(remainingBalance.toString());
    }
  }, [remainingBalance]);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }

    if ((selectedMethod === 'mobile_wallet' || selectedMethod === 'instapay') && !proofFile) {
      alert('الرجاء رفع إثبات الدفع (صورة التحويل)');
      return;
    }

    setIsSubmitting(true);
    try {
      let currentUser = user;
      if (!currentUser) {
        const cred = await loginAnonymously();
        currentUser = { uid: cred.uid, name: 'Guest', email: '', role: 'customer', createdAt: new Date().toISOString() };
      }

      let proofUrl = '';
      if (proofFile) {
        proofUrl = await uploadToImgBB(proofFile);
      }

      await addDoc(collection(db, 'payments'), {
        tableNumber,
        amount: Number(amount),
        method: selectedMethod,
        walletProvider: selectedWallet || (selectedMethod === 'instapay' ? 'instapay' : null),
        proofImageUrl: proofUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تسجيل الدفع');
    }
    setIsSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center p-6 text-center" dir="rtl">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card-bg p-8 rounded-3xl border border-border-color shadow-2xl max-w-md w-full">
          <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold text-text-light mb-2">تم إرسال الطلب بنجاح!</h2>
          <p className="text-text-muted mb-8">سيقوم الكاشير بمراجعة الدفع وتأكيد الحساب فوراً.</p>
          <button onClick={() => navigate(`/table/${tableNumber}`)} className="w-full bg-primary text-bg-dark py-4 rounded-xl font-bold hover:bg-[#E5C158] transition-colors">
            العودة للمنيو
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark p-6" dir="rtl">
      <header className="max-w-xl mx-auto mb-8 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-text-light">
          <ArrowRight size={24} />
        </button>
        <h1 className="text-xl font-bold text-text-light">دفع حساب طاولة {tableNumber}</h1>
        <div className="w-10"></div>
      </header>

      <main className="max-w-xl mx-auto space-y-6">
        {/* Balance Card */}
        <div className="bg-primary p-6 rounded-3xl text-bg-dark shadow-xl">
          <span className="text-sm font-medium opacity-80">الباقي المطلوب سداده</span>
          <div className="text-4xl font-black mt-1">{remainingBalance} <span className="text-lg">ج.م</span></div>
          {tableTotal > remainingBalance && (
            <div className="mt-4 pt-4 border-t border-black/10 text-sm font-medium">
              تم دفع {tablePayments} ج.م من أصل {tableTotal} ج.م
            </div>
          )}
        </div>

        {/* Method Selection */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-text-light">اختر طريقة الدفع</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => { setSelectedMethod('cash'); setSelectedWallet(null); }}
              className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${selectedMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border-color bg-card-bg hover:border-primary/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 text-green-500 rounded-xl">
                  <Banknote size={24} />
                </div>
                <div className="text-right">
                  <div className="font-bold text-text-light">نقدي (Cash)</div>
                  <div className="text-xs text-text-muted">الدفع مباشرة للكاشير</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('mobile_wallet')}
              className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${selectedMethod === 'mobile_wallet' ? 'border-primary bg-primary/5' : 'border-border-color bg-card-bg hover:border-primary/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 text-blue-500 rounded-xl">
                  <Smartphone size={24} />
                </div>
                <div className="text-right">
                  <div className="font-bold text-text-light">محفظة إلكترونية</div>
                  <div className="text-xs text-text-muted">فودافون، أورنج، اتصالات، وي</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setSelectedMethod('instapay'); setSelectedWallet(null); }}
              className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${selectedMethod === 'instapay' ? 'border-primary bg-primary/5' : 'border-border-color bg-card-bg hover:border-primary/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/20 text-purple-500 rounded-xl">
                  <CreditCard size={24} />
                </div>
                <div className="text-right">
                  <div className="font-bold text-text-light">Instapay</div>
                  <div className="text-xs text-text-muted">تحويل سريع عبر انستاباي</div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Dynamic Payment Details */}
        <AnimatePresence mode="wait">
          {selectedMethod === 'mobile_wallet' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card-bg p-6 rounded-3xl border border-border-color space-y-4">
              <h3 className="font-bold text-text-light">اختر مزود الخدمة</h3>
              <div className="grid grid-cols-2 gap-2">
                {WALLET_PROVIDERS.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWallet(w.id)}
                    className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${selectedWallet === w.id ? 'border-primary bg-primary/10 text-primary' : 'border-border-color text-text-muted hover:border-primary/50'}`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
              
              {selectedWallet && (
                <div className="mt-4 p-4 bg-bg-dark rounded-2xl border border-border-color">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-text-muted">رقم التحويل</span>
                    <span className="text-lg font-bold text-text-light font-mono">{walletNumber}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-text-muted">كود التحويل السريع</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-bold text-primary font-mono tracking-wider break-all text-left w-full" dir="ltr">
                        {WALLET_PROVIDERS.find(w => w.id === selectedWallet)?.code}{walletNumber}*{amount}#
                      </span>
                      <a 
                        href={`tel:${WALLET_PROVIDERS.find(w => w.id === selectedWallet)?.code}${walletNumber}*${amount}#`}
                        className="text-sm font-bold text-bg-dark bg-primary px-4 py-1.5 rounded-lg hover:bg-[#E5C158] transition-colors inline-block"
                      >
                        اضغط للاتصال
                      </a>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-xl flex items-start gap-2 text-[10px] text-amber-500 leading-tight">
                    <AlertCircle size={14} className="shrink-0" />
                    تحذير: تأكد من تحويل المبلغ المطلوب بالضبط قبل رفع الإثبات.
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {selectedMethod === 'instapay' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card-bg p-6 rounded-3xl border border-border-color space-y-4 text-center">
              <div className="grid grid-cols-2 gap-4">
                {instapayNumber && (
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(instapayNumber);
                      alert('تم نسخ رقم انستاباي بنجاح');
                    }}
                    className="p-4 bg-bg-dark rounded-2xl border border-border-color hover:border-primary transition-colors flex flex-col items-center gap-2"
                  >
                     <p className="text-xs text-text-muted">نسخ رقم الموبايل</p>
                     <span className="text-lg font-black text-primary font-mono">{instapayNumber}</span>
                  </button>
                )}
                {instapayLink && (
                  <a 
                    href={instapayLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 hover:border-purple-500 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                     <p className="text-sm font-bold text-purple-400">فتح تطبيق إنستاباي</p>
                     <CreditCard size={24} className="text-purple-400" />
                  </a>
                )}
              </div>
              {!instapayNumber && !instapayLink && (
                <p className="text-xs text-accent">لم يتم إعداد إنستاباي من الإدارة.</p>
              )}
              <p className="text-xs text-text-muted mt-4">حول المبلغ المطلوب ثم قم برفع لقطة شاشة للتحويل (Screenshot).</p>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedMethod && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-card-bg p-6 rounded-3xl border border-border-color space-y-4">
              <label className="block text-sm font-bold text-text-light">المبلغ المراد دفعه</label>
              <div className="relative">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-bg-dark border border-border-color rounded-xl px-5 py-4 text-2xl font-bold text-text-light focus:border-primary focus:outline-none"
                  placeholder="0.00"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-bold">ج.م</span>
              </div>

              {(selectedMethod === 'mobile_wallet' || selectedMethod === 'instapay') && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-text-light">إرفاق صورة التحويل</label>
                  <div className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${proofFile ? 'border-primary bg-primary/5' : 'border-border-color hover:border-primary/50'}`}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {proofFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="text-primary" size={32} />
                        <span className="text-xs text-text-light line-clamp-1">{proofFile.name}</span>
                        <button onClick={() => setProofFile(null)} className="text-[10px] text-accent font-bold mt-1">تغيير الصورة</button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="text-text-muted" size={32} />
                        <span className="text-xs text-text-muted">اضغط لرفع لقطة الشاشة (Screenshot)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedMethod}
              className="w-full bg-primary text-bg-dark py-5 rounded-2xl font-bold text-lg hover:bg-[#E5C158] disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3 shadow-xl shadow-primary/10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  جاري معالجة الدفع...
                </>
              ) : (
                'تأكيد الدفع'
              )}
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
