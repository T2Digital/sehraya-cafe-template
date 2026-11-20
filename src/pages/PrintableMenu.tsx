import React, { useRef } from 'react';
import { useStore } from '../store';
import { Printer, ArrowRight, Coffee, Utensils, Star, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrintableMenu() {
  const { categories, menuItems } = useStore();
  const componentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

  // Group categories into pairs (2 columns per A4 landscape sheet)
  // We'll use a more flexible approach: distribute categories based on item count to balance columns
  const columns: any[][] = [];
  let currentColumn: any[] = [];
  let currentItemCount = 0;
  const MAX_ITEMS_PER_COLUMN = 18; // Approximate limit before overflow

  sortedCategories.forEach(cat => {
    const catItems = menuItems.filter(item => item.categoryId === cat.id);
    // If adding this category exceeds the limit and column isn't empty, start new column
    if (currentItemCount + catItems.length > MAX_ITEMS_PER_COLUMN && currentColumn.length > 0) {
      columns.push(currentColumn);
      currentColumn = [cat];
      currentItemCount = catItems.length;
    } else {
      currentColumn.push(cat);
      currentItemCount += catItems.length;
    }
  });
  if (currentColumn.length > 0) columns.push(currentColumn);

  // Group columns into pairs for sheets
  const sheets: any[][][] = [];
  for (let i = 0; i < columns.length; i += 2) {
    sheets.push([columns[i], columns[i + 1] || []]);
  }

  const MenuItem = ({ item }: { item: any }) => (
    <div className="flex justify-between items-baseline gap-2 py-1">
      <div className="flex flex-col flex-1">
        <span className="font-bold text-gray-800 text-sm">{item.name}</span>
        {item.description && <span className="text-[10px] text-gray-500 leading-tight">{item.description}</span>}
      </div>
      <div className="flex-1 border-b border-dotted border-gray-300 mb-1"></div>
      <span className="font-black text-amber-900 text-sm whitespace-nowrap">{item.price} ج.م</span>
    </div>
  );

  const CategorySection = ({ cat }: { cat: any }) => (
    <div className="mb-6 break-inside-avoid">
      <div className="flex items-center gap-2 mb-2 border-b-2 border-amber-100 pb-1">
        <Star size={14} className="text-amber-600 fill-amber-600" />
        <h3 className="text-base font-black text-amber-900 uppercase tracking-wide">{cat.name}</h3>
      </div>
      <div className="space-y-0.5">
        {menuItems.filter(item => item.categoryId === cat.id).map(item => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );

  const PageHeader = ({ pageNum }: { pageNum: number }) => (
    <div className="flex justify-between items-center mb-8 border-b-4 border-amber-900 pb-4">
      <div className="flex items-center gap-3">
        <div className="bg-amber-900 p-2 rounded-lg">
          <Coffee size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-amber-900 leading-none">كافيه سهرايا</h1>
          <p className="text-[10px] text-amber-700 font-bold tracking-widest uppercase mt-1">Premium Cafe & Lounge</p>
        </div>
      </div>
      <div className="text-left">
        <p className="text-xs text-gray-500 font-bold">صفحة {pageNum}</p>
        <div className="flex gap-1 mt-1">
          {[1, 2, 3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= pageNum ? 'bg-amber-600' : 'bg-gray-200'}`}></div>)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-sm">
          <ArrowRight size={20} /> عودة لوحة التحكم
        </button>
        <div className="flex gap-4">
          <button 
            onClick={() => handlePrint()} 
            className="flex items-center gap-2 bg-amber-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            <Printer size={20} /> طباعة المنيو بالكامل
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-12 pb-20">
        {/* Preview Container */}
        <div ref={componentRef} className="flex flex-col gap-[20mm] print:gap-0 print-menu">
          {sheets.map((sheet, sheetIndex) => (
            <div 
              key={sheetIndex}
              className={`bg-white shadow-2xl print:shadow-none overflow-hidden relative ${sheetIndex > 0 ? 'break-before-page' : ''}`}
              style={{ width: '297mm', height: '210mm', padding: '0', boxSizing: 'border-box' }}
            >
              <div className="flex h-full w-full">
                {sheet.map((columnCats, colIndex) => (
                  <div 
                    key={colIndex} 
                    className={`w-1/2 h-full p-12 flex flex-col bg-white ${colIndex === 0 ? 'border-l border-dashed border-gray-200' : ''}`}
                  >
                    <PageHeader pageNum={sheetIndex * 2 + colIndex + 1} />
                    <div className="flex-1 overflow-hidden">
                      {columnCats.map(cat => (
                        <CategorySection key={cat.id} cat={cat} />
                      ))}
                      
                      {/* Footer on the very last column */}
                      {sheetIndex === sheets.length - 1 && colIndex === sheet.length - 1 && (
                        <div className="mt-auto pt-8 border-t border-amber-100 text-center">
                          <p className="text-amber-900 font-bold text-sm">نعتز بخدمتكم في كافيه سهرايا</p>
                          <p className="text-[10px] text-gray-400 mt-1">جميع الأسعار تشمل ضريبة القيمة المضافة</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        
        @media print {
          @page { 
            size: A4 landscape; 
            margin: 0; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
            background: white;
          }
          .print\\:shadow-none { box-shadow: none !important; }
          .break-before-page { page-break-before: always; }
        }
        
        * {
          font-family: 'Cairo', sans-serif;
        }
      `}</style>
    </div>
  );
}
