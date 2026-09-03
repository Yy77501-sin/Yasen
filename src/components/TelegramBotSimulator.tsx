import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  RotateCcw, 
  Smartphone, 
  Bot, 
  CheckCheck, 
  Copy, 
  Check, 
  ArrowLeft, 
  ExternalLink,
  Wallet,
  ShieldCheck,
  Zap,
  Globe,
  DollarSign
} from 'lucide-react';

interface Props {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
}

type Screen = 
  | 'main'
  | 'buy_apps'
  | 'buy_servers'
  | 'buy_countries'
  | 'buy_prices'
  | 'active_number'
  | 'ai_services'
  | 'telegram_ready'
  | 'best_sellers'
  | 'recharge'
  | 'my_recharges'
  | 'transfer_balance'
  | 'my_account'
  | 'change_currency'
  | 'games_services'
  | 'smm_section'
  | 'earn_free'
  | 'purchase_stats'
  | 'support'
  | 'other_services'
  | 'admin_panel'
  | 'admin_check_providers'
  | 'admin_servers'
  | 'admin_inventory'
  | 'admin_payments'
  | 'admin_users'
  | 'admin_pricing'
  | 'admin_maintenance'
  | 'admin_broadcast'
  | 'admin_user_detail';

const MAIN_APPS_SIM = [
  { id: 'whatsapp', name: 'واتساب WhatsApp', icon: '🟢', short: 'WhatsApp', basePrice: 0.45 },
  { id: 'telegram', name: 'تيليجرام Telegram', icon: '✈️', short: 'Telegram', basePrice: 0.50 },
  { id: 'instagram', name: 'إنستغرام Instagram', icon: '📸', short: 'Instagram', basePrice: 0.35 },
  { id: 'tiktok', name: 'تيك توك TikTok', icon: '🎵', short: 'TikTok', basePrice: 0.30 },
  { id: 'facebook', name: 'فيسبوك Facebook', icon: '👤', short: 'Facebook', basePrice: 0.25 },
  { id: 'google', name: 'جوجل / جيميل Google', icon: '🔴', short: 'Google', basePrice: 0.30 },
  { id: 'twitter', name: 'تويتر / إكس Twitter X', icon: '🐦', short: 'Twitter', basePrice: 0.40 },
  { id: 'snapchat', name: 'سناب شات Snapchat', icon: '👻', short: 'Snapchat', basePrice: 0.45 },
];

const SERVERS_SIM = [
  { id: 's1', name: '⚡ سيرفر (1) 5SIM العالمي', site: '5sim.net', badge: 'الأرخص سعراً', mult: 1.0 },
  { id: 's2', name: '🐻 سيرفر (2) Grizzly SMS', site: 'grizzlysms.com', badge: 'أسرع وصول كود', mult: 1.15 },
  { id: 's3', name: '💎 سيرفر (3) Plus VIP', site: 'plus-sms.vip', badge: 'ثبات عالي VIP', mult: 1.30 },
  { id: 's4', name: '🌟 سيرفر (4) Hero SMS', site: 'herosms.com', badge: 'تنوع المشغلين', mult: 1.10 },
];

const COUNTRIES = [
  { slug: 'saudi-arabia', name: 'السعودية', flag: '🇸🇦', code: '+966', factor: 1.3 },
  { slug: 'yemen', name: 'اليمن', flag: '🇾🇪', code: '+967', factor: 1.0 },
  { slug: 'egypt', name: 'مصر', flag: '🇪🇬', code: '+20', factor: 0.8 },
  { slug: 'united-arab-emirates', name: 'الإمارات', flag: '🇦🇪', code: '+971', factor: 1.5 },
  { slug: 'united-states', name: 'أمريكا', flag: '🇺🇸', code: '+1', factor: 0.6 },
  { slug: 'united-kingdom', name: 'بريطانيا', flag: '🇬🇧', code: '+44', factor: 0.9 },
  { slug: 'russia', name: 'روسيا', flag: '🇷🇺', code: '+7', factor: 0.7 },
  { slug: 'germany', name: 'ألمانيا', flag: '🇩🇪', code: '+49', factor: 1.2 }
];

