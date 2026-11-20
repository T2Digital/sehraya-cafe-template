import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ShoppingCart, Plus, Minus, Coffee, LogOut, History, CreditCard } from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, logout, loginAnonymously } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function CustomerMenu() {
  const { tableNumber: urlTableNumber } = useParams();
  const navigate = useNavigate();
  const { categories, menuItems, cart, addToCart, removeFromCart, updateCartItemNote, clearCart, user, tableNumber, setTableNumber, orders } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  useEffect(() => {
    if (urlTableNumber) {
      setTableNumber(urlTableNumber);
    }
    if (categories.length > 0) {
      if (!activeCategory || !categories.find(c => c.id === activeCategory)) {
        setActiveCategory(categories[0].id);
      }
    } else {
      setActiveCategory('');
    }
  }, [urlTableNumber, categories, activeCategory, setTableNumber]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!tableNumber) {
      toast.error('الرجاء إدخال رقم الطاولة');
      return;
    }
    if (cart.length === 0) return;

    let currentUser = user;
    if (!currentUser) {
      try {
        const cred = await loginAnonymously();
        currentUser = { uid: cred.uid, name: 'ضيف', email: '', role: 'customer', createdAt: new Date().toISOString() };
      } catch (e) {
        toast.error('حدث خطأ أثناء تسجيل الدخول');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderData: any = {
        tableNumber,
        items: cart.map(item => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          note: item.note || ''
        })),
        status: 'pending',
        totalAmount: cartTotal,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        type: 'customer'
      };

      if (customerName) orderData.customerName = customerName;
      if (customerMobile) orderData.customerMobile = customerMobile;

      await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      setIsCartOpen(false);
      toast.success('تم إرسال طلبك بنجاح!');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    }
    setIsSubmitting(false);
  };

  const filteredItems = menuItems.filter(item => item.categoryId === activeCategory && item.isAvailable);
  const myOrders = orders.filter(o => o.createdBy === user?.uid);

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled'
      });
      toast.success('تم إلغاء الطلب');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إلغاء الطلب');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark pb-24" dir="rtl">
      {/* Header */}
      <header className="bg-card-bg shadow-sm sticky top-0 z-10 border-b border-border-color">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Coffee size={28} />
            <h1 className="text-2xl font-bold text-text-light">سهرايا</h1>
          </div>
          <div className="flex items-center gap-4">
            {tableNumber && (
              <button 
                onClick={() => navigate(`/pay/${tableNumber}`)}
                className="flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1.5 rounded-xl border border-green-500/20 text-sm font-bold animate-pulse"
              >
                <CreditCard size={18} />
                <span>دفع الحساب</span>
              </button>
            )}
            {!user ? (
              <button onClick={() => navigate('/login')} className="text-sm font-medium text-primary hover:text-white transition-colors">تسجيل الدخول</button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-text-muted hover:bg-border-color hover:text-text-light rounded-full transition-colors">
                  <History size={20} />
                </button>
                <button onClick={() => logout()} className="p-2 text-text-muted hover:bg-border-color hover:text-text-light rounded-full transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Categories Scroll */}
        <div className="max-w-4xl mx-auto px-4 py-4 overflow-x-auto whitespace-nowrap hide-scrollbar flex gap-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center gap-2 min-w-[72px] transition-all ${
                activeCategory === cat.id ? 'scale-105' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center border-2 transition-colors ${
                activeCategory === cat.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-border-color bg-card-bg'
              }`}>
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Coffee size={24} className={activeCategory === cat.id ? 'text-primary' : 'text-text-muted'} />
                )}
              </div>
              <span className={`text-sm font-medium ${
                activeCategory === cat.id ? 'text-primary' : 'text-text-muted'
              }`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="col-span-full text-center py-12 text-text-muted bg-card-bg rounded-2xl border border-border-color"
              >
                لا توجد أصناف متاحة في هذا القسم حالياً.
              </motion.div>
            ) : (
              filteredItems.map(item => {
                const cartItem = cart.find(c => c.id === item.id);
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={item.id} 
                    className="bg-card-bg rounded-2xl shadow-sm border border-border-color flex flex-col overflow-hidden group"
                  >
                    <div className="relative h-32 sm:h-40 w-full bg-bg-dark border-b border-border-color overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      ) : (
                        <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80" alt={item.name} className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      )}
                    </div>
                    
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-text-light text-sm sm:text-base line-clamp-1">{item.name}</h3>
                      {item.description && <p className="text-text-muted text-xs mt-1 line-clamp-2">{item.description}</p>}
                      
                      <div className="mt-auto pt-3 flex items-center justify-between">
                        <p className="text-primary font-bold text-sm sm:text-base">{item.price} ج.م</p>
                        
                        <div className="flex items-center gap-2 bg-bg-dark rounded-full p-1 border border-border-color">
                          {cartItem ? (
                            <>
                              <button 
                                onClick={() => addToCart(item)}
                                className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-card-bg rounded-full shadow-sm text-primary hover:bg-border-color transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                              <span className="w-3 sm:w-4 text-center font-medium text-text-light text-xs sm:text-sm">{cartItem.quantity}</span>
                              <button 
                                onClick={() => removeFromCart(item.id)}
                                className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-card-bg rounded-full shadow-sm text-text-muted hover:bg-border-color transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => addToCart(item)}
                              className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-40 max-w-4xl mx-auto">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-primary text-bg-dark p-4 rounded-2xl shadow-[0_8px_30px_rgba(212,175,55,0.3)] flex items-center justify-between hover:bg-[#E5C158] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-bg-dark/20 p-2 rounded-full relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-accent text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold border-2 border-primary">
                  {cartCount}
                </span>
              </div>
              <span className="font-bold text-lg">عرض الطلب</span>
            </div>
            <span className="font-bold text-xl">{cartTotal} ج.م</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-card-bg rounded-t-3xl z-50 max-h-[85vh] flex flex-col max-w-4xl mx-auto border-t border-border-color"
            >
              <div className="p-4 border-b border-border-color flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-light">طلبك</h2>
                <button onClick={() => setIsCartOpen(false)} className="text-text-muted hover:text-text-light p-2 transition-colors">إغلاق</button>
              </div>
              
              <div className="overflow-y-auto p-4 flex-1 space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex flex-col py-3 border-b border-border-color last:border-0 gap-3">
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-bg-dark border border-border-color flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                              <Coffee size={24} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-text-light">{item.name}</h4>
                          <p className="text-primary text-sm font-bold">{item.price} ج.م</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-bg-dark rounded-full p-1 border border-border-color">
                        <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center bg-card-bg rounded-full shadow-sm text-primary hover:bg-border-color transition-colors"><Plus size={18} /></button>
                        <span className="w-4 text-center font-medium text-text-light">{item.quantity}</span>
                        <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center bg-card-bg rounded-full shadow-sm text-text-muted hover:bg-border-color transition-colors"><Minus size={18} /></button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <input 
                        type="text" 
                        placeholder="ملاحظات الطلب (اختياري)..." 
                        className="w-full bg-bg-dark border border-border-color rounded-lg px-3 py-2 text-sm text-text-light focus:outline-none focus:border-primary"
                        value={item.note || ''}
                        onChange={(e) => updateCartItemNote(item.id, e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        {['بدون سكر', 'سكر خفيف', 'مظبوط', 'مانو', 'زيادة'].map(opt => {
                          const isSelected = item.note?.includes(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                let note = item.note || '';
                                ['بدون سكر', 'سكر خفيف', 'مظبوط', 'مانو', 'زيادة'].forEach(o => {
                                  note = note.replace(new RegExp(` - ${o}|${o} - |${o}`, 'g'), '');
                                });
                                note = note.trim();
                                if (isSelected) {
                                  updateCartItemNote(item.id, note === '-' ? '' : note);
                                } else {
                                  const sep = note && note !== '-' ? ' - ' : '';
                                  updateCartItemNote(item.id, note + sep + opt);
                                }
                              }}
                              className={`text-[10px] px-2 py-1.5 rounded-md border transition-colors ${isSelected ? 'bg-primary text-bg-dark border-primary font-bold' : 'bg-bg-dark text-text-muted border-border-color hover:border-primary/50'}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-bg-dark rounded-t-3xl border-t border-border-color shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                {!urlTableNumber && (
                  <div className="mb-4 bg-card-bg p-3 rounded-xl border border-border-color flex items-center gap-3">
                    <label className="font-medium text-text-light whitespace-nowrap text-sm">رقم الطاولة:</label>
                    <input 
                      type="text" 
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="أدخل رقم الطاولة"
                      className="flex-1 px-3 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-card-bg p-3 rounded-xl border border-border-color flex flex-col gap-2">
                    <label className="font-medium text-text-light text-xs">الاسم (اختياري):</label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="اسمك"
                      className="w-full px-3 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="bg-card-bg p-3 rounded-xl border border-border-color flex flex-col gap-2">
                    <label className="font-medium text-text-light text-xs">الموبايل (اختياري):</label>
                    <input 
                      type="tel" 
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="012XXXXXXXX"
                      className="w-full px-3 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-text-muted font-medium">الإجمالي</span>
                  <span className="text-2xl font-bold text-primary">{cartTotal} ج.م</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={isSubmitting || !tableNumber}
                  className="w-full bg-primary text-bg-dark py-4 rounded-xl font-bold text-lg hover:bg-[#E5C158] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'جاري الإرسال...' : !tableNumber ? 'أدخل رقم الطاولة أولاً' : 'تأكيد الطلب'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setIsHistoryOpen(false)}
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-0 left-0 right-0 bg-card-bg rounded-t-3xl z-50 max-h-[85vh] flex flex-col max-w-4xl mx-auto border-t border-border-color"
            >
              <div className="p-4 border-b border-border-color flex justify-between items-center">
                <h2 className="text-xl font-bold text-text-light">طلباتي السابقة</h2>
                <button onClick={() => setIsHistoryOpen(false)} className="text-text-muted hover:text-text-light p-2 transition-colors">إغلاق</button>
              </div>
              
              <div className="overflow-y-auto p-4 flex-1 space-y-4">
                {myOrders.length === 0 ? (
                  <div className="text-center text-text-muted py-10">لا توجد طلبات سابقة</div>
                ) : (
                  myOrders.map(order => (
                    <div key={order.id} className="bg-bg-dark p-4 rounded-xl border border-border-color">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-text-light">طاولة {order.tableNumber}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'cancelled' ? 'bg-accent/20 text-accent' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {order.status === 'pending' ? 'قيد الانتظار' :
                           order.status === 'preparing' ? 'جاري التجهيز' :
                           order.status === 'ready' ? 'جاهز' :
                           order.status === 'confirmed' ? 'تم التأكيد' :
                           order.status === 'served' ? 'تم التقديم' :
                           order.status === 'completed' ? 'مكتمل' : 'ملغي'}
                        </span>
                      </div>
                      <div className="space-y-3 mb-3">
                        {order.items.map((item, idx) => {
                          const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
                          return (
                            <div key={idx} className="flex gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-card-bg border border-border-color flex-shrink-0">
                                {menuItem?.imageUrl ? (
                                  <img src={menuItem.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                                    <Coffee size={18} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <span className="text-sm font-medium text-text-light">{item.quantity}x {item.name}</span>
                                  <span className="text-sm text-text-muted">{item.price * item.quantity} ج.م</span>
                                </div>
                                {item.note && (
                                  <p className="text-[10px] text-accent">ملاحظة: {item.note}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-border-color font-bold mb-3">
                        <span className="text-text-light">الإجمالي</span>
                        <span className="text-primary">{order.totalAmount} ج.م</span>
                      </div>
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => cancelOrder(order.id)}
                          className="w-full py-2 bg-accent/10 text-accent rounded-lg text-sm font-bold hover:bg-accent/20 transition-colors"
                        >
                          إلغاء الطلب
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
