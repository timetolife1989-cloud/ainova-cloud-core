'use client';

import { useState, useEffect } from 'react';
import { Settings, Database, UserPlus, Palette, Blocks, Key, CheckCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

type Step = 'welcome' | 'admin' | 'branding' | 'modules' | 'license' | 'complete';
const STEPS: Step[] = ['welcome', 'admin', 'branding', 'modules', 'license', 'complete'];

// STEP_INFO will be generated dynamically using translations

const AVAILABLE_MODULE_IDS = [
  { id: 'workforce', tier: 'basic' },
  { id: 'tracking', tier: 'basic' },
  { id: 'fleet', tier: 'basic' },
  { id: 'file-import', tier: 'basic' },
  { id: 'reports', tier: 'basic' },
  { id: 'performance', tier: 'professional' },
  { id: 'scheduling', tier: 'professional' },
  { id: 'delivery', tier: 'professional' },
  { id: 'inventory', tier: 'professional' },
] as const;

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Admin form
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Branding form
  const [appName, setAppName] = useState('');
  const [locale, setLocale] = useState('en');

  // Modules form
  const [selectedModules, setSelectedModules] = useState<string[]>(['workforce', 'tracking', 'fleet', 'file-import', 'reports']);

  // License form
  const [licenseKey, setLicenseKey] = useState('');

  useEffect(() => {
    // Check if setup is already done
    fetch('/api/setup')
      .then(r => r.json())
      .then((data: { completed: boolean; step?: string }) => {
        if (data.completed) {
          window.location.href = '/login';
        }
      })
      .catch(() => {});
  }, []);

  const stepIndex = STEPS.indexOf(currentStep);

  const goNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setCurrentStep(STEPS[nextIdx]!);
  };

  const goPrev = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) setCurrentStep(STEPS[prevIdx]!);
  };

  const handleSubmitStep = async () => {
    setLoading(true);
    setError(null);

    try {
      let body: Record<string, unknown> = {};

      switch (currentStep) {
        case 'welcome':
          goNext();
          setLoading(false);
          return;
        case 'admin':
          if (!adminUser || !adminPass || adminPass.length < 8) {
            setError(t('auth.login_failed'));
            setLoading(false);
            return;
          }
          body = { step: 'admin', username: adminUser, password: adminPass, fullName: adminName, email: adminEmail || undefined };
          break;
        case 'branding':
          if (!appName.trim()) { setError(t('setup.company_name') + ' ' + t('common.required')); setLoading(false); return; }
          body = { step: 'branding', appName, locale };
          break;
        case 'modules':
          body = { step: 'modules', activeModules: selectedModules };
          break;
        case 'license':
          body = { step: 'license', licenseKey: licenseKey || undefined };
          break;
        case 'complete':
          body = { step: 'complete' };
          break;
      }

      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json() as { ok?: boolean; error?: string; completed?: boolean };
      if (!res.ok) throw new Error(result.error ?? 'Error');

      if (result.completed) {
        window.location.href = '/login';
        return;
      }

      goNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const getStepInfo = (step: Step) => {
    const iconMap = {
      welcome: <Settings className="w-8 h-8" />,
      admin: <UserPlus className="w-8 h-8" />,
      branding: <Palette className="w-8 h-8" />,
      modules: <Blocks className="w-8 h-8" />,
      license: <Key className="w-8 h-8" />,
      complete: <CheckCircle className="w-8 h-8" />,
    };
    
    return {
      title: t(`setup.${step}_title`),
      subtitle: t(`setup.${step}_subtitle`),
      icon: iconMap[step],
    };
  };

  const info = getStepInfo(currentStep);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i < stepIndex ? 'bg-green-600 text-white' :
                i === stepIndex ? 'bg-blue-600 text-white' :
                'bg-gray-800 text-gray-500'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < stepIndex ? 'bg-green-600' : 'bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-blue-900/30 rounded-xl text-blue-400 mb-4">
              {info.icon}
            </div>
            <h1 className="text-2xl font-bold text-white">{info.title}</h1>
            <p className="text-gray-400 mt-1">{info.subtitle}</p>
          </div>

          {/* Step content */}
          <div className="space-y-4">
            {currentStep === 'welcome' && (
              <div className="text-center space-y-4">
                <p className="text-gray-300">{t('setup.welcome_desc')}</p>
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="bg-gray-950 rounded-lg p-3"><p className="text-xs text-gray-500">{t('setup.step_n', { n: '1' })}</p><p className="text-sm text-white">{t('setup.step1_desc')}</p></div>
                  <div className="bg-gray-950 rounded-lg p-3"><p className="text-xs text-gray-500">{t('setup.step_n', { n: '2' })}</p><p className="text-sm text-white">{t('setup.step2_desc')}</p></div>
                  <div className="bg-gray-950 rounded-lg p-3"><p className="text-xs text-gray-500">{t('setup.step_n', { n: '3' })}</p><p className="text-sm text-white">{t('setup.step3_desc')}</p></div>
                  <div className="bg-gray-950 rounded-lg p-3"><p className="text-xs text-gray-500">{t('setup.step_n', { n: '4' })}</p><p className="text-sm text-white">{t('setup.step4_desc')}</p></div>
                </div>
              </div>
            )}

            {currentStep === 'admin' && (
              <>
                <div><label className="block text-sm text-gray-400 mb-1">{t('setup.username')} *</label>
                  <input type="text" value={adminUser} onChange={e => setAdminUser(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">{t('setup.password')} * ({t('setup.password_hint')})</label>
                  <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-gray-400 mb-1">{t('setup.full_name')}</label>
                    <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100" /></div>
                  <div><label className="block text-sm text-gray-400 mb-1">{t('setup.email')}</label>
                    <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100" /></div>
                </div>
              </>
            )}

            {currentStep === 'branding' && (
              <>
                <div><label className="block text-sm text-gray-400 mb-1">{t('setup.company_name')} *</label>
                  <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. ACME Manufacturing" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100" /></div>
                <div><label className="block text-sm text-gray-400 mb-1">{t('setup.language')}</label>
                  <select value={locale} onChange={e => setLocale(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100">
                    <option value="hu">Magyar</option>
                    <option value="en">English</option>
                    <option value="de">Deutsch</option>
                  </select></div>
              </>
            )}

            {currentStep === 'modules' && (
              <div className="space-y-2">
                {AVAILABLE_MODULE_IDS.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                    selectedModules.includes(m.id) ? 'bg-blue-900/20 border-blue-700' : 'bg-gray-950 border-gray-800'
                  }`}>
                    <input type="checkbox" checked={selectedModules.includes(m.id)} onChange={() => toggleModule(m.id)} className="rounded" />
                    <div className="flex-1">
                      <p className="text-white text-sm">{t(`setup.module_${m.id.replace('-', '_')}`)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      m.tier === 'basic' ? 'bg-gray-800 text-gray-400' : 'bg-blue-900/50 text-blue-300'
                    }`}>{m.tier}</span>
                  </label>
                ))}
              </div>
            )}

            {currentStep === 'license' && (
              <>
                <div><label className="block text-sm text-gray-400 mb-1">{t('setup.license_key')} ({t('setup.license_optional_short')})</label>
                  <input type="text" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 font-mono" /></div>
                <p className="text-xs text-gray-500">{t('setup.license_no_key_hint')}</p>
              </>
            )}

            {currentStep === 'complete' && (
              <div className="text-center space-y-4">
                <div className="inline-flex p-4 bg-green-900/30 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                </div>
                <p className="text-gray-300">{t('setup.complete_desc')}</p>
                <p className="text-sm text-gray-500">{t('setup.complete_hint')}</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">{error}</div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {stepIndex > 0 && currentStep !== 'complete' ? (
              <button onClick={goPrev} className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white text-sm">
                <ArrowLeft className="w-4 h-4" /> {t('setup.previous')}
              </button>
            ) : <div />}
            <button
              onClick={handleSubmitStep}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {currentStep === 'complete' ? t('setup.start_using') : currentStep === 'welcome' ? t('setup.next') : t('setup.next')}
              {currentStep !== 'complete' && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Already have an account? */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {t('setup.already_have_account')}{' '}
            <a href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              {t('auth.login')} →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
