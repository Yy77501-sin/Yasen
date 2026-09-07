import React, { useState, useEffect } from 'react';
يستورد {
  ينسخ،
  يفحص،
  رمز الملف،
  صالة،
  مثلث التنبيه،
  ArrowDownToLine,
  أرشيف المجلدات،
  رابط خارجي،
  بريق
} من 'lucide-react'؛
استورد JSZip من 'jszip'؛

واجهة معلومات ملف الكود {
  الاسم: سلسلة نصية؛
  الوصف: سلسلة نصية؛
  عنوان URL: سلسلة نصية؛
  githubPath: سلسلة نصية؛
}

const FILES_META: Record<string, CodeFileInfo> = {
  قاعدة البيانات: {
    الاسم: 'database.py'،
    desc: 'قاعدة بيانات SQLite الشاملة: جداول المستخدمين، المنتجات، المخزون، الطلبات، الشحن بالدولار، الكوبونات وتعويض المخالفات.',
    عنوان URL: '/bot_files/database.py',
    مسار GitHub: 'bot_files/database.py'
  },
  رئيسي: {
    الاسم: 'main.py'،
    desc: 'المحرك الشامل للبوت: البنك الأمين العام للتسليم للرصيد بالدولار ($)، رمز الدخول والضمان، ولوحة الإدارة بالكامل.',
    عنوان URL: '/bot_files/main.py',
    مسار GitHub: 'bot_files/main.py'
  },
  التكوين: {
    الاسم: 'config.py'،
    desc: 'إعدادات المفاتيح والتوكن، الدعم، التجريبية الموحدة (USD $).',
    عنوان URL: '/bot_files/config.py',
    مسار GitHub: 'bot_files/config.py'
  },
  متطلبات: {
    الاسم: 'requirements.txt'،
    desc: 'المكتبات المطلوبة لتشغيل البوت على Render.',
    عنوان URL: '/bot_files/requirements.txt',
    مسار GitHub: 'bot_files/requirements.txt'
  },
  ملف تعريف العملية: {
    الاسم: 'Procfile'،
    desc: 'ملف أوامر التشغيل المخصص لخدمة العامل في Render و Heroku.',
    عنوان URL: '/bot_files/Procfile',
    مسار GitHub: 'Procfile'
  },
  وقت التشغيل: {
    الاسم: 'runtime.txt'،
    desc: 'تحديد إصدار Python 3.11 مؤهل على السيرفر.',
    عنوان URL: '/bot_files/runtime.txt',
    مسار GitHub: 'runtime.txt'
  }
};

