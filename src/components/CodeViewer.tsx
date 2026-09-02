import React, { useState } from 'react';
import { Copy, Check, FileCode, Download, ExternalLink, Terminal } from 'lucide-react';

interface CodeFile {
  name: string;
  desc: string;
  path: string;
  code: string;
}

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'main' | 'catalog' | 'config' | 'requirements'>('main');
  const [copied, setCopied] = useState<string | null>(null);

  const files: Record<string, CodeFile> = {
    main: {
      name: 'main.py',
      desc: 'المحرك الشامل للبوت: نظام الملك للرشق مع خطوات التأكيد والتحديث، وسيرفرات الأرقام الأربعة، ونظام الأرباح 30%.',
      path: '/bot_files/main.py',
      code: `# تم تجهيز الكود بالكامل في bot_files/main.py
# يتضمن:
# 1. نظام الملك الكامل للرشق مع شاشات الرابط، الكمية، الفاتورة، والإيصال مع زر [🔄 تحديث الطلب]
# 2. احتساب هامش ربح 30% تلقائياً لجميع السيرفرات والأرقام
# 3. دعم كامل للأدمن والتحويل المجاني والشحن التلقائي
# يمكنك تحميل الملف أو نسخه مباشرة.`
    },
    catalog: {
      name: 'catalog.py',
      desc: 'كتالوج خدمات الرشق (نظام الملك) مع سعر بلاس 0.000271$ وكتالوج الدول والسيرفرات.',
      path: '/bot_files/catalog.py',
      code: `# تم تجهيز الكود بالكامل في bot_files/catalog.py
# يتضمن بيانات خدمات تيليجرام، إنستغرام، تيك توك، وببجي
# مع مواصفات نظام الملك الدقيقة.`
    },
    config: {
      name: 'config.py',
      desc: 'إعدادات المفاتيح، التوكن، PROFIT_MARGIN = 0.30، وسعر الصرف 1$ = 30 روبل.',
      path: '/bot_files/config.py',
      code: `import os

BOT_TOKEN = os.getenv("BOT_TOKEN", "8998307482:AAHlUFDu0E_0ltdVQVEGQ5z2pats24kK3rU").strip()
ADMIN_ID = str(os.getenv("ADMIN_ID", "8097770003")).strip()
SUPPORT_USERNAME = os.getenv("SUPPORT_USERNAME", "Yas_in7").strip()
CURRENCY = "$"

# هامش الربح المعتمد: 30% فوق سعر المزود تلقائياً
PROFIT_MARGIN = 0.30

# سعر الصرف: 1 دولار = 30 روبل
RUB_PER_USD = 30.0

# مفاتيح مزودي الأرقام والسيرفرات
FIVESIM_JWT_TOKEN = os.getenv("FIVESIM_JWT_TOKEN", "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9...").strip()
GRIZZLY_API_KEY = os.getenv("GRIZZLY_API_KEY", "15a9f459b5a5e02cc330ae0d66399e2b").strip()
HERO_SMS_API_KEY = os.getenv("HERO_SMS_API_KEY", "67ef5b751b1A4f2bef57dAd7bA2A248c").strip()
PLUS_API_KEY = os.getenv("PLUS_API_KEY", "PLUS-6c3caa402169433bb15ae1a7").strip()
PLUS_API_URL = os.getenv("PLUS_API_URL", "https://sms-plus.net/stubs/handler_api.php").strip()

MAIN_CHANNEL_URL = os.getenv("MAIN_CHANNEL_URL", "https://t.me/Yas_in7").strip()
INSTRUCTIONS_CHANNEL_URL = os.getenv("INSTRUCTIONS_CHANNEL_URL", "https://t.me/Yas_in7").strip()
ACTIVATION_CHANNEL_ID = os.getenv("ACTIVATION_CHANNEL_ID", "").strip()
`
    },
    requirements: {
      name: 'requirements.txt',
      desc: 'المكتبات المطلوبة لتشغيل البوت على Render أو VPS.',
      path: '/bot_files/requirements.txt',
      code: `pyTelegramBotAPI>=4.26.0
requests>=2.32.0
urllib3>=2.0.0
`
    }
  };

  const currentFile = files[activeTab];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(activeTab);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200">
        <div className="flex items-center gap-2">
          {(['main', 'catalog', 'config', 'requirements'] as const).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tabKey
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{files[tabKey].name}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => handleCopy(currentFile.code)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
        >
          {copied === activeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied === activeTab ? 'تم النسخ!' : `نسخ ${currentFile.name}`}</span>
        </button>
      </div>

      {/* Code Display Area */}
      <div className="bg-stone-950 text-stone-200 rounded-2xl border border-stone-800 p-5 font-mono text-xs overflow-hidden shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-stone-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">{currentFile.name}</span>
            <span>({currentFile.path})</span>
          </div>
          <p className="text-stone-400 font-sans hidden sm:block">{currentFile.desc}</p>
        </div>

        <pre className="mt-4 p-4 bg-stone-900/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-h-[450px]">
          <code>{currentFile.code}</code>
        </pre>
      </div>

      {/* Instructions for Render / Server deployment */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-2">
        <h4 className="font-bold text-stone-900 flex items-center gap-2">
          🚀 خطوات تحديث البوت على Render أو GitHub:
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-stone-600 leading-relaxed pr-2">
          <li>انسخ محتويات <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">config.py</code> و <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">catalog.py</code> و <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">main.py</code> مباشرة إلى مستودعك.</li>
          <li>تأكد من وجود <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">PROFIT_MARGIN = 0.30</code> لتطبيق هامش الربح 30% تلقائياً.</li>
          <li>على Render، اضغط <strong>Manual Deploy</strong> ثم <strong>Deploy latest commit</strong> لتفعيل نظام الملك الجديد فوراً.</li>
        </ol>
      </div>
    </div>
  );
};
