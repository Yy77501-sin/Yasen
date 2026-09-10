import React, { useState } from 'react';
import { 
  FolderDown, 
  Terminal, 
  Bot, 
  FileCode2, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Play, 
  Server, 
  Database,
  Smartphone,
  Send,
  Sparkles,
  ChevronRight,
  Code,
  FileText
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'simulator' | 'webapp'>('overview');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const projectFiles = [
    { name: "src/index.js", path: "src/index.js", desc: "محرك البوت الرئيسي وخادم Express و Webhook", size: "68.7 KB", type: "js" },
    { name: "src/config/index.js", path: "src/config/index.js", desc: "إعدادات المتغيرات وتوكن البوت والمعرفات", size: "2.4 KB", type: "js" },
    { name: "src/keyboards/mainMenuKeyboard.js", path: "src/keyboards/mainMenuKeyboard.js", desc: "لوحة مفاتيح القائمة الرئيسية والأزرار الكاملة", size: "8.9 KB", type: "js" },
    { name: "src/constants/smmServices.js", path: "src/constants/smmServices.js", desc: "كتالوج خدمات الرشق والتزويد ومنصات التواصل", size: "11.5 KB", type: "js" },
    { name: "src/constants/grizzly.js", path: "src/constants/grizzly.js", desc: "قائمة سيرفرات وتفعيلات أرقام SMS و Grizzly", size: "8.2 KB", type: "js" },
    { name: "src/constants/gameTopupCatalog.js", path: "src/constants/gameTopupCatalog.js", desc: "كتالوج شحن الألعاب (ببجي، فري فاير، إلخ)", size: "21.8 KB", type: "js" },
    { name: "src/constants/tempEmailCatalog.js", path: "src/constants/tempEmailCatalog.js", desc: "خدمة الإيميلات المؤقتة واستقبال الرسائل", size: "5.3 KB", type: "js" },
    { name: "src/services/proAccountsFlowService.js", path: "src/services/proAccountsFlowService.js", desc: "إدارة متجر الحسابات الجاهزة وحسابات Pro", size: "43.5 KB", type: "js" },
    { name: "src/services/virtualNumbersFlowService.js", path: "src/services/virtualNumbersFlowService.js", desc: "نظام شراء وتفعيل الأرقام الافتراضية المباشر", size: "66.0 KB", type: "js" },
    { name: "src/services/cloudServicesFlowService.js", path: "src/services/cloudServicesFlowService.js", desc: "الخدمات السحابية وفيزا كارد الافتراضية", size: "30.8 KB", type: "js" },
    { name: "src/services/topupService.js", path: "src/services/topupService.js", desc: "نظام شحن الرصيد والتحقق (بينانس، جيب، فودافون)", size: "21.9 KB", type: "js" },
    { name: "src/webapp/vaultx-app.html", path: "src/webapp/vaultx-app.html", desc: "تطبيق الويب المصغر التفاعلي (Telegram WebApp)", size: "38.6 KB", type: "html" },
    { name: "bot_config.json", path: "bot_config.json", desc: "ملف إعدادات بوابات الشحن والعملات", size: "697 B", type: "json" },
    { name: "package.json", path: "package.json", desc: "حزم التبعيات (node-telegram-bot-api, axios, etc)", size: "520 B", type: "json" },
    { name: "render.yaml", path: "render.yaml", desc: "مخطط النشر التلقائي المباشر على Render Blueprint", size: "240 B", type: "yaml" },
    { name: ".env.example", path: ".env.example", desc: "نموذج مفاتيح البيئة لربط البوت", size: "994 B", type: "env" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">بوت وتطبيق VaultX Pro</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ملفات أصلية مستبدلة 100%
                </span>
              </div>
              <p className="text-xs text-slate-400">Node.js • Telegram Bot API • WebApp • نظام متكامل للخدمات والأرقام</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/bot_code.zip"
              download="BOOOT.zip"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <FolderDown className="w-4 h-4" />
              <span>تحميل مجلد البوت كاملاً (ZIP)</span>
            </a>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>نظرة عامة والتشغيل</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>ملفات البوت الأصلية ({projectFiles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'simulator'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>معاينة واجهة وقوائم البوت</span>
          </button>
          <button
            onClick={() => setActiveTab('webapp')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'webapp'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>تطبيق الويب (VaultX WebApp)</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: OVERVIEW & RUNNING INSTRUCTIONS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-emerald-300 text-sm">تم حذف جميع ملفات البوت القديمة واستبدالها بالملفات الأصلية بنجاح!</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تم فك ضغط ملف <code>BOOOT.zip</code> ووضع كافة الحزم والملفات البرمجية الأصلية دون أي تعديل عليها نهائياً داخل مجلد <code>bot_files</code> وتجهيز نسخة التحميل المباشرة.
                  </p>
                </div>
              </div>
              <a
                href="/bot_code.zip"
                download="BOOOT.zip"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition"
              >
                <FolderDown className="w-4 h-4" />
                تحميل الحزمة الأصلية الكاملة (ZIP)
              </a>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  بيئة البوت
                </div>
                <div className="text-sm font-bold text-white">Node.js (v20+)</div>
                <div className="text-[11px] text-slate-500 mt-1">يعتمد على node-telegram-bot-api</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  قواعد البيانات
                </div>
                <div className="text-sm font-bold text-white">JSON Storage System</div>
                <div className="text-[11px] text-slate-500 mt-1">users, transactions, config, store</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                  واجهة WebApp
                </div>
                <div className="text-sm font-bold text-white">VaultX Pro App</div>
                <div className="text-[11px] text-slate-500 mt-1">تطبيق مصغر متكامل داخل تيليجرام</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="text-slate-400 text-xs flex items-center gap-1.5 mb-1">
                  <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  النشر السحابي
                </div>
                <div className="text-sm font-bold text-white">Render Blueprint جاهز</div>
                <div className="text-[11px] text-slate-500 mt-1">ملف render.yaml مهيأ تلقائياً</div>
              </div>
            </div>

            {/* How to Run Section */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                طريقة تشغيل البوت على جهازك أو سيرفرك
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-200">1. فك الضغط وتثبيت الحزم البرمجية:</span>
                    <button
                      onClick={() => copyToClipboard("npm install", "c1")}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {copiedCmd === "c1" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedCmd === "c1" ? "تم النسخ" : "نسخ الأمر"}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto">
                    npm install
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-200">2. إعداد ملف المتغيرات (.env):</span>
                    <button
                      onClick={() => copyToClipboard("cp .env.example .env", "c2")}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {copiedCmd === "c2" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedCmd === "c2" ? "تم النسخ" : "نسخ الأمر"}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-cyan-300 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto">
                    cp .env.example .env
                  </pre>
                  <p className="text-[11px] text-slate-400 mt-2">
                    ضع توكن البوت <code>BOT_TOKEN</code> والآيدي الخاص بك <code>ADMIN_IDS</code> ومفاتيح Grizzly و Hero SMS داخل ملف <code>.env</code>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-slate-200">3. تشغيل البوت:</span>
                    <button
                      onClick={() => copyToClipboard("npm start", "c3")}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                    >
                      {copiedCmd === "c3" ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedCmd === "c3" ? "تم النسخ" : "نسخ الأمر"}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto">
                    npm start
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORIGINAL FILES LIST */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">ملفات المشروع الأصلية المستخرجة</h3>
                <p className="text-xs text-slate-400 mt-0.5">تم الحفظ والاستبدال لملفات مشروع <code>BOOOT</code> بدقة كاملة</p>
              </div>
              <a
                href="/bot_code.zip"
                download="BOOOT.zip"
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <FolderDown className="w-4 h-4" />
                تحميل الملفات (ZIP)
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projectFiles.map((f, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      {f.type === 'js' ? <Code className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-200">{f.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    {f.size}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: TELEGRAM BOT SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="max-w-lg mx-auto bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Simulator Header */}
            <div className="p-3.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-white text-xs">
                  VX
                </div>
                <div>
                  <div className="text-xs font-bold text-white">VaultX Pro Bot</div>
                  <div className="text-[10px] text-emerald-400">متصل (Online)</div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">@vaultx_bot</span>
            </div>

            {/* Chat Body */}
            <div className="p-4 space-y-4 min-h-[420px] bg-gradient-to-b from-slate-950 to-slate-900/90 text-xs">
              {/* Bot Message */}
              <div className="p-3.5 rounded-2xl rounded-tr-none bg-slate-800/80 border border-slate-700/60 text-slate-200 leading-relaxed max-w-[90%]">
                <div className="font-bold text-cyan-400 mb-1">مرحباً بك في بوت VaultX Pro 💎</div>
                منصتك المتكاملة للخدمات الرقمية، الأرقام الوهمية، وشحن الألعاب وحسابات Pro بأسعار مميزة.
                <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                  <span>💰 الرصيد: 0.00 RUB</span>
                  <span>🆔 المعرف: 8097770003</span>
                </div>
              </div>

              {/* Bot Keyboards Layout matching getMainMenuKeyboard */}
              <div className="space-y-1.5 pt-2">
                <button className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5">
                  📱 الأرقام الوهمية
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    🚀 رشق الحسابات
                  </button>
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    🎮 شحن الألعاب
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    👥 حسابات سوشيال
                  </button>
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    💎 حسابات Pro
                  </button>
                </div>

                <button className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5">
                  ☁️ خدمات سحابية
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    💳 فيزا افتراضية
                  </button>
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    📧 إيميلات مؤقتة
                  </button>
                </div>

                <button className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5">
                  🧩 خدمات أخرى
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button className="py-2.5 px-3 rounded-xl bg-emerald-600/80 hover:bg-emerald-500/80 border border-emerald-500/60 text-white font-bold text-xs transition flex items-center justify-center gap-1">
                    💰 شحن حسابي
                  </button>
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    🔁 تحويل الرصيد
                  </button>
                </div>

                <button className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5">
                  👤 حسابي
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    🎁 الإحالة
                  </button>
                  <button className="py-2.5 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1">
                    🛟 الدعم
                  </button>
                </div>

                <button className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-1.5">
                  🚀 فتح تطبيق VaultX Pro WebApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WEBAPP PREVIEW */}
        {activeTab === 'webapp' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">تطبيق الويب المصغر (VaultX Pro Telegram WebApp)</h3>
                <p className="text-xs text-slate-400 mt-0.5">الملف الأصلي موجود داخل <code>src/webapp/vaultx-app.html</code></p>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
                HTML5 + Tailwind CSS + Telegram WebApp SDK
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="max-w-md mx-auto rounded-xl border border-slate-700/70 p-4 bg-[#05070d] text-slate-100 space-y-4 font-['Cairo',sans-serif]">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">VX</div>
                    <span className="font-bold text-sm">VaultX Pro</span>
                  </div>
                  <span className="text-xs text-amber-400 font-mono">0.00 ₽</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-slate-400 text-[10px]">الطلبات</div>
                    <div className="font-bold text-sm mt-0.5">0</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                    <div className="text-slate-400 text-[10px]">الرصيد النشط</div>
                    <div className="font-bold text-sm mt-0.5 text-emerald-400">0.00 $</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                    <span>📱 تفعيل الأرقام والرسائل</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                    <span>🚀 خدمات الرشق والتزويد</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                    <span>🎮 شحن الألعاب المباشر</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                    <span>💳 شحن الرصيد الفوري</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
