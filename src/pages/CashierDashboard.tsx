import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { LogOut, CheckCircle, Clock, XCircle, Printer, Wallet, Check, X, ExternalLink, Smartphone, Banknote, CreditCard, ArrowRight, Grid3X3, Coffee } from 'lucide-react';
import { updateDoc, addDoc } from 'firebase/firestore';
import { db, logout } from '../firebase';
import { tenantCollection as collection, tenantDoc as doc } from '../tenantBootstrap';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function CashierDashboard() {
  const navigate = useNavigate();
  const { orders, payments, user, settings } = useStore();
  const cafeDisplayName = settings?.cafeName || ((typeof window !== 'undefined' && (window as any).__TENANT_BRAND__?.name) as string) || 'كافيه سهرايا';
  const serviceChargePct = Number(settings?.serviceChargePct || 0);
  const vatPct = Number(settings?.vatPct || 0);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'tables' | 'orders' | 'payments'>('tables');
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  
  const [selectedTableForPayment, setSelectedTableForPayment] = useState<string | null>(null);
  const [selectedItemsForPayment, setSelectedItemsForPayment] = useState<string[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [actualCash, setActualCash] = useState<number>(0);

  const printRef = useRef<HTMLDivElement>(null);
  const printShiftRef = useRef<HTMLDivElement>(null);
  const [printingShift, setPrintingShift] = useState<any>(null);

  const { shifts } = useStore();
  const currentShift = shifts.find(s => s.status === 'open');

  const triggerPrint = (order: any) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintingOrder(null);
      }, 500);
    }, 100);
  };

  const triggerPrintShift = (shift: any) => {
    setPrintingShift(shift);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setPrintingShift(null);
      }, 500);
    }, 100);
  };

  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(o.status));
  const completedOrders = orders.filter(o => ['completed', 'cancelled'].includes(o.status)).slice(0, 20);

  const handleOpenShift = async () => {
    try {
      await addDoc(collection(db, 'shifts'), {
        startTime: new Date().toISOString(),
        startedBy: user?.uid,
        status: 'open',
        endTime: null,
        endedBy: null,
        cashCollected: null,
        expectedCash: null,
        totalSales: null,
        ordersCount: null
      });
      toast.success('تم فتح الشيفت بنجاح');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء فتح الشيفت');
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    
    // Calculate expected stats since shift start
    const shiftOrders = orders.filter(o => 
      o.status === 'completed' && 
      o.createdAt >= currentShift.startTime
    );
    
    const shiftPayments = payments.filter(p => 
      p.status === 'verified' && 
      p.createdAt >= currentShift.startTime
    );

    const totalSales = shiftOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const cashSales = shiftPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const walletSales = shiftPayments.filter(p => p.method !== 'cash').reduce((sum, p) => sum + p.amount, 0);

    const closedShiftData = {
      status: 'closed',
      endTime: new Date().toISOString(),
      endedBy: user?.uid,
      expectedCash: cashSales, // Assuming expected cash is cash payments collected
      cashCollected: actualCash,
      totalSales,
      ordersCount: shiftOrders.length,
      walletSales
    };

    try {
      await updateDoc(doc(db, 'shifts', currentShift.id), closedShiftData);
      toast.success('تم تقفيل الشيفت بنجاح');
      setIsShiftModalOpen(false);
      triggerPrintShift({ ...currentShift, ...closedShiftData });
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء إغلاق الشيفت');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };

  const verifyPayment = async (paymentId: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status,
        verifiedBy: user?.uid
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحديث حالة الدفع');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">قيد الانتظار</span>;
      case 'confirmed': return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">تم التأكيد</span>;
      case 'preparing': return <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">جاري التجهيز</span>;
      case 'ready': return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">جاهز</span>;
      case 'served': return <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">تم التقديم</span>;
      case 'completed': return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">مكتمل</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">ملغي</span>;
      default: return null;
    }
  };

  const OrderCard = ({ order }: { order: any }) => {
    const tableOrders = orders.filter(o => o.tableNumber === order.tableNumber && !['completed', 'cancelled'].includes(o.status));
    const tableTotal = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const tablePayments = payments.filter(p => p.tableNumber === order.tableNumber && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
    const remaining = tableTotal - tablePayments;

    return (
      <div className="bg-card-bg p-5 rounded-2xl shadow-sm border border-border-color flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-text-light">طاولة {order.tableNumber}</h3>
            <p className="text-sm text-text-muted mt-1">
              {format(new Date(order.createdAt), 'hh:mm a')} • {order.type === 'captain' ? 'طلب كابتن' : 'طلب عميل'}
            </p>
          </div>
          {getStatusBadge(order.status)}
        </div>
        
        <div className="flex-1 space-y-2 mb-4">
          {order.items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col text-text-light bg-bg-dark p-2 rounded-lg border border-border-color">
              <div className="flex justify-between font-medium text-sm">
                <span><span className="font-bold text-primary">{item.quantity}x</span> {item.name}</span>
                <span className="text-text-muted">{item.price * item.quantity} ج.م</span>
              </div>
              {item.note && (
                <span className="text-[10px] text-accent mt-1">ملاحظة: {item.note}</span>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border-color pt-4 mt-auto">
          <div className="space-y-1 mb-4">
            <div className="flex justify-between items-center text-xs text-text-muted">
              <span>إجمالي الطاولة</span>
              <span>{tableTotal} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-xs text-green-500">
              <span>تم دفع</span>
              <span>{tablePayments} ج.م</span>
            </div>
            <div className="flex justify-between items-center font-bold pt-1 border-t border-white/5">
              <span className="text-text-muted">الباقي</span>
              <span className={remaining <= 0 ? 'text-green-500' : 'text-primary'}>{remaining} ج.م</span>
            </div>
          </div>
          
          {['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(order.status) && (
            <div className="flex gap-2">
              {order.status === 'pending' && (
                <button onClick={() => updateOrderStatus(order.id, 'confirmed')} className="flex-1 bg-amber-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors">
                  تأكيد
                </button>
              )}
              {order.status === 'confirmed' && (
                <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                  تجهيز
                </button>
              )}
              {(order.status === 'preparing') && (
                <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                  جاهز
                </button>
              )}
              {order.status === 'ready' && (
                <button onClick={() => updateOrderStatus(order.id, 'served')} className="flex-1 bg-purple-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                  تقديم
                </button>
              )}
              {(order.status === 'served') && (
                <button 
                  onClick={() => {
                    updateOrderStatus(order.id, 'completed');
                    triggerPrint(order);
                  }} 
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${remaining <= 0 ? 'bg-green-500 text-bg-dark hover:bg-green-600' : 'bg-primary text-bg-dark hover:bg-[#E5C158]'}`}
                >
                  إنهاء
                </button>
              )}
              <button onClick={() => triggerPrint(order)} className="p-2 bg-bg-dark border border-border-color text-text-muted rounded-xl hover:text-text-light transition-colors" title="طباعة الفاتورة">
                <Printer size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const activeTables = Array.from(new Set(activeOrders.map(o => o.tableNumber)));

  const handlePartialPayment = async (mode: 'partial' | 'full', fullAmountRemaining?: number) => {
    if (!selectedTableForPayment || isProcessingPayment) return;
    setIsProcessingPayment(true);
    
    try {
      if (mode === 'full') {
         const tableOrders = activeOrders.filter(o => o.tableNumber === selectedTableForPayment);
         const unservedOrders = tableOrders.filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status));
         
         if (unservedOrders.length > 0) {
            toast.error('خطأ أمان: لا يمكن إغلاق حساب الطاولة! يوجد طلبات لم يتم تقديمها للعميل بعد (قيد الانتظار أو التجهيز).', { duration: 5000 });
            setIsProcessingPayment(false);
            return;
         }

         // Mark all orders for this table as completed
         for(let o of tableOrders) {
           await updateDoc(doc(db, 'orders', o.id), { status: 'completed' });
         }
         
         const tableTotal = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
         const allItems = tableOrders.flatMap(o => o.items);
         const combinedItems = Object.values(allItems.reduce((acc: any, curr: any) => {
             const key = curr.name + (curr.note || '');
             if (acc[key]) {
                 acc[key].quantity += curr.quantity;
             } else {
                 acc[key] = { ...curr };
             }
             return acc;
         }, {}));

         const pseudoOrder = {
             id: `T${selectedTableForPayment}-${Date.now().toString().slice(-4)}`,
             tableNumber: selectedTableForPayment,
             createdAt: new Date().toISOString(),
             items: combinedItems,
             totalAmount: tableTotal
         };
         triggerPrint(pseudoOrder);

         setSelectedTableForPayment(null);
         toast.success('تم دفع وإغلاق حساب الطاولة بالكامل وعرض الفاتورة');
      } else {
         // Partial Payment
         let amountToPay = 0;
         const updatesByOrder: Record<string, any[]> = {};

         selectedItemsForPayment.forEach(sel => {
            const [orderId, itemIdxStr] = sel.split('_');
            const itemIdx = parseInt(itemIdxStr);
            
            if (!updatesByOrder[orderId]) {
               updatesByOrder[orderId] = JSON.parse(JSON.stringify(orders.find(o => o.id === orderId)?.items || []));
            }
            const item = updatesByOrder[orderId][itemIdx];
            item.paidQuantity = (item.paidQuantity || 0) + 1;
            amountToPay += item.price;
         });

         if (amountToPay > 0) {
             // Add payment record
             await addDoc(collection(db, 'payments'), {
               tableNumber: selectedTableForPayment,
               amount: amountToPay,
               method: 'cash',
               status: 'verified',
               verifiedBy: user?.uid,
               createdAt: new Date().toISOString()
             });

             // Update orders
             for (const orderId of Object.keys(updatesByOrder)) {
                const updatedItems = updatesByOrder[orderId];
                const allPaid = updatedItems.every((i: any) => (i.paidQuantity || 0) >= i.quantity);
                const currentStatus = orders.find(o=>o.id === orderId)?.status;
                
                await updateDoc(doc(db, 'orders', orderId), { 
                  items: updatedItems,
                  status: (allPaid && currentStatus === 'served') ? 'completed' : currentStatus
                });
             }
             
             setSelectedItemsForPayment([]);
             toast.success(`تم دفع ${amountToPay} ج.م بنجاح`);
             // Close modal if all paid
             const updatedTableOrders = activeOrders.filter(o => o.tableNumber === selectedTableForPayment);
             const stillPending = updatedTableOrders.some(o => o.items.some((i:any) => (i.paidQuantity || 0) < i.quantity));
             if (!stillPending) {
                setSelectedTableForPayment(null);
             }
         } else {
             toast.error('الرجاء تحديد عناصر للدفع');
         }
      }
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء معالجة الدفع');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const renderTablePaymentModal = () => {
     if (!selectedTableForPayment) return null;
     
     const tableOrders = activeOrders.filter(o => o.tableNumber === selectedTableForPayment);
     const tableTotal = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
     const verifiedPayments = payments.filter(p => p.tableNumber === selectedTableForPayment && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
     
     // Build flattened array of UNPAID item units
     const unpaidItems: {orderId: string, itemIdx: number, unitIdx: number, name: string, price: number}[] = [];
     tableOrders.forEach(o => {
        o.items.forEach((item: any, idx: number) => {
           const unpaidQty = item.quantity - (item.paidQuantity || 0);
           for(let i=0; i<unpaidQty; i++) {
               unpaidItems.push({
                  orderId: o.id,
                  itemIdx: idx,
                  unitIdx: i,
                  name: item.name,
                  price: item.price
               });
           }
        });
     });

     const remaining = unpaidItems.reduce((sum, item) => sum + item.price, 0);
     const selectionTotal = selectedItemsForPayment.reduce((sum, sel) => {
        const item = unpaidItems.find(u => `${u.orderId}_${u.itemIdx}_${u.unitIdx}` === sel);
        return sum + (item ? item.price : 0);
     }, 0);

     const toggleItemSelection = (key: string) => {
        if (selectedItemsForPayment.includes(key)) {
           setSelectedItemsForPayment(prev => prev.filter(k => k !== key));
        } else {
           setSelectedItemsForPayment(prev => [...prev, key]);
        }
     };

     return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
           <div className="bg-card-bg p-6 rounded-3xl w-full max-w-2xl border border-border-color shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-2xl font-bold text-text-light">حساب طاولة {selectedTableForPayment}</h3>
                 </div>
                 <button onClick={() => { setSelectedTableForPayment(null); setSelectedItemsForPayment([]); }} className="text-text-muted hover:text-white transition-colors">
                    <X size={28} />
                 </button>
              </div>

              <div className="space-y-3 mb-6 bg-bg-dark p-4 rounded-xl border border-border-color">
                 {unpaidItems.length === 0 ? (
                    <div className="text-center text-text-muted py-8">لا يوجد حساب معلق لهذه الطاولة</div>
                 ) : (
                    unpaidItems.map((item) => {
                       const key = `${item.orderId}_${item.itemIdx}_${item.unitIdx}`;
                       const isSelected = selectedItemsForPayment.includes(key);
                       return (
                          <div 
                             key={key} 
                             onClick={() => toggleItemSelection(key)}
                             className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition-colors border ${isSelected ? 'bg-primary/20 border-primary text-text-light' : 'bg-card-bg border-border-color text-text-muted hover:bg-border-color'}`}
                          >
                             <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-primary border-primary text-bg-dark' : 'border-border-color'}`}>
                                   {isSelected && <Check size={14} strokeWidth={4} />}
                                </div>
                                <span className="font-medium text-lg">{item.name}</span>
                             </div>
                             <span className="font-bold">{item.price} ج.م</span>
                          </div>
                       );
                    })
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border-color pt-6">
                 <div className="bg-bg-dark p-4 rounded-xl text-center">
                    <p className="text-sm text-text-muted mb-1">المتبقي</p>
                    <p className="text-2xl font-bold text-accent">{remaining} ج.م</p>
                 </div>
                 <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl text-center">
                    <p className="text-sm text-text-muted mb-1">المحدد الآن</p>
                    <p className="text-2xl font-bold text-primary">{selectionTotal} ج.م</p>
                 </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                 <button 
                    onClick={() => handlePartialPayment('partial')}
                    disabled={selectedItemsForPayment.length === 0 || isProcessingPayment}
                    className="flex-1 py-4 bg-primary text-bg-dark rounded-xl font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg shadow-primary/20"
                 >
                    دفع وطباعة المحدد ({selectionTotal} ج.م)
                 </button>
                 <button 
                    onClick={() => handlePartialPayment('full', remaining)}
                    disabled={isProcessingPayment || unpaidItems.length === 0}
                    className="flex-1 py-4 bg-green-500 text-bg-dark rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50 text-lg shadow-lg shadow-green-500/20"
                 >
                    دفع وطباعة الفاتورة بالكامل
                 </button>
              </div>
           </div>
        </div>
     );
  };

  return (
    <div className="min-h-screen bg-bg-dark" dir="rtl">
      <header className="bg-card-bg shadow-sm sticky top-0 z-10 border-b border-border-color">

        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="p-2 text-text-muted hover:text-text-light transition-colors">
              <ArrowRight size={24} />
            </button>
            <h1 className="text-2xl font-bold text-primary">شاشة الكاشير</h1>
            <nav className="flex items-center gap-2">
              <button 
                onClick={() => setActiveTab('tables')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'tables' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color'}`}
              >
                <Grid3X3 size={18} />
                الطاولات
              </button>
              <button 
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color'}`}
              >
                الطلبات
              </button>
              <button 
                onClick={() => setActiveTab('payments')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'payments' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color'}`}
              >
                الدفعات
                {payments.filter(p => p.status === 'pending').length > 0 && (
                  <span className="bg-accent text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] animate-bounce">
                    {payments.filter(p => p.status === 'pending').length}
                  </span>
                )}
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {currentShift ? (
              <button 
                onClick={() => setIsShiftModalOpen(true)}
                className="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                تقفيل الشيفت
              </button>
            ) : (
              <button 
                onClick={handleOpenShift}
                className="bg-primary/20 text-primary hover:bg-primary hover:text-bg-dark px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                فتح شيفت جديد
              </button>
            )}
            <span className="text-sm font-medium text-text-muted">{user?.name}</span>
            <button onClick={() => logout()} className="p-2 text-text-muted hover:bg-border-color hover:text-text-light rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {renderTablePaymentModal()}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'tables' && (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold text-text-light flex items-center gap-2">
                 <Grid3X3 className="text-primary" /> الحسابات المفتوحة للمطعم
              </h2>
              {activeTables.length === 0 ? (
                 <div className="bg-card-bg p-12 rounded-3xl text-center text-text-muted border border-border-color">
                    لا توجد طاولات نشطة حالياً
                 </div>
              ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {activeTables.map(tableNumber => {
                       const tableOrders = activeOrders.filter(o => o.tableNumber === tableNumber);
                       const tableTotal = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                       const verifiedPayments = payments.filter(p => p.tableNumber === tableNumber && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
                       const remaining = tableTotal - verifiedPayments;
                       // Ensure there's remaining before rendering the button? No, it's nice to see all active tables.
                       return (
                          <button 
                             key={tableNumber}
                             onClick={() => setSelectedTableForPayment(tableNumber)}
                             className="bg-card-bg hover:bg-border-color transition-colors p-6 rounded-3xl border border-border-color flex flex-col items-center justify-center gap-4 text-center group"
                          >
                             <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="text-2xl font-black">{tableNumber}</span>
                             </div>
                             <div>
                                <p className="text-text-muted text-sm mb-1">المتبقي</p>
                                <p className="font-bold text-lg text-text-light">{remaining} ج.م</p>
                             </div>
                          </button>
                       );
                    })}
                 </div>
              )}
           </div>
        )}
        {activeTab === 'orders' && (
          <>
            <div className="mb-8">
              <h2 className="text-xl font-bold text-text-light mb-4 flex items-center gap-2">
                <Clock className="text-primary" /> الطلبات النشطة ({activeOrders.length})
              </h2>
              {activeOrders.length === 0 ? (
                <div className="bg-card-bg p-8 rounded-2xl text-center text-text-muted border border-border-color">
                  لا توجد طلبات نشطة حالياً
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeOrders.map(order => <OrderCard key={order.id} order={order} />)}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-light mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-500" /> آخر الطلبات المكتملة
              </h2>
              <div className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-bg-dark border-b border-border-color">
                      <tr>
                        <th className="px-6 py-3 text-sm font-medium text-text-muted">الوقت</th>
                        <th className="px-6 py-3 text-sm font-medium text-text-muted">الطاولة</th>
                        <th className="px-6 py-3 text-sm font-medium text-text-muted">النوع</th>
                        <th className="px-6 py-3 text-sm font-medium text-text-muted">الإجمالي</th>
                        <th className="px-6 py-3 text-sm font-medium text-text-muted">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                      {completedOrders.map(order => (
                        <tr key={order.id} className="hover:bg-bg-dark transition-colors cursor-pointer group" onClick={() => triggerPrint(order)}>
                          <td className="px-6 py-4 text-sm text-text-light">{format(new Date(order.createdAt), 'hh:mm a')}</td>
                          <td className="px-6 py-4 text-sm font-bold text-text-light">{order.tableNumber}</td>
                          <td className="px-6 py-4 text-sm text-text-muted">{order.type === 'captain' ? 'كابتن' : 'عميل'}</td>
                          <td className="px-6 py-4 text-sm font-bold text-primary">{order.totalAmount} ج.م</td>
                          <td className="px-6 py-4 flex items-center justify-between">
                            {getStatusBadge(order.status)}
                            <button className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-text-light hover:bg-border-color rounded-lg flex items-center gap-1" title="إعادة طباعة الفاتورة">
                               <Printer size={16} /> طباعة
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-text-light">إدارة الدفعات الإلكترونية والنقدية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {payments.filter(p => p.status === 'pending').length === 0 && (
                <div className="col-span-full py-20 text-center bg-card-bg rounded-3xl border border-dashed border-border-color text-text-muted">
                  لا توجد طلبات دفع معلقة
                </div>
              )}
              {payments.filter(p => p.status === 'pending').map(payment => (
                <div key={payment.id} className="bg-card-bg rounded-3xl border border-border-color overflow-hidden flex flex-col shadow-lg">
                  <div className="p-5 bg-bg-dark/50 flex justify-between items-center border-b border-border-color">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${payment.method === 'cash' ? 'bg-green-500/20 text-green-500' : payment.method === 'instapay' ? 'bg-purple-500/20 text-purple-500' : 'bg-blue-500/20 text-blue-500'}`}>
                        {payment.method === 'cash' ? <Banknote size={20} /> : payment.method === 'instapay' ? <CreditCard size={20} /> : <Smartphone size={20} />}
                      </div>
                      <span className="font-bold text-text-light text-lg">طاولة {payment.tableNumber}</span>
                    </div>
                    <span className="text-xs text-text-muted">{format(new Date(payment.createdAt), 'hh:mm a')}</span>
                  </div>
                  
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-text-muted text-sm">المبلغ المحول</span>
                      <span className="text-3xl font-black text-primary">{payment.amount} <span className="text-sm">ج.م</span></span>
                    </div>
                    <div className="bg-bg-dark p-3 rounded-2xl border border-border-color text-sm text-text-light">
                      <div className="flex justify-between mb-1">
                        <span className="text-text-muted">طريقة الدفع:</span>
                        <span className="font-bold">{payment.method === 'cash' ? 'نقدي' : payment.method === 'instapay' ? 'انستاباي' : `محفظة (${payment.walletProvider})`}</span>
                      </div>
                    </div>
                    {payment.proofImageUrl && (
                      <button 
                        onClick={() => setSelectedProof(payment.proofImageUrl!)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary/20 transition-all font-bold group"
                      >
                        <ExternalLink size={18} className="group-hover:scale-110 transition-transform" />
                        عرض إثبات الدفع
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 bg-bg-dark/30 border-t border-border-color grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => verifyPayment(payment.id, 'verified')}
                      className="flex items-center justify-center gap-2 bg-green-500 text-bg-dark py-3 rounded-xl font-bold hover:bg-green-600 transition-colors"
                    >
                      <Check size={18} /> تأكيد
                    </button>
                    <button 
                      onClick={() => verifyPayment(payment.id, 'rejected')}
                      className="flex items-center justify-center gap-2 bg-accent/10 text-accent py-3 rounded-xl font-bold hover:bg-accent/20 transition-colors"
                    >
                      <X size={18} /> رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Proof Modal */}
      <AnimatePresence>
        {selectedProof && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProof(null)} className="fixed inset-0 bg-black/95 z-[60] backdrop-blur-md flex items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative max-w-2xl w-full h-full flex items-center justify-center">
                  <img src={selectedProof} alt="Payment Proof" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" referrerPolicy="no-referrer" />
                  <button onClick={() => setSelectedProof(null)} className="absolute top-4 right-4 bg-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-colors">
                    <X size={32} />
                  </button>
               </motion.div>
            </motion.div>
          </>
        )}

        {isShiftModalOpen && currentShift && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-card-bg w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border-color"
            >
              <div className="p-6 border-b border-border-color flex justify-between items-center bg-bg-dark/50">
                <h3 className="text-xl font-bold text-text-light flex items-center gap-2">
                  <Clock className="text-primary" />
                  تقفيل الشيفت
                </h3>
                <button onClick={() => setIsShiftModalOpen(false)} className="text-text-muted hover:text-text-light">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-bg-dark rounded-xl p-4 border border-border-color">
                  <p className="text-sm text-text-muted mb-1">وقت البداية</p>
                  <p className="font-bold text-text-light">{format(new Date(currentShift.startTime), 'p', { locale: ar })}</p>
                </div>
                
                {(() => {
                  const shiftOrders = orders.filter(o => o.status === 'completed' && o.createdAt >= currentShift.startTime);
                  const shiftPayments = payments.filter(p => p.status === 'verified' && p.createdAt >= currentShift.startTime);
                  
                  const totalSales = shiftOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                  const cashSales = shiftPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
                  const walletSales = shiftPayments.filter(p => p.method !== 'cash').reduce((sum, p) => sum + p.amount, 0);
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-bg-dark rounded-xl p-4 border border-border-color">
                          <p className="text-sm text-text-muted mb-1">إجمالي المبيعات</p>
                          <p className="text-xl font-black text-text-light">{totalSales} ج.م</p>
                        </div>
                        <div className="bg-bg-dark rounded-xl p-4 border border-border-color">
                          <p className="text-sm text-text-muted mb-1">الطلبات المكتملة</p>
                          <p className="text-xl font-black text-text-light">{shiftOrders.length}</p>
                        </div>
                        <div className="bg-bg-dark rounded-xl p-4 border border-border-color">
                          <p className="text-sm text-text-muted mb-1">نقدي (كاش)</p>
                          <p className="text-xl font-black text-green-500">{cashSales} ج.م</p>
                        </div>
                        <div className="bg-bg-dark rounded-xl p-4 border border-border-color">
                          <p className="text-sm text-text-muted mb-1">محافظ بنكية</p>
                          <p className="text-xl font-black text-indigo-400">{walletSales} ج.م</p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <label className="block text-sm font-medium text-text-light mb-2">النقدية الفعلية بالدرج (إختياري)</label>
                        <input
                          type="number"
                          value={actualCash || ''}
                          onChange={(e) => setActualCash(Number(e.target.value))}
                          className="w-full bg-bg-dark border border-border-color rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                          placeholder="أدخل المبلغ الموجود بالدرج"
                        />
                        {actualCash > 0 && (
                          <div className={`mt-2 text-sm font-bold ${actualCash === cashSales ? 'text-green-500' : actualCash > cashSales ? 'text-primary' : 'text-red-500'}`}>
                            {actualCash === cashSales ? 'الدرج مضبوط' : actualCash > cashSales ? `زيادة قدرها ${actualCash - cashSales} ج.م` : `عجز قدره ${cashSales - actualCash} ج.م`}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}

                <button
                  onClick={handleCloseShift}
                  className="w-full bg-red-600/20 text-red-500 border border-red-500/50 py-3 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-colors mt-6"
                >
                  تأكيد وتقفيل الشيفت
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Printable Receipt */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print-receipt {
            display: block !important;
            width: 80mm;
            padding: 4mm;
            background-color: white;
            color: black;
            box-sizing: border-box;
          }
        }
      `}</style>
      <div className="hidden print:block print-receipt">
        <div ref={printRef} className="w-full text-black bg-white font-sans" dir="rtl">
          {printingOrder && (() => {
            const sub = Number(printingOrder.totalAmount || 0);
            const srvFee = Math.round(sub * (serviceChargePct / 100));
            const vatFee = Math.round(sub * (vatPct / 100));
            const grandTotal = sub + srvFee + vatFee;
            return (
            <div className="flex flex-col text-sm">
              <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-2">
                <h2 className="text-2xl font-black mb-1">{cafeDisplayName}</h2>
                {settings?.commercialRegister && <p className="text-[11px]">سجل تجاري: {settings.commercialRegister}</p>}
                {settings?.taxCardNumber && <p className="text-[11px]">بطاقة ضريبية: {settings.taxCardNumber}</p>}
                <p className="text-xs">رقم الطلب: {printingOrder.id.slice(-6).toUpperCase()}</p>
                <p className="text-xs">{format(new Date(), 'PPpp', { locale: ar })}</p>
                <p className="text-xl font-bold mt-2">طاولة: {printingOrder.tableNumber}</p>
              </div>
              <div className="mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dashed border-gray-400">
                      <th className="text-right py-1 w-1/2">الصنف</th>
                      <th className="text-center py-1 w-1/4">كمية</th>
                      <th className="text-left py-1 w-1/4">سعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingOrder.items.map((item: any, idx: number) => (
                      <tr key={idx} className="border-b border-dashed border-gray-200">
                        <td className="py-2 pr-1">
                          <div className="font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[35mm]">{item.name}</div>
                          {item.note && <div className="text-[10px] text-gray-600 line-clamp-2">({item.note})</div>}
                        </td>
                        <td className="text-center py-2">{item.quantity}</td>
                        <td className="text-left py-2 pl-1 truncate max-w-[15mm]">{item.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(srvFee > 0 || vatFee > 0) && (
                <div className="text-xs space-y-1 border-t border-dashed border-gray-300 pt-2 mb-2">
                  <div className="flex justify-between"><span>المجموع الفرعي:</span><span>{sub} ج.م</span></div>
                  {srvFee > 0 && <div className="flex justify-between"><span>خدمة صالة ({serviceChargePct}%):</span><span>{srvFee} ج.م</span></div>}
                  {vatFee > 0 && <div className="flex justify-between"><span>ضريبة VAT ({vatPct}%):</span><span>{vatFee} ج.م</span></div>}
                </div>
              )}
              <div className="flex justify-between items-center font-black border-t-2 border-black pt-2 border-dashed">
                <span className="text-lg">الإجمالي:</span>
                <span className="text-lg">{grandTotal} ج.م</span>
              </div>
              <div className="text-center mt-6 text-xs w-full border-t border-dashed border-gray-400 pt-2">
                <p className="font-bold">شكراً لزيارتكم!</p>
                <p className="mt-1">الكاشير: {user?.name}</p>
              </div>
            </div>
            );
          })()}
          
          {printingShift && (
            <div className="flex flex-col text-sm">
              <div className="text-center mb-4 border-b border-dashed border-gray-400 pb-2">
                <h2 className="text-2xl font-black mb-1">{cafeDisplayName}</h2>
                <h3 className="text-lg font-bold">تقفيل شيفت</h3>
                <p className="text-xs mt-1">بداية: {format(new Date(printingShift.startTime), 'p', { locale: ar })}</p>
                <p className="text-xs">نهاية: {format(new Date(printingShift.endTime), 'p', { locale: ar })}</p>
              </div>
              <div className="mb-4 text-base font-bold space-y-2">
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>إجمالي المبيعات:</span>
                  <span>{printingShift.totalSales} ج.م</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>الطلبات:</span>
                  <span>{printingShift.ordersCount}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1 text-green-700">
                  <span>نقدي (كاش):</span>
                  <span>{printingShift.expectedCash} ج.م</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1 text-indigo-700">
                  <span>محافظ بنكية:</span>
                  <span>{printingShift.walletSales} ج.م</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-1">
                  <span>الدرج مراجعة:</span>
                  <span>{printingShift.cashCollected} ج.م</span>
                </div>
              </div>
              <div className="text-center mt-6 w-full border-t border-dashed border-gray-400 pt-2">
                <p className="mt-1">الكاشير: {user?.name}</p>
                <p className="text-[10px] mt-2">{format(new Date(), 'PPpp', { locale: ar })}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
