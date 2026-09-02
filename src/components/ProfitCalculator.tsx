import React, { useState } from 'react';
import { Calculator, DollarSign, TrendingUp, Percent, ArrowRight } from 'lucide-react';
import { PROFIT_MARGIN, RUB_PER_USD } from '../data/catalogData';

export const ProfitCalculator: React.FC = () => {
  const [smmQuantity, setSmmQuantity] = useState<number>(1000);
  const [smsCount, setSmsCount] = useState<number>(50);

  // SMM Base cost from Plus SMM is $0.000271 per member ($0.271 per 1000)
  const baseSmmUnitPrice = 0.000271;
  const sellingSmmUnitPrice = baseSmmUnitPrice * (1.0 + PROFIT_MARGIN);
  const smmTotalRawCost = smmQuantity * baseSmmUnitPrice;
  const smmTotalSelling = smmQuantity * sellingSmmUnitPrice;
  const smmNetProfit = smmTotalSelling - smmTotalRawCost;

  // SMS Numbers Average (assume average cost is 25 Rubles raw)
  const baseSmsRub = 25.0;
  const sellingSmsRub = baseSmsRub * (1.0 + PROFIT_MARGIN); // 32.5 Rubles
  const totalSmsRawUsd = (smsCount * baseSmsRub) / RUB_PER_USD;
  const totalSmsSellingUsd = (smsCount * sellingSmsRub) / RUB_PER_USD;
  const smsNetProfitUsd = totalSmsSellingUsd - totalSmsRawUsd;

  const totalCombinedProfit = smmNetProfit + smsNetProfitUsd;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">حاسبة أرباح البوت (بنسبة 30% المعتمدة)</h3>
              <p className="text-xs text-stone-500">حساب فوري للأرباح الصافية على خدمات الرشق والأرقام الوهمية</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
            هامش الربح: 30%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SMM Calculator */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">1. أرباح رشق تيليجرام (نظام الملك)</span>
              <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Plus SMM</span>
            </div>

            <div>
              <label className="text-stone-500 block mb-1">الكمية المطلوبة (أعضاء):</label>
              <input
                type="number"
                value={smmQuantity}
                onChange={(e) => setSmmQuantity(Math.max(10, Number(e.target.value)))}
                className="w-full p-2.5 bg-white border border-stone-300 rounded-lg font-bold text-stone-900 outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-200">
              <div className="flex justify-between">
                <span className="text-stone-500">سعر التكلفة الخام:</span>
                <span className="font-mono text-stone-700">${smmTotalRawCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">سعر البيع للزبون (+30%):</span>
                <span className="font-mono font-bold text-stone-900">${smmTotalSelling.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-dashed border-stone-200">
                <span>ربحك الصافي:</span>
                <span className="font-mono">+${smmNetProfit.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* SMS Calculator */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900">2. أرباح أرقام السيرفرات الوهمية</span>
              <span className="text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">5SIM / Grizzly / Hero</span>
            </div>

            <div>
              <label className="text-stone-500 block mb-1">عدد الأرقام المباعة المتوقعة:</label>
              <input
                type="number"
                value={smsCount}
                onChange={(e) => setSmsCount(Math.max(1, Number(e.target.value)))}
                className="w-full p-2.5 bg-white border border-stone-300 rounded-lg font-bold text-stone-900 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-stone-200">
              <div className="flex justify-between">
                <span className="text-stone-500">تكلفة المزود المقدرة:</span>
                <span className="font-mono text-stone-700">${totalSmsRawUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">سعر البيع للزبائن (+30%):</span>
                <span className="font-mono font-bold text-stone-900">${totalSmsSellingUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold pt-1 border-t border-dashed border-stone-200">
                <span>ربحك الصافي:</span>
                <span className="font-mono">+${smsNetProfitUsd.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Profit Summary Card */}
        <div className="p-4 bg-emerald-600 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-emerald-100 font-medium">إجمالي الأرباح الصافية التقديرية:</div>
            <div className="text-2xl font-extrabold tracking-tight">${totalCombinedProfit.toFixed(2)}</div>
          </div>
          <div className="text-xs text-emerald-100 text-right sm:text-left leading-relaxed">
            جميع الأسعار في البوت يتم حسابها بهذه الصيغة: <br />
            <code className="bg-emerald-700/60 px-2 py-0.5 rounded text-white font-mono">final_price = raw_provider_price * 1.30</code>
          </div>
        </div>
      </div>
    </div>
  );
};
