import { useStore } from '../store';
import { ClipboardCheck, CheckCircle2, Clock, MapPin, Phone, User, Check, Utensils, ArrowRight } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function CaptainDashboard() {
  const navigate = useNavigate();
  const { orders } = useStore();
  
  // Orders for the captain:
  // 1. Pending orders to confirm.
  // 2. Ready orders to serve.
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const confirmOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تأكيد الطلب');
    }
  };

  const serveOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'served'
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark p-6" dir="rtl">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-text-light transition-colors">
            <ArrowRight size={28} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-text-light">لوحة تحكم الكابتن</h1>
            <p className="text-text-muted">تأكيد وتسليم الطلبات</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Confirmation */}
        <section>
          <div className="flex items-center gap-3 mb-6 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
            <ClipboardCheck className="text-amber-500" size={24} />
            <h2 className="text-xl font-bold text-text-light">طلبات بانتظار التأكيد ({pendingOrders.length})</h2>
          </div>
          
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {pendingOrders.length === 0 ? (
                <p className="text-text-muted text-center py-8">لا توجد طلبات جديدة</p>
              ) : (
                pendingOrders.map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card-bg rounded-2xl border border-border-color overflow-hidden"
                  >
                    <div className="p-4 bg-bg-dark/50 flex justify-between items-center border-b border-border-color">
                      <span className="text-lg font-bold text-text-light">طاولة {order.tableNumber}</span>
                      <span className="text-text-muted text-xs">{new Date(order.createdAt).toLocaleTimeString('ar-EG')}</span>
                    </div>
                    <div className="p-4 space-y-2">
                       {order.customerName && <div className="flex items-center gap-2 text-sm text-text-light"><User size={14} className="text-primary"/> {order.customerName}</div>}
                       {order.customerMobile && <div className="flex items-center gap-2 text-sm text-text-muted"><Phone size={14}/> {order.customerMobile}</div>}
                       <div className="pt-2 border-t border-border-color">
                         {order.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between text-sm py-1">
                             <span className="text-text-light">{item.quantity}x {item.name}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                    <div className="p-3 bg-bg-dark/20 border-t border-border-color">
                      <button 
                        onClick={() => confirmOrder(order.id)}
                        className="w-full bg-primary text-bg-dark py-2 rounded-xl font-bold hover:bg-[#E5C158] transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={18} />
                        تأكيد وإرسال للمطبخ
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Ready to Serve */}
        <section>
          <div className="flex items-center gap-3 mb-6 bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
            <Utensils className="text-green-500" size={24} />
            <h2 className="text-xl font-bold text-text-light">طلبات جاهزة للتسليم ({readyOrders.length})</h2>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {readyOrders.length === 0 ? (
                <p className="text-text-muted text-center py-8">لا توجد طلبات جاهزة</p>
              ) : (
                readyOrders.map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card-bg rounded-2xl border border-green-500/30 overflow-hidden shadow-lg shadow-green-500/5"
                  >
                    <div className="p-4 bg-green-500/10 flex justify-between items-center border-b border-green-500/20">
                      <span className="text-lg font-bold text-green-400">طاولة {order.tableNumber}</span>
                      <span className="bg-green-500 text-bg-dark text-[10px] px-2 py-0.5 rounded font-bold">جاهز!</span>
                    </div>
                    <div className="p-4">
                       <div className="space-y-1">
                         {order.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                             <span className="text-text-light">{item.quantity}x {item.name}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                    <div className="p-3 bg-bg-dark/20 border-t border-border-color">
                      <button 
                        onClick={() => serveOrder(order.id)}
                        className="w-full bg-green-500 text-bg-dark py-2 rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        تم تقديم الطلب للعميل
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
