import { registerModule } from '@/lib/modules/registry';

registerModule({
  id: 'recipes',
  name: 'Receptúrák',
  description: 'Recipe management with cost calculation and production tracking',
  icon: 'BookOpen',
  href: '/dashboard/modules/recipes',
  color: 'bg-amber-600',
  version: '1.0.0',
  tier: 'basic',
  dependsOn: ['inventory'],
  permissions: [
    'recipes.view',
    'recipes.edit',
    'recipes.export',
  ],
  adminSettings: [
    { key: 'recipes_default_yield_unit', label: 'Default yield unit', type: 'string', default: 'db' },
  ],
  migrations: ['modules/recipes/migrations/001_recipes.sql'],
  sector: ['gastronomy'],
  isAddon: true,
});
