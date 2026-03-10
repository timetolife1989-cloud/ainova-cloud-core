'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const FEATURES = [
  { icon: '👥', title: 'Workforce Management', desc: 'Employee scheduling, attendance tracking, overtime management' },
  { icon: '📦', title: 'Production Tracking', desc: 'Real-time product and batch tracking across the production line' },
  { icon: '🚗', title: 'Fleet Management', desc: 'Vehicle mileage, fuel consumption and fleet operations tracking' },
  { icon: '📊', title: 'Performance KPIs', desc: 'Manufacturing efficiency metrics with target-based analysis' },
  { icon: '📅', title: 'Capacity Planning', desc: 'Production line capacity scheduling and resource allocation' },
  { icon: '🏭', title: 'OEE Dashboard', desc: 'Overall Equipment Effectiveness: Availability × Performance × Quality' },
  { icon: '🔧', title: 'Maintenance', desc: 'Preventive maintenance scheduling, alerts and asset management' },
  { icon: '✅', title: 'Quality Control', desc: 'Inspections, defect tracking, 8D reports and compliance' },
];

const TIERS = [
  {
    name: 'Basic',
    price: '€299',
    features: ['Workforce Management', 'Production Tracking', 'Fleet Management', 'Reports', 'File Import', 'Up to 10 users'],
    color: 'from-gray-700 to-gray-800',
    popular: false,
  },
  {
    name: 'Professional',
    price: '€599',
    features: ['All Basic features', 'Performance KPIs', 'Capacity Planning', 'Delivery Management', 'Inventory Management', 'Up to 50 users'],
    color: 'from-blue-700 to-blue-800',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '€1,199',
    features: ['All Professional features', 'OEE Dashboard', 'Shift Management', 'Quality Control', 'Maintenance', 'Unlimited users', 'AI Assistant', 'PLC Integration'],
    color: 'from-purple-700 to-purple-800',
    popular: false,
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        <motion.div
          className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Next-Generation Manufacturing Management
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
              <span className="bg-gradient-to-r from-blue-400 via-white to-purple-400 bg-clip-text text-transparent">
                Ainova Cloud Core
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              A modular manufacturing management platform that adapts to your business.
              No unnecessary features — only what you truly need.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/setup"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-600/30 transition-all"
              >
                Start Free Trial →
              </a>
              <a
                href="#pricing"
                className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-lg rounded-xl border border-gray-700 transition-all"
              >
                Plans & Pricing
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything a manufacturing company needs</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Modular architecture — pay only for what you use. Expandable anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors group"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-300 transition-colors">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* USPs */}
      <section className="bg-gradient-to-b from-gray-950 to-gray-900 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔒', title: 'On-Premise or Cloud', desc: 'Deploy on your own server (GDPR compliant) or run in the cloud — your choice.' },
              { icon: '🔧', title: 'Zero Hardcode', desc: 'Everything configurable from the admin panel: units, formats, imports, permissions.' },
              { icon: '🌐', title: 'Multi-Language', desc: 'English, Hungarian, German built-in. Custom translations editable from admin.' },
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
                <h3 className="text-xl font-bold mb-2">{usp.title}</h3>
                <p className="text-gray-400">{usp.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-gray-400 text-lg">Fixed monthly fee — no per-user pricing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`relative rounded-2xl p-8 border ${
                tier.popular ? 'border-blue-500 shadow-xl shadow-blue-600/20 scale-105' : 'border-gray-800'
              } bg-gradient-to-b ${tier.color}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  MOST POPULAR
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-extrabold">{tier.price}</span>
                <span className="text-gray-400 text-sm"> €/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-green-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="/setup"
                className={`block w-full text-center py-3 rounded-xl font-semibold transition-colors ${
                  tier.popular
                    ? 'bg-blue-500 hover:bg-blue-400 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                Get Started
              </a>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8">
            Enter your email and try the Basic package free for 30 days.
          </p>
          {submitted ? (
            <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-6 text-green-300">
              ✓ Thank you! We'll be in touch shortly.
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
                Request Demo
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Ainova Cloud Core. Minden jog fenntartva.
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="/login" className="hover:text-gray-300 transition-colors">Sign In</a>
            <a href="/setup" className="hover:text-gray-300 transition-colors">Setup</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
