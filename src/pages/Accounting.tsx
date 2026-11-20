import React, { useState } from 'react';
import { useStore } from '../store';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Users, Landmark, Banknote, History, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Accounting() {
  const { suppliers, staffAccounts, expenses, payments, orders } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'suppliers' | 'staff' | 'expenses'>('overview');

  // Supplier state
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', initialBalance: '' });

  // Staff state
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', role: '', salary: '', initialBalance: '' });

  // Expense state
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ type: 'other', amount: '', description: '', referenceId: '' });

  const totalSales = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  const totalSupplierDebts = suppliers.reduce((sum, s) => sum + s.balance, 0);
  const totalStaffDebts = staffAccounts.reduce((sum, s) => sum + s.balance, 0);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'suppliers'), {
        name: supplierForm.name,
        contact: supplierForm.contact,
        balance: Number(supplierForm.initialBalance) || 0
      });
      toast.success('تمت إضافة المورد بنجاح');
      setIsAddingSupplier(false);
      setSupplierForm({ name: '', contact: '', initialBalance: '' });
    } catch (error) {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  const handleAddStaffAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'staffAccounts'), {
        name: staffForm.name,
        role: staffForm.role,
        salary: Number(staffForm.salary) || 0,
        balance: Number(staffForm.initialBalance) || 0
      });
      toast.success('تمت إضافة حساب الموظف بنجاح');
      setIsAddingStaff(false);
      setStaffForm({ name: '', role: '', salary: '', initialBalance: '' });
    } catch (error) {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = Number(expenseForm.amount);
      if (!amount) return toast.error('الرجاء إدخال مبلغ صحيح');

      await addDoc(collection(db, 'expenses'), {
        type: expenseForm.type,
        amount,
        description: expenseForm.description,
        referenceId: expenseForm.referenceId || null,
        date: new Date().toISOString()
      });

      // Update related balances
      if (expenseForm.type === 'supplier_payment' && expenseForm.referenceId) {
        const sup = suppliers.find(s => s.id === expenseForm.referenceId);
        if (sup) {
          await updateDoc(doc(db, 'suppliers', sup.id), { balance: sup.balance - amount });
        }
      } else if (expenseForm.type === 'staff_payment' && expenseForm.referenceId) {
        const staff = staffAccounts.find(s => s.id === expenseForm.referenceId);
        if (staff) {
          await updateDoc(doc(db, 'staffAccounts', staff.id), { balance: staff.balance - amount });
        }
      }

      toast.success('تم تسجيل المصروف بنجاح');
      setIsAddingExpense(false);
      setExpenseForm({ type: 'other', amount: '', description: '', referenceId: '' });
    } catch (error) {
      toast.error('حدث خطأ أثناء تسجيل المصروف');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-text-light">قسم الحسابات والمالية</h2>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-2 border-b border-border-color">
        <button onClick={() => setActiveSubTab('overview')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeSubTab === 'overview' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>نظرة عامة</button>
        <button onClick={() => setActiveSubTab('suppliers')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeSubTab === 'suppliers' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>الموردين</button>
        <button onClick={() => setActiveSubTab('staff')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeSubTab === 'staff' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>حسابات الاستاف</button>
        <button onClick={() => setActiveSubTab('expenses')} className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors ${activeSubTab === 'expenses' ? 'bg-primary text-bg-dark' : 'text-text-muted hover:bg-border-color hover:text-text-light'}`}>المصروفات والسلف</button>
      </div>

      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-card-bg p-6 rounded-2xl border border-border-color shadow-sm">
            <h3 className="text-text-muted mb-2 font-medium">إجمالي المبيعات</h3>
            <p className="text-3xl font-black text-green-500">{totalSales} <span className="text-sm font-normal">ج.م</span></p>
          </div>
          <div className="bg-card-bg p-6 rounded-2xl border border-border-color shadow-sm">
            <h3 className="text-text-muted mb-2 font-medium">إجمالي المصروفات المدفوعة</h3>
            <p className="text-3xl font-black text-accent">{totalExpenses} <span className="text-sm font-normal">ج.م</span></p>
          </div>
          <div className="bg-card-bg p-6 rounded-2xl border border-border-color shadow-sm">
            <h3 className="text-text-muted mb-2 font-medium">صافي الربح</h3>
            <p className={`text-3xl font-black ${netProfit >= 0 ? 'text-green-500' : 'text-accent'}`}>{netProfit} <span className="text-sm font-normal">ج.م</span></p>
          </div>
          <div className="bg-card-bg p-6 rounded-2xl border border-border-color shadow-sm">
            <h3 className="text-text-muted mb-2 font-medium">مديونيات الموردين (التزامات)</h3>
            <p className="text-3xl font-black text-accent">{totalSupplierDebts} <span className="text-sm font-normal">ج.م</span></p>
          </div>
          <div className="bg-card-bg p-6 rounded-2xl border border-border-color shadow-sm">
            <h3 className="text-text-muted mb-2 font-medium">حسابات الاستاف (متبقي)</h3>
            <p className="text-3xl font-black text-blue-500">{totalStaffDebts} <span className="text-sm font-normal">ج.م</span></p>
          </div>
        </div>
      )}

      {activeSubTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card-bg p-4 rounded-xl border border-border-color">
            <h3 className="font-bold text-text-light flex items-center gap-2"><Landmark className="text-primary"/> قائمة الموردين</h3>
            <button onClick={() => setIsAddingSupplier(!isAddingSupplier)} className="px-4 py-2 bg-primary text-bg-dark rounded-lg flex items-center gap-2 font-bold hover:bg-[#E5C158] transition-colors"><Plus size={18}/> إضافة مورد</button>
          </div>
          
          {isAddingSupplier && (
            <form onSubmit={handleAddSupplier} className="bg-card-bg p-6 rounded-2xl border border-border-color grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">اسم المورد</label>
                <input type="text" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">رقم التواصل</label>
                <input type="text" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">الرصيد الافتتاحي (مديونية)</label>
                <input type="number" value={supplierForm.initialBalance} onChange={e => setSupplierForm({...supplierForm, initialBalance: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" />
              </div>
              <div className="md:col-span-3">
                <button type="submit" className="px-6 py-2 bg-primary text-bg-dark rounded-lg font-bold">حفظ المورد</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {suppliers.map(sup => (
              <div key={sup.id} className="bg-card-bg p-6 rounded-2xl border border-border-color flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg text-text-light">{sup.name}</h4>
                  <p className="text-text-muted text-sm">{sup.contact || 'لا يوجد رقم'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-1">المديونية الحالية</p>
                  <p className={`font-black text-xl ${sup.balance > 0 ? 'text-accent' : 'text-green-500'}`}>{sup.balance} ج.م</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card-bg p-4 rounded-xl border border-border-color">
            <h3 className="font-bold text-text-light flex items-center gap-2"><Users className="text-primary"/> حسابات الموظفين (الاستاف)</h3>
            <button onClick={() => setIsAddingStaff(!isAddingStaff)} className="px-4 py-2 bg-primary text-bg-dark rounded-lg flex items-center gap-2 font-bold hover:bg-[#E5C158] transition-colors"><Plus size={18}/> إضافة موظف</button>
          </div>
          
          {isAddingStaff && (
            <form onSubmit={handleAddStaffAccount} className="bg-card-bg p-6 rounded-2xl border border-border-color grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">الاسم</label>
                <input type="text" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">الوظيفة</label>
                <input type="text" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">الراتب الأساسي</label>
                <input type="number" value={staffForm.salary} onChange={e => setStaffForm({...staffForm, salary: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">مستحقات حالية</label>
                <input type="number" value={staffForm.initialBalance} onChange={e => setStaffForm({...staffForm, initialBalance: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" />
              </div>
              <div className="md:col-span-4">
                <button type="submit" className="px-6 py-2 bg-primary text-bg-dark rounded-lg font-bold">حفظ الموظف</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {staffAccounts.map(staff => (
              <div key={staff.id} className="bg-card-bg p-6 rounded-2xl border border-border-color space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-text-light">{staff.name}</h4>
                    <span className="text-xs bg-bg-dark px-2 py-1 rounded text-primary">{staff.role}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-text-muted mb-1">الراتب</p>
                    <p className="font-bold text-text-light">{staff.salary} ج.م</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-border-color flex justify-between items-center">
                  <span className="text-sm text-text-muted">المستحقات المتبقية</span>
                  <span className={`font-black text-lg ${staff.balance > 0 ? 'text-blue-400' : 'text-text-muted'}`}>{staff.balance} ج.م</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'expenses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card-bg p-4 rounded-xl border border-border-color">
            <h3 className="font-bold text-text-light flex items-center gap-2"><Banknote className="text-primary"/> تسجيل المصروفات والسلف</h3>
            <button onClick={() => setIsAddingExpense(!isAddingExpense)} className="px-4 py-2 bg-accent/20 text-accent rounded-lg flex items-center gap-2 font-bold hover:bg-accent hover:text-white transition-colors"><Plus size={18}/> مصروف جديد</button>
          </div>
          
          {isAddingExpense && (
            <form onSubmit={handleAddExpense} className="bg-card-bg p-6 rounded-2xl border border-border-color grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">نوع المصروف</label>
                <select value={expenseForm.type} onChange={e => setExpenseForm({...expenseForm, type: e.target.value as any, referenceId: ''})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light">
                  <option value="other">مصروفات عامة (إيجار، كهرباء..)</option>
                  <option value="supplier_payment">دفعة لمورد</option>
                  <option value="staff_payment">سلفة / راتب موظف</option>
                </select>
              </div>

              {expenseForm.type === 'supplier_payment' && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">اسم المورد</label>
                  <select value={expenseForm.referenceId} onChange={e => setExpenseForm({...expenseForm, referenceId: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required>
                    <option value="">اختر المورد</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (مديونية: {s.balance})</option>)}
                  </select>
                </div>
              )}

              {expenseForm.type === 'staff_payment' && (
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1">اسم الموظف</label>
                  <select value={expenseForm.referenceId} onChange={e => setExpenseForm({...expenseForm, referenceId: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required>
                    <option value="">اختر الموظف</option>
                    {staffAccounts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">المبلغ (ج.م)</label>
                <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required />
              </div>
              <div className={expenseForm.type === 'other' ? 'lg:col-span-2' : ''}>
                <label className="block text-sm font-medium text-text-muted mb-1">البيان / الوصف</label>
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})} className="w-full px-4 py-2 bg-bg-dark rounded-lg border border-border-color text-text-light" required />
              </div>

              <div className="lg:col-span-4">
                <button type="submit" className="px-6 py-2 bg-accent text-white rounded-lg font-bold">تسجيل المصروف وتحديث العهدة</button>
              </div>
            </form>
          )}

          <div className="bg-card-bg rounded-2xl border border-border-color overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-bg-dark border-b border-border-color">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold text-text-muted">التاريخ</th>
                  <th className="px-6 py-4 text-sm font-bold text-text-muted">النوع</th>
                  <th className="px-6 py-4 text-sm font-bold text-text-muted">البيان</th>
                  <th className="px-6 py-4 text-sm font-bold text-text-muted">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-bg-dark transition-colors">
                    <td className="px-6 py-4 text-sm text-text-light">{new Date(exp.date).toLocaleString('ar-EG')}</td>
                    <td className="px-6 py-4 text-sm">
                      {exp.type === 'other' && <span className="bg-gray-500/20 text-gray-400 px-2 py-1 rounded">مصروفات عامة</span>}
                      {exp.type === 'supplier_payment' && <span className="bg-primary/20 text-primary px-2 py-1 rounded">دفعة لمورد</span>}
                      {exp.type === 'staff_payment' && <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded">سلفة موظف</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-light">{exp.description}</td>
                    <td className="px-6 py-4 text-sm font-black text-accent">{exp.amount} ج.م</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-muted">لا توجد مصروفات مسجلة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
