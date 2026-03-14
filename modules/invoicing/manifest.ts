import { registerModule, type ModuleDefinition } from '@/lib/modules/registry';

export const manifest: ModuleDefinition = {
  id: 'invoicing',
  name: 'Invoicing',
  description: 'Hungarian-standard invoicing with NAV Online Számla 3.0, VAT, PDF',
  icon: 'FileText',
  href: '/dashboard/modules/invoicing',
  color: 'bg-emerald-600',
  version: '1.0.0',
  tier: 'professional' as const,
  dependsOn: ['inventory'],
  permissions: [
    'invoicing.view',
    'invoicing.create',
    'invoicing.edit',
    'invoicing.void',
    'invoicing.export',
  ],
  adminSettings: [
    // === Company details ===
    { key: 'invoicing_company_name', label: 'Company name (issuer)', type: 'string', default: '' },
    { key: 'invoicing_company_tax_number', label: 'Tax number (adószám)', type: 'string', default: '' },
    { key: 'invoicing_company_address', label: 'Company address', type: 'string', default: '' },
    { key: 'invoicing_company_bank_account', label: 'Bank account number', type: 'string', default: '' },
    // === Invoice defaults ===
    { key: 'invoicing_invoice_prefix', label: 'Invoice number prefix', type: 'string', default: 'ACI' },
    { key: 'invoicing_default_due_days', label: 'Default payment due (days)', type: 'number', default: '8' },
    { key: 'invoicing_default_payment_method', label: 'Default payment method', type: 'select', default: 'cash',
      options: [
        { value: 'cash', label: 'Készpénz' },
        { value: 'card', label: 'Bankkártya' },
        { value: 'transfer', label: 'Átutalás' },
      ],
    },
    { key: 'invoicing_default_vat_rate', label: 'Default VAT rate', type: 'select', default: '27',
      options: [
        { value: '27', label: '27%' },
        { value: '18', label: '18%' },
        { value: '5', label: '5%' },
        { value: '0', label: 'ÁFA mentes (TAM)' },
        { value: 'AAM', label: 'Alanyi adómentes (AAM)' },
      ],
    },
    // === NAV Online Számla ===
    { key: 'invoicing_nav_enabled', label: 'NAV Online Számla integration', type: 'boolean', default: 'false' },
    { key: 'invoicing_nav_technical_user', label: 'NAV technical username', type: 'string', default: '' },
    { key: 'invoicing_nav_signature_key', label: 'NAV signature key (XML aláíró kulcs)', type: 'string', default: '' },
    { key: 'invoicing_nav_exchange_key', label: 'NAV exchange key (XML csere kulcs)', type: 'string', default: '' },
  ],
  migrations: ['001_invoicing.sql'],
};

registerModule(manifest);
