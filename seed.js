import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const categories = [
  { id: 'hot_drinks', name: 'المشروبات الساخنة', order: 1 },
  { id: 'herbs', name: 'أعشاب', order: 2 },
  { id: 'fresh_juices', name: 'العصائر', order: 3 },
  { id: 'mojito', name: 'موهيتو', order: 4 },
  { id: 'ice', name: 'آيس', order: 5 },
  { id: 'milkshake', name: 'الميلك شيك', order: 6 },
  { id: 'cocktails', name: 'الكوكتيلات', order: 7 },
  { id: 'water', name: 'مياه ومشروبات غازية', order: 8 },
  { id: 'shisha', name: 'الشيشة', order: 9 },
  { id: 'yogurt', name: 'زبادي', order: 10 },
  { id: 'smoothie', name: 'سموثي', order: 11 },
];

const menuItems = [
  { categoryId: 'hot_drinks', name: 'شاي', price: 15 },
  { categoryId: 'hot_drinks', name: 'شاي بالحليب', price: 20 },
  { categoryId: 'hot_drinks', name: 'براونيز', price: 40 },
  { categoryId: 'hot_drinks', name: 'قهوة تركي', price: 25 },
  { categoryId: 'hot_drinks', name: 'قهوة فرنساوي', price: 30 },
  { categoryId: 'hot_drinks', name: 'اسبريسو سنجل', price: 25 },
  { categoryId: 'hot_drinks', name: 'اسبريسو دبل', price: 35 },
  { categoryId: 'hot_drinks', name: 'فلات وايت', price: 45 },
  { categoryId: 'hot_drinks', name: 'ميكاتو', price: 35 },
  { categoryId: 'hot_drinks', name: 'كابتشينو', price: 40 },
  { categoryId: 'hot_drinks', name: 'كابتشينو فليفر', price: 45 },
  { categoryId: 'hot_drinks', name: 'لاتيه', price: 40 },
  { categoryId: 'hot_drinks', name: 'سبانيش لاتيه', price: 50 },
  { categoryId: 'hot_drinks', name: 'موكا', price: 45 },
  { categoryId: 'hot_drinks', name: 'نسكافيه بلاك', price: 30 },
  { categoryId: 'hot_drinks', name: 'نسكافيه بالحليب', price: 35 },
  { categoryId: 'hot_drinks', name: 'هوت شوكليت', price: 40 },
  { categoryId: 'hot_drinks', name: 'هوت سيدر', price: 35 },
  { categoryId: 'hot_drinks', name: 'قهوة نكهات', price: 35 },
  { categoryId: 'herbs', name: 'ينسون', price: 15 },
  { categoryId: 'herbs', name: 'قرفة', price: 15 },
  { categoryId: 'herbs', name: 'جنزبيل', price: 15 },
  { categoryId: 'herbs', name: 'كركديه', price: 15 },
  { categoryId: 'herbs', name: 'ليمون ساخن', price: 15 },
  { categoryId: 'herbs', name: 'نعناع ساخن', price: 15 },
  { categoryId: 'herbs', name: 'كوكتيل اعشاب', price: 20 },
  { categoryId: 'herbs', name: 'قرفة بالحليب', price: 25 },
  { categoryId: 'herbs', name: 'سحلب سادة', price: 30 },
  { categoryId: 'herbs', name: 'سحلب مكسرات', price: 40 },
  { categoryId: 'herbs', name: 'سحلب فواكه', price: 45 },
  { categoryId: 'herbs', name: 'سحلب اوريو', price: 45 },
  { categoryId: 'herbs', name: 'سحلب سهرايا', price: 50 },
  { categoryId: 'fresh_juices', name: 'مانجو', price: 35 },
  { categoryId: 'fresh_juices', name: 'فراولة', price: 35 },
  { categoryId: 'fresh_juices', name: 'جوافة', price: 30 },
  { categoryId: 'fresh_juices', name: 'موز بالحليب', price: 30 },
  { categoryId: 'fresh_juices', name: 'ليمون', price: 25 },
  { categoryId: 'fresh_juices', name: 'ليمون نعناع', price: 30 },
  { categoryId: 'fresh_juices', name: 'بطيخ', price: 30 },
  { categoryId: 'fresh_juices', name: 'كانتلوب', price: 30 },
  { categoryId: 'fresh_juices', name: 'كيوي', price: 35 },
  { categoryId: 'fresh_juices', name: 'خوخ', price: 35 },
  { categoryId: 'fresh_juices', name: 'برتقال', price: 30 },
  { categoryId: 'fresh_juices', name: 'بلح باللبن', price: 35 },
  { categoryId: 'fresh_juices', name: 'افوكادو', price: 50 },
  { categoryId: 'fresh_juices', name: 'افوكادو عسل', price: 55 },
  { categoryId: 'fresh_juices', name: 'افوكادو عسل ومكسرات', price: 65 },
  { categoryId: 'mojito', name: 'موهيتو سفن', price: 40 },
  { categoryId: 'mojito', name: 'موهيتو فراولة', price: 45 },
  { categoryId: 'mojito', name: 'موهيتو رمان', price: 45 },
  { categoryId: 'mojito', name: 'موهيتو ريد بول', price: 60 },
  { categoryId: 'mojito', name: 'بلوبيري', price: 45 },
  { categoryId: 'mojito', name: 'نعناع', price: 35 },
  { categoryId: 'mojito', name: 'رمان', price: 40 },
  { categoryId: 'mojito', name: 'فراولة', price: 40 },
  { categoryId: 'mojito', name: 'بلوبيري سفن', price: 45 },
  { categoryId: 'mojito', name: 'بلوبيري ريد بول', price: 60 },
  { categoryId: 'ice', name: 'ايس كوفي', price: 40 },
  { categoryId: 'ice', name: 'ايس لاتيه', price: 45 },
  { categoryId: 'ice', name: 'ايس سبانيش لاتيه', price: 55 },
  { categoryId: 'ice', name: 'ايس وايت موكا', price: 55 },
  { categoryId: 'ice', name: 'ايس شوكليت', price: 45 },
  { categoryId: 'ice', name: 'ايس موكا', price: 50 },
  { categoryId: 'milkshake', name: 'ميلك اوريو', price: 50 },
  { categoryId: 'milkshake', name: 'شوكولاتة', price: 45 },
  { categoryId: 'milkshake', name: 'فانيليا', price: 45 },
  { categoryId: 'milkshake', name: 'كراميل', price: 45 },
  { categoryId: 'milkshake', name: 'لوتس', price: 55 },
  { categoryId: 'milkshake', name: 'سنيكرز', price: 55 },
  { categoryId: 'milkshake', name: 'كيت كات', price: 55 },
  { categoryId: 'milkshake', name: 'مانجو', price: 45 },
  { categoryId: 'milkshake', name: 'فراولة', price: 45 },
  { categoryId: 'milkshake', name: 'بلوبيري', price: 50 },
  { categoryId: 'cocktails', name: 'فلوريدا', description: 'مانجو + فراولة + جوافة', price: 45 },
  { categoryId: 'cocktails', name: 'كوكتيل صيفي', description: 'مانجو + كيوي + اناناس', price: 50 },
  { categoryId: 'cocktails', name: 'بينا كولادا', description: 'اناناس + جوز هند + حليب', price: 50 },
  { categoryId: 'cocktails', name: 'بلو اوشن', description: 'سفن + سيرب بلو + ليمون', price: 45 },
  { categoryId: 'cocktails', name: 'عصير ليمون نعناع', price: 30 },
  { categoryId: 'cocktails', name: 'جوافة نعناع', price: 35 },
  { categoryId: 'cocktails', name: 'كيوي ليمون نعناع', price: 40 },
  { categoryId: 'cocktails', name: 'مانجو توينكيز', price: 45 },
  { categoryId: 'cocktails', name: 'باور هاوس', description: 'بلح + موز + افوكادو + مكسرات + عسل', price: 65 },
  { categoryId: 'cocktails', name: 'كوكتيل سهرايا', price: 60 },
  { categoryId: 'water', name: 'كولا', price: 20 },
  { categoryId: 'water', name: 'سبرايت', price: 20 },
  { categoryId: 'water', name: 'ميرندا', price: 20 },
  { categoryId: 'water', name: 'فيروز', price: 25 },
  { categoryId: 'water', name: 'شويبس', price: 25 },
  { categoryId: 'water', name: 'ريد بول', price: 50 },
  { categoryId: 'water', name: 'بيريل', price: 25 },
  { categoryId: 'water', name: 'مياه معدنية', price: 10 },
  { categoryId: 'shisha', name: 'شيشة قص', price: 30 },
  { categoryId: 'shisha', name: 'شيشة سلوم', price: 30 },
  { categoryId: 'shisha', name: 'شيشة فواكه', price: 40 },
  { categoryId: 'shisha', name: 'شيشة فاخر', price: 50 },
  { categoryId: 'shisha', name: 'لي حليب', price: 10 },
  { categoryId: 'shisha', name: 'لي زجاج', price: 15 },
  { categoryId: 'yogurt', name: 'زبادي عسل', price: 30 },
  { categoryId: 'yogurt', name: 'زبادي مانجو', price: 35 },
  { categoryId: 'yogurt', name: 'زبادي فراولة', price: 35 },
  { categoryId: 'yogurt', name: 'زبادي توت', price: 40 },
  { categoryId: 'yogurt', name: 'زبادي فواكه', price: 45 },
  { categoryId: 'yogurt', name: 'زبادي فواكه سهرايا', price: 50 },
  { categoryId: 'smoothie', name: 'سموثي ليمون نعناع', price: 40 },
  { categoryId: 'smoothie', name: 'سموثي مانجو', price: 45 },
  { categoryId: 'smoothie', name: 'سموثي بطيخ', price: 40 },
  { categoryId: 'smoothie', name: 'سموثي كيوي', price: 45 },
  { categoryId: 'smoothie', name: 'سموثي فراولة', price: 45 },
  { categoryId: 'smoothie', name: 'سموثي اناناس', price: 45 },
  { categoryId: 'smoothie', name: 'سموثي خوخ', price: 45 },
  { categoryId: 'smoothie', name: 'سموثي بلوبيري', price: 50 },
  { categoryId: 'smoothie', name: 'سموثي مانجو كيوي', price: 50 },
  { categoryId: 'smoothie', name: 'سموثي باشن فروت', price: 55 },
  { categoryId: 'smoothie', name: 'سموثي سهرايا', price: 60 }
];

async function seed() {
  const batch = writeBatch(db);
  categories.forEach(cat => {
    const ref = doc(db, 'categories', cat.id);
    batch.set(ref, cat);
  });
  menuItems.forEach((item) => {
    const ref = doc(collection(db, 'menuItems'));
    batch.set(ref, { ...item, isAvailable: true });
  });
  await batch.commit();
  console.log('Seeded successfully');
  process.exit(0);
}

seed().catch(console.error);
