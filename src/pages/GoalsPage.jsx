import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query, where, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, BookOpen, ChevronDown, ChevronUp, Trash2, CheckSquare, Square, AlertTriangle, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';

const STATUS_OPTIONS = ['pendente', 'em andamento', 'concluído'];
const STATUS_BADGE = { 'pendente': 'badge-yellow', 'em andamento': 'badge-blue', 'concluído': 'badge-green' };

export default function GoalsPage() {
  const { user, profile } = useAuth();
  const [goals, setGoals] = useState([]);
  const [checklistItems, setChecklistItems] = useState({});
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', responsible: '', deadline: '', status: 'pendente' });
  const [itemForm, setItemForm] = useState({ description: '', responsible: '', deadline: '' });
  const setG = (k, v) => setGoalForm(f => ({ ...f, [k]: v }));
  const setI = (k, v) => setItemForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const q = query(collection(db, 'goals'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGoals(list);
      const itemsMap = {};
      for (const goal of list) {
        const iq = query(collection(db, 'checklistItems'), where('goalId', '==', goal.id));
        const iSnap = await getDocs(iq);
        itemsMap[goal.id] = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setChecklistItems(itemsMap);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!expandedId) return;
    const q = query(collection(db, 'checklistItems'), where('goalId', '==', expandedId));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChecklistItems(prev => ({ ...prev, [expandedId]: items }));
      if (items.length > 0) {
        const done = items.filter(i => i.completed).length;
        updateDoc(doc(db, 'goals', expandedId), { progress: Math.round((done / items.length) * 100) });
      }
    });
    return unsub;
  }, [expandedId]);

  const openCreateGoal = () => {
    setEditingGoal(null);
    setGoalForm({ title: '', description: '', responsible: '', deadline: '', status: 'pendente' });
    setShowGoalModal(true);
  };

  const openEditGoal = (goal) => {
    setEditingGoal(goal.id);
    setGoalForm({ title: goal.title, description: goal.description || '', responsible: goal.responsible || '', deadline: goal.deadline || '', status: goal.status });
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!goalForm.title) return;
    setLoading(true);
    try {
      if (editingGoal) {
        await updateDoc(doc(db, 'goals', editingGoal), { ...goalForm, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'goals'), { ...goalForm, creatorId: user.uid, creatorName: profile?.name, progress: 0, createdAt: serverTimestamp() });
      }
      setShowGoalModal(false);
    } finally { setLoading(false); }
  };

  const handleDeleteGoal = async (id) => {
    if (!confirm('Excluir este programa e todos seus itens?')) return;
    const items = checklistItems[id] || [];
    for (const item of items) await deleteDoc(doc(db, 'checklistItems', item.id));
    await deleteDoc(doc(db, 'goals', id));
  };

  const handleAddItem = async () => {
    if (!itemForm.description) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'checklistItems'), { ...itemForm, goalId: selectedGoalId, completed: false, createdAt: serverTimestamp() });
      setShowItemModal(false);
      setItemForm({ description: '', responsible: '', deadline: '' });
    } finally { setLoading(false); }
  };

  const toggleItem = (item) => updateDoc(doc(db, 'checklistItems', item.id), { completed: !item.completed });
  const deleteItem = (item) => deleteDoc(doc(db, 'checklistItems', item.id));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Programas</h1>
          <p className="text-stone-400 text-sm">{goals.length} programas cadastrados</p>
        </div>
        <button onClick={openCreateGoal} className="btn-primary">
          <Plus size={16} /> Novo Programa
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum programa criado ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map(goal => {
            const isExpanded = expandedId === goal.id;
            const items = checklistItems[goal.id] || [];
            const done = items.filter(i => i.completed).length;
            const progress = items.length > 0 ? Math.round((done / items.length) * 100) : (goal.progress || 0);
            const isOverdue = goal.deadline && isPast(new Date(goal.deadline)) && goal.status !== 'concluído';

            return (
              <div key={goal.id} className={`card ${isOverdue ? 'border-red-200' : ''}`}>
                <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : goal.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-800">{goal.title}</h3>
                      <span className={`badge text-[10px] ${STATUS_BADGE[goal.status]}`}>{goal.status}</span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <AlertTriangle size={11} /> Atrasado
                        </span>
                      )}
                    </div>
                    {goal.responsible && <p className="text-xs text-stone-400 mt-0.5">👤 {goal.responsible}</p>}
                    {goal.deadline && <p className="text-xs text-stone-400">📅 {format(new Date(goal.deadline), "d MMM yyyy", { locale: ptBR })}</p>}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>{done}/{items.length} itens</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-1 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); openEditGoal(goal); }}
                      className="p-1.5 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-stone-100 pt-4 space-y-3 animate-fade-in">
                    {goal.description && <p className="text-sm text-stone-600">{goal.description}</p>}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Checklist</p>
                        <button onClick={() => { setSelectedGoalId(goal.id); setShowItemModal(true); }}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                          <Plus size={12} /> Adicionar item
                        </button>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-xs text-stone-300 italic">Nenhum item no checklist</p>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map(item => {
                            const itemOverdue = item.deadline && isPast(new Date(item.deadline)) && !item.completed;
                            return (
                              <div key={item.id} className="flex items-start gap-2.5 py-1.5 group">
                                <button onClick={() => toggleItem(item)} className="mt-0.5 flex-shrink-0">
                                  {item.completed
                                    ? <CheckSquare size={16} className="text-emerald-500" />
                                    : <Square size={16} className="text-stone-300" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${item.completed ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                                    {item.description}
                                  </p>
                                  <div className="flex gap-2 flex-wrap mt-0.5">
                                    {item.responsible && <span className="text-xs text-stone-400">👤 {item.responsible}</span>}
                                    {item.deadline && (
                                      <span className={`text-xs ${itemOverdue ? 'text-red-500' : 'text-stone-400'}`}>
                                        📅 {format(new Date(item.deadline), "d MMM", { locale: ptBR })}{itemOverdue && ' ⚠️'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button onClick={() => deleteItem(item)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 transition-all">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showGoalModal && (
        <Modal title={editingGoal ? 'Editar Programa' : 'Novo Programa'} onClose={() => setShowGoalModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input type="text" className="input" placeholder="Nome do programa" value={goalForm.title} onChange={e => setG('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input min-h-[70px] resize-none" value={goalForm.description} onChange={e => setG('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Responsável</label>
                <input type="text" className="input" value={goalForm.responsible} onChange={e => setG('responsible', e.target.value)} />
              </div>
              <div>
                <label className="label">Prazo</label>
                <input type="date" className="input" value={goalForm.deadline} onChange={e => setG('deadline', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setG('status', s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all
                      ${goalForm.status === s ? 'bg-indigo-100 border-indigo-400 border text-indigo-700' : 'bg-white border border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowGoalModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSaveGoal} disabled={loading || !goalForm.title} className="btn-primary flex-1 justify-center">
                {loading ? 'Salvando...' : 'Salvar Programa'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showItemModal && (
        <Modal title="Adicionar Item ao Checklist" onClose={() => setShowItemModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Descrição *</label>
              <input type="text" className="input" placeholder="O que precisa ser feito?" value={itemForm.description} onChange={e => setI('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Responsável</label>
                <input type="text" className="input" value={itemForm.responsible} onChange={e => setI('responsible', e.target.value)} />
              </div>
              <div>
                <label className="label">Prazo</label>
                <input type="date" className="input" value={itemForm.deadline} onChange={e => setI('deadline', e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowItemModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleAddItem} disabled={loading || !itemForm.description} className="btn-primary flex-1 justify-center">
                {loading ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
