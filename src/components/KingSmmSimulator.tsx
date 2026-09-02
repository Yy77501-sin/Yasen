import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Copy, 
  ArrowRight,
  ExternalLink,
  Users
} from 'lucide-react';
import { SMM_CATALOG, PROFIT_MARGIN } from '../data/catalogData';
import { SmmService, SmmOrder } from '../types';

interface Props {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
}

export const KingSmmSimulator: React.FC<Props> = ({ userBalance, setUserBalance }) => {
  const [selectedService, setSelectedService] = useState<SmmService>(SMM_CATALOG[0]);
  const [step, setStep] = useState<'catalog' | 'input_link' | 'input_qty' | 'confirm' | 'status'>('catalog');
  const [targetLink, setTargetLink] = useState('/NumbrWahm');
  const [inputQty, setInputQty] = useState<number>(10);
  const [currentOrder, setCurrentOrder] = useState<SmmOrder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Price calculations with 30% margin
  const unitPrice = selectedService.rawUnitPrice * (1.0 + PROFIT_MARGIN);
  const pricePer1000 = selectedService.rawPer1000 * (1.0 + PROFIT_MARGIN);
  const maxAffordable = Math.floor(userBalance / unitPrice);
  const totalCost = Number((inputQty * unitPrice).toFixed(5));

  const handleSelectService = (service: SmmService) => {
    setSelectedService(service);
    setStep('input_link');
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetLink.trim()) return;
    setStep('input_qty');
  };

  const handleQtySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQty < selectedService.minQty || inputQty > selectedService.maxQty) return;
    setStep('confirm');
  };

  const handleConfirmOrder = () => {
    if (userBalance < totalCost) {
      alert(`رصيدك الحالي ($${userBalance.toFixed(2)}) غير كافٍ لتغطية التكلفة ($${totalCost.toFixed(5)})!`);
      return;
    }

    // Deduct balance
    setUserBalance(prev => Math.max(0, Number((prev - totalCost).toFixed(4))));

    const newOrder: SmmOrder = {
      orderId: String(Math.floor(10000 + Math.random() * 90000)),
      secretId: String(Math.floor(100000 + Math.random() * 900000)),
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      targetLink: targetLink.trim(),
      quantity: inputQty,
      completed: 0,
      remains: inputQty,
      costUsd: totalCost,
      status: 'في الانتظار',
      createdAt: new Date().toLocaleTimeString('ar-EG')
    };

    setCurrentOrder(newOrder);
    setStep('status');
  };

  const handleRefreshProgress = () => {
    if (!currentOrder) return;
    if (currentOrder.remains === 0) {
      alert('الطلب مكتمل بالفعل بنجاح 100%!');
      return;
    }

    const increment = Math.max(1, Math.ceil(currentOrder.quantity * 0.35));
    const newCompleted = Math.min(currentOrder.quantity, currentOrder.completed + increment);
    const newRemains = Math.max(0, currentOrder.quantity - newCompleted);
    const newStatus = newRemains === 0 ? 'مكتمل بنجاح ✔️' : 'قيد التنفيذ ⏳';

    setCurrentOrder({
      ...currentOrder,
      completed: newCompleted,
      remains: newRemains,
      status: newStatus
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">نظام الملك للرشق وشحن المتابعين</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                +30% هامش ربح مفعّل
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              تنفيذ فوري • حسابات عالية الجودة • سرعة حتى 100 ألف/يوم • ضمان تعويض 30 يوم
            </p>
          </div>
        </div>

        {/* User live balance badge */}
        <div className="flex items-center gap-3 self-end md:self-auto bg-white px-4 py-2 rounded-xl border border-stone-200 shadow-xs">
          <span className="text-xs text-stone-500">رصيدك التجريبي:</span>
          <span className="text-sm font-bold text-emerald-700">${userBalance.toFixed(2)}</span>
          <button 
            onClick={() => setUserBalance(b => b + 10)}
            className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
          >
            +10$ شحن
          </button>
        </div>
      </div>

      {/* Simulator Flow Box (Telegram UI Replica) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Services Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-600" />
              خدمات نظام الملك المعتمدة
            </h3>
            <span className="text-[11px] text-stone-500">اختر للتجربة</span>
          </div>

          <div className="space-y-2">
            {SMM_CATALOG.map((srv) => {
              const isSelected = selectedService.id === srv.id;
              const unitP = srv.rawUnitPrice * (1.0 + PROFIT_MARGIN);
              const p1k = srv.rawPer1000 * (1.0 + PROFIT_MARGIN);

              return (
                <button
                  key={srv.id}
                  onClick={() => handleSelectService(srv)}
                  className={`w-full text-right p-4 rounded-xl border transition-all text-sm ${
                    isSelected 
                      ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs' 
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-stone-900">{srv.title}</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                      ${p1k.toFixed(3)} / 1K
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span>العضو: ${unitP.toFixed(6)}</span>
                    <span>•</span>
                    <span>أقل كمية: {srv.minQty}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-medium">ضمان {srv.guarantee}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick specs box */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-stone-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              معادلة التسعير الآلية (30% Profit)
            </div>
            <p className="text-[11px] leading-relaxed">
              سعر المزود الأساسي (بلاس): <code className="bg-stone-200 px-1 py-0.5 rounded">$0.000271</code> للعضو
              <br />
              + 30% هامش ربح = <code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-bold">${unitPrice.toFixed(6)}</code> للعضو الواحد.
            </p>
          </div>
        </div>

        {/* Right Side: Interactive Bot Chat Simulator */}
        <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between min-h-[480px]">
          <div className="space-y-4">
            {/* Step 1: King System Specs & Ask for Link */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                <Crown className="w-4 h-4" />
                <span>نظام الملك:</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line font-medium">
                {selectedService.desc}
              </p>
              <div className="pt-2 border-t border-stone-200/80 text-xs font-bold text-stone-900">
                : الآن من فضلك أرسل رابط الطلب:
              </div>
            </div>

            {/* Step 2: Input Link Form */}
            {step === 'input_link' && (
              <motion.form 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleLinkSubmit}
                className="space-y-3 p-4 bg-amber-50/40 rounded-xl border border-amber-200/70"
              >
                <label className="block text-xs font-bold text-stone-800">
                  أدخل رابط القناة أو البوت أو المعرف (مثال: /NumbrWahm أو رابط t.me):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetLink}
                    onChange={(e) => setTargetLink(e.target.value)}
                    placeholder="/NumbrWahm"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>إرسال</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.form>
            )}

            {/* Step 3: Input Quantity Screen */}
            {(step === 'input_qty' || step === 'confirm' || step === 'status') && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3"
              >
                <div className="text-xs text-stone-800 space-y-1.5 font-medium leading-relaxed">
                  <p>☑️︙ يرجى إرسال عدد الأعضاء تذكر أقل عدد للطلب {selectedService.minQty}، وأقصى عدد للطلب {selectedService.maxQty.toLocaleString()} 👤</p>
                  <p className="text-emerald-700 font-bold">💰︙سعر العضو الواحد: {unitPrice.toFixed(6)}$</p>
                  <p className="text-amber-800 font-bold">🏆︙يمكنك رشق ({maxAffordable.toLocaleString()}) عضو 🫂</p>
                </div>

                {step === 'input_qty' && (
                  <form onSubmit={handleQtySubmit} className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                    <input
                      type="number"
                      min={selectedService.minQty}
                      max={selectedService.maxQty}
                      value={inputQty}
                      onChange={(e) => setInputQty(Number(e.target.value))}
                      className="w-40 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm font-bold text-stone-900 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                    >
                      تأكيد الكمية (التكلفة: ${totalCost})
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* Step 4: Confirmation Screen */}
            {step === 'confirm' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-stone-900 text-stone-100 rounded-xl space-y-3 font-mono text-xs border border-stone-800 shadow-md"
              >
                <div className="border-b border-stone-800 pb-2">
                  <span className="text-stone-400">- القسم -</span> <span className="text-amber-400 font-bold">{selectedService.section}</span>
                </div>
                <div>
                  <span className="text-stone-400">- الخدمة -</span> <span className="text-white font-bold">{selectedService.title}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-stone-300">
                  <div>- سعر الـ 1000: <span className="text-emerald-400 font-bold">${pricePer1000.toFixed(4)}</span></div>
                  <div>- السعر الكلي: <span className="text-emerald-400 font-bold">${totalCost.toFixed(5)}</span></div>
                  <div>- الجودة: <span className="text-stone-200">{selectedService.quality}</span></div>
                  <div>- السرعة: <span className="text-stone-200">{selectedService.speed}</span></div>
                  <div>- الضمان: <span className="text-stone-200">{selectedService.guarantee}</span></div>
                  <div>- زر الإلغاء: <span className="text-stone-200">{selectedService.cancelBtn}</span></div>
                </div>
                <div className="pt-2 border-t border-stone-800 text-stone-300">
                  <span className="text-stone-400">- الرابط:</span> <span className="text-amber-300 font-bold underline">{targetLink}</span>
                </div>
                <div className="text-stone-200 font-sans font-bold pt-2 text-center text-sm">
                  هل تريد المتابعة وتأكيد الطلب؟
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleConfirmOrder}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs text-center transition-all"
                  >
                    ✅ تأكيد الطلب
                  </button>
                  <button
                    onClick={() => setStep('catalog')}
                    className="py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl text-xs text-center transition-all"
                  >
                    ❌ إلغاء الطلب
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Success & Live Progress Tracker */}
            {step === 'status' && currentOrder && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 bg-stone-900 text-stone-100 rounded-xl space-y-3 font-mono text-xs border border-stone-800 shadow-md"
              >
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>- تم تنفيذ الطلب بنجاح !</span>
                  </div>
                  <span className="px-2 py-0.5 bg-stone-800 rounded text-[11px] text-stone-400">
                    رقم الطلب: #{currentOrder.orderId}
                  </span>
                </div>

                <div className="space-y-1 text-stone-300">
                  <p>: الخدمة : <span className="text-white font-bold">{currentOrder.serviceTitle}</span></p>
                  <p>: الكمية : <span className="text-amber-400 font-bold">{currentOrder.quantity}</span></p>
                  <p>: السعر الكلي : <span className="text-emerald-400 font-bold">${currentOrder.costUsd.toFixed(5)}</span></p>
                  <p>: رقم الطلب : <span className="text-stone-100 font-bold">{currentOrder.orderId}</span></p>
                  <p>ID : الرقم السري: <span className="text-stone-100 font-bold">{currentOrder.secretId}</span></p>
                  <p className="text-amber-300 font-bold underline">الرابط : {currentOrder.targetLink}</p>
                </div>

                <div className="p-3 bg-stone-800/80 rounded-lg space-y-2 border border-stone-700/60 font-sans">
                  <div className="text-xs font-bold text-stone-200">حالة الطلب في الاسفل ++</div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-stone-900 p-2 rounded">
                      <div className="text-stone-400 text-[10px]">العدد المطلوب</div>
                      <div className="text-sm font-bold text-white">{currentOrder.quantity}</div>
                    </div>
                    <div className="bg-stone-900 p-2 rounded">
                      <div className="text-stone-400 text-[10px]">العدد المكتمل</div>
                      <div className="text-sm font-bold text-emerald-400">{currentOrder.completed}</div>
                    </div>
                    <div className="bg-stone-900 p-2 rounded">
                      <div className="text-stone-400 text-[10px]">العدد المتبقي</div>
                      <div className="text-sm font-bold text-amber-400">{currentOrder.remains}</div>
                    </div>
                  </div>

                  {/* Visual progress bar */}
                  <div className="w-full bg-stone-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${(currentOrder.completed / currentOrder.quantity) * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-300 pt-1">
                    <span>الحالة: <strong className={currentOrder.remains === 0 ? 'text-emerald-400' : 'text-amber-400'}>{currentOrder.status}</strong></span>
                    <span className="text-[11px] text-stone-400">تحديث حالة الطلب عبر زر [ التحديث ] في الاسفل.</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleRefreshProgress}
                    className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>تحديث الطلب</span>
                  </button>

                  <button
                    onClick={() => {
                      setStep('catalog');
                      setCurrentOrder(null);
                    }}
                    className="py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl text-xs transition-all text-center"
                  >
                    طلب جديد
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Reset / Steps Indicators */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
            <span>الخطوة: {step === 'catalog' ? '1/4 اختيار الخدمة' : step === 'input_link' ? '2/4 إدخال الرابط' : step === 'input_qty' ? '3/4 تحديد الكمية' : step === 'confirm' ? '4/4 التأكيد' : 'المتابعة والتحديث'}</span>
            {step !== 'catalog' && (
              <button
                onClick={() => setStep('catalog')}
                className="text-amber-700 hover:underline font-medium"
              >
                العودة لقائمة الخدمات
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
