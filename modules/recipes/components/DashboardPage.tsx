'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, ChefHat, Package, ArrowLeft } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';

interface Recipe {
  id: number;
  name: string;
  category: string | null;
  yield_qty: number;
  yield_unit: string;
  cost_per_unit: number | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  allergens: string[];
  is_active: boolean;
}

interface Ingredient {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  unit_cost: number | null;
}

interface Production {
  id: number;
  batch_qty: number;
  produced_qty: number;
  production_date: string;
  notes: string | null;
}

export default function RecipesDashboardPage() {
  const { t } = useTranslation();
  const { csrfToken } = useCsrf();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [showNewRecipe, setShowNewRecipe] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showProduce, setShowProduce] = useState(false);

  // New recipe form
  const [rName, setRName] = useState('');
  const [rCategory, setRCategory] = useState('');
  const [rYieldQty, setRYieldQty] = useState('1');
  const [rYieldUnit, setRYieldUnit] = useState('db');

  // Add ingredient form
  const [iName, setIName] = useState('');
  const [iQty, setIQty] = useState('');
  const [iUnit, setIUnit] = useState('kg');
  const [iCost, setICost] = useState('');

  // Production form
  const [pBatchQty, setPBatchQty] = useState('1');
  const [pProducedQty, setPProducedQty] = useState('');
  const [pNotes, setPNotes] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  }), [csrfToken]);

  const loadRecipes = useCallback(async () => {
    const res = await fetch('/api/modules/recipes/recipes');
    const data = await res.json() as { recipes: Recipe[] };
    if (data.recipes) setRecipes(data.recipes);
  }, []);

  const loadDetail = useCallback(async (recipeId: number) => {
    // Load ingredients
    const db = await fetch('/api/modules/recipes/recipes');
    // We need to get ingredients — use the moduleId/path pattern
    // Since ingredients are part of recipe detail, we can load them via a query param or separate endpoint
    // For simplicity, loading via SQL-compatible endpoint pattern
    // Actually the module API proxy pattern is `api/modules/[moduleId]/[...path]`
    // Let's use the direct module API path
    try {
      const ingRes = await fetch(`/api/modules/recipes/ingredients?recipeId=${recipeId}`);
      if (ingRes.ok) {
        const ingData = await ingRes.json() as { ingredients: Ingredient[] };
        setIngredients(ingData.ingredients ?? []);
      }
    } catch { setIngredients([]); }

    try {
      const prodRes = await fetch(`/api/modules/recipes/production?recipeId=${recipeId}`);
      if (prodRes.ok) {
        const prodData = await prodRes.json() as { productions: Production[] };
        setProductions(prodData.productions ?? []);
      }
    } catch { setProductions([]); }
  }, []);

  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  useEffect(() => {
    if (selected) loadDetail(selected.id);
  }, [selected, loadDetail]);

  const createRecipe = async () => {
    const res = await fetch('/api/modules/recipes/recipes', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: rName,
        category: rCategory || undefined,
        yieldQty: parseFloat(rYieldQty) || 1,
        yieldUnit: rYieldUnit,
      }),
    });
    if (res.ok) {
      setShowNewRecipe(false);
      setRName('');
      setRCategory('');
      await loadRecipes();
    }
  };

  const addIngredient = async () => {
    if (!selected) return;
    const res = await fetch('/api/modules/recipes/ingredients', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        recipeId: selected.id,
        productName: iName,
        quantity: parseFloat(iQty) || 0,
        unit: iUnit,
        unitCost: parseFloat(iCost) || 0,
      }),
    });
    if (res.ok) {
      setShowAddIngredient(false);
      setIName('');
      setIQty('');
      setICost('');
      await loadDetail(selected.id);
      await loadRecipes();
    }
  };

  const recordProduction = async () => {
    if (!selected) return;
    const res = await fetch('/api/modules/recipes/production', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        recipeId: selected.id,
        batchQty: parseFloat(pBatchQty) || 1,
        producedQty: parseFloat(pProducedQty) || 0,
        notes: pNotes || undefined,
      }),
    });
    if (res.ok) {
      setShowProduce(false);
      setPBatchQty('1');
      setPProducedQty('');
      setPNotes('');
      await loadDetail(selected.id);
    }
  };

  const totalIngredientCost = ingredients.reduce((sum, i) => sum + (i.quantity * (i.unit_cost ?? 0)), 0);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader title={t('recipes.title')} subtitle={t('recipes.subtitle')} />

      {!selected ? (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNewRecipe(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> {t('recipes.new_recipe')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map(r => (
              <div key={r.id} onClick={() => setSelected(r)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-amber-500/50 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-900/30 rounded-lg">
                    <BookOpen className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{r.name}</h3>
                    {r.category ? <p className="text-gray-500 text-xs">{r.category}</p> : null}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{r.yield_qty} {r.yield_unit}</span>
                  {r.cost_per_unit ? (
                    <span className="text-amber-400 font-medium">{r.cost_per_unit.toFixed(2)} / {r.yield_unit}</span>
                  ) : null}
                </div>
                {r.allergens.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.allergens.map(a => (
                      <span key={a} className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded">{a}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSelected(null); setIngredients([]); setProductions([]); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                {selected.category ? <p className="text-gray-400 text-sm">{selected.category}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">{t('recipes.yield')}: {selected.yield_qty} {selected.yield_unit}</p>
                {selected.cost_per_unit ? (
                  <p className="text-amber-400 font-bold">{t('recipes.cost_per_unit')}: {selected.cost_per_unit.toFixed(2)}</p>
                ) : null}
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" /> {t('recipes.ingredients')}
                </h3>
                <button onClick={() => setShowAddIngredient(true)}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs">
                  <Plus className="w-3 h-3" /> {t('common.add')}
                </button>
              </div>
              {ingredients.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="text-left py-2">{t('recipes.ingredient_name')}</th>
                      <th className="text-right py-2">{t('recipes.quantity')}</th>
                      <th className="text-right py-2">{t('recipes.unit_cost')}</th>
                      <th className="text-right py-2">{t('recipes.line_total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map(i => (
                      <tr key={i.id} className="border-b border-gray-800/50">
                        <td className="py-2 text-gray-300">{i.product_name}</td>
                        <td className="py-2 text-right text-gray-400">{i.quantity} {i.unit}</td>
                        <td className="py-2 text-right text-gray-400">{(i.unit_cost ?? 0).toFixed(2)}</td>
                        <td className="py-2 text-right text-white">{(i.quantity * (i.unit_cost ?? 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td colSpan={3} className="py-2 text-right text-gray-400">{t('recipes.total_cost')}:</td>
                      <td className="py-2 text-right text-amber-400">{totalIngredientCost.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="text-gray-500 text-sm">{t('recipes.no_ingredients')}</p>
              )}
            </div>

            {/* Production log */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <ChefHat className="w-4 h-4" /> {t('recipes.production_log')}
                </h3>
                <button onClick={() => { setPProducedQty(String(selected.yield_qty)); setShowProduce(true); }}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-xs">
                  <Plus className="w-3 h-3" /> {t('recipes.record_production')}
                </button>
              </div>
              {productions.length > 0 ? (
                <div className="space-y-2">
                  {productions.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-950 rounded-lg p-3">
                      <div>
                        <p className="text-white text-sm">{p.produced_qty} {selected.yield_unit} ({p.batch_qty}x)</p>
                        {p.notes ? <p className="text-gray-500 text-xs">{p.notes}</p> : null}
                      </div>
                      <span className="text-gray-500 text-xs">{p.production_date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">{t('recipes.no_production')}</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* New recipe modal */}
      {showNewRecipe && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewRecipe(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('recipes.new_recipe')}</h3>
            <div className="space-y-3">
              <input type="text" value={rName} onChange={e => setRName(e.target.value)} placeholder={t('recipes.recipe_name')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="text" value={rCategory} onChange={e => setRCategory(e.target.value)} placeholder={t('recipes.category')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={rYieldQty} onChange={e => setRYieldQty(e.target.value)} placeholder={t('recipes.yield')}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                <input type="text" value={rYieldUnit} onChange={e => setRYieldUnit(e.target.value)} placeholder={t('recipes.unit')}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewRecipe(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={createRecipe} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add ingredient modal */}
      {showAddIngredient && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddIngredient(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('recipes.add_ingredient')}</h3>
            <div className="space-y-3">
              <input type="text" value={iName} onChange={e => setIName(e.target.value)} placeholder={t('recipes.ingredient_name')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" value={iQty} onChange={e => setIQty(e.target.value)} placeholder={t('recipes.quantity')}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                <input type="text" value={iUnit} onChange={e => setIUnit(e.target.value)} placeholder={t('recipes.unit')}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                <input type="number" value={iCost} onChange={e => setICost(e.target.value)} placeholder={t('recipes.unit_cost')}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAddIngredient(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={addIngredient} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Production modal */}
      {showProduce && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowProduce(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('recipes.record_production')}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('recipes.batch_multiplier')}</label>
                  <input type="number" value={pBatchQty} onChange={e => setPBatchQty(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('recipes.produced_qty')}</label>
                  <input type="number" value={pProducedQty} onChange={e => setPProducedQty(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                </div>
              </div>
              <textarea value={pNotes} onChange={e => setPNotes(e.target.value)} placeholder={t('common.notes')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 h-20" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowProduce(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={recordProduction} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">{t('recipes.produce')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
