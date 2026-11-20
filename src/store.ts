import { create } from 'zustand';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'captain' | 'customer';
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  order: number;
  imageUrl?: string;
}

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  order?: number;
}

interface CartItem extends MenuItem {
  quantity: number;
  note?: string;
}

interface Order {
  id: string;
  tableNumber: string;
  customerName?: string;
  customerMobile?: string;
  items: { menuItemId: string; name: string; quantity: number; price: number; note?: string }[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  confirmedAt?: string;
  createdBy: string;
  type: 'customer' | 'captain';
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
}

interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  note: string;
  user: string;
}

export interface Payment {
  id: string;
  tableNumber: string;
  amount: number;
  method: 'cash' | 'mobile_wallet' | 'instapay';
  walletProvider?: string;
  proofImageUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  createdBy: string;
  verifiedBy?: string;
  note?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  balance: number; // positive = we owe them
}

export interface StaffAccount {
  id: string;
  name: string;
  role: string;
  salary: number;
  balance: number;
}

export interface Expense {
  id: string;
  type: 'supplier_payment' | 'staff_payment' | 'other';
  amount: number;
  date: string;
  description: string;
  referenceId?: string;
}

export interface Shift {
  id: string;
  startTime: string;
  endTime: string | null;
  startedBy: string;
  endedBy: string | null;
  status: 'open' | 'closed';
  cashCollected?: number;
  expectedCash?: number;
  totalSales?: number;
  ordersCount?: number;
}

export interface Settings {
  walletNumber: string;
  instapayNumber: string;
  instapayLink: string;
  cafeName?: string;
  commercialRegister?: string;
  taxCardNumber?: string;
  serviceChargePct?: number;
  vatPct?: number;
  tablesCount?: number;
}

interface AppState {
  user: User | null;
  isAuthReady: boolean;
  users: User[];
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  payments: Payment[];
  cart: CartItem[];
  tableNumber: string;
  inventoryItems: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  suppliers: Supplier[];
  staffAccounts: StaffAccount[];
  expenses: Expense[];
  shifts: Shift[];
  settings: Settings;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  setUsers: (users: User[]) => void;
  setCategories: (categories: Category[]) => void;
  setMenuItems: (items: MenuItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setPayments: (payments: Payment[]) => void;
  setInventoryItems: (items: InventoryItem[]) => void;
  setInventoryTransactions: (transactions: InventoryTransaction[]) => void;
  setSuppliers: (s: Supplier[]) => void;
  setStaffAccounts: (s: StaffAccount[]) => void;
  setExpenses: (e: Expense[]) => void;
  setShifts: (s: Shift[]) => void;
  setSettings: (s: Settings) => void;
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartItemNote: (itemId: string, note: string) => void;
  clearCart: () => void;
  setTableNumber: (table: string) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthReady: false,
  users: [],
  categories: [],
  menuItems: [],
  orders: [],
  payments: [],
  cart: [],
  tableNumber: '',
  inventoryItems: [],
  inventoryTransactions: [],
  suppliers: [],
  staffAccounts: [],
  expenses: [],
  shifts: [],
  settings: {
    walletNumber: '',
    instapayNumber: '',
    instapayLink: '',
  },
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  setUsers: (users) => set({ users }),
  setCategories: (categories) => set({ categories }),
  setMenuItems: (items) => set({ menuItems: items }),
  setOrders: (orders) => set({ orders }),
  setPayments: (payments) => set({ payments }),
  setInventoryItems: (items) => set({ inventoryItems: items }),
  setInventoryTransactions: (transactions) => set({ inventoryTransactions: transactions }),
  setSuppliers: (suppliers) => set({ suppliers }),
  setStaffAccounts: (staffAccounts) => set({ staffAccounts }),
  setExpenses: (expenses) => set({ expenses }),
  setShifts: (shifts) => set({ shifts }),
  setSettings: (settings) => set({ settings }),
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(c => c.id === item.id);
    if (existing) {
      return { cart: state.cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c) };
    }
    return { cart: [...state.cart, { ...item, quantity: 1, note: '' }] };
  }),
  removeFromCart: (itemId) => set((state) => {
    const existing = state.cart.find(c => c.id === itemId);
    if (existing && existing.quantity > 1) {
      return { cart: state.cart.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c) };
    }
    return { cart: state.cart.filter(c => c.id !== itemId) };
  }),
  updateCartItemNote: (itemId, note) => set((state) => ({
    cart: state.cart.map(c => c.id === itemId ? { ...c, note } : c)
  })),
  clearCart: () => set({ cart: [] }),
  setTableNumber: (table) => set({ tableNumber: table }),
}));
