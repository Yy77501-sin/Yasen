import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  Server, 
  Globe, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Copy, 
  DollarSign 
} from 'lucide-react';
import { PROVIDERS, APPS, TOP_COUNTRIES, PROFIT_MARGIN, RUB_PER_USD } from '../data/catalogData';
import { SmsProvider, ServiceApp, CountryItem } from '../types';

interface Props {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
}

export const NumberSmsSimulator: React.FC<Props> = ({ userBalance, setUserBalance }) => {
  const [selectedApp, setSelectedApp] = useState<ServiceApp>(APPS[0]);
  const [selectedServer, setSelectedServer] = useState<SmsProvider>(PROVIDERS[0]);
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(TOP_COUNTRIES[0]);
  
  const [activeNumber, setActiveNumber] = useState<{
    phone: string;
    orderId: string;
    costRub: number;
    costUsd: number;
    code: string | null;
    status: 'waiting' | 'received' | 'canceled';
    timeLeft: number;
  } | null>(null);

  // Price calculation with 30% profit margin
  const baseCostRub = selectedCountry.defaultRub;
  const priceRub = Number((baseCostRub * (1.0 + PROFIT_MARGIN)).toFixed(1));
  const priceUsd = Number((priceRub / RUB_PER_USD).toFixed(2));
  const profitUsd = Number(((priceRub - baseCostRub) / RUB_PER_USD).toFixed(2));

  // Timer countdown for active number
  useEffect(() => {
    if (!activeNumber || activeNumber.status !== 'waiting') return;
    const interval = setInterval(() => {
      setActiveNumber(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          // Timeout reached, refund
          setUserBalance(b => Number((b + prev.costUsd).toFixed(2)));
          return { ...prev, timeLeft: 0, status: 'canceled' };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeNumber, setUserBalance]);

  const handleBuyNumber = () => {
    if (userBalance < priceUsd) {
      alert(`رصيدك ($${userBalance.toFixed(2)}) غير كافٍ لشراء هذا الرقم ($${priceUsd.toFixed(2)})!`);
      return;
    }

    // Deduct user balance
    setUserBalance(b => Number((b - priceUsd).toFixed(2)));

    const generatedPhone = `${selectedCountry.prefix}${Math.floor(70000000 + Math.random() * 29999999)}`;
    const newOrder = {
      phone: generatedPhone,
      orderId: String(Math.floor(1000000 + Math.random() * 9000000)),
      costRub: priceRub,
      costUsd: priceUsd,
      code: null,
      status: 'waiting' as const,
      timeLeft: 18 * 60 // 18 minutes
    };

    setActiveNumber(newOrder);

    // Simulate SMS arrival after 5 seconds
    setTimeout(() => {
      setActiveNumber(prev => {
        if (!prev || prev.status !== 'waiting') return prev;
        const fakeCode = String(Math.floor(100000 + Math.random() * 900000));
        return { ...prev, code: fakeCode, status: 'received' };
      });
    }, 5000);
  };

  const handleCancelNumber = () => {
    if (!activeNumber) return;
    // Refund balance
    setUserBalance(b => Number((b + activeNumber.costUsd).toFixed(2)));
    setActiveNumber(null);
  };

  return (
    <div className="space-y-6">
      {/* 30% Profit Margin Spotlight */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">سيرفرات الأرقام الوهمية (4 سيرفرات كبرى)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                +30% هامش ربح تلقائي
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              جلب الأسعار تلقائياً من 5SIM، Grizzly SMS، Hero SMS، Plus SMS وتطبيق نسبة الربح 30% لجميع الدول.
            </p>
          </div>
        </div>

        <div className="bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-xs flex items-center gap-4 text-xs">
          <div>
            <span className="text-stone-400 block text-[10px]">سعر المزود الخام:</span>
            <span className="font-mono font-bold text-stone-700">{baseCostRub} ₽ (${(baseCostRub / RUB_PER_USD).toFixed(2)})</span>
          </div>
          <div className="text-emerald-600 font-bold text-base">+30%</div>
          <div>
            <span className="text-stone-400 block text-[10px]">سعر البيع للزبون:</span>
            <span className="font-mono font-bold text-emerald-700">{priceRub} ₽ (${priceUsd.toFixed(2)})</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Select App & Server & Country */}
        <div className="lg:col-span-6 space-y-4">
          {/* Step 1: Select App */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2.5">
            <label className="text-xs font-bold text-stone-800 block">1. التطبيق المراد تفعيله:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {APPS.slice(0, 6).map(app => (
                <button
                  key={app.code}
                  onClick={() => setSelectedApp(app)}
                  className={`p-2.5 text-xs font-bold rounded-lg border text-right transition-all ${
                    selectedApp.code === app.code 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs' 
                      : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {app.short}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Server */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2.5">
            <label className="text-xs font-bold text-stone-800 block">2. اختر السيرفر المزود:</label>
            <div className="space-y-1.5">
              {PROVIDERS.map(srv => (
                <button
                  key={srv.id}
                  onClick={() => setSelectedServer(srv)}
                  className={`w-full p-2.5 text-xs rounded-lg border text-right transition-all flex items-center justify-between ${
                    selectedServer.id === srv.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                      : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100 font-medium'
                  }`}
                >
                  <span>{srv.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white text-stone-600 border border-stone-200 font-mono">
                    {srv.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Select Country */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2.5">
            <label className="text-xs font-bold text-stone-800 block">3. الدولة:</label>
            <div className="grid grid-cols-2 gap-2">
              {TOP_COUNTRIES.slice(0, 8).map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCountry(c)}
                  className={`p-2.5 text-xs rounded-lg border text-right transition-all flex items-center justify-between ${
                    selectedCountry.id === c.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                      : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span>{c.flag} {c.title}</span>
                  <span className="font-mono text-[10px] text-stone-400">+{c.prefix}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Price Card & Active Order Terminal */}
        <div className="lg:col-span-6 space-y-4">
          {/* Price Preview Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-bold text-stone-600">بطاقة حجز الرقم</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {selectedServer.badge}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500">التطبيق المطلوب:</span>
                <span className="font-bold text-stone-800">{selectedApp.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500">الدولة المختارة:</span>
                <span className="font-bold text-stone-800">{selectedCountry.flag} {selectedCountry.title} (+{selectedCountry.prefix})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500">سعر المزود الأساسي:</span>
                <span className="font-mono text-stone-600">{baseCostRub} ₽ (${(baseCostRub / RUB_PER_USD).toFixed(2)})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-50">
                <span className="text-stone-500">هامش الربح الصافي (30%):</span>
                <span className="font-mono text-emerald-600 font-bold">+${profitUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-stone-100 text-sm">
                <span className="font-bold text-stone-900">السعر النهائي للزبون:</span>
                <span className="font-mono font-extrabold text-emerald-700">{priceRub} ₽ (${priceUsd.toFixed(2)})</span>
              </div>
            </div>

            {!activeNumber ? (
              <button
                onClick={handleBuyNumber}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>شراء وتفعيل الرقم الآن (${priceUsd})</span>
              </button>
            ) : (
              <div className="p-4 bg-stone-900 text-stone-100 rounded-xl space-y-3 font-mono text-xs border border-stone-800">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-emerald-400 font-bold">
                    {activeNumber.status === 'received' ? '✅ تم استلام الكود!' : '⏳ في انتظار كود SMS...'}
                  </span>
                  <span className="text-stone-400 text-[10px]">
                    {Math.floor(activeNumber.timeLeft / 60)}:{(activeNumber.timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-base font-bold text-amber-300">
                    +{activeNumber.phone}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    رقم الطلب: #{activeNumber.orderId} • التطبيق: {selectedApp.short}
                  </div>

                  {activeNumber.code ? (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-lg text-center space-y-1">
                      <div className="text-[10px] text-emerald-300">الكود المستلم:</div>
                      <div className="text-2xl font-extrabold text-emerald-400 tracking-wider">
                        {activeNumber.code}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 py-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>جاري الفحص التلقائي لوصول الكود عبر السيرفر...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setActiveNumber(null)}
                    className="py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-center rounded-lg text-[11px] font-sans"
                  >
                    شراء رقم آخر
                  </button>
                  <button
                    onClick={handleCancelNumber}
                    className="py-2 bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800 text-center rounded-lg text-[11px] font-sans"
                  >
                    إلغاء واسترجاع المبلغ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
