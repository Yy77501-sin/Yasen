import React, { useState } from 'react';
import { Copy, Check, FileCode, Download, ExternalLink, Terminal } from 'lucide-react';

import React, { useState, useEffect } from 'react';
import { Copy, Check, FileCode, Download, ExternalLink, Terminal, AlertTriangle, ArrowDownToLine } from 'lucide-react';

interface CodeFileInfo {
  name: string;
  desc: string;
  url: string;
  githubPath: string;
}

const FILES_META: Record<string, CodeFileInfo> = {
  main: {
    name: 'main.py',
    desc: 'المحرك الشامل للبوت: نظام الملك للرشق، زر [🔄 تحديث الطلب]، سيرفرات الأرقام الأربعة، وهامش ربح 30% محمي.',
    url: '/bot_files/main.py',
    githubPath: 'bot_files/main.py'
  },
  catalog: {
    name: 'catalog.py',
    desc: 'كتالوج خدمات الرشق (نظام الملك) مع سعر 0.000271$ وكتالوج الدول والسيرفرات.',
    url: '/bot_files/catalog.py',
    githubPath: 'bot_files/catalog.py'
  },
  config: {
    name: 'config.py',
    desc: 'إعدادات المفاتيح، التوكن، PROFIT_MARGIN = 0.30، وسعر الصرف 1$ = 30 روبل.',
    url: '/bot_files/config.py',
    githubPath: 'bot_files/config.py'
  },
  requirements: {
    name: 'requirements.txt',
    desc: 'المكتبات المطلوبة لتشغيل البوت على Render.',
    url: '/bot_files/requirements.txt',
    githubPath: 'bot_files/requirements.txt'
  }
};

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'main' | 'catalog' | 'config' | 'requirements'>('main');
  const [copied, setCopied] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAllFiles = async () => {
      setLoading(true);
      const contents: Record<string, string> = {};
      for (const [key, meta] of Object.entries(FILES_META)) {
        try {
          const res = await fetch(meta.url);
          if (res.ok) {
            contents[key] = await res.text();
          } else {
            contents[key] = '# تعذر جلب محتوى الملف';
          }
        } catch {
          contents[key] = '# خطأ في قراءة الملف';
        }
      }
      setFileContents(contents);
      setLoading(false);
    };

    fetchAllFiles();
  }, []);

  const currentMeta = FILES_META[activeTab];
  const currentCode = fileContents[activeTab] || 'جاري التحميل...';

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(activeTab);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Alert Warning */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-sm block text-amber-950 mb-0.5">
            لماذا لم يتغير شيء في تيليجرام حتى الآن؟
          </strong>
          موقع <strong>Render</strong> متصل بمستودعك على GitHub، وهو يقوم بتشغيل ملفات GitHub القديمة. لتظهر كل التحديثات في تيليجرام، يجب استبدال ملفي <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold">bot_files/main.py</code> و <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold">bot_files/catalog.py</code> في مستودعك، ثم إرسال أمر <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono font-bold">/start</code> في تيليجرام.
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200">
        <div className="flex flex-wrap items-center gap-2">
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
              <span>{FILES_META[tabKey].name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Download Button */}
          <a
            href={currentMeta.url}
            download={currentMeta.name}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-stone-300 shadow-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-stone-700" />
            <span>تحميل {currentMeta.name} للجهاز</span>
          </a>

          {/* Copy Button */}
          <button
            onClick={() => handleCopy(currentCode)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            {copied === activeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied === activeTab ? 'تم النسخ بنجاح!' : `نسخ كود ${currentMeta.name}`}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="bg-stone-950 text-stone-200 rounded-2xl border border-stone-800 p-5 font-mono text-xs overflow-hidden shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-stone-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">{currentMeta.name}</span>
            <span>(مساره في GitHub: <code className="text-amber-300 font-bold">{currentMeta.githubPath}</code>)</span>
          </div>
          <p className="text-stone-400 font-sans hidden sm:block">{currentMeta.desc}</p>
        </div>

        <pre className="mt-4 p-4 bg-stone-900/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-h-[500px]">
          <code>{loading ? 'جاري تحميل الكود...' : currentCode}</code>
        </pre>
      </div>

      {/* 3 Steps Guide */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-3">
        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          🚀 الخطوات الثلاث البسيطة لتحديث البوت على GitHub:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-stone-900">1. حمل أو انسخ الملف</div>
            <p className="text-stone-600 text-[11px]">
              اضغط على زر <strong>تحميل main.py</strong> بالأعلى أو انسخ الكود بالكامل.
            </p>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-stone-900">2. استبدله في GitHub</div>
            <p className="text-stone-600 text-[11px]">
              ادخل لمستودعك على GitHub داخل مجلد <code className="bg-stone-200 px-1 rounded">bot_files/main.py</code> واضغط تعديل ✏️ ثم احفظ.
            </p>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-stone-900">3. أرسل /start في تيليجرام</div>
            <p className="text-stone-600 text-[11px]">
              بعد أن يكمل Render البناء، افتح محادثة البوت وأرسل له <code className="bg-stone-200 px-1 rounded">/start</code> لتظهر الواجهات الجديدة فوراً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
