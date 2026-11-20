import { useState } from 'react';
import { useStore } from '../store';
import { ChefHat, CheckCircle, Clock, Play, AlertCircle, ArrowRight } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export function KitchenDashboard() {
  const navigate = useNavigate();
  const { orders } = useStore();
  
  // Kitchen cares about confirmed orders to start preparing, and preparing orders to mark as ready.
  const activeOrders = orders
    .filter(o => ['confirmed', 'preparing'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark p-6" dir="rtl">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-text-light transition-colors">
            <ArrowRight size={32} />
          </button>
          <div className="bg-primary/20 p-3 rounded-2xl text-primary">
            <ChefHat size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-light">شاشة المطبخ</h1>
            <p className="text-text-muted">الطلبات الجارية للتجهيز</p>
          </div>
        </div>
        <div className="bg-card-bg px-6 py-3 rounded-2xl border border-border-color flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-text-light font-medium">بث حي</span>
        </div>
      </header>

      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted bg-card-bg rounded-3xl border border-dashed border-border-color">
          <ChefHat size={64} className="mb-4 opacity-20" />
          <p className="text-xl">لا توجد طلبات نشطة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {activeOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-card-bg rounded-3xl border-2 flex flex-col overflow-hidden transition-colors ${
                  order.status === 'preparing' ? 'border-primary/50 shadow-lg shadow-primary/5' : 'border-border-color'
                }`}
              >
                {/* Order Header */}
                <div className="p-5 border-b border-border-color bg-bg-dark/50 flex justify-between items-start">
                  <div>
                    <span className="text-text-muted text-xs block mb-1">طاولة</span>
                    <h2 className="text-2xl font-black text-text-light">{order.tableNumber}</h2>
                  </div>
                  <div className="text-left">
                    <span className="text-text-muted text-xs block mb-1 flex items-center gap-1 justify-end">
                      <Clock size={12} />
                      {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      order.status === 'preparing' ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {order.status === 'preparing' ? 'جاري التحضير' : 'تم التأكيد'}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                {(order.customerName || order.customerMobile) && (
                  <div className="px-5 py-2 bg-primary/5 border-b border-border-color flex gap-3 text-xs">
                    {order.customerName && <span className="text-text-light">👤 {order.customerName}</span>}
                    {order.customerMobile && <span className="text-text-muted">📱 {order.customerMobile}</span>}
                  </div>
                )}

                {/* Items List */}
                <div className="p-5 flex-1 space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="bg-bg-dark text-primary font-bold w-8 h-8 rounded-lg flex items-center justify-center border border-border-color shrink-0">
                        {item.quantity}
                      </div>
                      <div className="flex-1">
                        <p className="text-text-light font-bold leading-tight">{item.name}</p>
                        {item.note && (
                          <div className="mt-1 flex items-start gap-1 text-accent bg-accent/10 px-2 py-1 rounded-md text-xs">
                            <AlertCircle size={12} className="mt-0.5 shrink-0" />
                            <span>{item.note}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-4 bg-bg-dark/30 mt-auto border-t border-border-color grid grid-cols-1 gap-2">
                  {order.status === 'confirmed' ? (
                    <button
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="w-full bg-primary text-bg-dark py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#E5C158] transition-colors"
                    >
                      <Play size={18} />
                      ابدأ التجهيز
                    </button>
                  ) : (
                    <button
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="w-full bg-green-500 text-bg-dark py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle size={18} />
                      تم التجهيز
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
