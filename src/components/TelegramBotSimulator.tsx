import React, { useState } from 'react';
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
  DollarSign,
  Users,
  Gift,
  Ticket,
  Headphones,
  Info,
  Crown,
  Package,
  Plus,
  Trash2,
  Lock,
  Download,
  AlertCircle,
  FileText,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Sliders
} from 'lucide-react';

interface Props {
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
}

interface Product {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  warrantyHours: number;
  countryCode: string;
  isActive: boolean;
}

interface InventoryItem {
  id: number;
  productId: number;
  phoneNumber: string;
  loginCode: string;
  twoFa: string;
  tdataUrl: string;
  status: 'available' | 'sold';
}

interface Order {
  orderId: string;
  userId: string;
  productId: number;
  productTitle: string;
  price: number;
  phoneNumber: string;
  loginCode: string;
  twoFa: string;
  tdataUrl: string;
  status: 'completed' | 'warranty';
  warrantyHours: number;
  warrantyUntil: string;
  warrantyStatus: 'none' | 'requested' | 'approved' | 'rejected';
  createdAt: string;
}

interface Deposit {
  depositId: string;
  userId: string;
  methodName: string;
  amountUsd: number;
  proof: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AuditLog {
  id: number;
  actor: string;
  action: string;
  details: string;
  amount: number;
  time: string;
}

export interface ProviderItem {
  id: number;
  name: string;
  baseUrl: string;
  apiKey: string;
  adapterType: 'standard' | 'sms_activate' | 'five_sim';
  priority: number;
  minBalance: number;
  currentBalance: number;
  status: 'online' | 'degraded' | 'offline';
  isActive: boolean;
  latencyMs: number;
  lastTested: string;
  lastError: string | null;
}

export interface ProviderLog {
  id: number;
  providerName: string;
  action: string;
  statusCode: string;
  latencyMs: number;
  message: string;
  time: string;
  isSuccess: boolean;
}

const INITIAL_PROVIDERS: ProviderItem[] = [
  {
    id: 1,
    name: 'Provider A (الرئيسي 🥇)',
    baseUrl: 'https://api.tg-ready.net/v1',
    apiKey: 'tg_live_sec_99a8182b847fa',
    adapterType: 'standard',
    priority: 100,
    minBalance: 10.0,
    currentBalance: 124.50,
    status: 'online',
    isActive: true,
    latencyMs: 185,
    lastTested: 'منذ دقيقة',
    lastError: null
  },
  {
    id: 2,
    name: 'Provider B (الاحتياط الأول 🥈)',
    baseUrl: 'https://api.grizzly-sms.com/stubs',
    apiKey: 'grz_sec_77b4190c403bc',
    adapterType: 'sms_activate',
    priority: 90,
    minBalance: 10.0,
    currentBalance: 48.20,
    status: 'online',
    isActive: true,
    latencyMs: 215,
    lastTested: 'منذ 3 دقائق',
    lastError: null
  },
  {
    id: 3,
    name: 'Provider C (الاحتياط الثاني 🥉)',
    baseUrl: 'https://api.5sim.net/v1',
    apiKey: '5sim_jwt_token_88c520118ef',
    adapterType: 'five_sim',
    priority: 80,
    minBalance: 10.0,
    currentBalance: 8.40,
    status: 'degraded',
    isActive: true,
    latencyMs: 310,
    lastTested: 'منذ 5 دقائق',
    lastError: 'تحذير: الرصيد ($8.40) أقل من الحد الأدنى المسموح ($10.00)'
  }
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    title: '🇺🇸 حساب تيليجرام أمريكي (+1) عمر قديم 2023',
    category: '🌍 الحسابات المتوفرة',
    description: 'حساب تيليجرام أمريكي قديم وموثق، تسليم فوري مع كود الدخول وكلمة سر 2FA وملف الجلسة.',
    price: 4.50,
    warrantyHours: 24,
    countryCode: '+1',
    isActive: true
  },
  {
    id: 2,
    title: '🇬🇧 حساب تيليجرام بريطاني (+44) مفعل ونظيف',
    category: '🌍 الحسابات المتوفرة',
    description: 'حساب بريطاني جاهز خالي من أي حظر أو قيود، مناسب لإنشاء القنوات وإدارتها.',
    price: 5.00,
    warrantyHours: 24,
    countryCode: '+44',
    isActive: true
  },
  {
    id: 3,
    title: '🇷🇺 حساب تيليجرام روسي (+7) جاهز للعمل',
    category: '🌍 الحسابات المتوفرة',
    description: 'حساب تيليجرام روسي ممتاز عالي الجودة مع تسليم فوري للملف والكود.',
    price: 3.20,
    warrantyHours: 24,
    countryCode: '+7',
    isActive: true
  },
  {
    id: 4,
    title: '🔥 باقة 5 حسابات تيليجرام متنوعة (عرض توفيري)',
    category: '🔥 العروض',
    description: 'باقة توفيرية تحتوي على 5 حسابات مسجلة ومفعلة مع ضمان شامل 48 ساعة.',
    price: 16.00,
    warrantyHours: 48,
    countryCode: 'Multi',
    isActive: true
  },
  {
    id: 5,
    title: '⭐ حساب تيليجرام VIP مميز جداً',
    category: '⭐ الحسابات المميزة',
    description: 'حساب قديم جداً نادر وغير مقيد مع ضمان 72 ساعة، مثالي للمشاريع الرسمية والمتاجر.',
    price: 8.50,
    warrantyHours: 72,
    countryCode: '+1',
    isActive: true
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 101, productId: 1, phoneNumber: '+1 (555) 019-2831', loginCode: '74829', twoFa: 'TgSafe#2026', tdataUrl: 'https://storage.yasnum.org/tdata/acc_101.zip', status: 'available' },
  { id: 102, productId: 1, phoneNumber: '+1 (555) 019-8472', loginCode: '39104', twoFa: 'TgSafe#2026', tdataUrl: 'https://storage.yasnum.org/tdata/acc_102.zip', status: 'available' },
  { id: 103, productId: 1, phoneNumber: '+1 (555) 019-9182', loginCode: '82049', twoFa: 'TgSafe#2026', tdataUrl: 'https://storage.yasnum.org/tdata/acc_103.zip', status: 'available' },
  { id: 201, productId: 2, phoneNumber: '+44 7911 123456', loginCode: '91820', twoFa: 'TgSecure#44', tdataUrl: 'https://storage.yasnum.org/tdata/acc_201.zip', status: 'available' },
  { id: 202, productId: 2, phoneNumber: '+44 7911 654321', loginCode: '58201', twoFa: 'TgSecure#44', tdataUrl: 'https://storage.yasnum.org/tdata/acc_202.zip', status: 'available' },
  { id: 301, productId: 3, phoneNumber: '+7 900 123-45-67', loginCode: '40192', twoFa: 'RuPass#2026', tdataUrl: 'https://storage.yasnum.org/tdata/acc_301.zip', status: 'available' },
  { id: 401, productId: 4, phoneNumber: '+1 & +44 Bundle (5 Accounts)', loginCode: 'Multi-Pack Codes', twoFa: 'Bundle#Pass1', tdataUrl: 'https://storage.yasnum.org/tdata/pack_5.zip', status: 'available' },
  { id: 501, productId: 5, phoneNumber: '+1 (212) 555-0199 (VIP)', loginCode: '99912', twoFa: 'VipOnly#2026', tdataUrl: 'https://storage.yasnum.org/tdata/vip_501.zip', status: 'available' },
];