export const TelegramBotSimulator: React.FC<Props> = ({ userBalance, setUserBalance }) => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [currency, setCurrency] = useState<'USD' | 'SAR' | 'YER' | 'AED'>('USD');
  const [selectedApp, setSelectedApp] = useState(MAIN_APPS_SIM[0]);
  const [selectedServer, setSelectedServer] = useState(SERVERS_SIM[0]);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [selectedSmmSection, setSelectedSmmSection] = useState('tg');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Active virtual number state
  const [activeNumber, setActiveNumber] = useState<{
    phone: string;
    orderId: string;
    app: string;
    country: string;
    price: number;
    code: string | null;
    status: 'waiting' | 'received' | 'canceled';
    timeLeft: number;
  } | null>(null);

  // Currency rate multiplier
  const currencyRates = {
    USD: { symbol: '$', rate: 1.0, label: 'دولار أمريكي' },
    SAR: { symbol: 'ر.س', rate: 3.85, label: 'ريال سعودي' },
    YER: { symbol: 'ر.ي', rate: 540.0, label: 'ريال يمني' },
    AED: { symbol: 'د.إ', rate: 3.67, label: 'درهم إماراتي' }
  };

  const currentRate = currencyRates[currency];

  // Format balance string in chosen currency
  const getDisplayBalance = (usd: number) => {
    const val = usd * currentRate.rate;
    return `${val.toFixed(currency === 'YER' ? 0 : 2)} ${currentRate.symbol}`;
  };

  // Grand Master Admin state
  const [adminServers, setAdminServers] = useState([
    { id: 's1', name: 'سيرفر (1) 5SIM العالمي', site: '5sim.net', enabled: true, balance: '4,520 ₽', key: '5sim_live_sec_99a8x' },
    { id: 's2', name: 'سيرفر (2) Grizzly SMS', site: 'grizzlysms.com', enabled: true, balance: '$184.20', key: 'grizzly_live_bc72k' },
    { id: 's3', name: 'سيرفر (3) Plus VIP الحصري', site: 'plus-sms.vip', enabled: true, balance: '$95.00', key: 'plus_vip_live_001x' },
    { id: 's4', name: 'سيرفر (4) Hero SMS', site: 'herosms.com', enabled: true, balance: '$140.50', key: 'hero_sms_live_44m' },
    { id: 'smm', name: 'سيرفر Plus SMM للرشق والمتابعين', site: 'plus-smm.com', enabled: true, balance: '$310.00', key: 'smm_live_sec_789z' },
  ]);

  const [adminInventory, setAdminInventory] = useState([
    { id: 'tg_acc', name: 'حسابات تيليجرام مفعلة وجاهزة', count: 48, price: 1.20, category: 'أرقام وحسابات' },
    { id: 'chatgpt_plus', name: 'اشتراكات ChatGPT Plus خاصة', count: 12, price: 19.99, category: 'خدمات AI' },
    { id: 'claude_pro', name: 'اشتراكات Claude Pro خاصة', count: 8, price: 19.99, category: 'خدمات AI' },
    { id: 'wa_us', name: 'أرقام واتساب أمريكية جاهزة', count: 95, price: 0.85, category: 'أرقام وحسابات' },
  ]);

  const [adminPayments, setAdminPayments] = useState([
    { id: 'usdt_trc20', name: 'USDT (TRC20)', address: 'TYasNumOfficialPaymentWallet77789XyZ', enabled: true, note: 'شبكة ترون الفورية' },
    { id: 'sham_cash', name: 'شام كاش Sham Cash', address: '0987654321 - حساب شام كاش المعتمد', enabled: true, note: 'تحويل يدوي فوري' },
    { id: 'kuraimi', name: 'بنك الكريمي Kuraimi', address: '3001234567 - حساب الكريمي المميز', enabled: true, note: 'اليمن (ريال ودولار)' },
    { id: 'vodafone_cash', name: 'فودافون كاش Vodafone Cash', address: '01012345678 - محفظة فودافون كاش', enabled: true, note: 'مصر (جنيه مصري)' },
    { id: 'payeer', name: 'بايير Payeer', address: 'P1098765432', enabled: true, note: 'محفظة بايير الدولية' },
    { id: 'asiacell', name: 'آسيا سيل AsiaCell', address: '07701234567', enabled: true, note: 'العراق (رصيد وتحويل)' },
  ]);

  const [adminPricing, setAdminPricing] = useState({
    smmMargin: 30,
    numberMargin: 25,
    referralReward: 0.10,
  });

  const [adminMaintenance, setAdminMaintenance] = useState({
    enabled: false,
    message: '🛠️ البوت في وضع الصيانة والتحديث حالياً.',
    forcedChannel: '@YasNumChannel',
    forcedChannelEnabled: true,
  });

  const [adminUsersList, setAdminUsersList] = useState([
    { id: 8097770003, name: 'ياسين (المدير العام)', username: 'yasin_admin', balance: 50.0, orders: 128, banned: false },
    { id: 554321098, name: 'أحمد السعيد', username: 'ahmed_99', balance: 14.50, orders: 18, banned: false },
    { id: 667890123, name: 'محمد خالد', username: 'mk_khaled', balance: 0.80, orders: 5, banned: false },
    { id: 778901234, name: 'سارة عبد الله', username: 'sarah_a', balance: 25.00, orders: 34, banned: false },
  ]);

  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [tempPaymentAddress, setTempPaymentAddress] = useState('');
  const [userDmText, setUserDmText] = useState('');
  const [userDmSent, setUserDmSent] = useState(false);
  const [balanceAdjustAmount, setBalanceAdjustAmount] = useState('');

  // Timer countdown for active number
  useEffect(() => {
    if (!activeNumber || activeNumber.status !== 'waiting') return;
    const timer = setInterval(() => {
      setActiveNumber(prev => {
        if (!prev) return null;
        if (prev.timeLeft <= 1) {
          // Auto refund
          setUserBalance(b => Number((b + prev.price).toFixed(2)));
          return { ...prev, timeLeft: 0, status: 'canceled' };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeNumber, setUserBalance]);

  // Handle buying number
  const handleBuyNumber = (app: string, price: number) => {
    if (userBalance < price) {
      alert(`عذراً، رصيدك ($${userBalance.toFixed(2)}) غير كافٍ لإتمام الشراء ($${price.toFixed(2)}). يرجى شحن رصيدك.`);
      return;
    }
    setUserBalance(b => Number((b - price).toFixed(2)));

    const randomDigits = Math.floor(10000000 + Math.random() * 89999999);
    const newNumber = {
      phone: `${selectedCountry.code}${randomDigits}`,
      orderId: String(Math.floor(8000000 + Math.random() * 1999999)),
      app,
      country: selectedCountry.name,
      price,
      code: null,
      status: 'waiting' as const,
      timeLeft: 20 * 60 // 20 minutes
    };

    setActiveNumber(newNumber);
    setCurrentScreen('active_number');

    // Simulate SMS arrival after 4 seconds
    setTimeout(() => {
      setActiveNumber(prev => {
        if (!prev || prev.status !== 'waiting') return prev;
        const fakeCode = String(Math.floor(100000 + Math.random() * 900000));
        return { ...prev, code: fakeCode, status: 'received' };
      });
    }, 4000);
  };

  const handleCancelActiveNumber = () => {
    if (!activeNumber) return;
    setUserBalance(b => Number((b + activeNumber.price).toFixed(2)));
    setActiveNumber(null);
    setCurrentScreen('main');
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!transferId.trim()) {
      alert('يرجى كتابة الآيدي الخاص بالمستلم');
      return;
    }
    if (isNaN(amt) || amt <= 0 || amt > userBalance) {
      alert('المبلغ غير صالح أو يتجاوز رصيدك الحالي');
      return;
    }
    setUserBalance(b => Number((b - amt).toFixed(2)));
    setTransferSuccess(`✅ تم تحويل $${amt.toFixed(2)} بنجاح إلى المستخدم (ID: ${transferId})`);
    setTransferAmount('');
    setTransferId('');
  };

  return (
    <div id="telegram-simulator-wrapper" className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-sky-50 via-blue-50 to-stone-50 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900">محاكي بوت تيليجرام التفاعلي (YasNum)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                القائمة الرئيسية المطورة
              </span>
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              هذه المعاينة الحية تعكس كود <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-sky-800 font-bold">main.py</code> بدقة: الأزرار الثنائية، رسالة الترحيب الشخصية، واسترجاع الرصيد التلقائي.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => {
              setCurrentScreen('main');
              setActiveNumber(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 transition-all shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين /start</span>
          </button>
        </div>
      </div>

      {/* Telegram Phone Simulator Frame */}
      <div className="bg-stone-900 rounded-3xl p-3 sm:p-5 shadow-xl max-w-xl mx-auto border border-stone-800">
        {/* Phone Header / Telegram App Top Bar */}
        <div className="bg-[#17212b] rounded-t-2xl px-4 py-3 border-b border-[#0e1621] flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-xs ring-2 ring-sky-400/30">
              YN
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide">YasNum Bot</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.2 rounded font-semibold">bot</span>
              </div>
              <p className="text-[11px] text-stone-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                <span>متصل دائماً • 24/7</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-400">
            <div className="bg-[#242f3d] px-2.5 py-1 rounded-lg border border-stone-700/50 text-sky-300 font-mono text-[11px]">
              رصيدك: ${userBalance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Telegram Chat Body Background */}
        <div className="bg-[#0e1621] p-3 sm:p-4 min-h-[460px] space-y-4 overflow-y-auto font-sans" style={{ backgroundImage: 'radial-gradient(#1f2c3f 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
          
          {/* User Command /start Bubble */}
          <div className="flex justify-end">
            <div className="bg-[#2b5278] text-white px-3.5 py-2 rounded-2xl rounded-br-xs text-xs max-w-[80%] shadow-xs flex items-end gap-2">
              <span className="font-mono">/start</span>
              <span className="text-[9px] text-sky-200/70 flex items-center gap-0.5">
                12:00 <CheckCheck className="w-3 h-3 inline" />
              </span>
            </div>
          </div>

          {/* Bot Reply Message Bubble */}
          <div className="flex justify-start">
            <div className="bg-[#182533] text-stone-100 rounded-2xl rounded-bl-xs p-4 text-xs max-w-[95%] sm:max-w-[90%] shadow-md border border-stone-800/80 space-y-3.5 leading-relaxed">
              
              {/* Screen: MAIN MENU */}
              {currentScreen === 'main' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-3"
                >
                  {/* Dynamic Welcome Message */}
                  <div className="space-y-1.5 text-stone-200">
                    <p className="font-bold text-sm text-sky-300">
                      👋 مرحباً بك عزيزي ياسين في YasNum! 📱
                    </p>
                    <div className="h-px bg-stone-700/60 my-1.5" />
                    <p>💰 <b>رصيدك:</b> <code className="bg-[#242f3d] text-emerald-300 px-1.5 py-0.5 rounded font-mono text-xs">${userBalance.toFixed(2)}</code> <span className="text-stone-400 font-mono text-[11px]">(≈ {getDisplayBalance(userBalance)})</span></p>
                    <p>🆔 <b>الآيدي:</b> <code className="bg-[#242f3d] text-sky-300 px-1.5 py-0.5 rounded font-mono text-xs">8097770003</code></p>
                    <p>💱 <b>العملة:</b> <span className="text-amber-300 font-semibold">{currency} ({currentRate.label})</span></p>
                    <p>⚡ <b>الحالة:</b> <span className="text-emerald-400">🟢 السيرفرات متصلة وتعمل 24/7</span></p>
                    <div className="h-px bg-stone-700/60 my-1.5" />
                    <p className="text-stone-300">👇 <b>اختر من الخدمات أدناه لبدء الاستخدام:</b></p>
                  </div>

                  {/* Inline Buttons Grid matching main.py */}
                  <div className="space-y-1.5 pt-1">
                    {/* Row 1 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('buy_apps')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>☎️ شراء رقم افتراضي</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('ai_services')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>🤖 اشتراك برامج AI</span>
                      </button>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('telegram_ready')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>✈️ Telegram جاهز</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('best_sellers')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>🔥 الأكثر مبيعاً</span>
                      </button>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('recharge')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>💳 شحن الرصيد</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('transfer_balance')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>🔄 تحويل الرصيد</span>
                      </button>
                    </div>

                    {/* Row 4 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('my_account')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>👤 حسابي والمحفظة</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('change_currency')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>💱 تغيير العملة</span>
                      </button>
                    </div>

                    {/* Row 5 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('games_services')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>🎮 الرشق وشحن الألعاب</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('earn_free')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>🎁 اربح رصيد مجاناً</span>
                      </button>
                    </div>

                    {/* Row 6 */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('purchase_stats')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>📊 الشراء الناجح</span>
                      </button>
                      <button
                        onClick={() => setCurrentScreen('support')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all flex items-center justify-center gap-1 shadow-2xs"
                      >
                        <span>🎧 الدعم الفني</span>
                      </button>
                    </div>

                    {/* Row 7 */}
                    <button
                      onClick={() => setCurrentScreen('other_services')}
                      className="w-full bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-stone-700/60 transition-all shadow-2xs"
                    >
                      ⚙️ خدمات ومميزات أخرى
                    </button>

                    {/* Row 8: Admin Button (for Admin ID) */}
                    <button
                      onClick={() => setCurrentScreen('admin_panel')}
                      className="w-full bg-gradient-to-r from-amber-600/30 to-amber-700/30 hover:from-amber-600/40 hover:to-amber-700/40 active:scale-98 text-amber-300 p-2.5 rounded-xl font-bold text-xs text-center border border-amber-500/40 transition-all shadow-2xs"
                    >
                      🛠️ لوحة تحكم الإدارة (خاص بالأدمن)
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 1: SELECT SPECIFIC APPS */}
              {currentScreen === 'buy_apps' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700">
                    <p className="font-bold text-xs text-sky-300"> الخطوة (1 من 4): اختر التطبيق المطلوب تفعيله</p>
                    <p className="text-[11px] text-stone-300 mt-1">تظهر فقط التطبيقات الأساسية المعتمدة التي حددتها مسبقاً (بدون زحمة 50 تطبيق):</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-1">
                    {MAIN_APPS_SIM.map(app => (
                      <button
                        key={app.id}
                        onClick={() => {
                          setSelectedApp(app);
                          setCurrentScreen('buy_servers');
                        }}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-stone-100 p-2 rounded-xl text-xs font-bold border border-stone-700/60 flex items-center gap-1.5 transition-all text-right shadow-2xs"
                      >
                        <span className="text-base">{app.icon}</span>
                        <span className="truncate">{app.short}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* STEP 2: SELECT SERVER / PROVIDER */}
              {currentScreen === 'buy_servers' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-300"> الخطوة (2 من 4): اختر السيرفر</span>
                      <span className="text-xs bg-stone-800 px-2 py-0.5 rounded text-stone-200">{selectedApp.icon} {selectedApp.short}</span>
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1">كل سيرفر يرتبط بموقع محدد من مواقع التزويد العالمية:</p>
                  </div>

                  <div className="space-y-2">
                    {SERVERS_SIM.map(srv => (
                      <button
                        key={srv.id}
                        onClick={() => {
                          setSelectedServer(srv);
                          setCurrentScreen('buy_countries');
                        }}
                        className="w-full bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-stone-100 p-2.5 rounded-xl text-xs border border-stone-700/60 flex items-center justify-between transition-all shadow-2xs"
                      >
                        <div className="text-right">
                          <span className="font-bold text-stone-100 block">{srv.name}</span>
                          <span className="text-[10px] text-stone-400 font-mono">مزود الربط: {srv.site}</span>
                        </div>
                        <span className="text-[10px] bg-sky-950 text-sky-300 px-2 py-1 rounded border border-sky-800/60 font-bold shrink-0">
                          {srv.badge}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentScreen('buy_apps')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 التطبيقات
                    </button>
                    <button
                      onClick={() => setCurrentScreen('main')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🏠 الرئيسية
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: SELECT COUNTRY WITH FLAG */}
              {currentScreen === 'buy_countries' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-300"> الخطوة (3 من 4): اختر الدولة وعلمها</span>
                      <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-amber-300 font-bold">{selectedServer.badge}</span>
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1">تظهر أسماء الدول وبجانب كل دولة رمز علمها الرسمي:</p>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                    {COUNTRIES.map(c => (
                      <button
                        key={c.slug}
                        onClick={() => {
                          setSelectedCountry(c);
                          setCurrentScreen('buy_prices');
                        }}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-stone-100 p-2 rounded-xl text-xs font-bold border border-stone-700/60 flex items-center justify-between transition-all"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="text-base">{c.flag}</span>
                          <span>{c.name}</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono shrink-0">{c.code}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentScreen('buy_servers')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 السيرفرات
                    </button>
                    <button
                      onClick={() => setCurrentScreen('main')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🏠 الرئيسية
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: PRICES & OPERATORS FOR CHOSEN COUNTRY */}
              {currentScreen === 'buy_prices' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-300"> الخطوة (4 من 4): تأكيد الشراء واختيار السعر</span>
                      <span className="text-xs font-bold text-stone-200">{selectedCountry.flag} {selectedCountry.name}</span>
                    </div>
                    <div className="text-[11px] text-stone-300 space-y-0.5 pt-1 border-t border-stone-700/60">
                      <p>📱 الخدمة: <b>{selectedApp.name}</b></p>
                      <p>🖥️ السيرفر: <b>{selectedServer.name}</b></p>
                      <p>🌐 موقع التزويد: <code className="text-amber-300 font-mono">{selectedServer.site}</code></p>
                    </div>
                  </div>

                  <p className="text-xs text-stone-300 font-bold">💵 اختر نوع المشغل / السعر المناسب لك:</p>

                  <div className="space-y-1.5">
                    {[
                      { op: 'any', label: '⚡ أي مشغل متوفر (تلقائي وسريع)', base: Number((selectedApp.basePrice * selectedCountry.factor * selectedServer.mult).toFixed(2)), count: 184 },
                      { op: 'premium', label: '💎 سيرفر VIP مخصص (أعلى استقرار)', base: Number((selectedApp.basePrice * selectedCountry.factor * selectedServer.mult * 1.2).toFixed(2)), count: 42 },
                      { op: 'econ', label: '🪙 اقتصادي خاص (الأرخص تكلفة)', base: Number((selectedApp.basePrice * selectedCountry.factor * selectedServer.mult * 0.9).toFixed(2)), count: 68 },
                    ].map(item => (
                      <button
                        key={item.op}
                        onClick={() => handleBuyNumber(`${selectedApp.short} (${selectedServer.badge})`, item.base)}
                        className="w-full bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-stone-100 p-2.5 rounded-xl text-xs font-bold border border-stone-700/60 flex items-center justify-between transition-all shadow-2xs"
                      >
                        <div className="text-right">
                          <span className="block text-stone-200">{item.label}</span>
                          <span className="text-[10px] text-emerald-400 font-normal">متوفر: {item.count} رقم</span>
                        </div>
                        <span className="text-emerald-400 font-mono font-bold text-sm bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                          ${item.base.toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentScreen('buy_countries')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 الدول
                    </button>
                    <button
                      onClick={() => setCurrentScreen('main')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🏠 الرئيسية
                    </button>
                  </div>
                </div>
              )}

              {/* Screen: ACTIVE PURCHASED NUMBER */}
              {currentScreen === 'active_number' && activeNumber && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-400">✅ تم شراء الرقم بنجاح!</span>
                    <span className="bg-stone-800 text-stone-300 px-2 py-0.5 rounded font-mono text-[10px]">
                      {Math.floor(activeNumber.timeLeft / 60)}:{(activeNumber.timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400 text-xs">الرقم المستلم:</span>
                      <code className="text-sky-300 font-mono font-bold text-sm select-all">+{activeNumber.phone}</code>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-400">الخدمة:</span>
                      <span className="text-stone-200">{activeNumber.app} ({activeNumber.country})</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-400">السعر:</span>
                      <span className="text-emerald-400 font-mono">${activeNumber.price.toFixed(2)}</span>
                    </div>

                    <div className="pt-2 border-t border-stone-700/40">
                      <span className="text-stone-400 text-xs block mb-1">كود التحقق (SMS Code):</span>
                      {activeNumber.code ? (
                        <div className="bg-emerald-950/60 border border-emerald-500/50 p-2.5 rounded-lg flex items-center justify-between">
                          <span className="font-mono font-black text-emerald-300 text-base tracking-widest">{activeNumber.code}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeNumber.code || '');
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold"
                          >
                            {copiedCode ? 'تم النسخ!' : 'نسخ الكود'}
                          </button>
                        </div>
                      ) : (
                        <div className="bg-amber-950/40 border border-amber-500/30 p-2 rounded-lg flex items-center gap-2 text-amber-300 text-xs animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>في انتظار وصول رسالة SMS... (إلغاء واسترجاع تلقائي إذا لم تصل)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelActiveNumber}
                      className="flex-1 bg-red-950/60 hover:bg-red-900/60 border border-red-800 text-red-300 py-2 rounded-xl text-xs font-bold"
                    >
                      ❌ إلغاء واسترجاع الرصيد
                    </button>
                    <button
                      onClick={() => setCurrentScreen('main')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🏠 القائمة الرئيسية
                    </button>
                  </div>
                </div>
              )}

              {/* Screen: RECHARGE */}
              {currentScreen === 'recharge' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">💳 <b>شحن رصيد المحفظة</b></p>
                  <p className="text-stone-300">اختر وسيلة الدفع المناسبة لك لشحن رصيدك:</p>
                  <div className="space-y-2">
                    <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700/60 text-xs space-y-1">
                      <p className="font-bold text-stone-200">🏦 بنك الكريمي (حساب مميز):</p>
                      <p className="text-stone-400">الاسم: <span className="text-stone-200">ياسين محمد احمد اليمني</span></p>
                      <p className="text-stone-400">رقم الحساب: <code className="text-amber-300">3068499525</code></p>
                    </div>

                    <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700/60 text-xs space-y-1">
                      <p className="font-bold text-stone-200">💼 محفظة جيب (Jeeb) أو Binance:</p>
                      <p className="text-stone-400">رقم جيب: <code className="text-amber-300">3093092</code></p>
                      <p className="text-stone-400">Binance Pay ID: <code className="text-amber-300">979688758</code></p>
                    </div>
                  </div>

                  {/* The newly fixed My Recharges button! */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => setCurrentScreen('my_recharges')}
                      className="bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700 text-indigo-200 p-2.5 rounded-xl font-bold text-xs text-center"
                    >
                      🧾 طلباتي (سجل الشحن)
                    </button>
                    <a
                      href="https://t.me/Yy77501"
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-900/60 hover:bg-emerald-800/60 border border-emerald-700 text-emerald-200 p-2.5 rounded-xl font-bold text-xs text-center flex items-center justify-center gap-1"
                    >
                      <span>📨 إرسال إشعار التحويل</span>
                    </a>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: MY RECHARGES (Recently fixed callback) */}
              {currentScreen === 'my_recharges' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">🧾 <b>سجل طلبات شحن الرصيد (my_recharges)</b></p>
                  <p className="text-stone-300">هذه هي المعالجة التي تم تصحيحها وإضافتها للبوت:</p>

                  <div className="space-y-2 text-xs">
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700/60 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-stone-200 block">REQ-992140</span>
                        <span className="text-stone-400 text-[11px]">تحويل بنك الكريمي</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 block">$15.00</span>
                        <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/50">✅ تم الشحن بنجاح</span>
                      </div>
                    </div>

                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700/60 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-stone-200 block">REQ-873102</span>
                        <span className="text-stone-400 text-[11px]">محفظة جيب (Jeeb)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-300 block">$5.00</span>
                        <span className="text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-700/50">⏳ قيد الانتظار</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentScreen('recharge')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 شحن جديد
                    </button>
                    <button
                      onClick={() => setCurrentScreen('main')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🏠 القائمة الرئيسية
                    </button>
                  </div>
                </div>
              )}

              {/* Screen: MY ACCOUNT & WALLET */}
              {currentScreen === 'my_account' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">👤 <b>حسابي والمحفظة</b></p>
                  
                  <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700/60 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-400">الاسم:</span>
                      <span className="text-stone-200 font-bold">ياسين اليمني</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">الآيدي (Telegram ID):</span>
                      <code className="text-sky-300 font-mono">8097770003</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">رصيدك الحالي:</span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">${userBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">عدد الطلبات الناجحة:</span>
                      <span className="text-stone-200 font-mono font-bold">12 طلب</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">العملة المفضلة:</span>
                      <span className="text-amber-300 font-bold">{currency}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setCurrentScreen('recharge')}
                      className="bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700 text-emerald-200 p-2 rounded-xl font-bold text-xs"
                    >
                      💳 شحن الرصيد
                    </button>
                    <button
                      onClick={() => setCurrentScreen('my_recharges')}
                      className="bg-[#242f3d] hover:bg-[#2e3b4d] text-stone-200 p-2 rounded-xl font-bold text-xs border border-stone-700/60"
                    >
                      🧾 طلبات الشحن
                    </button>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: CHANGE CURRENCY */}
              {currentScreen === 'change_currency' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">💱 <b>تغيير عملة الحساب</b></p>
                  <p className="text-stone-300 text-xs">اختر العملة التي تود عرض الرصيد والأسعار بها:</p>

                  <div className="grid grid-cols-2 gap-2">
                    {(['USD', 'SAR', 'YER', 'AED'] as const).map(curr => (
                      <button
                        key={curr}
                        onClick={() => {
                          setCurrency(curr);
                          setCurrentScreen('main');
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                          currency === curr
                            ? 'bg-sky-900/60 border-sky-500 text-sky-200'
                            : 'bg-[#242f3d] hover:bg-[#2e3b4d] border-stone-700 text-stone-200'
                        }`}
                      >
                        <span className="text-sm font-mono">{curr}</span>
                        <span className="text-[10px] text-stone-400">{currencyRates[curr].label}</span>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: TRANSFER BALANCE */}
              {currentScreen === 'transfer_balance' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">🔄 <b>تحويل الرصيد</b></p>
                  <p className="text-stone-300 text-xs">يمكنك تحويل رصيد مباشرة إلى أي مستخدم عبر كتابة معرّفه (ID):</p>

                  {transferSuccess && (
                    <div className="bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 p-2 rounded-xl text-xs">
                      {transferSuccess}
                    </div>
                  )}

                  <form onSubmit={handleTransfer} className="space-y-2">
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-0.5">آيدي المستلم (Telegram ID):</label>
                      <input
                        type="text"
                        value={transferId}
                        onChange={e => setTransferId(e.target.value)}
                        placeholder="مثال: 123456789"
                        className="w-full bg-[#242f3d] border border-stone-700 text-white px-3 py-1.5 rounded-xl text-xs outline-hidden focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-0.5">المبلغ بالدولار ($):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={transferAmount}
                        onChange={e => setTransferAmount(e.target.value)}
                        placeholder={`الحد الأقصى $${userBalance.toFixed(2)}`}
                        className="w-full bg-[#242f3d] border border-stone-700 text-white px-3 py-1.5 rounded-xl text-xs outline-hidden focus:border-sky-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-sky-600 hover:bg-sky-500 text-white py-2 rounded-xl font-bold text-xs transition-all shadow-xs"
                    >
                      تأكيد التحويل الآن
                    </button>
                  </form>

                  <button
                    onClick={() => {
                      setTransferSuccess(null);
                      setCurrentScreen('main');
                    }}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: AI SERVICES */}
              {currentScreen === 'ai_services' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">🤖 <b>اشتراكات برامج الذكاء الاصطناعي (AI)</b></p>
                  <p className="text-stone-300 text-xs">تفعيل فوري وحسابات خاصة:</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 flex justify-between items-center">
                      <span>⚡ ChatGPT Plus (شهري)</span>
                      <span className="text-emerald-400 font-mono font-bold">$19.99</span>
                    </div>
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 flex justify-between items-center">
                      <span>🧠 Claude Pro (شهري)</span>
                      <span className="text-emerald-400 font-mono font-bold">$19.99</span>
                    </div>
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 flex justify-between items-center">
                      <span>🎨 Midjourney (Standard)</span>
                      <span className="text-emerald-400 font-mono font-bold">$12.50</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: EARN FREE */}
              {currentScreen === 'earn_free' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">🎁 <b>اربح رصيد مجاناً (نظام الإحالة)</b></p>
                  <div className="bg-emerald-950/50 border border-emerald-700/60 p-3 rounded-xl text-xs text-stone-200 space-y-1.5">
                    <p className="font-bold text-emerald-300">💰 اربح $0.10 عن كل صديق تقوم بدعوته!</p>
                    <p className="text-stone-300">عندما يقوم صديقك بالدخول عبر رابطك وإجراء أول عملية شراء، ستحصل تلقائياً على 0.10$ تضاف فوراً إلى رصيدك.</p>
                  </div>
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 flex items-center justify-between text-xs">
                    <code className="text-sky-300 font-mono text-[11px] truncate mr-2">https://t.me/YasNumBot?start=ref_8097770003</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://t.me/YasNumBot?start=ref_8097770003');
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded text-[11px] font-bold shrink-0"
                    >
                      {copiedLink ? 'تم!' : 'نسخ الرابط'}
                    </button>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: GRAND MASTER ADMIN PANEL */}
              {currentScreen === 'admin_panel' && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-amber-950/60 to-amber-900/40 p-3 rounded-xl border border-amber-600/50 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-amber-300 flex items-center gap-1">
                        <span>👑</span>
                        <span>لوحة الإدارة الكبرى - Grand Master Panel</span>
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono border border-amber-500/30">
                        Admin: 8097770003
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300">
                      تحكم شامل وكامل بكافة مفاصل وأقسام وسيرفرات البوت:
                    </p>
                  </div>

                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-[#242f3d] p-2 rounded-xl border border-stone-700">
                      <span className="text-stone-400 block text-[10px]">إجمالي المستخدمين:</span>
                      <span className="font-mono font-bold text-white text-xs">1,420 مستخدم</span>
                    </div>
                    <div className="bg-[#242f3d] p-2 rounded-xl border border-stone-700">
                      <span className="text-stone-400 block text-[10px]">الأرقام المباعة:</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">3,892 رقم</span>
                    </div>
                    <div className="bg-[#242f3d] p-2 rounded-xl border border-stone-700">
                      <span className="text-stone-400 block text-[10px]">السيرفرات النشطة:</span>
                      <span className="font-mono font-bold text-sky-400 text-xs">
                        {adminServers.filter(s => s.enabled).length} من {adminServers.length} متصل
                      </span>
                    </div>
                    <div className="bg-[#242f3d] p-2 rounded-xl border border-stone-700">
                      <span className="text-stone-400 block text-[10px]">وضع الصيانة:</span>
                      <span className={`font-bold text-xs ${adminMaintenance.enabled ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {adminMaintenance.enabled ? '🔴 مفعل (البوت مغلق)' : '🟢 غير مفعل (طبيعي)'}
                      </span>
                    </div>
                  </div>

                  {/* Grand Master Admin Sections Matching main.py */}
                  <div className="space-y-1.5 pt-1">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('admin_servers')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-sky-600/40 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <span className="text-base">🌐</span>
                        <span>إدارة السيرفرات والمواقع</span>
                        <span className="text-[10px] text-sky-300 font-normal">5 مواقع تزويد مباشرة</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('admin_inventory')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-indigo-600/40 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <span className="text-base">📦</span>
                        <span>إدارة المخازن والجاهز</span>
                        <span className="text-[10px] text-indigo-300 font-normal">حسابات، AI، وأرقام</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('admin_payments')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-emerald-600/40 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <span className="text-base">💳</span>
                        <span>طرق الشحن والمحافظ</span>
                        <span className="text-[10px] text-emerald-300 font-normal">6 وسائل دفع وعناوين</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('admin_users')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-purple-600/40 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <span className="text-base">👥</span>
                        <span>إدارة المستخدمين</span>
                        <span className="text-[10px] text-purple-300 font-normal">بحث، رصيد، حظر، مراسلة</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('admin_pricing')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-amber-600/40 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <span className="text-base">📈</span>
                        <span>الأسعار وهوامش الربح</span>
                        <span className="text-[10px] text-amber-300 font-normal">أرقام +25%، رشق +30%</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('admin_maintenance')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2.5 rounded-xl font-bold text-xs text-center border border-rose-600/40 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs"
                      >
                        <span className="text-base">🛠️</span>
                        <span>الصيانة والاشتراك</span>
                        <span className="text-[10px] text-rose-300 font-normal">قناة الإجبار والوضع</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCurrentScreen('admin_broadcast')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2 rounded-xl font-bold text-xs text-center border border-stone-700 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>📢</span>
                        <span>إذاعة جماعية للمشتركين</span>
                      </button>

                      <button
                        onClick={() => setCurrentScreen('admin_check_providers')}
                        className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 text-white p-2 rounded-xl font-bold text-xs text-center border border-stone-700 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>🔄</span>
                        <span>فحص حالة الـ API</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    🏠 القائمة الرئيسية للبوت
                  </button>
                </div>
              )}

              {/* Sub-Screen: ADMIN SERVERS MANAGEMENT */}
              {currentScreen === 'admin_servers' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-sky-700/60">
                    <span className="font-bold text-xs text-sky-300 block">🌐 إدارة ومراقبة سيرفرات ومواقع التزويد</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">تحكم بحالة تشغيل كل سيرفر وتفعيل / إيقاف الربط:</p>
                  </div>

                  <div className="space-y-2">
                    {adminServers.map((srv) => (
                      <div key={srv.id} className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-stone-100 block">{srv.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono">{srv.site}</span>
                          </div>
                          <button
                            onClick={() => {
                              setAdminServers(prev => prev.map(s => s.id === srv.id ? { ...s, enabled: !s.enabled } : s));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                              srv.enabled 
                                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' 
                                : 'bg-rose-950/80 border-rose-500 text-rose-300'
                            }`}
                          >
                            {srv.enabled ? '🟢 مفعل وشغال' : '🔴 معطل وموقوف'}
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-700/60">
                          <span className="text-stone-400">الرصيد الخام المتوفر: <b className="text-sky-300 font-mono">{srv.balance}</b></span>
                          <button
                            onClick={() => {
                              const newKey = prompt(`أدخل مفتاح API الجديد لسيرفر ${srv.name}:`, srv.key);
                              if (newKey) {
                                setAdminServers(prev => prev.map(s => s.id === srv.id ? { ...s, key: newKey } : s));
                                alert('✅ تم تحديث مفتاح API بنجاح وحفظه في السيرفر!');
                              }
                            }}
                            className="text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300 px-2 py-0.5 rounded border border-stone-600 font-mono"
                          >
                            🔑 تعديل الـ Key
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => alert('تم فحص كافة السيرفرات: جميعها تستجيب بسرعة 140ms ومربوطة بأمان.')}
                      className="flex-1 bg-sky-900/60 hover:bg-sky-800/60 border border-sky-600 text-sky-200 py-2 rounded-xl text-xs font-bold"
                    >
                      🔄 فحص استجابة الـ Ping
                    </button>
                    <button
                      onClick={() => setCurrentScreen('admin_panel')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 لوحة الإدارة
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Screen: ADMIN INVENTORY MANAGEMENT */}
              {currentScreen === 'admin_inventory' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-indigo-700/60">
                    <span className="font-bold text-xs text-indigo-300 block">📦 إدارة المخازن والأرقام والخدمات الجاهزة</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">التحكم بكميات المخزون وأسعار البيع المباشرة:</p>
                  </div>

                  <div className="space-y-2">
                    {adminInventory.map((item) => (
                      <div key={item.id} className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-stone-100">{item.name}</span>
                          <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700 font-mono">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-700/60">
                          <span className="text-stone-300 text-[11px]">
                            المتوفر بالمخزن: <b className="text-emerald-400 font-mono text-sm">{item.count}</b> قطعة
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setAdminInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, count: Math.max(0, inv.count - 1) } : inv));
                              }}
                              className="w-6 h-6 bg-stone-800 hover:bg-stone-700 text-rose-300 rounded font-bold text-xs"
                              title="إنقاص قطعة"
                            >
                              -
                            </button>
                            <button
                              onClick={() => {
                                setAdminInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, count: inv.count + 5 } : inv));
                              }}
                              className="px-1.5 h-6 bg-stone-800 hover:bg-stone-700 text-emerald-300 rounded font-bold text-xs"
                              title="إضافة 5 قطع"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => {
                                const p = prompt(`أدخل السعر الجديد لـ ${item.name} بالدولار:`, String(item.price));
                                if (p && !isNaN(Number(p))) {
                                  setAdminInventory(prev => prev.map(inv => inv.id === item.id ? { ...inv, price: Number(p) } : inv));
                                }
                              }}
                              className="text-[10px] bg-indigo-900/60 hover:bg-indigo-800/60 text-indigo-200 px-2 h-6 rounded border border-indigo-600 font-bold"
                            >
                              تعديل السعر
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const name = prompt('أدخل اسم المنتج / الخدمة الجديدة:');
                        if (name) {
                          const price = Number(prompt('أدخل السعر بالدولار:') || '1.0');
                          const count = Number(prompt('أدخل الكمية المتوفرة:') || '10');
                          setAdminInventory(prev => [...prev, { id: 'item_' + Date.now(), name, price, count, category: 'عام' }]);
                          alert('✅ تم إضافة الصنف الجديد إلى المخزن بنجاح!');
                        }
                      }}
                      className="flex-1 bg-indigo-900/60 hover:bg-indigo-800/60 border border-indigo-600 text-indigo-200 py-2 rounded-xl text-xs font-bold"
                    >
                      ➕ إضافة صنف جديد
                    </button>
                    <button
                      onClick={() => setCurrentScreen('admin_panel')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 لوحة الإدارة
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Screen: ADMIN PAYMENTS MANAGEMENT */}
              {currentScreen === 'admin_payments' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-emerald-700/60">
                    <span className="font-bold text-xs text-emerald-300 block">💳 إدارة طرق الشحن والدفع والمحافظ</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">تفعيل/تعطيل الوسائل وتعديل العناوين وأرقام الحسابات:</p>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {adminPayments.map((method) => (
                      <div key={method.id} className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-stone-100">{method.name}</span>
                          <button
                            onClick={() => {
                              setAdminPayments(prev => prev.map(m => m.id === method.id ? { ...m, enabled: !m.enabled } : m));
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              method.enabled 
                                ? 'bg-emerald-950 border-emerald-600 text-emerald-300' 
                                : 'bg-stone-800 border-stone-600 text-stone-400'
                            }`}
                          >
                            {method.enabled ? 'مفعلة ✅' : 'معطلة ❌'}
                          </button>
                        </div>

                        {editingPaymentId === method.id ? (
                          <div className="space-y-1 pt-1">
                            <input
                              type="text"
                              value={tempPaymentAddress}
                              onChange={(e) => setTempPaymentAddress(e.target.value)}
                              className="w-full bg-[#182533] border border-emerald-500 rounded p-1.5 text-xs text-white font-mono"
                              placeholder="أدخل العنوان أو رقم الحساب الجديد"
                            />
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => {
                                  if (tempPaymentAddress.trim()) {
                                    setAdminPayments(prev => prev.map(m => m.id === method.id ? { ...m, address: tempPaymentAddress.trim() } : m));
                                    setEditingPaymentId(null);
                                  }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                              >
                                حفظ العنوان
                              </button>
                              <button
                                onClick={() => setEditingPaymentId(null)}
                                className="bg-stone-700 text-stone-300 px-2 py-0.5 rounded text-[10px]"
                              >
                                إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-700/60">
                            <span className="text-stone-300 font-mono text-[10px] truncate max-w-[200px]" title={method.address}>
                              {method.address}
                            </span>
                            <button
                              onClick={() => {
                                setEditingPaymentId(method.id);
                                setTempPaymentAddress(method.address);
                              }}
                              className="text-[10px] text-sky-400 hover:underline font-bold shrink-0 mr-1"
                            >
                              ✏️ تعديل
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentScreen('admin_panel')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🔙 لوحة الإدارة
                  </button>
                </div>
              )}

              {/* Sub-Screen: ADMIN USERS MANAGEMENT */}
              {currentScreen === 'admin_users' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-purple-700/60">
                    <span className="font-bold text-xs text-purple-300 block">👥 إدارة المستخدمين والعملاء</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">البحث بالآيدي أو المعرف، تعديل الرصيد، الحظر، والمراسلة:</p>
                  </div>

                  {/* Search bar */}
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="🔍 ابحث بالـ ID أو الاسم أو المعرف..."
                    className="w-full bg-[#182533] border border-stone-700 rounded-xl p-2 text-xs text-white placeholder-stone-500"
                  />

                  {/* Users list */}
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {adminUsersList
                      .filter(u => 
                        String(u.id).includes(userSearchQuery) || 
                        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                        u.username.toLowerCase().includes(userSearchQuery.toLowerCase())
                      )
                      .map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedAdminUser(user);
                            setCurrentScreen('admin_user_detail');
                          }}
                          className="bg-[#242f3d] hover:bg-[#2e3b4d] active:scale-98 p-2 rounded-xl border border-stone-700 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="text-right">
                            <span className="font-bold text-xs text-stone-100 flex items-center gap-1">
                              <span>{user.name}</span>
                              {user.banned && <span className="text-[10px] bg-rose-950 text-rose-300 px-1 rounded">محظور</span>}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">ID: {user.id} | @{user.username}</span>
                          </div>

                          <div className="text-left">
                            <span className="text-emerald-400 font-mono font-bold text-xs">${user.balance.toFixed(2)}</span>
                            <span className="text-[10px] text-stone-400 block">{user.orders} طلب</span>
                          </div>
                        </div>
                      ))}
                  </div>

                  <button
                    onClick={() => setCurrentScreen('admin_panel')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🔙 لوحة الإدارة
                  </button>
                </div>
              )}

              {/* Sub-Screen: ADMIN USER DETAIL */}
              {currentScreen === 'admin_user_detail' && selectedAdminUser && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-sky-300">👤 الملف الكامل للمستخدم</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedAdminUser.banned ? 'bg-rose-950 text-rose-300 border border-rose-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'}`}>
                        {selectedAdminUser.banned ? '🔴 محظور' : '🟢 نشط'}
                      </span>
                    </div>

                    <div className="text-xs space-y-0.5 pt-1 border-t border-stone-700/60 text-stone-200">
                      <p>🆔 الآيدي: <code className="text-sky-300 font-mono">{selectedAdminUser.id}</code></p>
                      <p>👤 الاسم: <b>{selectedAdminUser.name}</b></p>
                      <p>🔗 المعرف: <code className="text-stone-300">@{selectedAdminUser.username}</code></p>
                      <p>💰 الرصيد الحالي: <b className="text-emerald-400 font-mono">${selectedAdminUser.balance.toFixed(2)}</b></p>
                      <p>📦 المشتريات: <b>{selectedAdminUser.orders} عملية شراء</b></p>
                    </div>
                  </div>

                  {/* Actions: Add / Deduct Balance */}
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-2">
                    <span className="text-xs font-bold text-stone-300 block">💰 تعديل الرصيد:</span>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={balanceAdjustAmount}
                        onChange={(e) => setBalanceAdjustAmount(e.target.value)}
                        placeholder="المبلغ بالدولار..."
                        className="flex-1 bg-[#182533] border border-stone-700 rounded-lg p-1.5 text-xs text-white font-mono"
                      />
                      <button
                        onClick={() => {
                          const val = parseFloat(balanceAdjustAmount);
                          if (!isNaN(val) && val > 0) {
                            setAdminUsersList(prev => prev.map(u => u.id === selectedAdminUser.id ? { ...u, balance: u.balance + val } : u));
                            setSelectedAdminUser((prev: any) => ({ ...prev, balance: prev.balance + val }));
                            setBalanceAdjustAmount('');
                            alert(`✅ تم شحن $${val.toFixed(2)} لحساب المستخدم بنجاح!`);
                          }
                        }}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                      >
                        ➕ إضافة
                      </button>
                      <button
                        onClick={() => {
                          const val = parseFloat(balanceAdjustAmount);
                          if (!isNaN(val) && val > 0) {
                            const newBal = Math.max(0, selectedAdminUser.balance - val);
                            setAdminUsersList(prev => prev.map(u => u.id === selectedAdminUser.id ? { ...u, balance: newBal } : u));
                            setSelectedAdminUser((prev: any) => ({ ...prev, balance: newBal }));
                            setBalanceAdjustAmount('');
                            alert(`✅ تم خصم $${val.toFixed(2)} من حساب المستخدم!`);
                          }
                        }}
                        className="bg-rose-700 hover:bg-rose-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                      >
                        ➖ خصم
                      </button>
                    </div>
                  </div>

                  {/* Direct message to user */}
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-1.5">
                    <span className="text-xs font-bold text-stone-300 block">✉️ إرسال رسالة رسمية للمستخدم:</span>
                    <textarea
                      rows={2}
                      value={userDmText}
                      onChange={(e) => setUserDmText(e.target.value)}
                      placeholder="اكتب نص الرسالة التي ستصل للمستخدم..."
                      className="w-full bg-[#182533] border border-stone-700 rounded-lg p-1.5 text-xs text-white resize-none"
                    />
                    <button
                      onClick={() => {
                        if (userDmText.trim()) {
                          setUserDmSent(true);
                          setTimeout(() => setUserDmSent(false), 3000);
                          setUserDmText('');
                        }
                      }}
                      className="w-full bg-sky-700 hover:bg-sky-600 text-white py-1 rounded-lg text-xs font-bold"
                    >
                      {userDmSent ? '✅ تم إرسال الرسالة للمستخدم!' : 'إرسال الرسالة الخاصة'}
                    </button>
                  </div>

                  {/* Ban / Unban Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newBanned = !selectedAdminUser.banned;
                        setAdminUsersList(prev => prev.map(u => u.id === selectedAdminUser.id ? { ...u, banned: newBanned } : u));
                        setSelectedAdminUser((prev: any) => ({ ...prev, banned: newBanned }));
                        alert(newBanned ? '🚫 تم حظر المستخدم من البوت!' : '✅ تم إلغاء الحظر عن المستخدم!');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedAdminUser.banned 
                          ? 'bg-emerald-950 border-emerald-600 text-emerald-300 hover:bg-emerald-900' 
                          : 'bg-rose-950 border-rose-600 text-rose-300 hover:bg-rose-900'
                      }`}
                    >
                      {selectedAdminUser.banned ? '✅ إلغاء حظر المستخدم' : '🚫 حظر المستخدم نهائياً'}
                    </button>

                    <button
                      onClick={() => setCurrentScreen('admin_users')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 قائمة المستخدمين
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Screen: ADMIN PRICING & MARGINS */}
              {currentScreen === 'admin_pricing' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-amber-700/60">
                    <span className="font-bold text-xs text-amber-300 block">📈 الأسعار وهوامش الربح المركزية</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">تعديل نسبة الربح التي تضاف تلقائياً فوق أسعار السيرفرات الخام:</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* SMM Margin */}
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200">📊 هامش ربح خدمات الرشق (SMM):</span>
                        <span className="font-mono font-bold text-purple-300 text-sm">+{adminPricing.smmMargin}%</span>
                      </div>
                      <div className="flex gap-1">
                        {[20, 30, 40, 50].map(val => (
                          <button
                            key={val}
                            onClick={() => setAdminPricing(p => ({ ...p, smmMargin: val }))}
                            className={`flex-1 py-1 rounded font-bold text-[11px] border ${adminPricing.smmMargin === val ? 'bg-purple-900 border-purple-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-400'}`}
                          >
                            +{val}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Number Margin */}
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200">📱 هامش ربح الأرقام الافتراضية:</span>
                        <span className="font-mono font-bold text-sky-300 text-sm">+{adminPricing.numberMargin}%</span>
                      </div>
                      <div className="flex gap-1">
                        {[15, 25, 35, 50].map(val => (
                          <button
                            key={val}
                            onClick={() => setAdminPricing(p => ({ ...p, numberMargin: val }))}
                            className={`flex-1 py-1 rounded font-bold text-[11px] border ${adminPricing.numberMargin === val ? 'bg-sky-900 border-sky-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-400'}`}
                          >
                            +{val}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Referral Reward */}
                    <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-200">🎁 مكافأة دعوة الأصدقاء (الإحالة):</span>
                        <span className="font-mono font-bold text-emerald-300 text-sm">${adminPricing.referralReward.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-1">
                        {[0.05, 0.10, 0.20, 0.50].map(val => (
                          <button
                            key={val}
                            onClick={() => setAdminPricing(p => ({ ...p, referralReward: val }))}
                            className={`flex-1 py-1 rounded font-bold text-[11px] border ${adminPricing.referralReward === val ? 'bg-emerald-900 border-emerald-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-400'}`}
                          >
                            ${val.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('admin_panel')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🔙 لوحة الإدارة
                  </button>
                </div>
              )}

              {/* Sub-Screen: ADMIN MAINTENANCE & FORCED CHANNEL */}
              {currentScreen === 'admin_maintenance' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-rose-700/60">
                    <span className="font-bold text-xs text-rose-300 block">🛠️ الصيانة والنظام والاشتراك الإجباري</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">التحكم بحالة البوت العامة وقناة الاشتراك للمستخدمين:</p>
                  </div>

                  {/* Maintenance Mode Toggle */}
                  <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-stone-100 block">وضع الصيانة العامة</span>
                        <span className="text-[10px] text-stone-400">إيقاف استقبال طلبات المستخدمين مؤقتاً</span>
                      </div>
                      <button
                        onClick={() => {
                          setAdminMaintenance(prev => ({ ...prev, enabled: !prev.enabled }));
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          adminMaintenance.enabled 
                            ? 'bg-rose-950 border-rose-500 text-rose-300' 
                            : 'bg-stone-800 border-stone-700 text-stone-400'
                        }`}
                      >
                        {adminMaintenance.enabled ? '🔴 قيد الصيانة' : '🟢 البوت يعمل'}
                      </button>
                    </div>

                    <div className="pt-1 border-t border-stone-700/60 text-xs">
                      <span className="text-stone-400 text-[10px] block">رسالة الصيانة التي تظهر للمستخدم:</span>
                      <input
                        type="text"
                        value={adminMaintenance.message}
                        onChange={(e) => setAdminMaintenance(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full bg-[#182533] border border-stone-700 rounded p-1 text-xs text-stone-200 mt-1"
                      />
                    </div>
                  </div>

                  {/* Forced Channel */}
                  <div className="bg-[#242f3d] p-3 rounded-xl border border-stone-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-stone-100 block">قناة الاشتراك الإجباري</span>
                        <span className="text-[10px] text-stone-400">إلزام المستخدم بالاشتراك بالقناة أولاً</span>
                      </div>
                      <button
                        onClick={() => {
                          setAdminMaintenance(prev => ({ ...prev, forcedChannelEnabled: !prev.forcedChannelEnabled }));
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                          adminMaintenance.forcedChannelEnabled 
                            ? 'bg-sky-950 border-sky-500 text-sky-300' 
                            : 'bg-stone-800 border-stone-700 text-stone-400'
                        }`}
                      >
                        {adminMaintenance.forcedChannelEnabled ? 'مفعل ✅' : 'معطل ❌'}
                      </button>
                    </div>

                    <div className="pt-1 border-t border-stone-700/60 text-xs">
                      <span className="text-stone-400 text-[10px] block">معرف القناة (Channel Username):</span>
                      <input
                        type="text"
                        value={adminMaintenance.forcedChannel}
                        onChange={(e) => setAdminMaintenance(prev => ({ ...prev, forcedChannel: e.target.value }))}
                        className="w-full bg-[#182533] border border-stone-700 rounded p-1 text-xs text-stone-200 font-mono mt-1"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('admin_panel')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🔙 لوحة الإدارة
                  </button>
                </div>
              )}

              {/* Sub-Screen: ADMIN BROADCAST */}
              {currentScreen === 'admin_broadcast' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700">
                    <span className="font-bold text-xs text-sky-300 block">📢 إذاعة جماعية إلى كافة المستخدمين (Broadcast)</span>
                    <p className="text-[11px] text-stone-300 mt-0.5">إرسال تنبيه أو إشعار أو تحديث لجميع المشتركين (1,420 مستخدم):</p>
                  </div>

                  <textarea
                    rows={4}
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="اكتب رسالة الإذاعة هنا (تدعم الرموز التعبيرية والتنسيق)..."
                    className="w-full bg-[#182533] border border-stone-700 rounded-xl p-2.5 text-xs text-white placeholder-stone-500 resize-none"
                  />

                  {broadcastStatus && (
                    <div className="bg-emerald-950 border border-emerald-600 p-2.5 rounded-xl text-xs text-emerald-300 font-bold text-center">
                      {broadcastStatus}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!broadcastText.trim()) {
                          alert('يرجى كتابة نص الإذاعة أولاً!');
                          return;
                        }
                        setBroadcastStatus('⏳ جاري الإرسال إلى 1,420 مستخدم...');
                        setTimeout(() => {
                          setBroadcastStatus('✅ تم إرسال الإذاعة بنجاح! تم التسليم إلى 1,418 مستخدم (2 فشل/حظر).');
                          setBroadcastText('');
                        }, 1200);
                      }}
                      className="flex-1 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
                    >
                      🚀 إرسال الإذاعة فوراً
                    </button>
                    <button
                      onClick={() => {
                        setBroadcastStatus(null);
                        setCurrentScreen('admin_panel');
                      }}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 لوحة الإدارة
                    </button>
                  </div>
                </div>
              )}

              {/* Screen: ADMIN PROVIDER CHECK STATUS */}
              {currentScreen === 'admin_check_providers' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">🌐 <b>تقرير فحص مواقع وسيرفرات التزويد المباشرة</b></p>
                  <p className="text-stone-300 text-xs">فحص سرعة الاستجابة والاتصال بمزودي الأرقام والرشق:</p>

                  <div className="space-y-2 text-xs">
                    {[
                      { name: '5SIM (سيرفر الأرقام العالمي)', url: 'https://5sim.net', status: '🟢 متصل وشغال (200 OK)', key: '🔑 مفعل ومربوط' },
                      { name: 'Grizzly SMS (سيرفر الأرقام السريعة)', url: 'https://grizzlysms.com', status: '🟢 متصل وشغال (200 OK)', key: '🔑 مفعل ومربوط' },
                      { name: 'Plus SMS VIP (أرقام VIP الحصرية)', url: 'https://plus-sms.vip', status: '🟢 متصل وشغال (200 OK)', key: '🔑 مفعل ومربوط' },
                      { name: 'Hero SMS (تغطية المشغلين)', url: 'https://herosms.com', status: '🟢 متصل وشغال (200 OK)', key: '🔑 مفعل ومربوط' },
                      { name: 'Plus SMM (سيرفر الرشق والمتابعين)', url: 'https://plus-smm.com', status: '🟢 متصل وشغال (200 OK)', key: '🔑 مفعل + هامش 30%' },
                    ].map((prov, i) => (
                      <div key={i} className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700/70 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-stone-100">{prov.name}</span>
                          <span className="text-emerald-400 text-[10px] font-mono">{prov.status}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-stone-400">
                          <span className="font-mono text-stone-500">{prov.url}</span>
                          <span className="text-sky-300 font-medium">{prov.key}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => alert('تم إعادة فحص كافة السيرفرات: جميع المزودين يعملون بكفاءة عالية!')}
                      className="flex-1 bg-sky-900/60 hover:bg-sky-800/60 border border-sky-600 text-sky-200 py-2 rounded-xl text-xs font-bold"
                    >
                      🔄 إعادة الفحص الآن
                    </button>
                    <button
                      onClick={() => setCurrentScreen('admin_panel')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 لوحة الإدارة
                    </button>
                  </div>
                </div>
              )}

              {/* Screen: GAMES & SMM SERVICES */}
              {currentScreen === 'games_services' && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">🎮 <b>الرشق وشحن الألعاب والخدمات الرقمية</b></p>
                  <p className="text-stone-300 text-xs">اختر القسم للبدء بالطلب الفوري عبر السيرفرات المباشرة:</p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCurrentScreen('smm_section')}
                      className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 hover:from-indigo-800/80 hover:to-purple-800/80 border border-indigo-600 p-3 rounded-xl text-xs font-bold text-stone-100 flex flex-col items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="text-lg">📈</span>
                      <span>خدمات الرشق المباشرة</span>
                      <span className="text-[10px] text-indigo-300 font-normal">سيرفر Plus SMM + 30%</span>
                    </button>

                    <button
                      onClick={() => alert('قسم شحن شدات ببجي وفري فاير ونقاط تيك توك متاح فورياً بالـ ID')}
                      className="bg-[#242f3d] hover:bg-[#2e3b4d] border border-stone-700 p-3 rounded-xl text-xs font-bold text-stone-100 flex flex-col items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span className="text-lg">🎮</span>
                      <span>شحن الألعاب والـ ID</span>
                      <span className="text-[10px] text-stone-400 font-normal">ببجي، فري فاير، تيك توك</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

              {/* Screen: DYNAMIC SMM SERVICES CATALOG */}
              {currentScreen === 'smm_section' && (
                <div className="space-y-3">
                  <div className="bg-[#242f3d] p-2.5 rounded-xl border border-stone-700">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-sky-300">📈 خدمات الرشق (سيرفر Plus SMM)</span>
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-700 font-bold">+30% هامش ربح</span>
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1">اختر المنصة لعرض الخدمات والأسعار المحدثة تلقائياً:</p>
                  </div>

                  {/* Platforms buttons */}
                  <div className="grid grid-cols-4 gap-1 text-[11px]">
                    {[
                      { id: 'tg', label: 'تيليجرام ✈️' },
                      { id: 'ig', label: 'إنستغرام 📸' },
                      { id: 'tt', label: 'تيك توك 🎵' },
                      { id: 'yt', label: 'يوتيوب 🔴' },
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedSmmSection(p.id)}
                        className={`p-1.5 rounded-lg font-bold border transition-all text-center ${
                          selectedSmmSection === p.id 
                            ? 'bg-purple-900 border-purple-500 text-white' 
                            : 'bg-[#242f3d] border-stone-700 text-stone-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Services List for selected SMM section */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {[
                      { id: '1', title: 'متابعين حقيقيين سرعة فائقة (ضمان عدم النقص)', raw: 1.0, final: 1.30 },
                      { id: '2', title: 'لايكات وتفاعلات بلمح البصر (فوري)', raw: 0.20, final: 0.26 },
                      { id: '3', title: 'مشاهدات للمنشورات والفيديوهات (سريعة جداً)', raw: 0.08, final: 0.10 },
                    ].map(srv => (
                      <div key={srv.id} className="bg-[#242f3d] p-2 rounded-xl border border-stone-700 flex items-center justify-between text-xs">
                        <div className="text-right">
                          <span className="block text-stone-200 font-bold">{srv.title}</span>
                          <span className="text-[10px] text-stone-400 font-mono">سعر الجملة: ${srv.raw.toFixed(2)} | الربح: +30%</span>
                        </div>
                        <button
                          onClick={() => alert(`تم اختيار الخدمة بنجاح بسعر $${srv.final.toFixed(2)} لكل 1K! أدخل الرابط والكمية لتنفيذ الطلب فوراً.`)}
                          className="bg-purple-950 hover:bg-purple-900 border border-purple-600 text-purple-200 px-2 py-1 rounded font-mono font-bold shrink-0"
                        >
                          ${srv.final.toFixed(2)}/1K
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentScreen('games_services')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🔙 الأقسام
                    </button>
                    <button
                      onClick={() => setCurrentScreen('main')}
                      className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                    >
                      🏠 الرئيسية
                    </button>
                  </div>
                </div>
              )}

              {/* Generic fallback back to main */}
              {!['main', 'buy_apps', 'buy_servers', 'buy_countries', 'buy_prices', 'active_number', 'recharge', 'my_recharges', 'my_account', 'change_currency', 'transfer_balance', 'ai_services', 'games_services', 'smm_section', 'earn_free', 'admin_panel', 'admin_check_providers', 'admin_servers', 'admin_inventory', 'admin_payments', 'admin_users', 'admin_user_detail', 'admin_pricing', 'admin_maintenance', 'admin_broadcast'].includes(currentScreen) && (
                <div className="space-y-3">
                  <p className="font-bold text-sm text-sky-300">📌 قسم قيد العرض</p>
                  <p className="text-stone-300 text-xs">تم تسجيل نقرتك في المحاكي بنجاح.</p>
                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 rounded-xl text-xs font-bold"
                  >
                    🏠 القائمة الرئيسية
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Telegram Chat Input Bar */}
        <div className="bg-[#17212b] rounded-b-2xl px-3 py-2 border-t border-[#0e1621] flex items-center gap-2 text-stone-400">
          <div className="flex-1 bg-[#242f3d] rounded-xl px-3 py-2 text-xs text-stone-300 flex items-center justify-between">
            <span>اكتب رسالة أو اختر زراً...</span>
            <span className="text-[10px] bg-sky-600/30 text-sky-300 px-1.5 py-0.5 rounded font-mono">/start</span>
          </div>
          <button 
            onClick={() => setCurrentScreen('main')}
            className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-all shadow-xs"
          >
            <Send className="w-4 h-4 -rotate-45" />
          </button>
        </div>
      </div>
    </div>
  );
};
