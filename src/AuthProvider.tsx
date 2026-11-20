import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc as fsDoc, getDoc, setDoc, collection as fsCollection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { useStore } from './store';
import { tenantCollection as collection, tenantDoc as doc } from './tenantBootstrap';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthReady, setCategories, setMenuItems, setOrders, setUsers, user, isAuthReady } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.isAnonymous) {
          setUser({
            uid: firebaseUser.uid,
            name: 'ضيف',
            email: '',
            role: 'customer',
            createdAt: new Date().toISOString()
          });
          setAuthReady(true);
          return;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as any);
          } else {
            const newUser = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Guest',
              email: firebaseUser.email || '',
              role: firebaseUser.email?.toLowerCase() === 'ahm.atya@gmail.com' ? 'admin' : 'customer',
              createdAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            } catch (e) {
              console.error("Error creating user doc", e);
            }
            setUser(newUser as any);
          }
        } catch (error) {
          console.error("Error fetching user data", error);
        }
      } else {
        setUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  useEffect(() => {
    if (!isAuthReady) return;

    const unsubCategories = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    const unsubMenuItems = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort items by order (if they have one) so they appear ordered everywhere
      items.sort((a, b) => (a.order || 0) - (b.order || 0));
      setMenuItems(items);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'menuItems'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'payment'), (docSnap) => {
      if (docSnap.exists()) {
        useStore.getState().setSettings(docSnap.data() as any);
      }
    }, (error) => console.error("Settings fetch error:", error));

    let unsubOrders = () => {};
    let unsubPayments = () => {};
    let unsubUsers = () => {};
    let unsubInventoryItems = () => {};
    let unsubInventoryTransactions = () => {};
    let unsubSuppliers = () => {};
    let unsubStaffAccounts = () => {};
    let unsubExpenses = () => {};
    let unsubShifts = () => {};

    if (user) {
      const isStaff = user.role === 'admin' || user.role === 'cashier' || user.role === 'captain';
      
      const ordersQuery = isStaff 
        ? query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'orders'), where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'));

      unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
      }, (error) => {
        console.error("Orders fetch error:", error);
      });

      if (user.role === 'admin') {
        unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any)));
        }, (error) => {
          console.error("Users fetch error:", error);
        });

        unsubSuppliers = onSnapshot(collection(db, 'suppliers'), (snapshot) => {
          useStore.getState().setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        });

        unsubStaffAccounts = onSnapshot(collection(db, 'staffAccounts'), (snapshot) => {
          useStore.getState().setStaffAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        });

        unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot) => {
          useStore.getState().setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        });
      }

      if (isStaff) {
        unsubPayments = onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc')), (snapshot) => {
          useStore.getState().setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        }, (error) => {
          console.error("Payments fetch error:", error);
        });

        unsubInventoryItems = onSnapshot(collection(db, 'inventoryItems'), (snapshot) => {
          useStore.getState().setInventoryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        }, (error) => console.error("Inventory Items fetch error:", error));

        unsubInventoryTransactions = onSnapshot(query(collection(db, 'inventoryTransactions'), orderBy('date', 'desc')), (snapshot) => {
          useStore.getState().setInventoryTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        }, (error) => console.error("Inventory Transactions fetch error:", error));
        
        unsubShifts = onSnapshot(query(collection(db, 'shifts'), orderBy('startTime', 'desc')), (snapshot) => {
          useStore.getState().setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
        }, (error) => console.error("Shifts fetch error:", error));
      }
    }

    return () => {
      unsubCategories();
      unsubMenuItems();
      unsubOrders();
      unsubPayments();
      unsubUsers();
      unsubInventoryItems();
      unsubInventoryTransactions();
      unsubSuppliers();
      unsubStaffAccounts();
      unsubExpenses();
      unsubSettings();
      unsubShifts();
    };
  }, [isAuthReady, user, setCategories, setMenuItems, setOrders, setUsers]);

  return <>{children}</>;
}
