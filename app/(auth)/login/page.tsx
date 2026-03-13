'use client';

import { LoginContainer } from '@/components/login/LoginContainer';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="relative w-full max-w-md px-6">
      {/* Background effects matching landing page */}
      <motion.div
        className="fixed top-20 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="fixed bottom-20 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      {/* Logo */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <motion.div
          className="relative w-16 h-16"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <div className="absolute inset-0 rounded-lg bg-blue-600 opacity-80" style={{ transform: 'rotate(45deg)' }} />
          <div className="absolute inset-2 rounded-md bg-gray-950" style={{ transform: 'rotate(45deg)' }} />
          <motion.div
            className="absolute inset-3 rounded-sm bg-blue-400"
            style={{ transform: 'rotate(45deg)' }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-wider text-white">AINOVA CLOUD INTELLIGENCE</h1>
          <p className="text-xs text-gray-500 mt-1 tracking-widest uppercase">{t('branding.tagline')}</p>
        </div>
      </div>

      <LoginContainer />

      {/* Footer link */}
      <div className="mt-8 text-center">
        <a href="/" className="text-sm text-gray-500 hover:text-blue-400 transition-colors">
          {t('common.back_to_homepage')}
        </a>
      </div>
    </div>
  );
}
