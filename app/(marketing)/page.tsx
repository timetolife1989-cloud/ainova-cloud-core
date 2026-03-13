'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { LazyNeuronBackground } from '@/components/ui/LazyNeuronBackground';
import { LanguageSwitcher } from '@/components/core/LanguageSwitcher';

export default function LandingPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const FEATURES = [
    { icon: '👥', titleKey: 'landing.feat_workforce', descKey: 'landing.feat_workforce_desc' },
    { icon: '📦', titleKey: 'landing.feat_tracking', descKey: 'landing.feat_tracking_desc' },
    { icon: '🚗', titleKey: 'landing.feat_fleet', descKey: 'landing.feat_fleet_desc' },
    { icon: '📊', titleKey: 'landing.feat_performance', descKey: 'landing.feat_performance_desc' },
    { icon: '📅', titleKey: 'landing.feat_scheduling', descKey: 'landing.feat_scheduling_desc' },
    { icon: '🏭', titleKey: 'landing.feat_oee', descKey: 'landing.feat_oee_desc' },
    { icon: '🔧', titleKey: 'landing.feat_maintenance', descKey: 'landing.feat_maintenance_desc' },
    { icon: '✅', titleKey: 'landing.feat_quality', descKey: 'landing.feat_quality_desc' },
  ];

  const TIERS = [
    {
      nameKey: 'landing.tier_basic',
      price: '€299',
      features: ['landing.feat_workforce', 'landing.feat_tracking', 'landing.feat_fleet', 'reports.title', 'import.title'],
      userLimit: t('landing.tier_up_to_users', { count: 10 }),
      color: 'from-gray-700 to-gray-800',
      popular: false,
    },
    {
      nameKey: 'landing.tier_professional',
      price: '€599',
      features: ['landing.feat_performance', 'landing.feat_scheduling', 'delivery.title', 'inventory.title'],
      userLimit: t('landing.tier_up_to_users', { count: 50 }),
      color: 'from-blue-700 to-blue-800',
      popular: true,
    },
    {
      nameKey: 'landing.tier_enterprise',
      price: '€1,199',
      features: ['landing.feat_oee', 'shift.title', 'landing.feat_quality', 'landing.feat_maintenance'],
      userLimit: t('landing.tier_unlimited_users'),
      color: 'from-purple-700 to-purple-800',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Neuron animated background */}
      <LazyNeuronBackground nodeCount={80} connectionDistance={200} overlayOpacity={0.92} />

      {/* Top nav bar */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ACI
          </span>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
              {t('landing.footer_signin')}
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-14">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {t('landing.badge')}
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-white to-purple-400 bg-clip-text text-transparent">
                {t('landing.hero_title')}
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              {t('landing.hero_subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/setup"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/30 transition-all"
              >
                {t('landing.cta_trial')}
              </a>
              <a
                href="#pricing"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-lg rounded-xl border border-gray-700 transition-all"
              >
                {t('landing.cta_pricing')}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.features_title')}</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('landing.features_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors group"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-300 transition-colors">{t(f.titleKey)}</h3>
              <p className="text-gray-500 text-sm">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* USPs */}
      <section className="bg-gradient-to-b from-gray-950 to-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔒', titleKey: 'landing.usp_premise', descKey: 'landing.usp_premise_desc' },
              { icon: '🔧', titleKey: 'landing.usp_config', descKey: 'landing.usp_config_desc' },
              { icon: '🌐', titleKey: 'landing.usp_lang', descKey: 'landing.usp_lang_desc' },
            ].map((usp, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-4xl mb-4">{usp.icon}</div>
                <h3 className="text-xl font-bold mb-2">{t(usp.titleKey)}</h3>
                <p className="text-gray-400">{t(usp.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.pricing_title')}</h2>
          <p className="text-gray-400 text-lg">{t('landing.pricing_subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <motion.div
              key={tier.nameKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`relative rounded-2xl p-8 border ${
                tier.popular ? 'border-blue-500 shadow-xl shadow-blue-600/20 scale-105' : 'border-gray-800'
              } bg-gradient-to-b ${tier.color}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  {t('landing.tier_popular')}
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{t(tier.nameKey)}</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{tier.price}</span>
                <span className="text-gray-400 text-sm"> €{t('landing.tier_per_month')}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {t(f)}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-400">✓</span> {tier.userLimit}
                </li>
              </ul>
              <a
                href="/setup"
                className={`block w-full text-center py-3 rounded-xl font-semibold transition-colors ${
                  tier.popular
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {t('landing.tier_cta')}
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('landing.cta_title')}</h2>
          <p className="text-gray-400 mb-8">
            {t('landing.cta_subtitle')}
          </p>
          {submitted ? (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6 text-green-300">
              ✓ {t('landing.cta_thanks')}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@company.com"
                className="px-5 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full sm:w-80"
              />
              <button
                onClick={() => { if (email.includes('@')) setSubmitted(true); }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
              >
                {t('landing.cta_demo')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Ainova Cloud Intelligence. {t('landing.footer_rights')}
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="/login" className="hover:text-gray-300 transition-colors">{t('landing.footer_signin')}</a>
            <a href="/setup" className="hover:text-gray-300 transition-colors">{t('landing.footer_setup')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
