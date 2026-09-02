import { SmmService, SmsProvider, CountryItem, ServiceApp } from '../types';

export const PROFIT_MARGIN = 0.30; // 30% هامش ربح
export const RUB_PER_USD = 30.0;

export const SMM_CATALOG: SmmService[] = [
  {
    id: 'tg_king_members',
    section: 'رشق تيليجرام',
    title: 'متابعين تيليجرام | الأفضل | سرعة | ضمان 30ي',
    rawUnitPrice: 0.000271,
    rawPer1000: 0.271,
    minQty: 10,
    maxQty: 1000000,
    quality: 'حسابات عالية الجودة الافضل',
    speed: 'سريعة برق (حتى 100 ألف متابع يوميًا)',
    guarantee: '30 يوم',
    refill: 'نعم',
    compensation: 'نعم',
    cancelBtn: 'مُفعّل',
    linkType: 'رابط قناة أو مجموعة تيليجرام (مثال: https://t.me/NumbrWahm أو /NumbrWahm)',
    desc: `نظام الملك:
ضمان وقت البدء فوري الجودة حسابات عالية الجودة السرعة: حتى 100 ألف متابع يوميا معدل السقوط لا يوجد إعادة التعبئة: نعم التعويض نعم زر الإلغاء : مُفعّل. الرابط رابط قناة أو مجموعة تيليجرام . ملاحظات قد تختلف سرعة التنفيذ عند ارتفاع الضغط على الخدمة. لا تطلب الخدمة مرة أخرى على نفس الرابط حتى يكتمل الطلب الحالي عند وجود أي مشكلة، تواصل مع الدعم.`
  },
  {
    id: 'tg_king_views',
    section: 'رشق تيليجرام',
    title: 'مشاهدات منشورات تيليجرام | فوري وسريع',
    rawUnitPrice: 0.00005,
    rawPer1000: 0.05,
    minQty: 50,
    maxQty: 500000,
    quality: 'حسابات حقيقية متفاعلة',
    speed: 'فوري خلال دقائق',
    guarantee: 'دائم بدون نقص',
    refill: 'نعم',
    compensation: 'نعم',
    cancelBtn: 'مُفعّل',
    linkType: 'رابط منشور القناة',
    desc: 'مشاهدات فورية ترفع تفاعل القنوات والمنشورات فور نشرها.'
  },
  {
    id: 'ig_king_followers',
    section: 'رشق إنستغرام',
    title: 'متابعين إنستغرام VIP | ضمان 30 يوم',
    rawUnitPrice: 0.00115,
    rawPer1000: 1.15,
    minQty: 50,
    maxQty: 500000,
    quality: 'حسابات بصور ومنشورات حقيقية',
    speed: '20-50 ألف يومياً',
    guarantee: '30 يوم تعويض تلقائي',
    refill: 'نعم',
    compensation: 'نعم',
    cancelBtn: 'مُفعّل',
    linkType: 'رابط حساب الإنستغرام العام',
    desc: 'متابعين إنستغرام ممتازين لنظام الملك مع سرعة تسليم عالية.'
  },
  {
    id: 'tk_king_followers',
    section: 'رشق تيك توك',
    title: 'متابعين تيك توك | مؤهل للبث المباشر LIVE',
    rawUnitPrice: 0.00150,
    rawPer1000: 1.50,
    minQty: 50,
    maxQty: 200000,
    quality: 'حسابات عربية وأجنبية نشطة',
    speed: 'حتى 30 ألف يومياً',
    guarantee: 'ضمان 30 يوم',
    refill: 'نعم',
    compensation: 'نعم',
    cancelBtn: 'مُفعّل',
    linkType: 'رابط حساب تيك توك',
    desc: 'أفضل خدمة لرفع المتابعين والوصول لشرط فتح البث المباشر (LIVE).'
  }
];

export const PROVIDERS: SmsProvider[] = [
  {
    id: 's1',
    name: '5SIM Global',
    title: '⚡ السيرفر (1) 5SIM العالمي (الأرخص)',
    badge: '5SIM',
    desc: 'أكبر قاعدة بيانات عالمية للأرقام مع أسعار اقتصادية جداً.',
    status: 'active'
  },
  {
    id: 's2',
    name: 'Grizzly SMS',
    title: '🐻 السيرفر (2) Grizzly SMS (أسرع وصول)',
    badge: 'GRIZZLY',
    desc: 'أسرع وصول لأكواد التحقق في ثوانٍ معدودة.',
    status: 'active'
  },
  {
    id: 's3',
    name: 'Hero SMS',
    title: '🌟 السيرفر (3) Hero SMS (الأكثر تنوعاً)',
    badge: 'HERO',
    desc: 'تغطية واسعة للدول النادرة والتطبيقات المتنوعة.',
    status: 'active'
  },
  {
    id: 's4',
    name: 'Plus SMS',
    title: '💎 السيرفر (4) Plus SMS (الاقتصادي)',
    badge: 'PLUS',
    desc: 'خدمة مستقرة وأسعار تنافسية مناسبة للتفعيل المتكرر.',
    status: 'active'
  }
];

export const APPS: ServiceApp[] = [
  { code: 'wa', name: 'واتساب WhatsApp', short: 'WhatsApp', iconName: 'MessageSquare' },
  { code: 'tg', name: 'تيليجرام Telegram', short: 'Telegram', iconName: 'Send' },
  { code: 'ig', name: 'إنستغرام Instagram', short: 'Instagram', iconName: 'Camera' },
  { code: 'fb', name: 'فيسبوك Facebook', short: 'Facebook', iconName: 'Share2' },
  { code: 'tw', name: 'تويتر / X', short: 'Twitter (X)', iconName: 'Twitter' },
  { code: 'lf', name: 'تيك توك TikTok', short: 'TikTok', iconName: 'Video' },
  { code: 'go', name: 'جوجل Google', short: 'Google', iconName: 'Mail' },
  { code: 'sn', name: 'سناب شات Snapchat', short: 'Snapchat', iconName: 'Ghost' },
  { code: 'hj', name: 'حراج Haraj', short: 'Haraj', iconName: 'ShoppingBag' },
  { code: 'im', name: 'إيمو IMO', short: 'IMO', iconName: 'PhoneCall' }
];

export const TOP_COUNTRIES: CountryItem[] = [
  { id: '54', name: 'yemen', title: 'اليمن', flag: '🇾🇪', prefix: '967', defaultRub: 35.0 },
  { id: '53', name: 'saudi', title: 'السعودية', flag: '🇸🇦', prefix: '966', defaultRub: 40.0 },
  { id: '21', name: 'egypt', title: 'مصر', flag: '🇪🇬', prefix: '20', defaultRub: 20.0 },
  { id: '73', name: 'brazil', title: 'البرازيل', flag: '🇧🇷', prefix: '55', defaultRub: 30.0 },
  { id: '0', name: 'russia', title: 'روسيا', flag: '🇷🇺', prefix: '7', defaultRub: 15.0 },
  { id: '187', name: 'usa', title: 'أمريكا', flag: '🇺🇸', prefix: '1', defaultRub: 25.0 },
  { id: '16', name: 'england', title: 'بريطانيا', flag: '🇬🇧', prefix: '44', defaultRub: 22.0 },
  { id: '95', name: 'uae', title: 'الإمارات', flag: '🇦🇪', prefix: '971', defaultRub: 40.0 },
  { id: '52', name: 'iraq', title: 'العراق', flag: '🇮🇶', prefix: '964', defaultRub: 22.0 },
  { id: '116', name: 'jordan', title: 'الأردن', flag: '🇯🇴', prefix: '962', defaultRub: 25.0 }
];
