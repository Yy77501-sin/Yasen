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
  ExternalLink,
  DollarSign,
  Package
} from 'lucide-react';
import { CodeViewer } from './components/CodeViewer';
import { ProfitCalculator } from './components/ProfitCalculator';
import { TelegramBotSimulator } from './components/TelegramBotSimulator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'telegram_bot' | 'calculator' | 'code'>('telegram_bot');
  const [userBalance, setUserBalance] = useState<number>(15.0);

  return (
    <div id="main-container" className="min-h-screen bg-stone-100/60 text-stone-800 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900 font-['Tajawal',sans-serif]">
      {/* Top Header */}
      <header id="app-header" className="border-b border-stone-200/80 bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900 leading-tight">متجر حسابات تيليجرام الجاهزة للتسليم</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  العملة: USD $ موحدة
                </span>
              </div>
              <p className="text-xs text-stone-500">حسابات تيليجرام جاهزة ومفعلة • كود الدخول وكلمة سر 2FA • لوحة إدارة شاملة وقاعدة بيانات SQLite</p>
            </div>
          </div>

          {/* Quick Balance & Support Status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-stone-600 font-medium">تسليم فوري 24/7</span>
            </div>

            <a
              href="https://t.me/Yy77501"
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
              <span>📱 متجر الحسابات الجاهزة ولوحة الإدارة (Telegram Bot)</span>
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
              <span>💰 حاسبة الأرباح والتسعير بالدولار ($)</span>
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
              <span>📄 كود البوت وقاعدة البيانات (Python + SQLite)</span>
            </button>
          </div>

          <div className="text-xs text-stone-500 px-3 py-1 font-mono flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>العملة الوحيدة: <strong className="text-emerald-700">الدولار الأمريكي ($)</strong></span>
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
            <span>نظام المتجر متوافق 100% مع Python Telebot و Render مع قاعدة بيانات SQLite وهيكل التسليم الفوري.</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400 font-mono">
            <span>TELEGRAM READY</span>
            <span>•</span>
            <span>SQLITE DATABASE</span>
            <span>•</span>
            <span>USD ONLY</span>
            <span>•</span>
            <span>AUTO DELIVERY</span>
          </div>
        </div>
      </footer>
    </div>
  );
}