export const TelegramBotSimulator: React.FC<Props> = ({ userBalance, setUserBalance }) => {
  // Screens
  const [currentScreen, setCurrentScreen] = useState<string>('main');
  const [selectedCategory, setSelectedCategory] = useState<string>('🌍 الحسابات المتوفرة');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  
  // Data State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [orders, setOrders] = useState<Order[]>([
    {
      orderId: '#10482',
      userId: '8097770003',
      productId: 1,
      productTitle: '🇺🇸 حساب تيليجرام أمريكي (+1) عمر قديم 2023',
      price: 4.50,
      phoneNumber: '+1 (555) 019-1122',
      loginCode: '61928',
      twoFa: 'TgSafe#2026',
      tdataUrl: 'https://storage.yasnum.org/tdata/sample_completed.zip',
      status: 'completed',
      warrantyHours: 24,
      warrantyUntil: '2026-09-08 14:30:00',
      warrantyStatus: 'none',
      createdAt: '2026-09-07 14:30:00'
    }
  ]);
  
  const [deposits, setDeposits] = useState<Deposit[]>([
    {
      depositId: '#5832',
      userId: '8097770003',
      methodName: 'بنك الكريمي (حساب يمني / دولار)',
      amountUsd: 10.00,
      proof: 'سند رقم #99281729',
      status: 'pending',
      createdAt: '2026-09-07 15:10:00'
    }
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: 1, actor: '8097770003', action: 'buy_order', details: 'شراء حساب أمريكي (#10482)', amount: -4.50, time: '14:30' },
    { id: 2, actor: 'System', action: 'referral_reward', details: 'مكافأة دعوة مستخدم جديد', amount: 0.10, time: '13:15' },
    { id: 3, actor: '8097770003', action: 'deposit_request', details: 'طلب شحن #5832 قيد المراجعة', amount: 10.00, time: '15:10' }
  ]);

  // Modals and form state
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferMsg, setTransferMsg] = useState<string | null>(null);
  
  const [depositAmount, setDepositAmount] = useState('10.00');
  const [depositProof, setDepositProof] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('kuraimi');
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const [adminTab, setAdminTab] = useState<'stats' | 'providers' | 'products' | 'inventory' | 'orders' | 'deposits' | 'balance' | 'logs'>('providers');
  const [copiedLink, setCopiedLink] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Provider Manager States (20 Phases)
  const [providers, setProviders] = useState<ProviderItem[]>(INITIAL_PROVIDERS);
  const [providerLogs, setProviderLogs] = useState<ProviderLog[]>([
    {
      id: 1,
      providerName: 'Provider A (الرئيسي 🥇)',
      action: 'health_check',
      statusCode: 'HTTP_200',
      latencyMs: 185,
      message: 'الاتصال سليم والرصيد متوفر ($124.50)',
      time: '12:35:10',
      isSuccess: true
    },
    {
      id: 2,
      providerName: 'Provider B (الاحتياط 🥈)',
      action: 'health_check',
      statusCode: 'HTTP_200',
      latencyMs: 215,
      message: 'الاتصال سليم والرصيد متوفر ($48.20)',
      time: '12:34:02',
      isSuccess: true
    },
    {
      id: 3,
      providerName: 'Provider C (الاحتياط 🥉)',
      action: 'balance_alert',
      statusCode: 'LOW_BALANCE',
      latencyMs: 310,
      message: 'تحذير: الرصيد ($8.40) أقل من الحد الأدنى $10.00',
      time: '12:30:45',
      isSuccess: false
    }
  ]);
  const [revealedKeys, setRevealedKeys] = useState<Record<number, boolean>>({});
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; msg: string; latency: number }>>({});
  const [testingId, setTestingId] = useState<number | null>(null);
  const [isHealthCheckingAll, setIsHealthCheckingAll] = useState(false);

  // Failover simulator states (Phase 10 & 16)
  const [isSimulatingFailover, setIsSimulatingFailover] = useState(false);
  const [failoverStep, setFailoverStep] = useState(0);
  const [failoverLogs, setFailoverLogs] = useState<string[]>([]);

  // Add provider modal (Phase 5)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvName, setNewProvName] = useState('');
  const [newProvUrl, setNewProvUrl] = useState('');
  const [newProvKey, setNewProvKey] = useState('');
  const [newProvType, setNewProvType] = useState<'standard' | 'sms_activate' | 'five_sim'>('standard');
  const [newProvPriority, setNewProvPriority] = useState('70');
  const [newProvMinBal, setNewProvMinBal] = useState('10.0');
  const [newProvTested, setNewProvTested] = useState(false);
  const [newProvTesting, setNewProvTesting] = useState(false);
  const [newProvTestMsg, setNewProvTestMsg] = useState<string | null>(null);

  // Safe Key Edit Modal (Phase 15)
  const [editingKeyProvider, setEditingKeyProvider] = useState<ProviderItem | null>(null);
  const [tempNewKey, setTempNewKey] = useState('');
  const [keyTestSuccess, setKeyTestSuccess] = useState(false);
  const [keyTestMsg, setKeyTestMsg] = useState<string | null>(null);
  const [keyTesting, setKeyTesting] = useState(false);

  // Pricing Engine (Phase 17)
  const [pricingMarginPercent, setPricingMarginPercent] = useState(30);
  const [sampleCost, setSampleCost] = useState(1.20);

  // Test single provider connection
  const handleTestProviderConnection = (prov: ProviderItem) => {
    setTestingId(prov.id);
    setTimeout(() => {
      const isSuccess = prov.status !== 'offline';
      const latency = Math.floor(150 + Math.random() * 180);
      const msg = isSuccess 
        ? `✅ الاتصال سليم (HTTP 200 OK) • زمن الاستجابة: ${latency}ms • الرصيد: $${prov.currentBalance.toFixed(2)}`
        : `❌ خطأ في الاتصال بالمزود (HTTP 502 / DNS Failure)`;
      
      setTestResults(prev => ({ ...prev, [prov.id]: { success: isSuccess, msg, latency } }));
      setTestingId(null);

      // Add log
      setProviderLogs(prev => [
        {
          id: Date.now(),
          providerName: prov.name,
          action: 'test_connection',
          statusCode: isSuccess ? 'HTTP_200' : 'HTTP_502',
          latencyMs: latency,
          message: msg,
          time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isSuccess
        },
        ...prev
      ]);
    }, 600);
  };

  // Run Health Check All
  const handleHealthCheckAll = () => {
    setIsHealthCheckingAll(true);
    setTimeout(() => {
      setProviders(prev => prev.map(p => {
        const randLat = Math.floor(160 + Math.random() * 150);
        return {
          ...p,
          latencyMs: randLat,
          lastTested: 'الآن',
          status: p.currentBalance < p.minBalance ? 'degraded' : 'online'
        };
      }));
      setIsHealthCheckingAll(false);
      setProviderLogs(prev => [
        {
          id: Date.now(),
          providerName: 'نظام إدارة المزودين',
          action: 'health_check_all',
          statusCode: 'SUCCESS_ALL',
          latencyMs: 240,
          message: 'تم فحص جميع المزودين بنجاح وتحديث الأرصدة وحالات الشبكة',
          time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isSuccess: true
        },
        ...prev
      ]);
      alert('✅ اكتمل الفحص الشامل! تم تحديث جميع حالات المزودين وأرصدتهم بنجاح.');
    }, 800);
  };

  // Toggle Provider Active
  const handleToggleProvider = (provId: number) => {
    setProviders(prev => prev.map(p => p.id === provId ? { ...p, isActive: !p.isActive } : p));
  };

  // Change Provider Priority
  const handleChangePriority = (provId: number, delta: number) => {
    setProviders(prev => {
      const updated = prev.map(p => p.id === provId ? { ...p, priority: Math.max(1, p.priority + delta) } : p);
      return [...updated].sort((a, b) => b.priority - a.priority);
    });
  };

  // Delete Provider
  const handleDeleteProvider = (provId: number) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا المزود؟')) {
      setProviders(prev => prev.filter(p => p.id !== provId));
    }
  };

  // Run Failover Simulation
  const handleSimulateFailover = () => {
    setIsSimulatingFailover(true);
    setFailoverStep(1);
    setFailoverLogs(['1️⃣ وصول طلب شراء حساب تيليجرام أمريكي (+1) من مستخدم.']);

    setTimeout(() => {
      setFailoverStep(2);
      setFailoverLogs(prev => [
        ...prev,
        '2️⃣ توجيه الطلب إلى Provider A (🥇 الأولوية 100)...',
        '⚠️ استجابة Provider A: انقطاع الاتصال / مهلة منتهية (TIMEOUT - HTTP 504).'
      ]);

      setTimeout(() => {
        setFailoverStep(3);
        setFailoverLogs(prev => [
          ...prev,
          '3️⃣ 🛡️ تفعيل حماية منع الخصم المزدوج (Idempotency Guard)...',
          '🔍 الاستعلام عن حالة الطلب لدى Provider A: لم يُنشأ أي طلب ولم يتم خصم رصيد.'
        ]);

        setTimeout(() => {
          setFailoverStep(4);
          setFailoverLogs(prev => [
            ...prev,
            '4️⃣ 🔄 تفعيل التحويل التلقائي السلس إلى Provider B (🥈 الأولوية 90)...',
            '✅ تم الاتصال بنجاح وتوليد الرقم: +1 555 019 4829 وكود الدخول!'
          ]);

          setTimeout(() => {
            setFailoverStep(5);
            setFailoverLogs(prev => [
              ...prev,
              '5️⃣ تسليم الحساب فورياً للمستخدم + تسجيل العملية في سجل التدقيق + إشعار المدير بنجاح التحويل.'
            ]);
            setIsSimulatingFailover(false);

            // Add log
            setProviderLogs(l => [
              {
                id: Date.now(),
                providerName: 'Provider A ➔ Provider B',
                action: 'auto_failover_success',
                statusCode: 'FAILOVER_OK',
                latencyMs: 420,
                message: 'تحويل تلقائي ناجح بسبب تعطل المزود الرئيسي ومنع الشراء المزدوج',
                time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isSuccess: true
              },
              ...l
            ]);
          }, 1200);
        }, 1200);
      }, 1200);
    }, 1200);
  };

  // Helper: Get available stock for a product
  const getStockCount = (prodId: number) => {
    return inventory.filter(i => i.productId === prodId && i.status === 'available').length;
  };

  // Buy handler
  const handleBuyProduct = (prod: Product) => {
    const availableItems = inventory.filter(i => i.productId === prod.id && i.status === 'available');
    if (availableItems.length === 0) {
      alert('عذراً، نفد المخزون المتوفر لهذا المنتج حالياً!');
      return;
    }

    if (userBalance < prod.price) {
      alert(`رصيدك الحالي ($${userBalance.toFixed(2)}) غير كافٍ. يرجى شحن محفظتك أولاً.`);
      setCurrentScreen('deposit');
      return;
    }

    const boughtItem = availableItems[0];
    
    // Deduct balance
    setUserBalance(prev => Number((prev - prod.price).toFixed(2)));

    // Mark inventory as sold
    setInventory(prev => prev.map(item => item.id === boughtItem.id ? { ...item, status: 'sold' } : item));

    // Create Order
    const newOrderId = `#${Math.floor(10000 + Math.random() * 90000)}`;
    const newOrder: Order = {
      orderId: newOrderId,
      userId: '8097770003',
      productId: prod.id,
      productTitle: prod.title,
      price: prod.price,
      phoneNumber: boughtItem.phoneNumber,
      loginCode: boughtItem.loginCode,
      twoFa: boughtItem.twoFa,
      tdataUrl: boughtItem.tdataUrl,
      status: 'completed',
      warrantyHours: prod.warrantyHours,
      warrantyUntil: new Date(Date.now() + prod.warrantyHours * 3600 * 1000).toLocaleString('ar-YE'),
      warrantyStatus: 'none',
      createdAt: new Date().toLocaleString('ar-YE')
    };

    setOrders(prev => [newOrder, ...prev]);
    setActiveOrder(newOrder);

    // Audit log
    setAuditLogs(prev => [
      {
        id: Date.now(),
        actor: '8097770003',
        action: 'buy_order',
        details: `شراء ${prod.title} (${newOrderId})`,
        amount: -prod.price,
        time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);

    setCurrentScreen('order_success');
  };

  // Deposit Request
  const handleCreateDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح بالدولار ($)!');
      return;
    }
    const depId = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const newDep: Deposit = {
      depositId: depId,
      userId: '8097770003',
      methodName: selectedMethod === 'kuraimi' ? 'بنك الكريمي' : selectedMethod === 'sham_cash' ? 'شام كاش' : selectedMethod === 'usdt' ? 'USDT TRC20' : 'فودافون كاش',
      amountUsd: amt,
      proof: depositProof || 'إشعار تحويل بنكي',
      status: 'pending',
      createdAt: new Date().toLocaleString('ar-YE')
    };
    setDeposits(prev => [newDep, ...prev]);
    setDepositSuccessMsg(`تم رفع طلب الشحن ${depId} بنجاح بمبلغ $${amt.toFixed(2)}. بانتظار تأكيد الإدارة.`);
    setDepositProof('');
  };

  // Balance Transfer
  const handleTransfer = () => {
    const amt = parseFloat(transferAmount);
    if (!transferTargetId.trim()) {
      setTransferMsg('⚠️ يرجى إدخال آيدي (Telegram ID) المستلم!');
      return;
    }
    if (isNaN(amt) || amt < 1.0) {
      setTransferMsg('⚠️ الحد الأدنى للتحويل هو $1.00!');
      return;
    }
    if (userBalance < amt) {
      setTransferMsg('❌ رصيدك الحالي لا يكفي لإتمام التحويل!');
      return;
    }

    setUserBalance(prev => Number((prev - amt).toFixed(2)));
    const tfId = `TRF-${Math.floor(10000 + Math.random() * 90000)}`;
    setTransferMsg(`✅ تم تحويل $${amt.toFixed(2)} بنجاح إلى المستخدم (${transferTargetId})! رقم الحوالة: ${tfId}`);
    setTransferAmount('');
    setTransferTargetId('');
  };

  // Coupon Apply
  const handleApplyCoupon = () => {
    if (couponInput.trim().toUpperCase() === 'WELCOME10') {
      setUserBalance(prev => Number((prev + 1.0).toFixed(2)));
      setCouponMsg('🎉 مبروك! كود الترحيب صحيح وتمت إضافة هدية $1.00 إلى محفظتك!');
    } else if (couponInput.trim().toUpperCase() === 'TG2026') {
      setUserBalance(prev => Number((prev + 0.50).toFixed(2)));
      setCouponMsg('🎉 مبروك! تم تفعيل كوبون خصم وإيداع $0.50 في محفظتك!');
    } else {
      setCouponMsg('❌ كود الكوبون غير صالح أو انتهت صلاحيته.');
    }
    setCouponInput('');
  };

  // Admin Approve Deposit
  const handleApproveDeposit = (depId: string) => {
    const dep = deposits.find(d => d.depositId === depId);
    if (!dep || dep.status !== 'pending') return;

    setUserBalance(prev => Number((prev + dep.amountUsd).toFixed(2)));
    setDeposits(prev => prev.map(d => d.depositId === depId ? { ...d, status: 'approved' } : d));
    setAuditLogs(prev => [
      {
        id: Date.now(),
        actor: 'Admin',
        action: 'deposit_approved',
        details: `الموافقة على شحن ${depId} للمستخدم`,
        amount: dep.amountUsd,
        time: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);
  };

  const totalSpent = orders.reduce((acc, o) => acc + o.price, 0);

  return (
    <div className="w-full max-w-4xl mx-auto bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-['Tajawal',sans-serif]">
      {/* Top Telegram App Header */}
      <div className="bg-stone-800/90 border-b border-stone-700/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-md">
            ✈️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">متجر حسابات التيليجرام الجاهزة</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                تسليم فوري
              </span>
            </div>
            <p className="text-[11px] text-stone-400">@YasNumBot • العملة المعتمدة: الدولار الأمريكي ($)</p>
          </div>
        </div>

        {/* User Balance Badge */}
        <div className="flex items-center gap-2">
          <div className="bg-stone-900/80 border border-stone-700/80 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-[11px] text-stone-400">الرصيد:</span>
            <span className="text-sm font-bold text-emerald-400">${userBalance.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setCurrentScreen('main')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-700/60 hover:bg-stone-700 text-stone-300 text-xs transition-all"
            title="الرئيسية"
          >
            🏠
          </button>
        </div>
      </div>

      {/* Screen Container */}
      <div className="p-4 sm:p-6 bg-stone-950/60 min-h-[520px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* ===================== SCREEN: MAIN ===================== */}
          {currentScreen === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 text-stone-200 text-xs sm:text-sm space-y-2 leading-relaxed">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>👋 مرحباً بك في متجر حسابات تيليجرام الجاهزة</span>
                </div>
                <p className="text-stone-400">
                  متجرك الأول لشراء حسابات وأرقام تيليجرام مفعلة وجاهزة للتسليم الفوري التلقائي مع كود الدخول وكلمة سر 2FA وضمان شامل 24 ساعة.
                </p>
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                  <span>🆔 Telegram ID: <strong className="text-stone-300">8097770003</strong></span>
                  <span>💰 رصيدك: <strong className="text-emerald-400">${userBalance.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Bot Keyboards Grid */}
              <div className="space-y-2 pt-2">
                {/* 1. حسابات جاهزة للتسليم */}
                <button
                  onClick={() => setCurrentScreen('ready_store')}
                  className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  <span>🛍 حسابات جاهزة للتسليم</span>
                </button>

                {/* 2. حسابي | طلباتي */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentScreen('my_account')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>👤 حسابي</span>
                  </button>
                  <button
                    onClick={() => setCurrentScreen('my_orders')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>📦 طلباتي ({orders.length})</span>
                  </button>
                </div>

                {/* 3. شحن الرصيد | تحويل الرصيد */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentScreen('deposit')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>💳 شحن الرصيد</span>
                  </button>
                  <button
                    onClick={() => setCurrentScreen('transfer')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>🔄 تحويل الرصيد</span>
                  </button>
                </div>

                {/* 4. رصيد مجاني | نظام الإحالة */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentScreen('coupons')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>🎁 رصيد مجاني</span>
                  </button>
                  <button
                    onClick={() => setCurrentScreen('referrals')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>👥 نظام الإحالة</span>
                  </button>
                </div>

                {/* 5. العروض والكوبونات */}
                <button
                  onClick={() => setCurrentScreen('coupons')}
                  className="w-full py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-amber-400 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>🎟 العروض والكوبونات</span>
                </button>

                {/* 6. الدعم الفني | التعليمات والأسئلة الشائعة */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setCurrentScreen('support')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>🎧 الدعم الفني</span>
                  </button>
                  <button
                    onClick={() => setCurrentScreen('faq')}
                    className="py-3 px-3 rounded-xl bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    <span>ℹ️ التعليمات والأسئلة الشائعة</span>
                  </button>
                </div>

                {/* 7. لوحة الإدارة للمشرف */}
                <button
                  onClick={() => setCurrentScreen('admin')}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 border border-amber-500/50"
                >
                  <Crown className="w-4 h-4" />
                  <span>👑 لوحة الإدارة (Admin Panel)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: READY STORE ===================== */}
          {currentScreen === 'ready_store' && (
            <motion.div
              key="ready_store"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 text-stone-300 text-xs sm:text-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">🛍 متجر الحسابات الجاهزة للتسليم الفوري</h3>
                  <p className="text-stone-400 text-xs mt-0.5">اختر القسم وتصفح الحسابات المتوفرة بالمخزون الحي</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              {/* Categories Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {['🌍 الحسابات المتوفرة', '🔥 العروض', '⭐ الحسابات المميزة'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-sky-600 text-white'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Products List in selected category */}
              <div className="space-y-2.5">
                {products
                  .filter(p => p.category === selectedCategory && p.isActive)
                  .map(prod => {
                    const stock = getStockCount(prod.id);
                    return (
                      <div
                        key={prod.id}
                        className="bg-stone-900/90 border border-stone-800 rounded-2xl p-3.5 space-y-2.5 hover:border-stone-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-white text-sm">{prod.title}</h4>
                            <p className="text-stone-400 text-xs mt-1 leading-relaxed">{prod.description}</p>
                          </div>
                          <div className="text-left shrink-0">
                            <span className="text-base font-extrabold text-emerald-400">${prod.price.toFixed(2)}</span>
                            <div className="text-[10px] text-stone-400">تسليم فوري</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              stock > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {stock > 0 ? `🟢 متوفر: ${stock}` : '🔴 نفد المخزون'}
                            </span>
                            <span className="text-stone-400 text-[11px]">🛡 ضمان: {prod.warrantyHours} ساعة</span>
                          </div>

                          <button
                            disabled={stock === 0}
                            onClick={() => handleBuyProduct(prod)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              stock > 0
                                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            {stock > 0 ? '🛒 شراء الآن' : 'غير متوفر'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: ORDER SUCCESS ===================== */}
          {currentScreen === 'order_success' && activeOrder && (
            <motion.div
              key="order_success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-xl font-bold">
                  ✓
                </div>
                <h3 className="font-bold text-white text-base">🎉 تم شراء الحساب وتسليمه بنجاح!</h3>
                <p className="text-xs text-emerald-300">الطلب مكتمل والتسليم فوري من المخزون</p>
              </div>

              {/* Delivery Data Card */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">رقم الطلب:</span>
                  <strong className="text-white font-mono">{activeOrder.orderId}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">المنتج:</span>
                  <span className="text-stone-200 font-bold">{activeOrder.productTitle}</span>
                </div>
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-stone-400">المبلغ المدفوع:</span>
                  <span className="text-emerald-400 font-bold">${activeOrder.price.toFixed(2)}</span>
                </div>

                <div className="bg-stone-950 border border-stone-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">📱 رقم الهاتف:</span>
                    <span className="text-sky-400 font-mono font-bold text-sm tracking-wide">{activeOrder.phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">🔑 كود الدخول (SMS):</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm tracking-widest">{activeOrder.loginCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">🛡 كلمة سر 2FA:</span>
                    <span className="text-amber-400 font-mono font-bold">{activeOrder.twoFa}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-stone-400">
                  <span>⏱ صلاحية الضمان: {activeOrder.warrantyHours} ساعة</span>
                  <span>حتى: {activeOrder.warrantyUntil}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCurrentScreen('my_orders')}
                  className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-all"
                >
                  📦 عرض في طلباتي
                </button>
                <button
                  onClick={() => setCurrentScreen('ready_store')}
                  className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all"
                >
                  🛍 شراء حساب آخر
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: MY ACCOUNT ===================== */}
          {currentScreen === 'my_account' && (
            <motion.div
              key="my_account"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                      👤
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">حسابي ومحفظتي</h3>
                      <p className="text-xs text-stone-400 font-mono">🆔 Telegram ID: 8097770003</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentScreen('main')}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                  >
                    🔙 الرئيسية
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-400 block">💰 الرصيد الحالي:</span>
                    <strong className="text-lg font-extrabold text-emerald-400">${userBalance.toFixed(2)}</strong>
                  </div>
                  <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-400 block">📦 عدد الطلبات:</span>
                    <strong className="text-lg font-extrabold text-white">{orders.length}</strong>
                  </div>
                  <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-400 block">💵 إجمالي المشتريات:</span>
                    <strong className="text-lg font-extrabold text-stone-200">${totalSpent.toFixed(2)}</strong>
                  </div>
                  <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-400 block">🎁 أرباح الإحالة:</span>
                    <strong className="text-lg font-extrabold text-amber-400">$1.20 (12 إحالة)</strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setCurrentScreen('deposit')}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all"
                  >
                    💳 شحن الرصيد الآن
                  </button>
                  <button
                    onClick={() => setCurrentScreen('my_orders')}
                    className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all"
                  >
                    📦 عرض سجل طلباتي
                  </button>
                  <button
                    onClick={() => setCurrentScreen('referrals')}
                    className="w-full py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-all"
                  >
                    👥 نظام الإحالة والأرباح
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: MY ORDERS ===================== */}
          {currentScreen === 'my_orders' && (
            <motion.div
              key="my_orders"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">📦 سجل طلباتي ({orders.length})</h3>
                  <p className="text-xs text-stone-400 mt-0.5">تفاصيل الحسابات المشتراة وأكواد الدخول والضمان</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              <div className="space-y-3">
                {orders.map(ord => (
                  <div key={ord.orderId} className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2 text-xs">
                      <span className="font-mono text-stone-400">طلب {ord.orderId}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        {ord.warrantyStatus === 'requested' ? '🛡 بانتظار الضمان' : '✅ مكتمل'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-white text-sm">{ord.productTitle}</h4>
                      <p className="text-stone-400 text-xs mt-0.5">تاريخ الشراء: {ord.createdAt}</p>
                    </div>

                    <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span className="text-stone-400">الهاتف:</span>
                        <span className="text-sky-400 font-bold">{ord.phoneNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">الكود:</span>
                        <span className="text-emerald-400 font-bold">{ord.loginCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">2FA:</span>
                        <span className="text-amber-400 font-bold">{ord.twoFa}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-emerald-400 font-bold text-sm">${ord.price.toFixed(2)}</span>
                      {ord.warrantyStatus === 'none' ? (
                        <button
                          onClick={() => {
                            setOrders(prev => prev.map(o => o.orderId === ord.orderId ? { ...o, warrantyStatus: 'requested' } : o));
                            alert('تم تقديم طلب الضمان للإدارة لمراجعة الحساب واستبداله!');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-600/30"
                        >
                          🛡 طلب ضمان
                        </button>
                      ) : (
                        <span className="text-xs text-amber-400">تم رفع طلب الضمان للإدارة</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: DEPOSIT ===================== */}
          {currentScreen === 'deposit' && (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">💳 شحن الرصيد بالدولار ($)</h3>
                  <p className="text-xs text-stone-400 mt-0.5">وسائل دفع متعددة ومباشرة مع اعتماد سريع</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              {depositSuccessMsg && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs">
                  {depositSuccessMsg}
                </div>
              )}

              {/* Payment Methods Selection */}
              <div className="space-y-2">
                <label className="text-xs text-stone-300 block font-bold">اختر وسيلة الدفع:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'kuraimi', label: '🏦 بنك الكريمي', info: 'حساب: 123456789 - باسم المتجر' },
                    { id: 'sham_cash', label: '💵 شام كاش', info: 'حساب: 963900000000' },
                    { id: 'usdt', label: '💎 USDT TRC-20', info: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb' },
                    { id: 'vodafone', label: '📱 فودافون / إنستاباي', info: 'محفظة: 01000000000' },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMethod(m.id)}
                      className={`p-3 rounded-xl border text-right transition-all ${
                        selectedMethod === m.id
                          ? 'bg-sky-600/20 border-sky-500 text-white'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-800'
                      }`}
                    >
                      <div className="font-bold text-xs text-stone-200">{m.label}</div>
                      <div className="text-[10px] text-stone-400 mt-1 truncate">{m.info}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount and Proof Input */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
                <div>
                  <label className="text-stone-300 block mb-1">المبلغ المراد شحنه بالدولار ($):</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    placeholder="10.00"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">رقم الحوالة / السند / كود المعاملة TXID:</label>
                  <input
                    type="text"
                    value={depositProof}
                    onChange={e => setDepositProof(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="مثال: #89281920 أو TXID"
                  />
                </div>

                <button
                  onClick={handleCreateDeposit}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md mt-2"
                >
                  📨 إرسال طلب الشحن للإدارة
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: TRANSFER ===================== */}
          {currentScreen === 'transfer' && (
            <motion.div
              key="transfer"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">🔄 تحويل الرصيد</h3>
                  <p className="text-xs text-stone-400 mt-0.5">تحويل فوري ومباشر إلى حساب مستخدم آخر بالدولار ($)</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              {transferMsg && (
                <div className={`p-3 rounded-xl text-xs ${
                  transferMsg.startsWith('✅') ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}>
                  {transferMsg}
                </div>
              )}

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
                <div>
                  <label className="text-stone-300 block mb-1">معرف المستلم (Telegram User ID):</label>
                  <input
                    type="text"
                    value={transferTargetId}
                    onChange={e => setTransferTargetId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                    placeholder="مثال: 591829104"
                  />
                </div>

                <div>
                  <label className="text-stone-300 block mb-1">المبلغ المراد تحويله بالدولار ($):</label>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    placeholder="الحد الأدنى $1.00"
                  />
                </div>

                <button
                  onClick={handleTransfer}
                  className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all shadow-md mt-2"
                >
                  ⚡ إتمام التحويل الفوري
                </button>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: REFERRALS ===================== */}
          {currentScreen === 'referrals' && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">👥 نظام الإحالة وشارك واربح</h3>
                  <p className="text-xs text-stone-400 mt-0.5">احصل على $0.10 دولار مجاناً لكل شخص ينضم عبر رابطك</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-400 block">المستخدمين المدعوين:</span>
                    <strong className="text-lg font-bold text-white">12 شخص</strong>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <span className="text-xs text-stone-400 block">أرباح الإحالة المكتسبة:</span>
                    <strong className="text-lg font-bold text-emerald-400">$1.20 دولار</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-stone-300 block font-bold text-xs">رابط الإحالة الخاص بك:</label>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value="https://t.me/YasNumBot?start=ref_8097770003"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-sky-400 font-mono text-xs"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://t.me/YasNumBot?start=ref_8097770003');
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shrink-0"
                    >
                      {copiedLink ? '✓ نُسخ' : 'نسخ'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: COUPONS ===================== */}
          {currentScreen === 'coupons' && (
            <motion.div
              key="coupons"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">🎟 العروض والكوبونات</h3>
                  <p className="text-xs text-stone-400 mt-0.5">استخدم قسائم التخفيض للحصول على رصيد مجاني</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              {couponMsg && (
                <div className="p-3 bg-amber-950/60 border border-amber-800 text-amber-300 text-xs rounded-xl">
                  {couponMsg}
                </div>
              )}

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
                <label className="text-stone-300 block font-bold">أدخل كود الكوبون أو القسيمة:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={e => setCouponInput(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white uppercase font-mono tracking-wider"
                    placeholder="مثال: WELCOME10 أو TG2026"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0"
                  >
                    تطبيق
                  </button>
                </div>
                <p className="text-stone-500 text-[11px]">جرب إدخال: <code className="text-amber-400">WELCOME10</code> للحصول على هدية $1.00 فورا</p>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: SUPPORT ===================== */}
          {currentScreen === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">🎧 الدعم الفني المباشر</h3>
                  <p className="text-xs text-stone-400 mt-0.5">فريق خدمة العملاء متواجد على مدار 24 ساعة لمساعدتك</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 text-xs sm:text-sm">
                <a
                  href="https://t.me/Yy77501"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800 hover:border-sky-500 text-white transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Headphones className="w-5 h-5 text-sky-400" />
                    <div>
                      <div className="font-bold">المشرف العام والدعم الفني المباشر</div>
                      <div className="text-stone-400 text-xs">@Yy77501</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-400" />
                </a>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: FAQ ===================== */}
          {currentScreen === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-xl mx-auto w-full"
            >
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">ℹ️ التعليمات والأسئلة الشائعة</h3>
                  <p className="text-xs text-stone-400 mt-0.5">دليل شامل لاستخدام الحسابات والضمان</p>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 text-xs sm:text-sm text-stone-300 leading-relaxed">
                <div className="border-b border-stone-800 pb-2">
                  <h4 className="font-bold text-white mb-1">1. كيف يتم تسليم الحساب بعد الشراء؟</h4>
                  <p className="text-stone-400">التسليم فوري وتلقائي مباشرة في البوت! يظهر لك رقم الهاتف، كود التحقق الأول، وكلمة سر التحقق بخطوتين (2FA) ورابط تحميل ملف الجلسة.</p>
                </div>
                <div className="border-b border-stone-800 pb-2">
                  <h4 className="font-bold text-white mb-1">2. ما هي مدة الضمان؟</h4>
                  <p className="text-stone-400">جميع الحسابات مشمولة بضمان استبدال لمدة 24 ساعة (و48-72 ساعة للباقات المميزة) ضد تسجيل الخروج الأول أو أي مشكلة دخول.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">3. ما هي العملة المعتمدة؟</h4>
                  <p className="text-stone-400">العملة الرسمية والوحيدة للبوت هي الدولار الأمريكي ($) منعاً لأي تقلبات في أسعار الصرف.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== SCREEN: ADMIN PANEL ===================== */}
          {currentScreen === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4 max-w-3xl mx-auto w-full"
            >
              {/* Admin Bar */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                    👑
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">لوحة الإدارة والتحكم الشاملة</h3>
                    <p className="text-xs text-amber-400">صلاحيات المدير الكاملة • متصل</p>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentScreen('main')}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 text-xs font-bold text-stone-300 hover:bg-stone-700"
                >
                  🔙 الرئيسية
                </button>
              </div>

              {/* Admin Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'providers', label: '🔌 إدارة المزودين (الـ 20 مرحلة)' },
                  { id: 'stats', label: '📊 الإحصائيات' },
                  { id: 'products', label: '📦 المنتجات' },
                  { id: 'inventory', label: '📋 المخزون' },
                  { id: 'orders', label: '🛒 الطلبات' },
                  { id: 'deposits', label: '💳 الشحن' },
                  { id: 'balance', label: '💰 الأرصدة' },
                  { id: 'logs', label: '📜 سجل العمليات' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAdminTab(t.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      adminTab === t.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-900 text-stone-400 border border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT: PROVIDERS (20 PHASES FULL IMPLEMENTATION) */}
              {adminTab === 'providers' && (
                <div className="space-y-4">
                  {/* Global Status & Quick Actions Bar */}
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <span>🔌 نظام إدارة المزودين المركزي</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            20 مرحلة مكتملة
                          </span>
                        </h4>
                        <p className="text-xs text-stone-400">
                          نظام موحد لإدارة المفاتيح، الأولويات، التحويل التلقائي عند التعطل (Failover)، ومنع الشراء المزدوج
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleHealthCheckAll}
                          disabled={isHealthCheckingAll}
                          className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <span className={isHealthCheckingAll ? 'animate-spin' : ''}>🔄</span>
                          {isHealthCheckingAll ? 'جاري الفحص...' : 'فحص شامل لجميع المزودين'}
                        </button>
                        <button
                          onClick={handleSimulateFailover}
                          disabled={isSimulatingFailover}
                          className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>🧪</span>
                          {isSimulatingFailover ? 'محاكاة جارية...' : 'تجربة التحويل التلقائي (Failover)'}
                        </button>
                        <button
                          onClick={() => {
                            setNewProvName('');
                            setNewProvUrl('');
                            setNewProvKey('');
                            setNewProvTested(false);
                            setNewProvTestMsg(null);
                            setShowAddModal(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>➕</span>
                          إضافة مزود جديد
                        </button>
                      </div>
                    </div>

                    {/* Quick Metrics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-800 text-xs">
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80">
                        <span className="text-stone-400 text-[11px] block">المزودين النشطين:</span>
                        <strong className="text-emerald-400 font-bold text-sm">
                          {providers.filter(p => p.isActive).length} من {providers.length} مزودين
                        </strong>
                      </div>
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80">
                        <span className="text-stone-400 text-[11px] block">إجمالي الأرصدة المتاحة:</span>
                        <strong className="text-amber-400 font-bold text-sm">
                          ${providers.reduce((sum, p) => sum + p.currentBalance, 0).toFixed(2)}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80">
                        <span className="text-stone-400 text-[11px] block">التبديل التلقائي (Failover):</span>
                        <strong className="text-sky-400 font-bold text-sm">🟢 نشط ومؤمن</strong>
                      </div>
                      <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80">
                        <span className="text-stone-400 text-[11px] block">منع الخصم المزدوج:</span>
                        <strong className="text-purple-400 font-bold text-sm">🛡️ مفعل (Idempotency)</strong>
                      </div>
                    </div>
                  </div>

                  {/* FAILOVER SIMULATION VISUAL BOX */}
                  {(isSimulatingFailover || failoverStep > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-purple-950/30 border border-purple-800/60 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-purple-300 font-bold text-xs flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                          محاكي التبديل التلقائي التفاعلي (Live Failover & Idempotency Simulation)
                        </h5>
                        <button
                          onClick={() => { setFailoverStep(0); setFailoverLogs([]); setIsSimulatingFailover(false); }}
                          className="text-[10px] text-purple-400 hover:underline font-bold"
                        >
                          إغلاق المحاكي
                        </button>
                      </div>

                      {/* Stepper Visual */}
                      <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                        {[
                          { step: 1, title: 'وصول الطلب' },
                          { step: 2, title: 'المزود A (انقطاع)' },
                          { step: 3, title: 'منع الشراء المزدوج' },
                          { step: 4, title: 'تحويل لـ المزود B' },
                          { step: 5, title: 'تسليم فوري' }
                        ].map(s => (
                          <div
                            key={s.step}
                            className={`p-2 rounded-xl border transition-all ${
                              failoverStep >= s.step
                                ? s.step === 2
                                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                                : 'bg-stone-900 border-stone-800 text-stone-500'
                            }`}
                          >
                            <span className="block text-[10px]">مرحلة {s.step}</span>
                            {s.title}
                          </div>
                        ))}
                      </div>

                      {/* Log stream */}
                      <div className="bg-stone-950 p-3 rounded-xl border border-purple-900/40 space-y-1 text-xs font-mono">
                        {failoverLogs.map((lg, i) => (
                          <div key={i} className="text-stone-300 leading-relaxed">
                            {lg}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* PROVIDERS CARDS LIST (Sorted by Priority) */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-white text-xs flex items-center justify-between">
                      <span>📋 قائمة المزودين حسب الأولوية الحالية:</span>
                      <span className="text-stone-400 font-normal text-[11px]">
                        يتم التوجيه أولاً للأعلى أولوية ثم الاحتياطي تلقائياً
                      </span>
                    </h4>

                    {providers
                      .slice()
                      .sort((a, b) => b.priority - a.priority)
                      .map((prov, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                        const isKeyRevealed = !!revealedKeys[prov.id];
                        const testInfo = testResults[prov.id];
                        const isTesting = testingId === prov.id;
                        const isLowBalance = prov.currentBalance < prov.minBalance;

                        return (
                          <div
                            key={prov.id}
                            className={`bg-stone-900 border rounded-2xl p-4 space-y-3 transition-all ${
                              prov.isActive
                                ? isLowBalance
                                  ? 'border-amber-700/60 shadow-sm'
                                  : 'border-stone-800'
                                : 'border-stone-800/40 opacity-60'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">{medal}</span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-white text-sm">{prov.name}</h5>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                        prov.status === 'online'
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : prov.status === 'degraded'
                                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      }`}
                                    >
                                      {prov.status === 'online' ? '🟢 متصل' : prov.status === 'degraded' ? '🟡 استجابة جزئية / رصيد منخفض' : '🔴 غير متصل'}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 text-[10px] font-mono">
                                      {prov.adapterType}
                                    </span>
                                  </div>
                                  <span className="text-stone-400 text-xs font-mono">{prov.baseUrl}</span>
                                </div>
                              </div>

                              {/* Priority Control */}
                              <div className="flex items-center gap-1.5 bg-stone-950 px-2.5 py-1.5 rounded-xl border border-stone-800">
                                <span className="text-stone-400 text-[11px]">الأولوية:</span>
                                <strong className="text-amber-400 font-bold text-xs">{prov.priority}</strong>
                                <button
                                  onClick={() => handleChangePriority(prov.id, 5)}
                                  title="زيادة الأولوية"
                                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => handleChangePriority(prov.id, -5)}
                                  title="خفض الأولوية"
                                  className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>

                            {/* Card Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/60">
                                <span className="text-stone-400 text-[10px] block">الرصيد المتاح:</span>
                                <strong className={`text-sm font-bold ${isLowBalance ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  ${prov.currentBalance.toFixed(2)}
                                </strong>
                                <span className="text-stone-500 text-[9px] block">أدنى مسموح: ${prov.minBalance.toFixed(2)}</span>
                              </div>

                              <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/60">
                                <span className="text-stone-400 text-[10px] block">زمن الاستجابة (Latency):</span>
                                <strong className="text-sky-400 text-sm font-bold">{prov.latencyMs}ms</strong>
                                <span className="text-stone-500 text-[9px] block">آخر فحص: {prov.lastTested}</span>
                              </div>

                              <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/60 col-span-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-stone-400 text-[10px]">مفتاح الـ API (مشفر):</span>
                                  <button
                                    onClick={() => setRevealedKeys(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                                    className="text-[10px] text-amber-400 hover:underline"
                                  >
                                    {isKeyRevealed ? 'إخفاء' : 'كشف'}
                                  </button>
                                </div>
                                <span className="font-mono text-xs text-stone-200 block truncate mt-0.5">
                                  {isKeyRevealed ? prov.apiKey : `••••••••••••${prov.apiKey.slice(-4)}`}
                                </span>
                              </div>
                            </div>

                            {/* Low balance alert message */}
                            {isLowBalance && (
                              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                                <span>⚠️</span>
                                <span>
                                  <strong>تنبيه رصيد منخفض:</strong> رصيد هذا المزود (${prov.currentBalance.toFixed(2)}) أقل من الحد الأدنى المعين (${prov.minBalance.toFixed(2)}). يرجى شحن الحساب لتفادي تعطل التوليد.
                                </span>
                              </div>
                            )}

                            {/* Test result feedback banner */}
                            {testInfo && (
                              <div
                                className={`p-2 rounded-xl text-xs flex items-center justify-between border ${
                                  testInfo.success
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                }`}
                              >
                                <span>{testInfo.msg}</span>
                                <button
                                  onClick={() => setTestResults(prev => { const n = { ...prev }; delete n[prov.id]; return n; })}
                                  className="text-stone-400 hover:text-white"
                                >
                                  ✕
                                </button>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800/80">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleTestProviderConnection(prov)}
                                  disabled={isTesting}
                                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 transition-all"
                                >
                                  <span className={isTesting ? 'animate-spin' : ''}>🧪</span>
                                  {isTesting ? 'جاري الفحص...' : 'فحص الاتصال الفوري'}
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingKeyProvider(prov);
                                    setTempNewKey('');
                                    setKeyTestSuccess(false);
                                    setKeyTestMsg(null);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold flex items-center gap-1 transition-all"
                                >
                                  <span>🔑</span>
                                  تعديل المفتاح الآمن
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleProvider(prov.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    prov.isActive
                                      ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30'
                                      : 'bg-stone-800 text-stone-500 hover:bg-stone-700'
                                  }`}
                                >
                                  {prov.isActive ? '🟢 مفعل' : '⚪ معطل'}
                                </button>
                                <button
                                  onClick={() => handleDeleteProvider(prov.id)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs transition-all"
                                  title="حذف المزود"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* PRICING & MARGINS ENGINE (PHASE 17) */}
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>💰 محرك التسعير وهوامش الأرباح التلقائي (Pricing Engine)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                        Phase 17
                      </span>
                    </h4>
                    <p className="text-stone-400 text-[11px]">
                      يقوم البوت تلقائياً بحساب سعر بيع الحساب أو الرقم بإضافة هامش ربحك المحدد فوق تكلفة المزود المباشرة.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-stone-950 rounded-xl border border-stone-800/80 items-center">
                      <div>
                        <span className="text-stone-400 text-[11px] block">تكلفة المزود النموذجية ($):</span>
                        <input
                          type="number"
                          step="0.1"
                          value={sampleCost}
                          onChange={e => setSampleCost(parseFloat(e.target.value) || 0)}
                          className="mt-1 w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-stone-400 text-[11px] block">نسبة هامش الربح (%):</span>
                        <input
                          type="number"
                          value={pricingMarginPercent}
                          onChange={e => setPricingMarginPercent(parseInt(e.target.value) || 0)}
                          className="mt-1 w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-amber-400 font-mono text-xs font-bold"
                        />
                      </div>
                      <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-800">
                        <span className="text-stone-400 text-[10px] block">سعر البيع النهائي للعميل:</span>
                        <strong className="text-emerald-400 text-base font-bold font-mono block">
                          ${(sampleCost * (1 + pricingMarginPercent / 100)).toFixed(2)}
                        </strong>
                        <span className="text-stone-500 text-[10px]">
                          صافي الربح: +${(sampleCost * (pricingMarginPercent / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* REAL-TIME PROVIDER AUDIT LOGS TABLE (PHASE 19) */}
                  <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <span>📜 سجل تدقيق عمليات المزودين (Provider Audit Trail)</span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                          Phase 19
                        </span>
                      </h4>
                      <button
                        onClick={() => setProviderLogs([])}
                        className="text-[11px] text-stone-500 hover:text-stone-300"
                      >
                        مسح السجل
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {providerLogs.map(log => (
                        <div
                          key={log.id}
                          className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className={log.isSuccess ? 'text-emerald-400' : 'text-rose-400'}>
                              {log.isSuccess ? '●' : '▲'}
                            </span>
                            <span className="text-stone-500">[{log.time}]</span>
                            <span className="text-amber-400 font-bold">{log.providerName}</span>
                            <span className="text-stone-300">{log.message}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-400 text-[10px]">
                              {log.statusCode}
                            </span>
                            <span className="text-sky-400 font-bold">{log.latencyMs}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MODAL: ADD PROVIDER (PHASE 5: PRE-TEST REQUIRED) */}
                  {showAddModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                          <h4 className="font-bold text-white text-base">➕ إضافة موقع مزود جديد</h4>
                          <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label className="text-stone-400 block mb-1">اسم المزود:</label>
                            <input
                              type="text"
                              value={newProvName}
                              onChange={e => setNewProvName(e.target.value)}
                              placeholder="مثال: Grizzly-SMS Backup"
                              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="text-stone-400 block mb-1">رابط الـ API الأساسي (Base URL):</label>
                            <input
                              type="text"
                              value={newProvUrl}
                              onChange={e => setNewProvUrl(e.target.value)}
                              placeholder="https://api.example.com/v1"
                              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-stone-400 block mb-1">مفتاح الـ API السري:</label>
                            <input
                              type="password"
                              value={newProvKey}
                              onChange={e => { setNewProvKey(e.target.value); setNewProvTested(false); }}
                              placeholder="أدخل مفتاح الـ API الخاص بالمزود"
                              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-stone-400 block mb-1">نوع البروتوكول:</label>
                              <select
                                value={newProvType}
                                onChange={e => setNewProvType(e.target.value as any)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white"
                              >
                                <option value="standard">Standard REST</option>
                                <option value="sms_activate">SMS-Activate Protocol</option>
                                <option value="five_sim">5SIM JWT Protocol</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-stone-400 block mb-1">الأولوية المبدئية:</label>
                              <input
                                type="number"
                                value={newProvPriority}
                                onChange={e => setNewProvPriority(e.target.value)}
                                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* Pre-Save Connection Test Section */}
                          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800/80 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-stone-400 font-bold text-[11px]">فحص الاتصال الإلزامي قبل الحفظ:</span>
                              <button
                                onClick={() => {
                                  if (!newProvUrl || !newProvKey) {
                                    alert('يرجى كتابة الرابط والمفتاح أولاً!');
                                    return;
                                  }
                                  setNewProvTesting(true);
                                  setTimeout(() => {
                                    setNewProvTesting(false);
                                    setNewProvTested(true);
                                    setNewProvTestMsg('✅ تم الاتصال بنجاح بالمزود واستلام الرصيد ($35.00)');
                                  }, 700);
                                }}
                                disabled={newProvTesting}
                                className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                              >
                                {newProvTesting ? 'جاري الفحص...' : 'اختبار الاتصال'}
                              </button>
                            </div>
                            {newProvTestMsg && (
                              <p className="text-[11px] text-emerald-400 font-mono">{newProvTestMsg}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                          <button
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => {
                              if (!newProvName.trim() || !newProvUrl.trim()) {
                                alert('يرجى تعبئة الحقول المطلوبة!');
                                return;
                              }
                              const newProv: ProviderItem = {
                                id: Date.now(),
                                name: newProvName.trim(),
                                baseUrl: newProvUrl.trim(),
                                apiKey: newProvKey.trim() || 'demo_key',
                                adapterType: newProvType,
                                priority: parseInt(newProvPriority) || 70,
                                minBalance: parseFloat(newProvMinBal) || 10.0,
                                currentBalance: 35.0,
                                status: 'online',
                                isActive: true,
                                latencyMs: 230,
                                lastTested: 'الآن',
                                lastError: null
                              };
                              setProviders(prev => [...prev, newProv].sort((a, b) => b.priority - a.priority));
                              setShowAddModal(false);
                              alert('✅ تم حفظ المزود الجديد وتفعيله بنجاح!');
                            }}
                            disabled={!newProvTested}
                            className={`px-4 py-2 rounded-xl font-bold transition-all ${
                              newProvTested
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            حفظ وتفعيل المزود
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODAL: SAFE KEY EDIT (PHASE 15) */}
                  {editingKeyProvider && (
                    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-5 space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                          <h4 className="font-bold text-white text-base">🔑 تعديل مفتاح API الآمن ({editingKeyProvider.name})</h4>
                          <button onClick={() => setEditingKeyProvider(null)} className="text-stone-400 hover:text-white">✕</button>
                        </div>

                        <div className="space-y-3">
                          <p className="text-stone-400 text-[11px]">
                            حفاظاً على استقرار العمليات ومنع إدخال مفتاح معطوب يوقف الخدمة، يلزم النظام فحص المفتاح الجديد والتأكد من صحة الصلاحيات قبل استبداله.
                          </p>

                          <div>
                            <label className="text-stone-400 block mb-1">المفتاح الجديد:</label>
                            <input
                              type="text"
                              value={tempNewKey}
                              onChange={e => { setTempNewKey(e.target.value); setKeyTestSuccess(false); setKeyTestMsg(null); }}
                              placeholder="أدخل المفتاح الجديد هنا..."
                              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-white font-mono"
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800">
                            <span className="text-stone-400 text-[11px]">التحقق المسبق من المفتاح:</span>
                            <button
                              onClick={() => {
                                if (!tempNewKey.trim()) {
                                  alert('يرجى إدخال المفتاح أولاً!');
                                  return;
                                }
                                setKeyTesting(true);
                                setTimeout(() => {
                                  setKeyTesting(false);
                                  setKeyTestSuccess(true);
                                  setKeyTestMsg('✅ تم التحقق: المفتاح صالح وصلاحيات الاستعلام والشراء مفعلة (HTTP 200 OK)');
                                }, 600);
                              }}
                              disabled={keyTesting}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
                            >
                              {keyTesting ? 'جاري التحقق...' : 'فحص المفتاح'}
                            </button>
                          </div>

                          {keyTestMsg && (
                            <p className="text-[11px] text-emerald-400 font-mono">{keyTestMsg}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                          <button
                            onClick={() => setEditingKeyProvider(null)}
                            className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 font-bold"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => {
                              setProviders(prev => prev.map(p => p.id === editingKeyProvider.id ? { ...p, apiKey: tempNewKey.trim() } : p));
                              setEditingKeyProvider(null);
                              alert('✅ تم تحديث مفتاح API الآمن بنجاح!');
                            }}
                            disabled={!keyTestSuccess}
                            className={`px-4 py-2 rounded-xl font-bold transition-all ${
                              keyTestSuccess
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            }`}
                          >
                            تأكيد واستبدال المفتاح
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: STATS */}
              {adminTab === 'stats' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-stone-400">👥 إجمالي المستخدمين:</span>
                    <strong className="text-lg font-bold text-white block">1,492 مستخدم</strong>
                  </div>
                  <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-stone-400">🛒 إجمالي الطلبات:</span>
                    <strong className="text-lg font-bold text-sky-400 block">{orders.length + 84} طلب</strong>
                  </div>
                  <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-stone-400">💵 إجمالي المبيعات:</span>
                    <strong className="text-lg font-bold text-emerald-400 block">${(totalSpent + 380).toFixed(2)}</strong>
                  </div>
                  <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-stone-400">📋 الحسابات المتاحة بالمخزون:</span>
                    <strong className="text-lg font-bold text-amber-400 block">{inventory.filter(i => i.status === 'available').length} حساب</strong>
                  </div>
                  <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-stone-400">💳 طلبات شحن معلقة:</span>
                    <strong className="text-lg font-bold text-purple-400 block">{deposits.filter(d => d.status === 'pending').length} طلب</strong>
                  </div>
                  <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-1">
                    <span className="text-stone-400">🛡 مطالبات الضمان:</span>
                    <strong className="text-lg font-bold text-rose-400 block">{orders.filter(o => o.warrantyStatus === 'requested').length} مطالبة</strong>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PRODUCTS */}
              {adminTab === 'products' && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">📦 قائمة المنتجات المسجلة في قاعدة البيانات</h4>
                    <button
                      onClick={() => {
                        const title = prompt('أدخل اسم المنتج الجديد:');
                        const price = parseFloat(prompt('أدخل السعر بالدولار ($):') || '0');
                        if (title && price > 0) {
                          const newP: Product = {
                            id: Date.now(),
                            title,
                            category: '🌍 الحسابات المتوفرة',
                            description: 'حساب جديد مضاف من الإدارة',
                            price,
                            warrantyHours: 24,
                            countryCode: '+1',
                            isActive: true
                          };
                          setProducts(prev => [...prev, newP]);
                          alert('تمت إضافة المنتج بنجاح!');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      ➕ إضافة منتج جديد
                    </button>
                  </div>

                  <div className="space-y-2">
                    {products.map(p => (
                      <div key={p.id} className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{p.title}</div>
                          <div className="text-stone-400 text-[11px]">{p.category} • السعر: ${p.price.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newPrice = prompt(`تعديل سعر (${p.title}):`, p.price.toString());
                              if (newPrice && !isNaN(parseFloat(newPrice))) {
                                setProducts(prev => prev.map(prod => prod.id === p.id ? { ...prod, price: parseFloat(newPrice) } : prod));
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200"
                          >
                            تعديل السعر
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: INVENTORY */}
              {adminTab === 'inventory' && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm">📋 المخزون الفعلي المتاح للتسليم ({inventory.filter(i => i.status === 'available').length} حساب)</h4>
                    <button
                      onClick={() => {
                        const phone = prompt('أدخل رقم الهاتف:');
                        const code = prompt('أدخل كود الدخول الأول (أو اتركه فارغاً):') || 'Auto';
                        const twoFa = prompt('أدخل كلمة سر 2FA:') || 'SafeTg#2026';
                        if (phone) {
                          setInventory(prev => [
                            ...prev,
                            {
                              id: Date.now(),
                              productId: 1,
                              phoneNumber: phone,
                              loginCode: code,
                              twoFa,
                              tdataUrl: 'https://storage.yasnum.org/tdata/sample.zip',
                              status: 'available'
                            }
                          ]);
                          alert('تم إضافة الحساب إلى المخزون بنجاح!');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                    >
                      ➕ إضافة حساب للمخزون
                    </button>
                  </div>

                  <div className="space-y-2">
                    {inventory.map(inv => (
                      <div key={inv.id} className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-white font-bold">{inv.phoneNumber}</span>
                          <span className="text-stone-400 text-[11px] block">الكود: {inv.loginCode} | 2FA: {inv.twoFa}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          inv.status === 'available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-500'
                        }`}>
                          {inv.status === 'available' ? '🟢 متاح' : '⚪ مباع'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: DEPOSITS */}
              {adminTab === 'deposits' && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-bold text-white text-sm">💳 طلبات الشحن المعلقة</h4>
                  {deposits.length === 0 ? (
                    <p className="text-xs text-stone-400">لا توجد طلبات شحن حالياً.</p>
                  ) : (
                    deposits.map(dep => (
                      <div key={dep.depositId} className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">طلب {dep.depositId} - {dep.methodName}</div>
                          <div className="text-stone-400 text-[11px]">المستخدم: {dep.userId} | المبلغ: <strong className="text-emerald-400">${dep.amountUsd.toFixed(2)}</strong></div>
                          <div className="text-stone-500 text-[10px]">الإشعار: {dep.proof}</div>
                        </div>

                        {dep.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleApproveDeposit(dep.depositId)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                            >
                              ✓ قبول وشحن
                            </button>
                            <button
                              onClick={() => setDeposits(prev => prev.map(d => d.depositId === dep.depositId ? { ...d, status: 'rejected' } : d))}
                              className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 font-bold text-xs"
                            >
                              ✕ رفض
                            </button>
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-bold">تمت الموافقة</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB CONTENT: LOGS */}
              {adminTab === 'logs' && (
                <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2 text-xs font-mono">
                  <h4 className="font-bold text-white text-sm mb-2">📜 سجل العمليات والتدقيق (Audit Logs)</h4>
                  {auditLogs.map(log => (
                    <div key={log.id} className="p-2 bg-stone-950 rounded-lg border border-stone-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500">[{log.time}]</span>
                        <span className="text-sky-400 font-bold">{log.actor}</span>
                        <span className="text-stone-300">{log.details}</span>
                      </div>
                      <span className={`font-bold ${log.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {log.amount > 0 ? `+$${log.amount.toFixed(2)}` : `-$${Math.abs(log.amount).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};