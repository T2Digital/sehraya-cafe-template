import React, { useEffect, useRef } from 'react';
import { useStore } from '../store';
import toast from 'react-hot-toast';

export function NotificationManager() {
  const { orders, user } = useStore();
  const prevOrdersRef = useRef(orders);

  useEffect(() => {
    if (!user) return;
    if (orders.length === 0 && prevOrdersRef.current.length === 0) return;

    // Detect changes
    const prevMap = new Map(prevOrdersRef.current.map(o => [o.id, o]));
    let shouldNotify = false;
    let notificationMessage = '';

    orders.forEach(order => {
      const prevOrder = prevMap.get(order.id);
      
      // New Order
      if (!prevOrder) {
        if (user.role === 'admin' || user.role === 'cashier') {
           shouldNotify = true;
           notificationMessage = `طلب جديد للطاولة ${order.tableNumber}`;
        }
      } 
      // Status Changed
      else if (prevOrder.status !== order.status) {
        const isCashierOrAdmin = user.role === 'admin' || user.role === 'cashier';
        const isCaptain = user.role === 'captain';

        if (order.status === 'confirmed' && isCashierOrAdmin) {
          shouldNotify = true;
          notificationMessage = `تم إرسال طلب طاولة ${order.tableNumber} للبار/المطبخ`;
        } else if (order.status === 'ready' && (isCaptain || isCashierOrAdmin)) {
          shouldNotify = true;
          notificationMessage = `طلب طاولة ${order.tableNumber} جاهز للتقديم!`;
        } else if (order.status === 'served' && isCashierOrAdmin) {
          shouldNotify = true;
          notificationMessage = `تم تقديم طلب طاولة ${order.tableNumber}`;
        } else if (order.status === 'completed' && isCashierOrAdmin) {
          shouldNotify = true;
          notificationMessage = `تم دفع وإنهاء طاولة ${order.tableNumber} بنجاح`;
        }
      }
    });

    if (shouldNotify) {
      // Vibrate
      if ('vibrate' in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]); // Vibrates for about a second
      }

      // Play Sound (2-3 seconds beeping)
      playNotificationSound();

      // Show Toast
      if (notificationMessage) {
        toast.success(notificationMessage, {
           duration: 4000,
           position: 'top-center',
           style: {
             background: '#333',
             color: '#fff',
             fontSize: '18px',
             fontWeight: 'bold',
             border: '1px solid #cfa858'
           },
           iconTheme: {
             primary: '#cfa858',
             secondary: '#000',
           },
        });
      }
    }

    prevOrdersRef.current = orders;
  }, [orders, user]);

  return null;
}

function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const playBeep = (startTime: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, startTime); // A5 note
      gain.gain.setValueAtTime(0.2, startTime);
      osc.start(startTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.5);
      osc.stop(startTime + 0.5);
    };

    // Play 4 beeps over 2 seconds
    const now = ctx.currentTime;
    playBeep(now);
    playBeep(now + 0.5);
    playBeep(now + 1.0);
    playBeep(now + 1.5);
    playBeep(now + 2.0);

  } catch (e) {
    console.error("Audio play failed", e);
  }
}
