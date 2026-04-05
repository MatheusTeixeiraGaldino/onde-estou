import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query, where, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, FolderKanban, ChevronDown, ChevronUp, Trash2,
  CheckSquare, Square, AlertTriangle, Edit2, Check, Users, Lock
} from 'lucide-react';
import Modal from '../components/Modal';

const STATUS_OPTIONS = ['pendente', 'em andamento', 'concluído'];
const STATUS_BADGE = { 'pendente': 'badge-yellow', 'em andamento': 'badge-blue', 'concluído': 'badge-green' };

export default function GoalsPage() {
  const { user, profile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [stages, setStages] = useState({});        // { projectId: [stage, ...] }
  const [allUsers, setAllUsers] = useState([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [editingStage, setEditingStage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [projectForm, setProjectForm] = useState({
    title: '', description: '', deadline: '', status: 'pendente', memberIds: []
  });
  const [stageForm, setStageForm] = useState({
    title: '', description: '', responsible: '', deadline: '', status: 'pendente'
  });

  const setPF = (k, v) => setProjectForm(f => ({ ...f, [k]: v }));
  const setSF = (k, v) => setStageForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const q = query(collection(db, 'goals'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjects(list);

      const stagesMap = {};
      for (const p of list) {
        const sq = query(collection(db, 'projectStages'), where('projectId', '==', p.id), orderBy('order', 'asc'));
        const sSnap = await getDocs(sq);
        stagesMap[p.id] = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setStages(stagesMap);
    });
    return unsub;
  }, []);

  // Realtime stages when expanded
  useEffect(() => {
    if (!expandedId) return;
    const sq = query(collection(db, 'projectStages'), where('projectId', '==', expandedId), orderBy('order', 'asc'));
    const unsub = onSnapshot(sq, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStages(prev => ({ ...prev, [expandedId]: items }));
      // Update progress
      if (items.length > 0) {
        const done = items.filter(i => i.status === 'concluído').length;
        updateDoc(doc(db, 'goals', expandedId), { progress: Math.round((done / items.length) * 100) });
      }
    });
    return unsub;
  }, [expandedId]);

  // Visible projects: creator OR member
  const visibleProjects = projects.filter(p =>
    p.creatorId === user.uid || (p.memberIds || []).includes(user.uid)
  );

  const toggleMember = (uid) => {
    setProjectForm(f => {
      const ids = f.memberIds || [];
      return { ...f, memberIds: ids.includes(uid) ? ids.filter(id => id !== uid) : [...ids, uid] };
    });
  };

  const openCreateProject = () => {
    setEditingProject(null);
    setProjectForm({ title: '', description: '', deadline: '', status: 'pendente', memberIds: [user.uid] });
    setShowProjectModal(true);
  };

  const openEditProject = (p) => {
    setEditingProject(p.id);
    setProjectForm({ title: p.title, description: p.description || '', deadline: p.deadline || '', status: p.status, memberIds: p.memberIds || [] });
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectForm.title) return;
    setLoading(true);
    try {
      if (editingProject) {
        await updateDoc(doc(db, 'goals', editingProject), { ...projectForm, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'goals'), {
          ...projectForm,
          creatorId: user.uid,
          creatorName: profile?.name,
          progress: 0,
          createdAt: serverTimestamp(),
        });
      }
      setShowProjectModal(false);
    } finally { setLoading(false); }
  };

  const handleDeleteProject = async (p) => {
    if (!confirm('Excluir este projeto e todas suas etapas?')) return;
    const items = stages[p.id] || [];
    for (const s of items) await deleteDoc(doc(db, 'projectStages', s.id));
    await deleteDoc(doc(db, 'goals', p.id));
  };

  const openAddStage = (projectId) => {
    setEditingStage(null);
    setSelectedProjectId(projectId);
    const currentStages = stages[projectId] || [];
    setStageForm({ title: '', description: '', responsible: '', deadline: '', status: 'pendente', order: currentStages.length });
    setShowStageModal(true);
  };

  const openEditStage = (s) => {
    setEditingStage(s.id);
    setSelectedProjectId(s.projectId);
    setStageForm({ title: s.title, description: s.description || '', responsible: s.responsible || '', deadline: s.deadline || '', status: s.status, order: s.order || 0 });
    setShowStageModal(true);
  };

  const handleSaveStage = async () => {
    if (!stageForm.title) return;
    setLoading(true);
    try {
      if (editingStage) {
        await updateDoc(doc(db, 'projectStages', editingStage), { ...stageForm, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'projectStages'), {
          ...stageForm,
          projectId: selectedProjectId,
          createdAt: serverTimestamp(),
        });
      }
      setShowStageModal(false);
    } finally { setLoading(false); }
  };

  const updateStageStatus = (s, status) =>
    updateDoc(doc(db, 'projectStages', s.id), { status });

  const deleteStage = async (s) => {
    if (!confirm('Excluir esta etapa?')) return;
    await deleteDoc(doc(db, 'projectStages', s.id));
  };

  const STATUS_COLOR = {
    'pendente': 'bg-amber-100 text-amber-700 border-amber-200',
    'em andamento': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">Projetos</h1>
          <p className="text-stone-400 text-sm">{visibleProjects.length} projetos</p>
        </div>
        <button onClick={openCreateProject} className="btn-primary">
          <Plus size={16} /> Novo Projeto
        </button>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum projeto criado ainda</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleProjects.map(p => {
            const isExpanded = expandedId === p.id;
            const pStages = stages[p.id] || [];
            const done = pStages.filter(s => s.status === 'concluído').length;
            const progress = pStages.length > 0 ? Math.round((done / pStages.length) * 100) : (p.progress || 0);
            const isOverdue = p.deadline && isPast(new Date(p.deadline)) && p.status !== 'concluído';
            const isCreator = p.creatorId === user.uid;
            const memberUsers = allUsers.filter(u => (p.memberIds || []).includes(u.uid || u.id));

            return (
              <div key={p.id} className={`card ${isOverdue ? 'border-red-200' : ''}`}>
                <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-800">{p.title}</h3>
                      <span className={`badge text-[10px] ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                      {isOverdue && <span className="flex items-center gap-1 text-xs text-red-500"><AlertTriangle size={11} /> Atrasado</span>}
                      {!isCreator && <span className="flex items-center gap-1 text-[10px] text-stone-400"><Lock size={9} /> Membro</span>}
                    </div>
                    {p.deadline && <p className="text-xs text-stone-400 mt-0.5">📅 {format(new Date(p.deadline), "d MMM yyyy", { locale: ptBR })}</p>}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>{done}/{pStages.length} etapas</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-1 flex-shrink-0">
                    {isCreator && (
                      <>
                        <button onClick={e => { e.stopPropagation(); openEditProject(p); }}
                          className="p-1.5 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteProject(p); }}
                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 border-t border-stone-100 pt-4 space-y-4 animate-fade-in">
                    {p.description && <p className="text-sm text-stone-600">{p.description}</p>}

                    {/* Members */}
                    {memberUsers.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Users size={11} /> Membros com acesso
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {memberUsers.map(u => (
                            <span key={u.uid || u.id} className="flex items-center gap-1.5 text-xs bg-stone-100 text-stone-700 rounded-full px-2.5 py-1 border border-stone-200">
                              {u.emoji || '👤'} {u.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stages */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Etapas do Projeto</p>
                        <button onClick={() => openAddStage(p.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                          <Plus size={12} /> Adicionar etapa
                        </button>
                      </div>

                      {pStages.length === 0 ? (
                        <p className="text-xs text-stone-300 italic">Nenhuma etapa cadastrada</p>
                      ) : (
                        <div className="space-y-2">
                          {pStages.map((s, idx) => {
                            const stageOverdue = s.deadline && isPast(new Date(s.deadline)) && s.status !== 'concluído';
                            return (
                              <div key={s.id} className="border border-stone-200 rounded-xl p-3 bg-stone-50/50">
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className={`text-sm font-medium ${s.status === 'concluído' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                                        {s.title}
                                      </p>
                                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[s.status]}`}>
                                        {s.status}
                                      </span>
                                      {stageOverdue && <span className="text-xs text-red-500">⚠️</span>}
                                    </div>
                                    {s.description && <p className="text-xs text-stone-500 mt-0.5">{s.description}</p>}
                                    <div className="flex gap-3 mt-1 flex-wrap">
                                      {s.responsible && <span className="text-xs text-stone-400">👤 {s.responsible}</span>}
                                      {s.deadline && (
                                        <span className={`text-xs ${stageOverdue ? 'text-red-500' : 'text-stone-400'}`}>
                                          📅 {format(new Date(s.deadline), "d MMM", { locale: ptBR })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {/* Status cycle */}
                                    <button onClick={() => {
                                      const next = { 'pendente': 'em andamento', 'em andamento': 'concluído', 'concluído': 'pendente' };
                                      updateStageStatus(s, next[s.status]);
                                    }} className="p-1 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Alterar status">
                                      {s.status === 'concluído'
                                        ? <CheckSquare size={15} className="text-emerald-500" />
                                        : s.status === 'em andamento'
                                          ? <Square size={15} className="text-indigo-400" />
                                          : <Square size={15} className="text-stone-300" />}
                                    </button>
                                    <button onClick={() => openEditStage(s)}
                                      className="p-1 text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                                      <Edit2 size={12} />
                                    </button>
                                    <button onClick={() => deleteStage(s)}
                                      className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>
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

      {/* PROJECT MODAL */}
      {showProjectModal && (
        <Modal title={editingProject ? 'Editar Projeto' : 'Novo Projeto'} onClose={() => setShowProjectModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Título *</label>
              <input type="text" className="input" placeholder="Nome do projeto"
                value={projectForm.title} onChange={e => setPF('title', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input min-h-[70px] resize-none" placeholder="Descreva o projeto..."
                value={projectForm.description} onChange={e => setPF('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prazo</label>
                <input type="date" className="input" value={projectForm.deadline} onChange={e => setPF('deadline', e.target.value)} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input appearance-none" value={projectForm.status} onChange={e => setPF('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Member selector */}
            <div>
              <label className="label">Quem pode ver este projeto ({(projectForm.memberIds || []).length} selecionados)</label>
              <div className="max-h-44 overflow-y-auto space-y-1 border border-stone-200 rounded-xl p-2 bg-stone-50">
                {allUsers.map(u => {
                  const uid = u.uid || u.id;
                  const selected = (projectForm.memberIds || []).includes(uid);
                  return (
                    <button key={uid} type="button" onClick={() => toggleMember(uid)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left
                        ${selected ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'hover:bg-white border border-transparent text-stone-600'}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-stone-300 bg-white'}`}>
                        {selected && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-base leading-none">{u.emoji || '👤'}</span>
                      <span className="font-medium truncate">{u.name}</span>
                      <span className="text-xs text-stone-400 ml-auto flex-shrink-0">{u.department}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowProjectModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSaveProject} disabled={loading || !projectForm.title} className="btn-primary flex-1 justify-center">
                {loading ? 'Salvando...' : 'Salvar Projeto'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* STAGE MODAL */}
      {showStageModal && (
        <Modal title={editingStage ? 'Editar Etapa' : 'Nova Etapa'} onClose={() => setShowStageModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Nome da etapa *</label>
              <input type="text" className="input" placeholder="Ex: Levantamento de requisitos"
                value={stageForm.title} onChange={e => setSF('title', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Descrição</label>
              <textarea className="input min-h-[60px] resize-none" placeholder="Detalhes desta etapa..."
                value={stageForm.description} onChange={e => setSF('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Responsável</label>
                <input type="text" className="input" placeholder="Nome do responsável"
                  value={stageForm.responsible} onChange={e => setSF('responsible', e.target.value)} />
              </div>
              <div>
                <label className="label">Prazo</label>
                <input type="date" className="input" value={stageForm.deadline} onChange={e => setSF('deadline', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} type="button" onClick={() => setSF('status', s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all
                      ${stageForm.status === s ? 'bg-indigo-100 border-indigo-400 border text-indigo-700' : 'bg-white border border-stone-200 text-stone-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowStageModal(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleSaveStage} disabled={loading || !stageForm.title} className="btn-primary flex-1 justify-center">
                {loading ? 'Salvando...' : 'Salvar Etapa'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