export const CodeViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'main' | 'providers' | 'catalog' | 'config' | 'requirements' | 'procfile' | 'runtime'>('main');
  const [copied, setCopied] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [zipping, setZipping] = useState<boolean>(false);

  useEffect(() => {
    const fetchAllFiles = async () => {
      setLoading(true);
      const contents: Record<string, string> = {};
      for (const [key, meta] of Object.entries(FILES_META)) {
        يحاول {
          const res = await fetch(meta.url);
          إذا كانت النتيجة صحيحة {
            contents[key] = await res.text();
          } آخر {
            contents[key] = '# تعذر جلب محتوى الملف';
          }
        } يمسك {
          contents[key] = '# خطأ في قراءة الملف';
        }
      }
      setFileContents(contents);
      setLoADing(false);
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

  const handleDownloadAllZip = async () => {
    setZipping(true);
    يحاول {
      const zip = new JSZip();
      const botFolder = zip.folder('bot_files');

      // إضافة ملفات
      for (const [key, meta] of Object.entries(FILES_META)) {
        const content = fileContents[key] || '';
        إذا كان (المفتاح === 'procfile' || المفتاح === 'runtime') {
          // ضع ملفات الجذر في الجذر
          zip.file(meta.name, content);
          إذا كان (botFolder) botFolder.file(meta.name, content);
        } آخر {
          إذا كان (botFolder) botFolder.file(meta.name, content);
        }
      }

      // أضف ملف README.md
      const readmeText = `# Number SMS & King SMM Telegram Bot
نظام وجبات لوعاء زجاج الوهمية (4 سيرفرات) وخدمات الرشق (نظام الملك).

## طريقة التشغيل على الرندر:
1. رفع المجلد \`bot_files\` إلى مستودعك على GitHub.
2. أنشئ خدمة ويب أو عامل خلفية في Render.
3. أمر البناء: \`pip install -r requires.txt\` أو \`pip install -r bot_files/requirements.txt\`
4. أمر المبتدئ: \`python bot_files/main.py\` أو \`python main.py\`
5. إضافة متغيرات البيئة (BOT_TOKEN، ADMIN_ID، إلخ.) في قسم البيئة.
`;
      zip.file('README.md', readmeText);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'number_sms_king_smm_bot.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('فشل إنشاء ملف مضغوط', err);
      تنبيه('تعذر ملف ZIP، يرجى تحميل ملفات التجميع فرديًا.');
    } أخيراً {
      setZipping(false);
    }
  };

  يعود (
    <div className="space-y-5">
      {/* تنبيه تحذيري */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-sm block text-amber-950 mb-0.5">
            لماذا لم تشمل شيئا في تيليجرام حتى الآن؟
          </strong>
          موقع <strong>Render</strong> متصل بمستودعك على GitHub، وهو يسمح بملفات GitHub القديمة. لظهور كل التحديثات في تيليجرام، يجب استبدال ملفي <code className="bg-amber-100/80 px-1.5 py-0.5 rounded Font-monofont-bold">bot_files/main.py</code> و <code className="bg-amber-100/80 px-1.5 py-0.5 rounded Font-mono Font-bold">bot_files/catalog.py</code> في مستودعك، ثم إرسال أمر <code className="bg-amber-100/80 px-1.5 py-0.5 rounded Font-monofont-bold">/start</code> في تيليجرام.
        </div>
      </div>

      {/* شريط الإجراءات */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200">
        <div className="flex flex-wrap items-center gap-2">
          {(['main', 'catalog', 'config', 'requirements', 'procfile', 'runtime'] as const).map(tabKey => (
            زر
              المفتاح={مفتاح الجدولة}
              onClick={() => setActiveTab(tabKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                علامة التبويب النشطة === مفتاح علامة التبويب
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{FILES_META[tabKey].name}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* زر تنزيل الملف المضغوط الكامل */}
          زر
            onClick={handleDownloadAllZip}
            معطل={ضغط الملفات}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="تحميل مجلد البوت كاملاً مع كل الملفات بصيغة ZIP"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>{الضغط ؟ 'جاري ضغط الملفات...' : '📦 تحميل المشروع كاملاً (ZIP)'}</span>
          </button>

          {/* زر التنزيل المباشر */}
          <a
            href={currentMeta.url}
            download={currentMeta.name}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-stone-300 shadow-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-stone-700" />
            <span>تحميل {currentMeta.name}</span>
          </a>

          {/* زر النسخ */}
          زر
            onClick={() => handleCopy(currentcode)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            {copied === activeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{نسخ === activeTab ؟ 'تم النسخ!' : `نسخة الكود ${currentMeta.name}`}</span>
          </button>
        </div>
      </div>

      {/* منطقة عرض الكود */}
      <div className="bg-stone-950 text-stone-200 rounded-2xl border border-stone-800 p-5 font-mono text-xs overflow-hidden shadow-md">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-stone-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white">{currentMeta.name}</span>
            <span>(مساره في GitHub: <code className="text-amber-300font-bold">{currentMeta.githubPath}</code>)</span>
          </div>
          <p className="text-stone-400 font-sans hidden sm:block">{currentMeta.desc}</p>
        </div>

        <pre className="mt-4 p-4 bg-stone-900/60 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-h-[500px]">
          <كود>{جاري التحميل؟ 'جاري تحميل الكود...' : currentCode</code>
        </pre>
      </div>

      {/* دليل من 3 خطوات */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 text-xs text-stone-700 space-y-3">
        <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
          🚀 الخطوات الثلاثة البسيطة لتحديث البوت على GitHub:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-stone-900">1. حمل أو انسخ الملف</div>
            <p className="text-stone-600 text-[11px]">
              انقر على الزر <strong>تحميل main.py</strong> بالأعلى أو ينسخ الكود بالكامل.
            </p>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-stone-900">2. تم استبداله في GitHub</div>
            <p className="text-stone-600 text-[11px]">
              ادخل لمستودعك على GitHub داخل مقلمة <code className="bg-stone-200 px-1 rounded">bot_files/main.py</code> واضغط تعديل ✏️ ثم احفظ.
            </p>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-bold text-stone-900">3. أرسل /ابدأ في تيليجرام</div>
            <p className="text-stone-600 text-[11px]">
              بعد أن يكمل Render البناء، دخول الدخول البوت وأرسل له <code className="bg-stone-200 px-1 rounded">/start</code> لتظهر الواجهات الجديدة فوراً.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};