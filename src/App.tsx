/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, 
  Smartphone, 
  FileCode, 
  Calculator, 
  ShieldCheck, 
  Zap, 
  Sparkles,
  Server,
  Users,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { KingSmmSimulator } from './components/KingSmmSimulator';
import { NumberSmsSimulator } from './components/NumberSmsSimulator';
import { CodeViewer } from './components/CodeViewer';
import { ProfitCalculator } from './components/ProfitCalculator';
import { TelegramBotSimulator } from './components/TelegramBotSimulator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'telegram_bot' | 'king_smm' | 'sms_numbers' | 'code' | 'calculator'>('telegram_bot');
  const [userBalance, setUserBalance] = useState<number>(10.0);

  return (
    <div id="main-container" className="min-h-screen bg-stone-100/60 text-stone-800 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {/* Top Header */}
      <header id="app-header" className="border-b border-stone-200/80 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 leading-tight">Number SMS & King SMM Bot</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  30% هامش ربح
                </span>
              </div>
              <p className="text-xs text-stone-500">نظام الملك للرشق • الأرقام الوهمية (4 سيرفرات) • إدارة وتحديث الطلبات</p>
            </div>
          </div>

          {/* Quick Balance & Support Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-stone-600 font-medium">السيرفرات متصلة 24/7</span>
            </div>

            <a
              href="https://t.me/Yas_in7"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white transition-all shadow-xs"
            >
              <span>الدعم الفني</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="app-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="bg-white border border-stone-200 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('telegram_bot')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'telegram_bot'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>📱 محاكي البوت والقائمة (Telegram)</span>
            </button>

            <button
              onClick={() => setActiveTab('king_smm')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'king_smm'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span>👑 نظام الملك للرشق</span>
            </button>

            <button
              onClick={() => setActiveTab('sms_numbers')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'sms_numbers'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>☎️ أرقام السيرفرات الأربعة</span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'calculator'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>💰 حاسبة الأرباح (30%)</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>📄 كود البوت للنشر (Render)</span>
            </button>
          </div>

          <div className="text-xs text-stone-500 px-3 py-1 font-mono">
            هوامش الربح: <span className="text-emerald-700 font-bold">+30% تلقائياً</span>
          </div>
        </div>

        {/* Tab Contents with Animations */}
        <AnimatePresence mode="wait">
          {activeTab === 'telegram_bot' && (
            <motion.div
              key="telegram_bot"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TelegramBotSimulator userBalance={userBalance} setUserBalance={setUserBalance} />
            </motion.div>
          )}

          {activeTab === 'king_smm' && (
            <motion.div
              key="king_smm"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <KingSmmSimulator userBalance={userBalance} setUserBalance={setUserBalance} />
            </motion.div>
          )}

          {activeTab === 'sms_numbers' && (
            <motion.div
              key="sms_numbers"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <NumberSmsSimulator userBalance={userBalance} setUserBalance={setUserBalance} />
            </motion.div>
          )}

          {activeTab === 'calculator' && (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ProfitCalculator />
            </motion.div>
          )}

          {activeTab === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CodeViewer />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer id="app-footer" className="border-t border-stone-200 bg-white py-4 text-xs text-stone-500 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام البوت متوافق 100% مع معايير Render و Telegram API مع هامش ربح 30% محمي.</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400 font-mono">
            <span>5SIM</span>
            <span>•</span>
            <span>GRIZZLY</span>
            <span>•</span>
            <span>HERO</span>
            <span>•</span>
            <span>PLUS SMM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


