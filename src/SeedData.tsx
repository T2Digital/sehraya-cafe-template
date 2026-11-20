import { useState } from 'react';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from './firebase';

const categories = [
  { id: 'hot_drinks', name: 'المشروبات الساخنة', order: 1, imageUrl: 'https://images.unsplash.com/photo-1541167760496-162955ed2a41?w=800&q=80' },
  { id: 'herbs', name: 'أعشاب', order: 2, imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89fe6d9cde9?w=800&q=80' },
  { id: 'fresh_juices', name: 'العصائر', order: 3, imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80' },
  { id: 'mojito', name: 'موهيتو', order: 4, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80' },
  { id: 'ice', name: 'آيس', order: 5, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80' },
  { id: 'milkshake', name: 'الميلك شيك', order: 6, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&q=80' },
  { id: 'cocktails', name: 'الكوكتيلات', order: 7, imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800&q=80' },
  { id: 'water', name: 'مياه ومشروبات غازية', order: 8, imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800&q=80' },
  { id: 'shisha', name: 'الشيشة', order: 9, imageUrl: 'https://images.unsplash.com/photo-1582046296336-d668c27cf1e2?w=800&q=80' },
  { id: 'yogurt', name: 'زبادي', order: 10, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80' },
  { id: 'smoothie', name: 'سموثي', order: 11, imageUrl: 'https://images.unsplash.com/photo-1502741224143-90386d7cd8c9?w=800&q=80' },
];

const menuItems = [
  // Hot Drinks
  { categoryId: 'hot_drinks', name: 'شاي', price: 15, imageUrl: 'https://images.unsplash.com/photo-1544787210-22db397782ea?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'شاي بالحليب', price: 20, imageUrl: 'https://images.unsplash.com/photo-1576092729250-19c137184842?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'براونيز', price: 40, imageUrl: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'قهوة تركي', price: 25, imageUrl: 'https://images.unsplash.com/photo-1579992357154-faf4bfe95b3d?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'قهوة فرنساوي', price: 30, imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'اسبريسو سنجل', price: 25, imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'اسبريسو دبل', price: 35, imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'فلات وايت', price: 45, imageUrl: 'https://images.unsplash.com/photo-1551030173-1d2056c44ef1?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'ميكاتو', price: 35, imageUrl: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'كابتشينو', price: 40, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'كابتشينو فليفر', price: 45, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'لاتيه', price: 40, imageUrl: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'سبانيش لاتيه', price: 50, imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'موكا', price: 45, imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'نسكافيه بلاك', price: 30, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'نسكافيه بالحليب', price: 35, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'هوت شوكليت', price: 40, imageUrl: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'هوت سيدر', price: 35, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
  { categoryId: 'hot_drinks', name: 'قهوة نكهات', price: 35, imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&q=80' },

  // Herbs
  { categoryId: 'herbs', name: 'ينسون', price: 15, imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=500&q=80' },
  { categoryId: 'herbs', name: 'قرفة', price: 15, imageUrl: 'https://images.unsplash.com/photo-1506800113253-1563f1606828?w=500&q=80' },
  { categoryId: 'herbs', name: 'جنزبيل', price: 15, imageUrl: 'https://images.unsplash.com/photo-1615485215802-9ca9df100e4e?w=500&q=80' },
  { categoryId: 'herbs', name: 'كركديه', price: 15, imageUrl: 'https://images.unsplash.com/photo-1576092729250-19c137184842?w=500&q=80' },
  { categoryId: 'herbs', name: 'ليمون ساخن', price: 15, imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=500&q=80' },
  { categoryId: 'herbs', name: 'نعناع ساخن', price: 15, imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89fe6d9cde9?w=500&q=80' },
  { categoryId: 'herbs', name: 'كوكتيل اعشاب', price: 20, imageUrl: 'https://images.unsplash.com/photo-1564890369478-c89fe6d9cde9?w=500&q=80' },
  { categoryId: 'herbs', name: 'قرفة بالحليب', price: 25, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&q=80' },
  { categoryId: 'herbs', name: 'سحلب سادة', price: 30, imageUrl: 'https://images.unsplash.com/photo-1632054033413-5ebca3ff6b09?w=500&q=80' },
  { categoryId: 'herbs', name: 'سحلب مكسرات', price: 40, imageUrl: 'https://images.unsplash.com/photo-1632054033413-5ebca3ff6b09?w=500&q=80' },
  { categoryId: 'herbs', name: 'سحلب فواكه', price: 45, imageUrl: 'https://images.unsplash.com/photo-1632054033413-5ebca3ff6b09?w=500&q=80' },
  { categoryId: 'herbs', name: 'سحلب اوريو', price: 45, imageUrl: 'https://images.unsplash.com/photo-1632054033413-5ebca3ff6b09?w=500&q=80' },
  { categoryId: 'herbs', name: 'سحلب سهرايا', price: 50, imageUrl: 'https://images.unsplash.com/photo-1632054033413-5ebca3ff6b09?w=500&q=80' },

  // Fresh Juices
  { categoryId: 'fresh_juices', name: 'مانجو', price: 35, imageUrl: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'فراولة', price: 35, imageUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'جوافة', price: 30, imageUrl: 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'موز بالحليب', price: 30, imageUrl: 'https://images.unsplash.com/photo-1528498031133-c5980753086b?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'ليمون', price: 25, imageUrl: 'https://images.unsplash.com/photo-1523675322749-dd6056d05f3e?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'ليمون نعناع', price: 30, imageUrl: 'https://images.unsplash.com/photo-1523675322749-dd6056d05f3e?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'بطيخ', price: 30, imageUrl: 'https://images.unsplash.com/photo-1554494583-c4e1649bfe71?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'كانتلوب', price: 30, imageUrl: 'https://images.unsplash.com/photo-1520623235316-c87a5f6e864c?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'كيوي', price: 35, imageUrl: 'https://images.unsplash.com/photo-1585059895524-72359e061381?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'خوخ', price: 35, imageUrl: 'https://images.unsplash.com/photo-1601314167099-232775b3d6fd?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'برتقال', price: 30, imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab80261f184?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'بلح باللبن', price: 35, imageUrl: 'https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=500&q=80' },
  { categoryId: 'fresh_juices', name: 'افوكادو', price: 50, imageUrl: 'https://images.unsplash.com/photo-1523040558550-6818174f85e5?w=500&q=80' },

  // Mojito
  { categoryId: 'mojito', name: 'موهيتو سفن', price: 40, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
  { categoryId: 'mojito', name: 'موهيتو فراولة', price: 45, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
  { categoryId: 'mojito', name: 'موهيتو رمان', price: 45, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
  { categoryId: 'mojito', name: 'موهيتو ريد بول', price: 60, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
  { categoryId: 'mojito', name: 'بلوبيري', price: 45, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },
  { categoryId: 'mojito', name: 'نعناع', price: 35, imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80' },

  // Ice
  { categoryId: 'ice', name: 'ايس كوفي', price: 40, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },
  { categoryId: 'ice', name: 'ايس لاتيه', price: 45, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },
  { categoryId: 'ice', name: 'ايس سبانيش لاتيه', price: 55, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },
  { categoryId: 'ice', name: 'ايس وايت موكا', price: 55, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&q=80' },

  // Milkshake
  { categoryId: 'milkshake', name: 'ميلك اوريو', price: 50, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { categoryId: 'milkshake', name: 'لوتس', price: 55, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { categoryId: 'milkshake', name: 'شوكولاتة', price: 45, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },
  { categoryId: 'milkshake', name: 'فانيليا', price: 45, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&q=80' },

  // Cocktails
  { categoryId: 'cocktails', name: 'فلوريدا', price: 45, imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=500&q=80' },
  { categoryId: 'cocktails', name: 'بينا كولادا', price: 50, imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=500&q=80' },
  { categoryId: 'cocktails', name: 'بلو اوشن', price: 45, imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=500&q=80' },

  // Yogurt
  { categoryId: 'yogurt', name: 'زبادي عسل', price: 30, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80' },
  { categoryId: 'yogurt', name: 'زبادي فواكه', price: 45, imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500&q=80' },

  // Smoothie
  { categoryId: 'smoothie', name: 'سموثي مانجو', price: 45, imageUrl: 'https://images.unsplash.com/photo-1502741224143-90386d7cd8c9?w=500&q=80' },
  { categoryId: 'smoothie', name: 'سموثي فراولة', price: 45, imageUrl: 'https://images.unsplash.com/photo-1502741224143-90386d7cd8c9?w=500&q=80' },
  { categoryId: 'smoothie', name: 'سموثي اناناس', price: 45, imageUrl: 'https://images.unsplash.com/photo-1502741224143-90386d7cd8c9?w=500&q=80' },
  { categoryId: 'smoothie', name: 'سموثي خوخ', price: 45, imageUrl: 'https://images.unsplash.com/photo-1502741224143-90386d7cd8c9?w=500&q=80' },
];

export function SeedData() {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      // Update categories (IDs are fixed)
      categories.forEach(cat => {
        const ref = doc(db, 'categories', cat.id);
        batch.set(ref, cat, { merge: true });
      });

      // Get all existing items to match by name
      const existingItemsSnap = await getDocs(collection(db, 'menuItems'));
      const existingItems = existingItemsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

      menuItems.forEach((item) => {
        const existing = existingItems.find(ei => ei.name === item.name && ei.categoryId === item.categoryId);
        if (existing) {
          const ref = doc(db, 'menuItems', existing.id);
          batch.set(ref, { ...item, isAvailable: true }, { merge: true });
        } else {
          const ref = doc(collection(db, 'menuItems'));
          batch.set(ref, { ...item, isAvailable: true, order: 0 });
        }
      });

      await batch.commit();
      alert('تم تحديث البيانات بنجاح!');
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء تحديث البيانات');
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleSeed} 
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded-md"
    >
      {loading ? 'جاري الإضافة...' : 'إضافة بيانات المنيو الأساسية'}
    </button>
  );
}
