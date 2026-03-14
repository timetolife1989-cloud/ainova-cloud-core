'use client';

import { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Plus, ArrowLeft, DollarSign, ListTodo, BarChart3 } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';

interface Project {
  id: number;
  name: string;
  client_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  actual_cost: number;
  currency: string;
  description: string | null;
}

interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  assigned_name: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  sort_order: number;
}

interface Cost {
  id: number;
  description: string;
  amount: number;
  cost_type: string;
  cost_date: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-blue-900/30 text-blue-300',
  active: 'bg-green-900/30 text-green-300',
  on_hold: 'bg-yellow-900/30 text-yellow-300',
  completed: 'bg-gray-700/30 text-gray-300',
  cancelled: 'bg-red-900/30 text-red-300',
};

const TASK_COLUMNS = ['todo', 'in_progress', 'done', 'blocked'] as const;
const TASK_COL_COLORS: Record<string, string> = {
  todo: 'border-gray-600',
  in_progress: 'border-cyan-500',
  done: 'border-green-500',
  blocked: 'border-red-500',
};

const COST_LABELS: Record<string, string> = {
  material: '🧱',
  labor: '👷',
  subcontract: '🏗️',
  other: '📦',
};

type TabView = 'tasks' | 'costs';

export default function ProjectsDashboardPage() {
  const { t } = useTranslation();
  const { csrfToken } = useCsrf();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [tab, setTab] = useState<TabView>('tasks');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewCost, setShowNewCost] = useState(false);

  // Project form
  const [pName, setPName] = useState('');
  const [pClient, setPClient] = useState('');
  const [pBudget, setPBudget] = useState('');
  const [pDesc, setPDesc] = useState('');

  // Task form
  const [tTitle, setTTitle] = useState('');
  const [tAssigned, setTAssigned] = useState('');
  const [tDue, setTDue] = useState('');
  const [tHours, setTHours] = useState('');

  // Cost form
  const [cDesc, setCDesc] = useState('');
  const [cAmount, setCAmount] = useState('');
  const [cType, setCType] = useState('material');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  }), [csrfToken]);

  const loadProjects = useCallback(async () => {
    const res = await fetch('/api/modules/projects/projects');
    if (res.ok) {
      const data = await res.json() as { projects: Project[] };
      if (data.projects) setProjects(data.projects);
    }
  }, []);

  const loadDetail = useCallback(async (projectId: number) => {
    try {
      const [taskRes, costRes] = await Promise.all([
        fetch(`/api/modules/projects/tasks?projectId=${projectId}`),
        fetch(`/api/modules/projects/costs?projectId=${projectId}`),
      ]);
      if (taskRes.ok) {
        const td = await taskRes.json() as { tasks: Task[] };
        setTasks(td.tasks ?? []);
      }
      if (costRes.ok) {
        const cd = await costRes.json() as { costs: Cost[] };
        setCosts(cd.costs ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selected) loadDetail(selected.id); }, [selected, loadDetail]);

  const createProject = async () => {
    const res = await fetch('/api/modules/projects/projects', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        name: pName,
        clientName: pClient || undefined,
        budget: parseFloat(pBudget) || undefined,
        description: pDesc || undefined,
      }),
    });
    if (res.ok) {
      setShowNewProject(false);
      setPName(''); setPClient(''); setPBudget(''); setPDesc('');
      await loadProjects();
    }
  };

  const createTask = async () => {
    if (!selected) return;
    const res = await fetch('/api/modules/projects/tasks', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        projectId: selected.id,
        title: tTitle,
        assignedName: tAssigned || undefined,
        dueDate: tDue || undefined,
        estimatedHours: parseFloat(tHours) || undefined,
      }),
    });
    if (res.ok) {
      setShowNewTask(false);
      setTTitle(''); setTAssigned(''); setTDue(''); setTHours('');
      await loadDetail(selected.id);
    }
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    await fetch('/api/modules/projects/tasks', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id: taskId, status }),
    });
    if (selected) await loadDetail(selected.id);
  };

  const addCost = async () => {
    if (!selected) return;
    const res = await fetch('/api/modules/projects/costs', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        projectId: selected.id,
        description: cDesc,
        amount: parseFloat(cAmount) || 0,
        costType: cType,
      }),
    });
    if (res.ok) {
      setShowNewCost(false);
      setCDesc(''); setCAmount(''); setCType('material');
      await loadDetail(selected.id);
      await loadProjects(); // refresh actual_cost
    }
  };

  const updateProjectStatus = async (status: string) => {
    if (!selected) return;
    await fetch('/api/modules/projects/projects', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id: selected.id, status }),
    });
    await loadProjects();
    setSelected(prev => prev ? { ...prev, status } : null);
  };

  const budgetPct = selected?.budget && selected.budget > 0
    ? Math.min(100, Math.round((selected.actual_cost / selected.budget) * 100))
    : 0;

  const totalCostAmount = costs.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader title={t('projects.title')} subtitle={t('projects.subtitle')} />

      {!selected ? (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> {t('projects.new_project')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.id} onClick={() => setSelected(p)}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 cursor-pointer hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-900/30 rounded-lg">
                      <FolderKanban className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{p.name}</h3>
                      {p.client_name ? <p className="text-gray-500 text-xs">{p.client_name}</p> : null}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[p.status] ?? ''}`}>
                    {t(`projects.status_${p.status}`)}
                  </span>
                </div>
                {p.budget ? (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{t('projects.budget')}</span>
                      <span>{p.actual_cost.toLocaleString()} / {p.budget.toLocaleString()} {p.currency}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${p.actual_cost > p.budget ? 'bg-red-500' : 'bg-cyan-500'}`}
                        style={{ width: `${Math.min(100, (p.actual_cost / p.budget) * 100)}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSelected(null); setTasks([]); setCosts([]); }}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> {t('common.back')}
          </button>

          {/* Project header */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                {selected.client_name ? <p className="text-gray-400 text-sm">{selected.client_name}</p> : null}
              </div>
              <select value={selected.status} onChange={e => updateProjectStatus(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100">
                {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => (
                  <option key={s} value={s}>{t(`projects.status_${s}`)}</option>
                ))}
              </select>
            </div>

            {/* Budget bar */}
            {selected.budget ? (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>{t('projects.budget')}: {selected.budget.toLocaleString()} {selected.currency}</span>
                  <span className={budgetPct > 90 ? 'text-red-400' : 'text-cyan-400'}>{budgetPct}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${budgetPct > 90 ? 'bg-red-500' : 'bg-cyan-500'}`}
                    style={{ width: `${budgetPct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('projects.actual_cost')}: {selected.actual_cost.toLocaleString()} {selected.currency}</p>
              </div>
            ) : null}

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-gray-800 mb-4">
              <button onClick={() => setTab('tasks')}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-[1px] ${tab === 'tasks' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                <ListTodo className="w-4 h-4" /> {t('projects.tasks')}
              </button>
              <button onClick={() => setTab('costs')}
                className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-[1px] ${tab === 'costs' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                <DollarSign className="w-4 h-4" /> {t('projects.costs')}
              </button>
            </div>

            {/* Tasks — Kanban view */}
            {tab === 'tasks' && (
              <>
                <div className="flex items-center justify-end mb-3">
                  <button onClick={() => setShowNewTask(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs">
                    <Plus className="w-3 h-3" /> {t('projects.new_task')}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {TASK_COLUMNS.map(col => (
                    <div key={col} className={`border-t-2 ${TASK_COL_COLORS[col]} pt-3`}>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">{t(`projects.task_${col}`)}</h4>
                      <div className="space-y-2">
                        {tasks.filter(t => t.status === col).map(task => (
                          <div key={task.id} className="bg-gray-950 rounded-lg p-3 text-sm">
                            <p className="text-white font-medium text-xs">{task.title}</p>
                            {task.assigned_name ? <p className="text-gray-500 text-[10px] mt-1">{task.assigned_name}</p> : null}
                            {task.due_date ? <p className="text-gray-600 text-[10px]">{task.due_date}</p> : null}
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {TASK_COLUMNS.filter(s => s !== col).map(s => (
                                <button key={s} onClick={() => updateTaskStatus(task.id, s)}
                                  className="px-1.5 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-[10px]">
                                  → {t(`projects.task_${s}`)}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Costs view */}
            {tab === 'costs' && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <BarChart3 className="w-4 h-4" />
                    {t('projects.total_costs')}: <span className="text-white font-semibold">{totalCostAmount.toLocaleString()} {selected.currency}</span>
                  </div>
                  <button onClick={() => setShowNewCost(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs">
                    <Plus className="w-3 h-3" /> {t('projects.add_cost')}
                  </button>
                </div>
                {costs.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        <th className="text-left py-2">{t('projects.cost_desc')}</th>
                        <th className="text-left py-2">{t('projects.cost_type')}</th>
                        <th className="text-right py-2">{t('projects.amount')}</th>
                        <th className="text-right py-2">{t('projects.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costs.map(c => (
                        <tr key={c.id} className="border-b border-gray-800/50">
                          <td className="py-2 text-gray-300">{c.description}</td>
                          <td className="py-2 text-gray-400">{COST_LABELS[c.cost_type] ?? ''} {t(`projects.type_${c.cost_type}`)}</td>
                          <td className="py-2 text-right text-white">{c.amount.toLocaleString()}</td>
                          <td className="py-2 text-right text-gray-500">{c.cost_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-sm">{t('projects.no_costs')}</p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* New project modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewProject(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('projects.new_project')}</h3>
            <div className="space-y-3">
              <input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder={t('projects.project_name')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="text" value={pClient} onChange={e => setPClient(e.target.value)} placeholder={t('projects.client')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="number" value={pBudget} onChange={e => setPBudget(e.target.value)} placeholder={t('projects.budget')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder={t('projects.description')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 h-20" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewProject(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={createProject} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* New task modal */}
      {showNewTask && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewTask(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('projects.new_task')}</h3>
            <div className="space-y-3">
              <input type="text" value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder={t('projects.task_title')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="text" value={tAssigned} onChange={e => setTAssigned(e.target.value)} placeholder={t('projects.assigned_to')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={tDue} onChange={e => setTDue(e.target.value)}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                <input type="number" value={tHours} onChange={e => setTHours(e.target.value)} placeholder={t('projects.estimated_hours')}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewTask(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={createTask} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* New cost modal */}
      {showNewCost && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewCost(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('projects.add_cost')}</h3>
            <div className="space-y-3">
              <input type="text" value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder={t('projects.cost_desc')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="number" value={cAmount} onChange={e => setCAmount(e.target.value)} placeholder={t('projects.amount')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <select value={cType} onChange={e => setCType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100">
                <option value="material">{t('projects.type_material')}</option>
                <option value="labor">{t('projects.type_labor')}</option>
                <option value="subcontract">{t('projects.type_subcontract')}</option>
                <option value="other">{t('projects.type_other')}</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewCost(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={addCost} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
