import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { LogOut, Settings, Users, BarChart3, Printer, Plus, Edit, Trash2, UserPlus, TrendingUp, Clock, CheckCircle2, Package, ArrowDownCircle, ArrowUpCircle, ArrowUp, ArrowDown, GripVertical, Sparkles, Wand2, ChefHat, ClipboardList, Home, Wallet, Calculator, QrCode } from 'lucide-react';
import { updateDoc, deleteDoc, addDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db, logout, secondaryAuth } from '../firebase';
import { tenantCollection as collection, tenantDoc as doc } from '../tenantBootstrap';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { SeedData } from '../SeedData';
import { getBusinessInsights, generateMenuItemImage } from '../services/geminiService';
import { uploadToImgBB } from '../lib/upload';
import ReactMarkdown from 'react-markdown';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '../components/SortableItem';

import { Accounting } from './Accounting';
import toast from 'react-hot-toast';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, users, categories, menuItems, orders, inventoryItems, inventoryTransactions, settings } = useStore();
  const [activeTab, setActiveTab] = useState('stats');
  const [statsDateFilter, setStatsDateFilter] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImage, setNewItemImage] = useState<File | null>(null);
  const [newItemImageUrl, setNewItemImageUrl] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // New Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState<File | null>(null);
  const [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Edit State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // New User State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('cashier');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [aiInsights, setAiInsights] = useState('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Inventory State
  const [newInvName, setNewInvName] = useState('');
  const [newInvUnit, setNewInvUnit] = useState('');
  const [isAddingInv, setIsAddingInv] = useState(false);
  const [invTransaction, setInvTransaction] = useState<{itemId: string, type: 'in'|'out', quantity: string, note: string} | null>(null);

  const filteredCompletedOrders = orders.filter(o => {
    if (o.status !== 'completed') return false;
    const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
    return orderDate >= statsDateFilter.start && orderDate <= statsDateFilter.end;
  });

  const periodSales = filteredCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const periodOrdersCount = filteredCompletedOrders.length;

  const totalSales = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
  const todaySales = orders.filter(o => o.status === 'completed' && new Date(o.createdAt).toDateString() === new Date().toDateString()).reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrders = orders.filter(o => o.status === 'completed').length;
  const activeOrdersCount = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
  const openTableOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));

  // Group open orders by table for display
  const openTables = openTableOrders.reduce((acc, order) => {
    if (!acc[order.tableNumber]) acc[order.tableNumber] = [];
    acc[order.tableNumber].push(order);
    return acc;
  }, {} as Record<string, typeof orders>);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndCategories = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Update local state immediately for smooth UI
      // useStore.getState().setCategories(newCategories); // This might be handled by onSnapshot, but let's update Firestore

      const batch = writeBatch(db);
      newCategories.forEach((cat, index) => {
        batch.update(doc(db, 'categories', cat.id), { order: index });
      });
      await batch.commit();
    }
  };

  const handleDragEndMenuItems = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const categoryItems = menuItems.filter(item => item.categoryId === categoryId);
      const oldIndex = categoryItems.findIndex((i) => i.id === active.id);
      const newIndex = categoryItems.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(categoryItems, oldIndex, newIndex);

      const batch = writeBatch(db);
      newItems.forEach((item, index) => {
        batch.update(doc(db, 'menuItems', item.id), { order: index });
      });
      await batch.commit();
    }
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const salesSummary = orders
        .filter(o => o.status === 'completed')
        .map(o => `Order ${o.id}: ${o.totalAmount} EGP, Items: ${o.items.map(i => i.name).join(', ')}`)
        .join('\n');
      
      const insights = await getBusinessInsights('Analyze my sales and suggest improvements for my cafe.', salesSummary);
      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('حدث خطأ أثناء توليد التحليلات');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateAIImage = async (itemName: string, isEditing: boolean = false) => {
    if (!itemName) {
      alert('الرجاء إدخال اسم الصنف أولاً');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const prompt = `A professional food photography of ${itemName}, high resolution, appetizing, studio lighting, on a cafe table background.`;
      const base64Image = await generateMenuItemImage(prompt);
      if (base64Image) {
        // Upload the base64 image to ImgBB immediately to get a URL
        const uploadedUrl = await handleImageUpload(base64Image);
        
        if (isEditing && editingItem) {
          setEditingItem({ ...editingItem, newImageUrl: uploadedUrl });
        } else {
          setNewItemImageUrl(uploadedUrl);
        }
        alert('تم توليد ورفع الصورة بنجاح');
      } else {
        alert('فشل توليد الصورة');
      }
    } catch (error) {
      console.error('Error generating AI image:', error);
      alert('حدث خطأ أثناء توليد الصورة');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const toggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'menuItems', itemId), { isAvailable: !currentStatus });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      console.error('Error updating role:', error);
      alert('حدث خطأ أثناء تحديث الصلاحية');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('حدث خطأ أثناء حذف المستخدم');
      }
    }
  };

  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvName || !newInvUnit) return;
    setIsAddingInv(true);
    try {
      await addDoc(collection(db, 'inventoryItems'), {
        name: newInvName,
        unit: newInvUnit,
        currentStock: 0
      });
      setNewInvName('');
      setNewInvUnit('');
      alert('تمت إضافة الصنف للمخزن');
    } catch (error) {
      console.error(error);
      alert('خطأ في إضافة الصنف');
    }
    setIsAddingInv(false);
  };

  const handleInventoryTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invTransaction || !invTransaction.quantity) return;
    try {
      const item = inventoryItems.find(i => i.id === invTransaction.itemId);
      if (!item) return;
      
      const qty = Number(invTransaction.quantity);
      const newStock = invTransaction.type === 'in' ? item.currentStock + qty : item.currentStock - qty;
      
      await addDoc(collection(db, 'inventoryTransactions'), {
        itemId: item.id,
        itemName: item.name,
        type: invTransaction.type,
        quantity: qty,
        date: new Date().toISOString(),
        note: invTransaction.note,
        user: user?.name || 'Admin'
      });
      
      await updateDoc(doc(db, 'inventoryItems', item.id), {
        currentStock: newStock
      });
      
      setInvTransaction(null);
      alert('تم تسجيل العملية بنجاح');
    } catch (error) {
      console.error(error);
      alert('خطأ في تسجيل العملية');
    }
  };

  const moveCategory = async (cat: any, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === cat.id);
    if (direction === 'up' && currentIndex > 0) {
      const prevCat = categories[currentIndex - 1];
      await updateDoc(doc(db, 'categories', cat.id), { order: prevCat.order });
      await updateDoc(doc(db, 'categories', prevCat.id), { order: cat.order });
    } else if (direction === 'down' && currentIndex < categories.length - 1) {
      const nextCat = categories[currentIndex + 1];
      await updateDoc(doc(db, 'categories', cat.id), { order: nextCat.order });
      await updateDoc(doc(db, 'categories', nextCat.id), { order: cat.order });
    }
  };
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserDisplayName) {
      alert('الرجاء إدخال جميع الحقول المطلوبة');
      return;
    }
    setIsAddingUser(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: newUserDisplayName,
        email: newUserEmail,
        role: newUserRole,
        createdAt: new Date().toISOString()
      });
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDisplayName('');
      setNewUserRole('cashier');
      alert('تم إنشاء حساب المستخدم بنجاح');
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert('حدث خطأ أثناء إنشاء المستخدم: ' + error.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleImageUpload = async (imageSource: File | string): Promise<string> => {
    try {
      return await uploadToImgBB(imageSource);
    } catch (error: any) {
      console.error('ImgBB upload error:', error);
      alert('حدث خطأ أثناء رفع الصورة: ' + error.message);
      throw error;
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(newItemPrice);
    if (!newItemName || isNaN(price) || price < 0 || !newItemCategory) {
      alert('الرجاء إدخال جميع الحقول المطلوبة بشكل صحيح');
      return;
    }

    setIsAddingItem(true);
    try {
      let imageUrl = newItemImageUrl.trim();
      if (newItemImage) {
        imageUrl = await handleImageUpload(newItemImage);
      }

      await addDoc(collection(db, 'menuItems'), {
        name: newItemName.trim(),
        price: price,
        categoryId: newItemCategory,
        description: newItemDescription.trim(),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
        isAvailable: true
      });

      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      setNewItemDescription('');
      setNewItemImage(null);
      setNewItemImageUrl('');
      alert('تمت إضافة الصنف بنجاح');
    } catch (error: any) {
      console.error('Error adding item:', error);
      alert('حدث خطأ أثناء إضافة الصنف: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleUpdateItemImage = async (itemId: string, file: File) => {
    try {
      const imageUrl = await handleImageUpload(file);
      await updateDoc(doc(db, 'menuItems', itemId), { imageUrl });
      alert('تم تحديث الصورة بنجاح');
    } catch (error) {
      console.error('Error updating image:', error);
      alert('حدث خطأ أثناء تحديث الصورة');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟ (هذا لن يؤثر على الأصناف داخله ولكن يجب نقلها لقسم آخر لتظهر)')) return;
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      alert('تم حذف القسم بنجاح');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف النهائي؟')) return;
    try {
      await deleteDoc(doc(db, 'menuItems', itemId));
      alert('تم حذف الصنف بنجاح');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    walletNumber: settings?.walletNumber || '',
    instapayNumber: settings?.instapayNumber || '',
    instapayLink: settings?.instapayLink || '',
    cafeName: settings?.cafeName || ((typeof window !== 'undefined' && (window as any).__TENANT_BRAND__?.name) as string) || 'كافيه سهرايا',
    commercialRegister: settings?.commercialRegister || '',
    taxCardNumber: settings?.taxCardNumber || '',
    serviceChargePct: Number(settings?.serviceChargePct ?? 0),
    vatPct: Number(settings?.vatPct ?? 0),
    tablesCount: Number(settings?.tablesCount ?? 15),
  });

  // Sync settings when loaded
  React.useEffect(() => {
    if (settings) {
      setSettingsForm(prev => ({
        ...prev,
        walletNumber: settings.walletNumber || '',
        instapayNumber: settings.instapayNumber || '',
        instapayLink: settings.instapayLink || '',
        cafeName: settings.cafeName || prev.cafeName,
        commercialRegister: settings.commercialRegister || '',
        taxCardNumber: settings.taxCardNumber || '',
        serviceChargePct: Number(settings.serviceChargePct ?? 0),
        vatPct: Number(settings.vatPct ?? 0),
        tablesCount: Number(settings.tablesCount ?? 15),
      }));
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'payment'), settingsForm, { merge: true });
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) {
      alert('الرجاء إدخال اسم القسم');
      return;
    }

    setIsAddingCategory(true);
    try {
      let imageUrl = newCategoryImageUrl;
      if (newCategoryImage) {
        imageUrl = await handleImageUpload(newCategoryImage);
      }

      await addDoc(collection(db, 'categories'), {
        name: newCategoryName,
        order: categories.length,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=500&q=80' // Default image
      });

      setNewCategoryName('');
      setNewCategoryImage(null);
      setNewCategoryImageUrl('');
      alert('تمت إضافة القسم بنجاح');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('حدث خطأ أثناء إضافة القسم');
    }
    setIsAddingCategory(false);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setIsUpdatingCategory(true);
    try {
      let imageUrl = editingCategory.imageUrl || '';
      if (editingCategory.newImage) {
        imageUrl = await handleImageUpload(editingCategory.newImage);
      } else if (editingCategory.newImageUrl) {
        imageUrl = editingCategory.newImageUrl;
      }

      await updateDoc(doc(db, 'categories', editingCategory.id), {
        name: editingCategory.name,
        imageUrl: imageUrl
      });

      setEditingCategory(null);
      alert('تم تحديث القسم بنجاح');
    } catch (error) {
      console.error('Error updating category:', error);
      alert('حدث خطأ أثناء تحديث القسم');
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const price = Number(editingItem.price);
    if (isNaN(price) || price < 0) {
      alert('الرجاء إدخال سعر صحيح');
      return;
    }

    setIsUpdatingItem(true);
    try {
      let imageUrl = (editingItem.newImageUrl || editingItem.imageUrl || '').trim();
      if (editingItem.newImage) {
        imageUrl = await handleImageUpload(editingItem.newImage);
      }

      await updateDoc(doc(db, 'menuItems', editingItem.id), {
        name: editingItem.name.trim(),
        price: price,
        categoryId: editingItem.categoryId,
        description: (editingItem.description || '').trim(),
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'
      });

      setEditingItem(null);
      alert('تم تحديث الصنف بنجاح');
    } catch (error: any) {
      console.error('Error updating item:', error);
      alert('حدث خطأ أثناء تحديث الصنف: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsUpdatingItem(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col md:flex-row" dir="rtl">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card-bg text-text-light flex flex-col border-l border-border-color">
        <div className="p-6 border-b border-border-color flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">لوحة الإدارة</h1>
            <p className="text-text-muted text-sm mt-1">{user?.name}</p>
          </div>
          <button onClick={() => navigate('/')} className="p-2 text-text-muted hover:text-text-light transition-colors">
            <Home size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'stats' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <Home size={20} /> الرئيسية
          </button>
          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'menu' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <Settings size={20} /> إدارة المنيو
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'inventory' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <Package size={20} /> إدارة المخزون
          </button>
          <button onClick={() => setActiveTab('accounting')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'accounting' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <Calculator size={20} /> الحسابات والمالية
          </button>
          <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <Users size={20} /> إدارة المستخدمين
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <Settings size={20} /> الإعدادات
          </button>
          <button onClick={() => setActiveTab('qr_tables')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'qr_tables' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>
            <QrCode size={20} /> باركود الطاولات (QR)
          </button>
          <button onClick={() => navigate('/print')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:bg-border-color hover:text-text-light transition-colors">
            <Printer size={20} /> طباعة المنيو
          </button>
        </nav>
        <div className="p-4 border-t border-border-color">
          <button onClick={() => navigate('/kitchen')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-indigo-400 hover:bg-border-color hover:text-indigo-300 transition-colors">
            <ChefHat size={20} /> شاشة المطبخ
          </button>
          <button onClick={() => navigate('/cashier')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-green-400 hover:bg-border-color hover:text-green-300 transition-colors">
            <Wallet size={20} /> شاشة الكاشير
          </button>
          <button onClick={() => navigate('/captain/dashboard')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-amber-400 hover:bg-border-color hover:text-amber-300 transition-colors">
            <ClipboardList size={20} /> لوحة الكابتن
          </button>
          <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bg-dark text-accent rounded-xl hover:bg-border-color transition-colors">
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {activeTab === 'accounting' && <Accounting />}

        {activeTab === 'menu' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-text-light">إدارة المنيو</h2>
            </div>

            {/* Add New Category Form */}
            <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color mb-8">
              <h3 className="text-lg font-bold text-text-light mb-4 flex items-center gap-2"><Plus size={20} /> إضافة قسم جديد</h3>
              <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">اسم القسم *</label>
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">صورة القسم (رابط أو رفع)</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="رابط الصورة" value={newCategoryImageUrl} onChange={e => setNewCategoryImageUrl(e.target.value)} className="flex-1 px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent text-right" dir="ltr" />
                    <input type="file" accept="image/*" onChange={e => setNewCategoryImage(e.target.files?.[0] || null)} className="w-full max-w-[120px] text-sm px-2 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" />
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" disabled={isAddingCategory} className="px-6 py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50">
                    {isAddingCategory ? 'جاري الإضافة...' : 'إضافة القسم'}
                  </button>
                </div>
              </form>
            </div>

            {/* Add New Item Form */}
            <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color mb-8">
              <h3 className="text-lg font-bold text-text-light mb-4 flex items-center gap-2"><Plus size={20} /> إضافة صنف جديد</h3>
              <form onSubmit={handleAddMenuItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">اسم الصنف *</label>
                  <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">السعر (ج.م) *</label>
                  <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">القسم *</label>
                  <select value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" required>
                    <option value="">اختر القسم</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-muted mb-1">صورة الصنف (رابط أو رفع)</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="رابط الصورة" value={newItemImageUrl} onChange={e => setNewItemImageUrl(e.target.value)} className="flex-1 px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent text-right" dir="ltr" />
                    <button type="button" onClick={() => handleGenerateAIImage(newItemName)} disabled={isGeneratingImage} className="px-3 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50" title="توليد صورة بالذكاء الاصطناعي">
                      <Wand2 size={20} className={isGeneratingImage ? 'animate-pulse' : ''} />
                    </button>
                    <input type="file" accept="image/*" onChange={e => setNewItemImage(e.target.files?.[0] || null)} className="w-full max-w-[120px] text-sm px-2 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-muted mb-1">الوصف</label>
                  <textarea value={newItemDescription} onChange={e => setNewItemDescription(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" rows={2}></textarea>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" disabled={isAddingItem} className="px-6 py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50">
                    {isAddingItem ? 'جاري الإضافة...' : 'إضافة الصنف'}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-8">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEndCategories}
              >
                <SortableContext 
                  items={categories.map(c => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categories.map(cat => (
                    <SortableItem key={cat.id} id={cat.id} className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                      <div className="bg-bg-dark px-6 py-4 border-b border-border-color flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          {cat.imageUrl && (
                            <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 object-cover rounded-lg border border-border-color" referrerPolicy="no-referrer" />
                          )}
                          <h3 className="text-lg font-bold text-text-light">{cat.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingCategory(cat)} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-900/30 px-3 py-1.5 rounded transition-colors mr-2">
                            <Edit size={16} /> تعديل القسم
                          </button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-sm text-accent hover:text-red-400 flex items-center gap-1 bg-accent/10 px-3 py-1.5 rounded transition-colors">
                            <Trash2 size={16} /> حذف
                          </button>
                        </div>
                      </div>
                      
                      <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEndMenuItems(e, cat.id)}
                      >
                        <SortableContext 
                          items={menuItems.filter(item => item.categoryId === cat.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(i => i.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="divide-y divide-border-color">
                            {menuItems.filter(item => item.categoryId === cat.id).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => (
                              <SortableItem key={item.id} id={item.id} className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-bg-dark gap-4 transition-colors">
                                <div className="flex items-center gap-4">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-border-color" referrerPolicy="no-referrer" />
                                  ) : (
                                    <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80" alt={item.name} className="w-16 h-16 object-cover rounded-lg border border-border-color" referrerPolicy="no-referrer" />
                                  )}
                                  <div>
                                    <h4 className="font-medium text-text-light">{item.name}</h4>
                                    {item.description && <p className="text-sm text-text-muted">{item.description}</p>}
                                    <p className="text-sm text-primary font-bold mt-1">{item.price} ج.م</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setEditingItem(item)} className="cursor-pointer text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-900/30 px-2 py-1 rounded transition-colors">
                                      <Edit size={14} /> تعديل
                                    </button>
                                    <button onClick={() => handleDeleteMenuItem(item.id)} className="cursor-pointer text-sm text-accent hover:text-red-400 flex items-center gap-1 bg-accent/10 px-2 py-1 rounded transition-colors">
                                      <Trash2 size={14} /> حذف
                                    </button>
                                  </div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-sm text-text-muted">متاح</span>
                                    <input 
                                      type="checkbox" 
                                      checked={item.isAvailable} 
                                      onChange={() => toggleItemAvailability(item.id, item.isAvailable)}
                                      className="w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer bg-bg-dark border-border-color"
                                    />
                                  </label>
                                </div>
                              </SortableItem>
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </SortableItem>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {activeTab === 'qr_tables' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-text-light flex items-center gap-2">
                  <QrCode className="text-primary" size={26} />
                  <span>مولّد وطباعة باركود الطاولات (QR Tables)</span>
                </h2>
                <p className="text-sm text-text-muted mt-1">اطبع هذه البطاقات وضعها على كل طاولة ليطلب العميل مباشرة من الموبايل</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-text-muted">عدد الطاولات:</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settingsForm.tablesCount || 15}
                  onChange={e => setSettingsForm(p => ({ ...p, tablesCount: Math.max(1, Math.min(100, Number(e.target.value) || 1)) }))}
                  className="w-20 bg-bg-dark border border-border-color rounded-lg px-3 py-2 text-text-light text-center font-bold"
                />
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-primary text-bg-dark rounded-xl font-bold hover:bg-[#E5C158] transition-colors flex items-center gap-2"
                >
                  <Printer size={18} /> طباعة الكل
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: Number(settingsForm.tablesCount || 15) }, (_, idx) => {
                const tableNum = idx + 1;
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const tableUrl = `${origin}/table/${tableNum}`;
                const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(tableUrl)}`;
                return (
                  <div key={tableNum} className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-amber-400 text-center shadow-md flex flex-col items-center">
                    <div className="text-xs font-extrabold text-amber-700 uppercase tracking-wider mb-1">{settingsForm.cafeName || 'كافيه سهرايا'}</div>
                    <div className="text-lg font-black text-slate-900 mb-3">طاولة رقم #{tableNum}</div>
                    <img src={qrSrc} alt={`QR طاولة ${tableNum}`} className="w-40 h-40 rounded-xl border border-slate-200 p-1 bg-white mb-3" />
                    <p className="text-xs font-bold text-slate-600">امسح الكود بكاميرا الموبايل لتصفح المنيو والطلب فوراً</p>
                    <a href={tableUrl} target="_blank" rel="noreferrer" className="text-[11px] text-amber-700 font-mono mt-1 underline" dir="ltr">/table/{tableNum}</a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-2xl font-bold text-text-light mb-8">الإعدادات العـامة والفاتورة</h2>

            <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color mb-8">
              <h3 className="text-xl font-bold text-text-light mb-6 flex items-center gap-2">
                <Wallet className="text-primary" size={24} />
                إعدادات الكافيه والضرائب والدفع الإلكتروني
              </h3>
              
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-light mb-2">اسم الكافيه (يظهر في الإيصال وبطاقات QR)</label>
                    <input
                      type="text"
                      value={settingsForm.cafeName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, cafeName: e.target.value })}
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">عدد الطاولات الافتراضي</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={settingsForm.tablesCount}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tablesCount: Number(e.target.value) })}
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">رقم السجل التجاري (لشيك الكاشير)</label>
                    <input
                      type="text"
                      value={settingsForm.commercialRegister}
                      onChange={(e) => setSettingsForm({ ...settingsForm, commercialRegister: e.target.value })}
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">رقم البطاقة الضريبية (لشيك الكاشير)</label>
                    <input
                      type="text"
                      value={settingsForm.taxCardNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, taxCardNumber: e.target.value })}
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">نسبة خدمة الصالة (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      step="0.5"
                      value={settingsForm.serviceChargePct}
                      onChange={(e) => setSettingsForm({ ...settingsForm, serviceChargePct: Number(e.target.value) })}
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">نسبة الضريبة VAT (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={25}
                      step="0.5"
                      value={settingsForm.vatPct}
                      onChange={(e) => setSettingsForm({ ...settingsForm, vatPct: Number(e.target.value) })}
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">رقم الاستلام (محافظ كاش)</label>
                    <input
                      type="tel"
                      value={settingsForm.walletNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, walletNumber: e.target.value })}
                      placeholder="مثال: 010xxxxxxxx"
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                    <p className="text-xs text-text-muted mt-1">يستخدم لإنشاء كود الدفع السريع لفودافون واتصالات واورنج و وي.</p>
                  </div>
                  <div>
                    <label className="block text-text-light mb-2">رقم إنستاباي</label>
                    <input
                      type="tel"
                      value={settingsForm.instapayNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instapayNumber: e.target.value })}
                      placeholder="مثال: 010xxxxxxxx"
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-text-light mb-2">رابط إنستاباي (Instapay Link)</label>
                    <input
                      type="url"
                      value={settingsForm.instapayLink}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instapayLink: e.target.value })}
                      placeholder="مثال: https://instapay.eg/..."
                      className="w-full bg-bg-dark border border-border-color rounded-lg px-4 py-2 text-text-light focus:outline-none focus:border-primary"
                    />
                     <p className="text-xs text-text-muted mt-1">يُفضل إدخال رابط الحساب لفتح التطبيق مباشرة للعميل.</p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button type="submit" disabled={isUpdatingSettings} className="px-6 py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {isUpdatingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                    {!isUpdatingSettings && <CheckCircle2 size={18} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-bold text-text-light mb-8">إدارة المستخدمين</h2>

            {/* Add New User Form */}
            <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color mb-8">
              <h3 className="text-lg font-bold text-text-light mb-4 flex items-center gap-2"><UserPlus size={20} /> إضافة مستخدم جديد</h3>
              <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">الاسم *</label>
                  <input type="text" value={newUserDisplayName} onChange={e => setNewUserDisplayName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">البريد الإلكتروني *</label>
                  <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent text-right" dir="ltr" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">كلمة المرور *</label>
                  <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent text-right" dir="ltr" required minLength={6} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">الصلاحية *</label>
                  <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light focus:ring-2 focus:ring-primary focus:border-transparent" required>
                    <option value="cashier">كاشير</option>
                    <option value="captain">كابتن</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-4 flex justify-end mt-2">
                  <button type="submit" disabled={isAddingUser} className="px-6 py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50">
                    {isAddingUser ? 'جاري الإضافة...' : 'إنشاء الحساب'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-bg-dark border-b border-border-color">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">الاسم</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">البريد الإلكتروني</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">الصلاحية</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">تاريخ التسجيل</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {users.map(u => (
                      <tr key={u.uid} className="hover:bg-bg-dark transition-colors">
                        <td className="px-6 py-4 text-sm text-text-light">{u.name || 'بدون اسم'}</td>
                        <td className="px-6 py-4 text-sm text-text-muted">{u.email || 'بدون بريد'}</td>
                        <td className="px-6 py-4 text-sm">
                          <select 
                            value={u.role} 
                            onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                            disabled={u.uid === user?.uid} // Prevent changing own role
                            className="bg-bg-dark border border-border-color text-text-light text-sm rounded-lg focus:ring-primary focus:border-primary block w-full p-2"
                          >
                            <option value="customer">عميل</option>
                            <option value="captain">كابتن</option>
                            <option value="cashier">كاشير</option>
                            <option value="admin">مدير</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-muted">
                          {new Date(u.createdAt).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button 
                            onClick={() => handleDeleteUser(u.uid)}
                            disabled={u.uid === user?.uid}
                            className="text-accent hover:text-red-400 disabled:opacity-50 p-2 transition-colors"
                            title="حذف المستخدم"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <h2 className="text-2xl font-bold text-text-light">الرئيسية</h2>
              <div className="flex items-center gap-4 bg-card-bg p-2 rounded-xl border border-border-color">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">من:</span>
                  <input type="date" value={statsDateFilter.start} onChange={e => setStatsDateFilter({...statsDateFilter, start: e.target.value})} className="bg-bg-dark border border-border-color text-text-light rounded-lg px-3 py-1 text-sm outline-none w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">إلى:</span>
                  <input type="date" value={statsDateFilter.end} onChange={e => setStatsDateFilter({...statsDateFilter, end: e.target.value})} className="bg-bg-dark border border-border-color text-text-light rounded-lg px-3 py-1 text-sm outline-none w-32" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-text-muted mb-2">مبيعات الفترة</p>
                    <h3 className="text-3xl font-bold text-primary">{periodSales} <span className="text-lg text-text-muted font-normal">ج.م</span></h3>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>
              
              <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-text-muted mb-2">طلبات الفترة المكتملة</p>
                    <h3 className="text-3xl font-bold text-green-400">{periodOrdersCount}</h3>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                    <CheckCircle2 size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-text-muted mb-2">الطلبات النشطة (الآن)</p>
                    <h3 className="text-3xl font-bold text-blue-400">{activeOrdersCount}</h3>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <Clock size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-gray-500/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <p className="text-text-muted mb-2">إجمالي المبيعات (كل الوقت)</p>
                    <h3 className="text-3xl font-bold text-text-light">{totalSales} <span className="text-lg text-text-muted font-normal">ج.م</span></h3>
                  </div>
                  <div className="p-3 bg-bg-dark border border-border-color rounded-xl text-text-muted">
                    <BarChart3 size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden mb-8">
              <div className="p-6 border-b border-border-color">
                <h3 className="text-lg font-bold text-text-light flex items-center gap-2">
                  <ClipboardList size={20} className="text-primary" />
                  أوردرات الطاولات المفتوحة
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-right">
                  <thead className="bg-bg-dark border-b border-border-color sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">رقم الطاولة</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">عدد الطلبات</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">إجمالي الحساب</th>
                      <th className="px-6 py-4 text-sm font-bold text-text-muted">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-color">
                    {Object.entries(openTables).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                          لا توجد طاولات مفتوحة حالياً
                        </td>
                      </tr>
                    ) : (
                      Object.entries(openTables).map(([tableNumber, tableOrders]) => {
                        const tableTotal = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                        return (
                          <tr key={tableNumber} className="hover:bg-bg-dark transition-colors">
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">
                                {tableNumber}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-text-light">
                              {tableOrders.length} طلبات
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-primary">
                              {tableTotal} ج.م
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => navigate('/cashier')}
                                className="text-sm px-4 py-2 bg-bg-dark border border-border-color rounded-lg hover:border-primary text-text-light transition-colors"
                              >
                                الذهاب للكاشير
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <h2 className="text-2xl font-bold text-text-light mb-8">إدارة المخزون</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Inventory Items */}
                <div className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                  <div className="p-6 border-b border-border-color">
                    <h3 className="text-lg font-bold text-text-light">الأصناف في المخزن</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead className="bg-bg-dark border-b border-border-color">
                        <tr>
                          <th className="px-6 py-4 text-sm font-bold text-text-muted">الصنف</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-muted">الرصيد الحالي</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-muted">الوحدة</th>
                          <th className="px-6 py-4 text-sm font-bold text-text-muted">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {inventoryItems.map(item => (
                          <tr key={item.id} className="hover:bg-bg-dark transition-colors">
                            <td className="px-6 py-4 text-sm font-bold text-text-light">{item.name}</td>
                            <td className="px-6 py-4 text-sm font-bold text-primary">{item.currentStock}</td>
                            <td className="px-6 py-4 text-sm text-text-muted">{item.unit}</td>
                            <td className="px-6 py-4 text-sm flex gap-2">
                              <button onClick={() => setInvTransaction({itemId: item.id, type: 'in', quantity: '', note: ''})} className="flex items-center gap-1 text-green-400 hover:text-green-300 bg-green-500/10 px-2 py-1 rounded">
                                <ArrowDownCircle size={16} /> إضافة
                              </button>
                              <button onClick={() => setInvTransaction({itemId: item.id, type: 'out', quantity: '', note: ''})} className="flex items-center gap-1 text-accent hover:text-red-400 bg-accent/10 px-2 py-1 rounded">
                                <ArrowUpCircle size={16} /> سحب
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Transactions History */}
                <div className="bg-card-bg rounded-2xl shadow-sm border border-border-color overflow-hidden">
                  <div className="p-6 border-b border-border-color">
                    <h3 className="text-lg font-bold text-text-light">سجل الحركات</h3>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-right">
                      <thead className="bg-bg-dark border-b border-border-color sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-sm font-bold text-text-muted">التاريخ</th>
                          <th className="px-6 py-3 text-sm font-bold text-text-muted">الصنف</th>
                          <th className="px-6 py-3 text-sm font-bold text-text-muted">الحركة</th>
                          <th className="px-6 py-3 text-sm font-bold text-text-muted">الكمية</th>
                          <th className="px-6 py-3 text-sm font-bold text-text-muted">المستخدم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-color">
                        {inventoryTransactions.map(t => (
                          <tr key={t.id} className="hover:bg-bg-dark transition-colors">
                            <td className="px-6 py-3 text-sm text-text-muted">{new Date(t.date).toLocaleString('ar-EG')}</td>
                            <td className="px-6 py-3 text-sm font-bold text-text-light">{t.itemName}</td>
                            <td className="px-6 py-3 text-sm">
                              {t.type === 'in' ? <span className="text-green-400">إضافة (شراء)</span> : <span className="text-accent">سحب</span>}
                            </td>
                            <td className="px-6 py-3 text-sm font-bold text-text-light">{t.quantity}</td>
                            <td className="px-6 py-3 text-sm text-text-muted">{t.user}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Add New Item */}
                <div className="bg-card-bg p-6 rounded-2xl shadow-sm border border-border-color">
                  <h3 className="text-lg font-bold text-text-light mb-4 flex items-center gap-2"><Plus size={20} /> تعريف صنف جديد</h3>
                  <form onSubmit={handleAddInventoryItem} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">اسم الصنف</label>
                      <input type="text" value={newInvName} onChange={e => setNewInvName(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">وحدة القياس (كجم، لتر، قطعة)</label>
                      <input type="text" value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required />
                    </div>
                    <button type="submit" disabled={isAddingInv} className="w-full py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50">
                      إضافة للمخزن
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Transaction Modal */}
        {invTransaction && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-card-bg p-6 rounded-2xl w-full max-w-md border border-border-color">
              <h3 className="text-xl font-bold text-text-light mb-4">
                {invTransaction.type === 'in' ? 'إضافة رصيد (أمر شراء)' : 'سحب رصيد'} - {inventoryItems.find(i => i.id === invTransaction.itemId)?.name}
              </h3>
              <form onSubmit={handleInventoryTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">الكمية</label>
                  <input type="number" value={invTransaction.quantity} onChange={e => setInvTransaction({...invTransaction, quantity: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required min="0.01" step="0.01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">ملاحظات (اختياري)</label>
                  <input type="text" value={invTransaction.note} onChange={e => setInvTransaction({...invTransaction, note: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setInvTransaction(null)} className="px-4 py-2 text-text-muted hover:bg-border-color rounded-lg transition-colors">إلغاء</button>
                  <button type="submit" className={`px-4 py-2 text-white rounded-lg font-bold transition-colors ${invTransaction.type === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-accent hover:bg-red-600'}`}>
                    تأكيد العملية
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-card-bg p-6 rounded-2xl w-full max-w-md border border-border-color">
              <h3 className="text-xl font-bold text-text-light mb-4">تعديل القسم</h3>
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">اسم القسم</label>
                  <input type="text" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">تحديث صورة القسم (رابط أو رفع)</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="رابط الصورة الجديد" value={editingCategory.newImageUrl || ''} onChange={e => setEditingCategory({...editingCategory, newImageUrl: e.target.value})} className="flex-1 px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light text-right" dir="ltr" />
                    <input type="file" accept="image/*" onChange={e => setEditingCategory({...editingCategory, newImage: e.target.files?.[0] || null})} className="w-full max-w-[120px] text-sm px-2 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setEditingCategory(null)} className="px-4 py-2 text-text-muted hover:bg-border-color rounded-lg transition-colors" disabled={isUpdatingCategory}>إلغاء</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50" disabled={isUpdatingCategory}>
                    {isUpdatingCategory ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Menu Item Modal */}
        {editingItem && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-card-bg p-6 rounded-2xl w-full max-w-md border border-border-color">
              <h3 className="text-xl font-bold text-text-light mb-4">تعديل الصنف</h3>
              <form onSubmit={handleUpdateMenuItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">اسم الصنف</label>
                  <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">السعر (ج.م)</label>
                  <input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">القسم</label>
                  <select value={editingItem.categoryId} onChange={e => setEditingItem({...editingItem, categoryId: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" required>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">الوصف</label>
                  <textarea value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" rows={2}></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">تحديث الصورة (رابط أو رفع)</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="رابط الصورة الجديد" value={editingItem.newImageUrl || ''} onChange={e => setEditingItem({...editingItem, newImageUrl: e.target.value})} className="flex-1 px-4 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light text-right" dir="ltr" />
                    <button type="button" onClick={() => handleGenerateAIImage(editingItem.name, true)} disabled={isGeneratingImage} className="px-3 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-50" title="توليد صورة بالذكاء الاصطناعي">
                      <Wand2 size={20} className={isGeneratingImage ? 'animate-pulse' : ''} />
                    </button>
                    <input type="file" accept="image/*" onChange={e => setEditingItem({...editingItem, newImage: e.target.files?.[0] || null})} className="w-full max-w-[120px] text-sm px-2 py-2 rounded-lg bg-bg-dark border border-border-color text-text-light" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-text-muted hover:bg-border-color rounded-lg transition-colors" disabled={isUpdatingItem}>إلغاء</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-bg-dark rounded-lg font-bold hover:bg-[#E5C158] transition-colors disabled:opacity-50" disabled={isUpdatingItem}>
                    {isUpdatingItem ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
