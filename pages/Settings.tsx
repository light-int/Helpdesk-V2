import React, { useState } from 'react';
import { RefreshCw, Plus, Trash2, Edit3, UserPlus, User, Wrench, Zap, Lock, Shield, Save, Webhook, Globe, Palette, Type, Bell, Moon, Sun, FileText, Image, Layout, Activity, CheckCircle2, AlertTriangle, Settings2, AlertCircle } from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { UserProfile, Prestation, UserRole, DocumentTemplate, VAPID_PUBLIC_KEY } from '../types';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../services/supabaseClient';
import { getPushPermissionStatus, subscribeToPush, unsubscribeFromPush } from '../services/pushNotifications';

const AVAILABLE_VARIABLES = [
   { label: 'Nom Client', value: '{{client_nom}}' },
   { label: 'Tel Client', value: '{{client_tel}}' },
   { label: 'N° Ticket', value: '{{ticket_id}}' },
   { label: 'Date', value: '{{date}}' },
   { label: 'Marque', value: '{{marque}}' },
   { label: 'Modèle', value: '{{modele}}' },
   { label: 'N° Série', value: '{{serie}}' },
   { label: 'Total', value: '{{total}}' },
   { label: 'Technicien', value: '{{tech}}' },
];

const Settings: React.FC = () => {
   const _u = (() => { try { return useData(); } catch { return { users: [], saveUser: () => { }, deleteUser: () => { }, brands: [], addBrand: () => { }, deleteBrand: () => { }, prestations: [], savePrestation: () => { }, deletePrestation: () => { }, isLoading: false, config: { theme: 'light', accentColor: '#3ecf8e', webhooks: [] } as any, updateConfig: () => { }, templates: [], saveTemplate: () => { }, deleteTemplate: () => { }, hardReset: () => { }, saveTechnician: () => { } }; } })();
   const {
      users = _u.users, saveUser = _u.saveUser, deleteUser = _u.deleteUser,
      brands = _u.brands, addBrand = _u.addBrand, deleteBrand = _u.deleteBrand,
      prestations = _u.prestations, savePrestation = _u.savePrestation, deletePrestation = _u.deletePrestation,
      isLoading = _u.isLoading, config = _u.config, updateConfig = _u.updateConfig,
      templates = _u.templates, saveTemplate = _u.saveTemplate, deleteTemplate = _u.deleteTemplate,
      hardReset = _u.hardReset, saveTechnician = _u.saveTechnician
   } = _u;

   const { addNotification, showModalNotification } = (() => { try { return useNotifications(); } catch { return { addNotification: () => { }, showModalNotification: () => { } }; } })();
   const { currentUser } = (() => { try { return useUser(); } catch { return { currentUser: null }; } })();


   const [activeTab, setActiveTab] = useState<'users' | 'brands' | 'pricing' | 'integrations' | 'appearance' | 'templates' | 'system'>('users');
   const [isUserModalOpen, setIsUserModalOpen] = useState(false);
   const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
   const [isSaving, setIsSaving] = useState(false);

   // Hard Reset state
   const [isResetModalOpen, setIsResetModalOpen] = useState(false);
   const [resetPassword, setResetPassword] = useState('');
   const [isResetting, setIsResetting] = useState(false);

   // Brand modal state
   const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
   const [newBrandName, setNewBrandName] = useState('');

   // Prestation modal state
   const [isPrestationModalOpen, setIsPrestationModalOpen] = useState(false);
   const [editingPrestation, setEditingPrestation] = useState<Prestation | null>(null);
   const [prestationForm, setPrestationForm] = useState({ name: '', fixedCost: '' });

   // Template modal state
   const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
   const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
   const [previewScale, setPreviewScale] = useState(0.85);

   // Deletion confirmation state
   const [deleteConfirm, setDeleteConfirm] = useState<{
      type: 'user' | 'brand' | 'prestation' | 'template' | 'webhook';
      id: string;
      label: string;
      message: string;
   } | null>(null);

   // Use config values with defaults
   const theme = config?.theme || 'light';
   const accentColor = config?.accentColor || '#3ecf8e';
   const apiKey = config?.apiKey || 'pk_live_' + Math.random().toString(36).substring(2, 15);
   const webhooks = config?.webhooks || [];
   const emailNotifications = config?.emailNotifications ?? true;
   const desktopNotifications = config?.desktopNotifications ?? true;
   const soundNotifications = config?.soundNotifications ?? true;
  const pushMobile = config?.pushNotifications ?? false;

   const tabs = [
      { id: 'users', label: 'Utilisateurs', icon: <UserPlus size={18} /> },
      { id: 'brands', label: 'Marques', icon: <Shield size={18} /> },
      { id: 'pricing', label: 'Prestations', icon: <Zap size={18} /> },
      { id: 'integrations', label: 'Intégrations', icon: <Webhook size={18} /> },
      { id: 'appearance', label: 'Personnalisation', icon: <Palette size={18} /> },
      { id: 'templates', label: 'Documents', icon: <FileText size={18} /> },
      ...(currentUser?.role === 'ADMIN' ? [{ id: 'system', label: 'Système', icon: <Settings2 size={18} /> }] : []),
   ] as const;

   const VARIABLE_GROUPS = [
      {
         title: 'Client',
         icon: <User size={10} />,
         items: AVAILABLE_VARIABLES.filter(v => ['Nom Client', 'Tel Client'].includes(v.label))
      },
      {
         title: 'Ticket',
         icon: <Activity size={10} />,
         items: AVAILABLE_VARIABLES.filter(v => ['N° Ticket', 'Date', 'Total', 'Technicien'].includes(v.label))
      },
      {
         title: 'Appareil',
         icon: <Wrench size={10} />,
         items: AVAILABLE_VARIABLES.filter(v => ['Marque', 'Modèle', 'N° Série'].includes(v.label))
      }
   ];

   const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSaving(true);
      const formData = new FormData(e.currentTarget);

      const userData: UserProfile = {
         id: editingUser?.id || `U-${Date.now()}`,
         name: formData.get('name') as string,
         email: formData.get('email') as string,
         role: formData.get('role') as UserRole,
         status: 'Actif',
         avatar: editingUser?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
         password: formData.get('password') as string || editingUser?.password
      };

      try {
         const userId = editingUser?.id || `U-${Date.now()}`;
         userData.id = userId;
         await saveUser(userData);

         if (userData.role === 'TECHNICIAN') {
            await saveTechnician({
               id: userId,
               name: userData.name,
                email: userData.email || '',
               phone: '',
               specialty: ['SAV'],
               showroom: userData.showroom || '',
               avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=3ecf8e&color=ffffff`,
               status: 'Disponible',
               activeTickets: 0,
               completedTickets: 0,
               avgResolutionTime: '0h',
               rating: 5.0,
               nps: 100,
               firstFixRate: 100,
               performanceHistory: [],
               maxWorkload: 5
            });
         }

         addNotification({ title: 'Succès', message: 'Utilisateur enregistré.', type: 'success' });
         setIsUserModalOpen(false);
         setEditingUser(null);
      } catch (err) {
         addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde.', type: 'error' });
      } finally {
         setIsSaving(false);
      }
   };

   const handleHardReset = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser?.email) return;

      setIsResetting(true);
      try {
         // Re-authentifier pour vérifier le mot de passe
         const { error } = await supabase.auth.signInWithPassword({
            email: currentUser.email,
            password: resetPassword
         });

         if (error) {
            addNotification({ title: 'Erreur', message: 'Mot de passe incorrect.', type: 'error' });
            setIsResetting(false);
            return;
         }

         await hardReset?.();
         addNotification({ title: 'Succès', message: 'Le système a été réinitialisé avec succès.', type: 'success' });
         setIsResetModalOpen(false);
         setResetPassword('');
         window.location.href = '/'; // Recharger l'application pour effacer l'état local
      } catch (err) {
         console.error('Hard Reset Error:', err);
         addNotification({ title: 'Erreur', message: 'Échec de la réinitialisation.', type: 'error' });
      } finally {
         setIsResetting(false);
      }
   };

   const handleConfirmDelete = async () => {
      if (!deleteConfirm) return;
      try {
         switch (deleteConfirm.type) {
            case 'user': await deleteUser(deleteConfirm.id); break;
            case 'brand': await deleteBrand(deleteConfirm.id); break;
            case 'prestation': await deletePrestation(deleteConfirm.id); break;
            case 'template': await deleteTemplate(deleteConfirm.id); break;
            case 'webhook':
               const updated = webhooks.filter((w: any) => w.id !== deleteConfirm.id);
               await updateConfig({ webhooks: updated });
               break;
         }
         showModalNotification({ title: 'Enregistré ✓', message: 'Utilisateur enregistré avec succès.', type: 'success' });
      } catch {
         showModalNotification({ title: 'Échec', message: 'Échec de la sauvegarde.', type: 'error' });
      } finally {
         setDeleteConfirm(null);
      }
   };

   return (
      <div className="max-w-7xl mx-auto p-4 md:p-3 space-y-5 animate-sb-entry pb-20">
         <header className="space-y-3">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e]">
                  <Settings2 size={18} />
               </div>
               <div>
                  <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                     Paramètres
                  </h1>
                  <p className="text-xs text-[#686868] font-semibold uppercase tracking-wider mt-0.5">Configuration et administration du système.</p>
               </div>
            </div>

            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit overflow-x-auto">
               {tabs.map((tab) => (
                  <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id as any)}
                     className={`flex items-center gap-2 px-6 py-2 text-[9px] font-semibold uppercase tracking-widest rounded-lg transition-all ${activeTab === tab.id
                        ? 'bg-white shadow-sm text-[#1c1c1c]'
                        : 'text-[#686868] hover:text-[#1c1c1c]'
                        }`}
                  >
                     {React.cloneElement(tab.icon as React.ReactElement, { size: 14 })}
                     {tab.label}
                  </button>
               ))}
            </div>
         </header>

         <div className="animate-sb-entry">
            {activeTab === 'users' && (
               <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-4 mb-4">
                     <AlertCircle size={16} className="text-amber-600 mt-1" />
                     <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-900 uppercase">Synchronisation d'Accès</p>
                        <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                           Pour activer la connexion, assurez-vous que l'email de l'utilisateur est également enregistré dans votre console <span className="font-semibold underline">Supabase Auth</span>.
                           Le profil sql "users" sera synchronisé automatiquement lors de leur première session.
                        </p>
                     </div>
                  </div>

                  <div className="flex justify-end">
                     <button
                        onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                        className="btn-sb-primary flex items-center gap-2"
                     >
                        <Plus size={16} /> Nouvel Utilisateur
                     </button>
                  </div>

                  <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
                     <table className="w-full">
                        <thead className="bg-[#f8f9fa]">
                           <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#686868]">Nom</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#686868]">Email</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#686868]">Rôle</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-[#686868]">Actions</th>
                           </tr>
                        </thead>
                        <tbody>
                           {users?.map((user: UserProfile) => (
                              <tr key={user.id} className="border-t border-[#f0f0f0]">
                                 <td className="px-4 py-3 font-semibold">{user.name}</td>
                                 <td className="px-4 py-3 text-[#686868]">{user.email}</td>
                                 <td className="px-4 py-3">
                                    <span className="px-2 py-1 bg-[#f0fdf4] text-[#16a34a] text-xs rounded-full">
                                       {user.role}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <button
                                       onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}
                                       className="text-[#686868] hover:text-[#3ecf8e] mr-3"
                                    >
                                       <Edit3 size={16} />
                                    </button>
                                    <button
                                       onClick={() => setDeleteConfirm({
                                          type: 'user',
                                          id: user.id,
                                          label: 'Utilisateur',
                                          message: `Voulez-vous vraiment supprimer l'utilisateur ${user.name} ?`
                                       })}
                                       className="text-[#686868] hover:text-red-500"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === 'brands' && (
               <div className="space-y-4">
                  <div className="flex justify-end">
                     <button
                        onClick={() => { setNewBrandName(''); setIsBrandModalOpen(true); }}
                        className="btn-sb-primary flex items-center gap-2"
                     >
                        <Plus size={16} /> Nouvelle Marque
                     </button>
                  </div>
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 text-center py-12">
                     <h3 className="font-semibold mb-4">Marques Partenaires</h3>
                     <div className="flex flex-wrap justify-center gap-3">
                        {brands?.map((brand: string) => (
                           <div key={brand} className="flex items-center gap-3 px-4 py-2 bg-[#f8f9fa] rounded-lg border border-[#e5e5e5] group hover:border-[#3ecf8e]/30 transition-all">
                              <span className="font-semibold text-sm text-[#1c1c1c]">{brand}</span>
                              <button
                                 onClick={() => setDeleteConfirm({
                                    type: 'brand',
                                    id: brand,
                                    label: 'Marque',
                                    message: `Voulez-vous vraiment supprimer la marque ${brand} ?`
                                 })}
                                 className="text-[#9ca3af] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        ))}
                        {brands?.length === 0 && (
                           <p className="text-sm text-[#686868]">Aucune marque enregistrée</p>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'pricing' && (
               <div className="space-y-4">
                  <div className="flex justify-end">
                     <button
                        onClick={() => {
                           setEditingPrestation(null);
                           setPrestationForm({ name: '', fixedCost: '' });
                           setIsPrestationModalOpen(true);
                        }}
                        className="btn-sb-primary flex items-center gap-2"
                     >
                        <Plus size={16} /> Nouvelle Prestation
                     </button>
                  </div>
                  <div className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden">
                     <table className="w-full">
                        <thead className="bg-[#f8f9fa]">
                           <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-[#686868]">Prestation</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-[#686868]">Prix (F CFA)</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-[#686868]">Actions</th>
                           </tr>
                        </thead>
                        <tbody>
                           {prestations?.map((p: Prestation) => (
                              <tr key={p.id} className="border-t border-[#f0f0f0]">
                                 <td className="px-4 py-3 font-semibold">{p.name}</td>
                                 <td className="px-4 py-3 text-right font-semibold text-[#1c1c1c]">{p.fixedCost?.toLocaleString()} F</td>
                                 <td className="px-4 py-3 text-right">
                                    <button
                                       onClick={() => {
                                          setEditingPrestation(p);
                                          setPrestationForm({ name: p.name, fixedCost: p.fixedCost.toString() });
                                          setIsPrestationModalOpen(true);
                                       }}
                                       className="text-[#686868] hover:text-[#3ecf8e] mr-3"
                                    >
                                       <Edit3 size={16} />
                                    </button>
                                    <button
                                       onClick={() => setDeleteConfirm({
                                          type: 'prestation',
                                          id: p.id,
                                          label: 'Prestation',
                                          message: `Voulez-vous vraiment supprimer la prestation ${p.name} ?`
                                       })}
                                       className="text-[#686868] hover:text-red-500"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}

            {activeTab === 'integrations' && (
               <div className="space-y-4">
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-4">
                     <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-50 rounded-lg">
                           <Globe size={18} className="text-[#3ecf8e]" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-sm text-[#1c1c1c]">Clé API de Sécurité</h3>
                           <p className="text-sm text-[#686868]">Indispensable pour l'interconnexion avec vos outils tiers</p>
                        </div>
                     </div>
                     <div className="flex gap-3 bg-[#fcfcfc] p-4 rounded-lg border border-[#e5e5e5]">
                        <input
                           type="password"
                           value={apiKey}
                           readOnly
                           className="bg-transparent flex-1 font-mono text-sm border-none focus:ring-0"
                        />
                        <button
                           onClick={() => {
                              navigator.clipboard.writeText(apiKey);
                              addNotification({ title: 'Copié', message: 'Clé API copiée', type: 'success' });
                           }}
                           className="btn-sb-outline h-10"
                        >
                           Copier
                        </button>
                        <button
                           onClick={async () => {
                              const newKey = 'pk_live_' + Math.random().toString(36).substring(2, 15);
                              await updateConfig({ apiKey: newKey });
                              addNotification({ title: 'Régénérée', message: 'Clé API renouvelée', type: 'success' });
                           }}
                           className="btn-sb-primary h-10"
                        >
                           Régénérer
                        </button>
                     </div>
                  </div>

                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-4">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-blue-50 rounded-lg">
                              <Webhook size={18} className="text-blue-500" />
                           </div>
                           <div>
                              <h3 className="font-semibold text-sm text-[#1c1c1c]">Webhooks (Flux Sortants)</h3>
                              <p className="text-sm text-[#686868]">Notifiez vos systèmes externes en temps réel</p>
                           </div>
                        </div>
                        <button
                           onClick={async () => {
                              const newWebhook = { id: Date.now().toString(), url: '', events: [] as string[], active: true };
                              await updateConfig({ webhooks: [...webhooks, newWebhook] });
                           }}
                           className="btn-sb-primary flex items-center gap-2"
                        >
                           <Plus size={16} /> Ajouter un point de terminaison
                        </button>
                     </div>

                     <div className="space-y-4">
                        {webhooks.map((webhook: any) => (
                           <div key={webhook.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 bg-[#fcfcfc] rounded-lg border border-[#e5e5e5] group hover:border-[#3ecf8e]/30 transition-all">
                              <div className="flex-1 w-full">
                                 <input
                                    type="text"
                                    placeholder="https://votre-api.com/webhook"
                                    value={webhook.url}
                                    onChange={async (e) => {
                                       const updated = webhooks.map((w: any) => w.id === webhook.id ? { ...w, url: e.target.value } : w);
                                       await updateConfig({ webhooks: updated });
                                    }}
                                    className="sb-input w-full bg-white font-semibold mb-2"
                                 />
                                 <div className="flex flex-wrap gap-1">
                                    {['ticket.created', 'ticket.updated', 'ticket.resolved'].map(event => (
                                       <button
                                          key={event}
                                          onClick={async () => {
                                             const currentEvents = webhook.events || [];
                                             const newEvents = currentEvents.includes(event)
                                                ? currentEvents.filter((e: string) => e !== event)
                                                : [...currentEvents, event];
                                             const updated = webhooks.map((w: any) => w.id === webhook.id ? { ...w, events: newEvents } : w);
                                             await updateConfig({ webhooks: updated });
                                          }}
                                          className={`px-2 py-1 rounded text-[11px] font-semibold uppercase transition-all ${webhook.events?.includes(event) ? 'bg-[#3ecf8e] text-white' : 'bg-gray-100 text-gray-400'}`}
                                       >
                                          {event.replace('.', ' ')}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                              <div className="flex items-center gap-3 self-end md:self-center">
                                 <button
                                    onClick={async () => {
                                       const updated = webhooks.map((w: any) => w.id === webhook.id ? { ...w, active: !w.active } : w);
                                       await updateConfig({ webhooks: updated });
                                    }}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all ${webhook.active ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-gray-100 text-gray-500'}`}
                                 >
                                    {webhook.active ? 'Actif' : 'Pause'}
                                 </button>
                                 <button
                                    onClick={() => setDeleteConfirm({
                                       type: 'webhook',
                                       id: webhook.id,
                                       label: 'Webhook',
                                       message: 'Voulez-vous vraiment supprimer ce point de terminaison webhook ?'
                                    })}
                                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                 >
                                    <Trash2 size={18} />
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {activeTab === 'appearance' && (
               <div className="space-y-8 max-w-4xl">
                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-4 shadow-sm">
                     <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-violet-50 rounded-lg">
                           <Layout size={18} className="text-violet-500" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-sm text-[#1c1c1c]">Thème Graphique</h3>
                           <p className="text-sm text-[#686868]">Personnalisez l'ambiance visuelle de votre espace de travail</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                           onClick={async () => {
                              await updateConfig({ theme: 'light' });
                              addNotification({ title: 'Thème', message: 'Mode clair activé', type: 'success' });
                           }}
                           className={`group relative flex flex-col gap-4 p-5 rounded-lg border-2 transition-all text-left ${theme === 'light' ? 'border-[#3ecf8e] bg-[#f0fdf4]' : 'border-[#e5e5e5] bg-white hover:border-[#3ecf8e]/30 shadow-sm'}`}
                        >
                           <div className="aspect-video w-full bg-[#f8f9fa] rounded-lg border border-[#e5e5e5] p-3 flex flex-col gap-2 shadow-sm ring-1 ring-black/5">
                              <div className="h-2 w-1/2 bg-gray-200 rounded-full"></div>
                              <div className="flex gap-2">
                                 <div className="h-8 w-full bg-white rounded-lg border border-[#e5e5e5]"></div>
                                 <div className="h-8 w-1/3 bg-[#3ecf8e] rounded-lg"></div>
                              </div>
                              <div className="mt-auto flex gap-1">
                                 <div className="h-1.5 w-1/4 bg-gray-100 rounded-full"></div>
                                 <div className="h-1.5 w-1/4 bg-gray-100 rounded-full"></div>
                              </div>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Sun size={16} className={theme === 'light' ? 'text-[#16a34a]' : 'text-gray-400'} />
                                 <span className="font-semibold text-sm">Mode Lumineux</span>
                              </div>
                              {theme === 'light' && <CheckCircle2 size={18} className="text-[#3ecf8e]" />}
                           </div>
                        </button>

                        <button
                           onClick={async () => {
                              await updateConfig({ theme: 'dark' });
                              addNotification({ title: 'Thème', message: 'Mode sombre activé', type: 'success' });
                           }}
                           className={`group relative flex flex-col gap-4 p-5 rounded-lg border-2 transition-all text-left ${theme === 'dark' ? 'border-[#3ecf8e] bg-[#3ecf8e]/10' : 'border-[#e5e5e5] bg-white hover:border-[#3ecf8e]/30 shadow-sm'}`}
                        >
                           <div className="aspect-video w-full bg-[#121212] rounded-lg border border-[#2e2e2e] p-3 flex flex-col gap-2 shadow-sm ring-1 ring-white/5">
                              <div className="h-2 w-1/2 bg-[#2e2e2e] rounded-full"></div>
                              <div className="flex gap-2">
                                 <div className="h-8 w-full bg-[#1c1c1c] rounded-lg border border-[#2e2e2e]"></div>
                                 <div className="h-8 w-1/3 bg-[#3ecf8e] rounded-lg"></div>
                              </div>
                              <div className="mt-auto flex gap-1">
                                 <div className="h-1.5 w-1/4 bg-[#2e2e2e] rounded-full"></div>
                                 <div className="h-1.5 w-1/4 bg-[#2e2e2e] rounded-full"></div>
                              </div>
                           </div>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <Moon size={16} className={theme === 'dark' ? 'text-[#3ecf8e]' : 'text-gray-400'} />
                                 <span className="font-semibold text-sm">Mode Sombre</span>
                              </div>
                              {theme === 'dark' && <CheckCircle2 size={18} className="text-[#3ecf8e]" />}
                           </div>
                        </button>
                     </div>
                  </div>

                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-4 shadow-sm">
                     <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-pink-50 rounded-lg">
                           <Palette size={18} className="text-pink-500" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-sm text-[#1c1c1c]">Identité Visuelle (Accent)</h3>
                           <p className="text-sm text-[#686868]">Sélectionnez la teinte dominante de votre interface industrielle</p>
                        </div>
                     </div>
                     <div className="flex gap-4 flex-wrap">
                        {['#3ecf8e', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#1c1c1c'].map((color) => (
                           <button
                              key={color}
                              onClick={async () => {
                                 await updateConfig({ accentColor: color });
                                 addNotification({ title: 'Couleur', message: 'Identité visuelle mise à jour', type: 'success' });
                              }}
                              className={`w-14 h-14 rounded-lg border-4 transition-all relative flex items-center justify-center hover:scale-110 active:scale-95 ${accentColor === color ? 'border-[#3ecf8e] shadow-md shadow-[#3ecf8e]/20' : 'border-white shadow-sm hover:shadow-md'}`}
                              style={{ backgroundColor: color }}
                           >
                              {accentColor === color && <Save size={16} className="text-white drop-shadow-md" />}
                           </button>
                        ))}
                        <div className="w-14 h-14 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center group cursor-pointer relative overflow-hidden hover:bg-gray-100 transition-colors">
                           <input
                              type="color"
                              value={accentColor}
                              onChange={async (e) => await updateConfig({ accentColor: e.target.value })}
                              className="w-[200%] h-[200%] opacity-0 cursor-pointer absolute -top-[50%] -left-[50%]"
                           />
                           <Plus size={16} className="text-gray-400 group-hover:text-[#3ecf8e] transition-colors" />
                        </div>
                     </div>
                  </div>

                  <div className="bg-white rounded-lg border border-[#e5e5e5] p-4 shadow-sm">
                     <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-amber-50 rounded-lg">
                           <Bell size={18} className="text-amber-500" />
                        </div>
                        <div>
                           <h3 className="font-semibold text-sm text-[#1c1c1c]">Canaux de Notifications</h3>
                           <p className="text-sm text-[#686868]">Configurez comment vous souhaitez être alerté des activités</p>
                        </div>
                     </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                         {[
                            { id: 'email', label: 'Email', desc: 'Alertes par courriel', icon: <Globe size={16} />, key: 'emailNotifications', value: emailNotifications },
                            { id: 'desktop', label: 'Bureau', desc: 'Push navigateur', icon: <Layout size={16} />, key: 'desktopNotifications', value: desktopNotifications },
                            { id: 'push', label: 'Mobile', desc: 'Notifications push', icon: <Bell size={16} />, key: 'pushNotifications', value: pushMobile },
                            { id: 'sound', label: 'Audio', desc: 'Signal sonore', icon: <Bell size={16} />, key: 'soundNotifications', value: soundNotifications }
                         ].map((pref: any) => (
                           <label key={pref.id} className={`flex flex-col gap-4 p-5 rounded-lg border-2 cursor-pointer transition-all ${pref.value ? 'border-[#3ecf8e] bg-[#f0fdf4]' : 'border-[#e5e5e5] bg-white hover:border-gray-300 shadow-sm'}`}>
                              <div className="flex justify-between items-center">
                                 <div className={`p-2.5 rounded-lg ${pref.value ? 'bg-[#3ecf8e] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {pref.icon}
                                 </div>
                                 <div className={`w-10 h-6 rounded-full relative transition-colors duration-300 ${pref.value ? 'bg-[#3ecf8e]' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${pref.value ? 'left-5' : 'left-1'}`} />
                                    <input
                                       type="checkbox"
                                       className="hidden"
                                       checked={pref.value}
                                        onChange={async (e) => {
                                           if (pref.key === 'pushNotifications') {
                                              if (e.target.checked) {
                                                 const ok = await subscribeToPush(currentUser?.id || '', VAPID_PUBLIC_KEY);
                                                 if (!ok) {
                                                    addNotification({ title: 'Push refusé', message: 'Vérifiez les permissions navigateur.', type: 'warning' });
                                                    return;
                                                 }
                                              } else {
                                                 await unsubscribeFromPush(currentUser?.id || '');
                                              }
                                           }
                                           await updateConfig({ [pref.key]: e.target.checked });
                                        }}
                                    />
                                 </div>
                              </div>
                              <div>
                                 <p className="font-semibold text-[15px] text-[#1c1c1c] uppercase tracking-wide">{pref.label}</p>
                                 <p className="text-[12px] font-semibold text-[#686868] mt-1 uppercase opacity-60 tracking-tight">{pref.desc}</p>
                              </div>
                           </label>
                        ))}
                      </div>
                   </div>
                   {currentUser?.role === 'ADMIN' && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-[#e5e5e5]">
                         <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-[#f0fdf4] rounded-lg">
                               <Bell size={18} className="text-[#3ecf8e]" />
                            </div>
                            <div>
                               <h3 className="font-semibold text-sm text-[#1c1c1c]">Serveur Push</h3>
                               <p className="text-sm text-[#686868]">URL de l'Edge Function Supabase pour les notifications push</p>
                            </div>
                         </div>
                         <input
                            type="url"
                            placeholder="https://[projet].supabase.co/functions/v1/send-push"
                            defaultValue={config?.pushEndpoint || ''}
                            onBlur={async (e) => {
                               await updateConfig({ pushEndpoint: e.target.value });
                            }}
                            className="w-full"
                         />
                         <p className="text-[10px] text-[#686868] font-semibold mt-1">
                            Déployer avec: <code className="text-[#3ecf8e]">supabase functions deploy send-push</code>
                         </p>
                      </div>
                   )}
                </div>
             )}

            {activeTab === 'templates' && (
               <div className="space-y-4">
                  <div className="flex justify-end">
                     <button
                        onClick={() => {
                           setEditingTemplate({
                              id: crypto.randomUUID(),
                              name: '',
                              type: 'BOTH',
                              isActive: false,
                              headerContent: '',
                              footerContent: '',
                              termsConditions: '',
                              primaryColor: '#3ecf8e',
                              fontFamily: 'Inter'
                           });
                           setIsTemplateModalOpen(true);
                        }}
                        className="btn-sb-primary flex items-center gap-2"
                     >
                        <Plus size={16} /> Nouveau Template
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     {templates?.map((t: DocumentTemplate) => (
                        <div key={t.id} className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden group hover:border-[#3ecf8e]/30 transition-all shadow-sm">
                           <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center border-b border-[#f0f0f0] relative">
                              <Layout size={48} className="text-[#e2e2e2]" />
                              <div className="absolute inset-0 bg-black/5 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                                 <button
                                    onClick={() => { setEditingTemplate(t); setIsTemplateModalOpen(true); }}
                                    className="p-3 bg-white rounded-lg shadow-md text-[#1c1c1c] hover:text-[#3ecf8e] transition-all hover:scale-110 active:scale-95"
                                 >
                                    <Edit3 size={18} />
                                 </button>
                              </div>
                           </div>
                           <div className="p-5">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="font-semibold text-xs text-[#1c1c1c] truncate uppercase tracking-tight">{t.name}</h3>
                                 <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-widest ${t.isActive ? 'bg-[#f0fdf4] text-[#16a34a]' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {t.isActive ? 'ACTIF' : 'INACTIF'}
                                 </span>
                              </div>
                              <div className="flex items-center justify-between text-[12px] font-semibold text-[#686868]">
                                 <span className="uppercase tracking-tight opacity-70">{t.type === 'BOTH' ? 'Devis & Factures' : t.type === 'QUOTATION' ? 'Devis' : 'Factures'}</span>
                                 <button
                                    onClick={() => setDeleteConfirm({
                                       type: 'template',
                                       id: t.id,
                                       label: 'Document',
                                       message: `Voulez-vous vraiment supprimer le modèle de document "${t.name}" ?`
                                    })}
                                    className="text-red-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                     {templates?.length === 0 && (
                        <div className="col-span-full py-16 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                           <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                           <p className="text-[#686868] font-semibold">Aucun gabarit configuré</p>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {activeTab === 'system' && currentUser?.role === 'ADMIN' && (
               <div className="space-y-4 animate-sb-entry">
                  <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                     <div className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                              <AlertTriangle size={18} />
                           </div>
                           <div>
                              <h3 className="text-sm font-semibold text-red-600 uppercase tracking-tight">Administration Système</h3>
                              <p className="text-[9px] text-[#686868] font-semibold uppercase tracking-widest">Protocole de maintenance critique</p>
                           </div>
                        </div>
                        <p className="text-xs text-[#1c1c1c] font-semibold leading-relaxed mb-4">
                           La "Zone de Danger" contient des commandes de bas niveau capables de modifier structurellement votre instance Horizon.
                           <span className="block mt-1 text-[#686868] text-xs italic">L'utilisation de ces outils nécessite une accréditation de niveau 5.</span>
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div className="p-3 bg-[#fcfcfc] border-2 border-dashed border-red-200 rounded-xl hover:bg-red-50/30 transition-all">
                              <div className="flex items-center gap-3 mb-2">
                                 <div className="w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center text-red-500 shadow-sm">
                                    <RefreshCw size={14} />
                                 </div>
                                 <h4 className="font-semibold text-red-700 text-[10px] uppercase tracking-wide">Réinitialisation Nucléaire</h4>
                              </div>
                              <p className="text-[9px] text-red-600/70 font-semibold leading-relaxed mb-3">
                                 Nettoie l'intégralité des tables opérationnelles (Tickets, Clients, Finance, Stock).
                                 Conserve uniquement l'infrastructure utilisateur et la configuration racine.
                              </p>
                              <button
                                 onClick={() => setIsResetModalOpen(true)}
                                 className="w-full py-2.5 bg-red-600 text-white rounded-lg font-semibold text-[9px] uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-sm btn-interactive"
                              >
                                 Déclencher le Reset
                              </button>
                           </div>

                           <div className="p-3 bg-gray-50/50 border border-[#e5e5e5] rounded-xl flex flex-col justify-center gap-2 opacity-50 grayscale select-none">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                                    <Save size={14} />
                                 </div>
                                 <h4 className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide">Sauvegarde Cloud</h4>
                              </div>
                              <p className="text-[9px] text-gray-400 italic font-semibold">
                                 Module de backup externe prochainement disponible.
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>

         {/* User Modal */}
         <Modal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            title={editingUser ? 'Détails Utilisateur' : 'Enrôlement Utilisateur'}
            size="md"
         >
            <form onSubmit={handleSaveUser} className="space-y-4">
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Identité Complète</label>
                  <input name="name" defaultValue={editingUser?.name} className="sb-input w-full" placeholder="Ex: Jean Dupont" required />
               </div>
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Contact Email</label>
                  <input name="email" type="email" defaultValue={editingUser?.email} className="sb-input w-full" placeholder="jean@sosmobiles.sn" required />
               </div>
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Permissions Système</label>
                  <select name="role" defaultValue={editingUser?.role || 'AGENT'} className="sb-input w-full font-semibold">
                     <option value="ADMIN">ADMINISTRATEUR</option>
                     <option value="MANAGER">MANAGER</option>
                     <option value="AGENT">AGENT SAV</option>
                     <option value="TECHNICIAN">TECHNICIEN</option>
                  </select>
               </div>
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Clé d'Accès (Mot de Passe)</label>
                  <input name="password" type="password" className="sb-input w-full" placeholder={editingUser ? 'Laisser vide pour inchangé' : 'Définir un mot de passe'} required={!editingUser} />
               </div>
               <div className="flex justify-end gap-3 pt-6 border-t border-[#f5f5f5] mt-8">
                  <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn-sb-outline">ANNULER</button>
                  <button type="submit" disabled={isSaving} className="btn-sb-primary flex items-center gap-2">
                     {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                     ENREGISTRER
                  </button>
               </div>
            </form>
         </Modal>

         {/* Brand Modal */}
         <Modal
            isOpen={isBrandModalOpen}
            onClose={() => setIsBrandModalOpen(false)}
            title="Référentiel Marque"
            size="sm"
         >
            <form
               onSubmit={async (e) => {
                  e.preventDefault();
                  if (newBrandName.trim()) {
                     await addBrand(newBrandName.trim());
                     addNotification({ title: 'Succès', message: 'Marque ajoutée', type: 'success' });
                     setIsBrandModalOpen(false);
                     setNewBrandName('');
                  }
               }}
               className="space-y-4"
            >
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Intitulé de la Marque</label>
                  <input
                     type="text"
                     value={newBrandName}
                     onChange={(e) => setNewBrandName(e.target.value)}
                     className="sb-input w-full h-12 text-sm font-semibold"
                     placeholder="Ex: APPLE, SAMSUNG..."
                     required
                  />
               </div>
               <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsBrandModalOpen(false)} className="btn-sb-outline">ANNULER</button>
                  <button type="submit" className="btn-sb-primary">AJOUTER</button>
               </div>
            </form>
         </Modal>

         {/* Prestation Modal */}
         <Modal
            isOpen={isPrestationModalOpen}
            onClose={() => setIsPrestationModalOpen(false)}
            title={editingPrestation ? 'Édition Service' : 'Nouvelle Prestation Standard'}
            size="sm"
         >
            <form
               onSubmit={async (e) => {
                  e.preventDefault();
                  const prestationData: Prestation = {
                     id: editingPrestation?.id || `P-${Date.now()}`,
                     name: prestationForm.name,
                     fixedCost: parseInt(prestationForm.fixedCost) || 0
                  };
                  await savePrestation(prestationData);
                  addNotification({ title: 'Succès', message: 'Prestation enregistrée', type: 'success' });
                  setIsPrestationModalOpen(false);
                  setPrestationForm({ name: '', fixedCost: '' });
               }}
               className="space-y-5"
            >
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Libellé du Service</label>
                  <input
                     type="text"
                     value={prestationForm.name}
                     onChange={(e) => setPrestationForm({ ...prestationForm, name: e.target.value })}
                     className="sb-input w-full font-semibold"
                     placeholder="Ex: RÉPARATION ÉCRAN"
                     required
                  />
               </div>
               <div>
                  <label className="block text-[12px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Forfait Fixe (F CFA)</label>
                  <input
                     type="number"
                     value={prestationForm.fixedCost}
                     onChange={(e) => setPrestationForm({ ...prestationForm, fixedCost: e.target.value })}
                     className="sb-input w-full font-semibold text-sm"
                     placeholder="15000"
                     required
                  />
               </div>
               <div className="flex justify-end gap-3 pt-6 border-t border-[#f5f5f5] mt-4">
                  <button type="button" onClick={() => setIsPrestationModalOpen(false)} className="btn-sb-outline">ANNULER</button>
                  <button type="submit" className="btn-sb-primary flex items-center gap-2">
                     <Save size={16} /> VALIDER
                  </button>
               </div>
            </form>
         </Modal>

         {/* Template Editor Modal - FULLSCREEN */}
         <Modal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            title={
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#3ecf8e]/10 rounded-lg">
                     <FileText size={18} className="text-[#3ecf8e]" />
                  </div>
                  <div>
                     <h2 className="text-[16px] font-semibold text-[#1c1c1c] uppercase tracking-tight">
                        {editingTemplate?.name ? `Édition: ${editingTemplate.name}` : 'Conception de Template'}
                     </h2>
                     <p className="text-[11px] text-[#686868] font-semibold uppercase opacity-60">Personnalisez vos documents officiels (PDF)</p>
                  </div>
               </div>
            }
            size="full"
         >
            <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-[#fcfcfc] -m-8 relative">
               {/* Left: Editor Sidebar */}
               <div className="w-full lg:w-[450px] border-r border-[#e5e5e5] bg-white flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     <form
                        id="template-editor-form"
                        onSubmit={async (e) => {
                           e.preventDefault();
                           if (editingTemplate) {
                              await saveTemplate(editingTemplate);
                              addNotification({ title: 'Succès', message: 'Template enregistré', type: 'success' });
                              setIsTemplateModalOpen(false);
                           }
                        }}
                        className="space-y-8"
                     >
                        {/* General Settings */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="w-1 h-4 bg-[#3ecf8e] rounded-full"></div>
                              <h4 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest">Réglages Généraux</h4>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                 <label className="block text-[10px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Nom du template</label>
                                 <input
                                    value={editingTemplate?.name || ''}
                                    onChange={(e) => setEditingTemplate((prev: any) => prev ? { ...prev, name: e.target.value } : null)}
                                    className="sb-input w-full h-10 text-xs font-semibold"
                                    placeholder="Ex: Facture Standard 2024"
                                    required
                                 />
                              </div>
                              <div>
                                 <label className="block text-[10px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Type</label>
                                 <select
                                    value={editingTemplate?.type || 'BOTH'}
                                    onChange={(e) => setEditingTemplate((prev: any) => prev ? { ...prev, type: e.target.value as any } : null)}
                                    className="sb-input w-full h-10 text-xs font-semibold"
                                 >
                                    <option value="QUOTATION">Devis</option>
                                    <option value="INVOICE">Factures</option>
                                    <option value="BOTH">Les deux</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-[10px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Teinte Identitaire</label>
                                 <div className="flex gap-2">
                                    <input
                                       type="color"
                                       value={editingTemplate?.primaryColor || '#3ecf8e'}
                                       onChange={(e) => setEditingTemplate((prev: any) => prev ? { ...prev, primaryColor: e.target.value } : null)}
                                       className="w-10 h-10 rounded-lg p-1 border border-[#e5e5e5] bg-white cursor-pointer"
                                    />
                                    <input
                                       value={editingTemplate?.primaryColor || ''}
                                       onChange={(e) => setEditingTemplate((prev: any) => prev ? { ...prev, primaryColor: e.target.value } : null)}
                                       className="sb-input flex-1 font-mono uppercase text-[11px]"
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Content Sections */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 mb-2">
                              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                              <h4 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-widest">Structure du Document</h4>
                           </div>

                           {(['headerContent', 'footerContent', 'termsConditions'] as const).map((field) => (
                              <div key={field} className="group bg-[#fcfcfc] border border-[#e5e5e5] rounded-lg overflow-hidden focus-within:border-[#3ecf8e]/30 transition-all">
                                 <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#f5f5f5]">
                                    <div className="flex items-center gap-2">
                                       {field === 'headerContent' ? <Layout size={12} className="text-[#3ecf8e]" /> : field === 'footerContent' ? <Activity size={12} className="text-[#3ecf8e]" /> : <Shield size={12} className="text-[#3ecf8e]" />}
                                       <label className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-tight">
                                          {field === 'headerContent' ? "Haut de page" : field === 'footerContent' ? "Pied de page" : "Clauses & Conditions"}
                                       </label>
                                    </div>
                                 </div>

                                 <div className="p-4 space-y-3">
                                    <div className="flex flex-wrap gap-1">
                                       {VARIABLE_GROUPS.map(group => (
                                          <div key={group.title} className="contents">
                                             {group.items.map(v => (
                                                <button
                                                   key={v.value}
                                                   type="button"
                                                   onClick={() => {
                                                      setEditingTemplate((prev: any) => ({
                                                         ...prev,
                                                         [field]: (prev?.[field] || '') + ' ' + v.value + ' '
                                                      }));
                                                   }}
                                                   title={group.title}
                                                   className="px-2 py-1 bg-white border border-[#e5e5e5] rounded-md text-[10px] font-semibold text-[#686868] hover:bg-[#3ecf8e] hover:text-white hover:border-[#3ecf8e] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                                >
                                                   {v.label}
                                                </button>
                                             ))}
                                          </div>
                                       ))}
                                    </div>
                                    <textarea
                                       value={editingTemplate?.[field] || ''}
                                       onChange={(e) => setEditingTemplate((prev: any) => prev ? { ...prev, [field]: e.target.value } : null)}
                                       className="w-full min-h-[100px] text-[12px] font-semibold p-3 bg-transparent border-none focus:ring-0 resize-none custom-scrollbar"
                                       placeholder="Saisissez votre texte ici..."
                                    />
                                 </div>
                              </div>
                           ))}
                        </div>

                        <div className="p-4 bg-[#f0fdf4]/50 border border-[#dcfce7] rounded-lg flex items-center gap-3">
                           <input
                              type="checkbox"
                              id="t_active_new"
                              checked={editingTemplate?.isActive || false}
                              onChange={(e) => setEditingTemplate((prev: any) => prev ? { ...prev, isActive: e.target.checked } : null)}
                              className="w-4 h-4 text-[#3ecf8e] rounded border-[#e5e5e5] focus:ring-0"
                           />
                           <label htmlFor="t_active_new" className="text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-tight cursor-pointer">
                              Définir comme template par défaut
                           </label>
                        </div>
                     </form>
                  </div>

                  {/* Editor Footer Actions */}
                  <div className="p-3 bg-[#f8f9fa] border-t border-[#e5e5e5] flex gap-3">
                     <button
                        type="button"
                        onClick={() => setIsTemplateModalOpen(false)}
                        className="flex-1 h-12 text-[11px] font-semibold uppercase tracking-widest text-[#686868] hover:bg-white rounded-lg transition-all border border-[#e5e5e5]"
                     >
                        Quitter
                     </button>
                     <button
                        type="submit"
                        form="template-editor-form"
                        className="flex-1 h-12 bg-[#3ecf8e] hover:bg-[#34b27b] text-white text-[11px] font-semibold uppercase tracking-widest rounded-lg shadow-md shadow-[#3ecf8e]/20 flex items-center justify-center gap-2"
                     >
                        <Save size={14} /> Enregistrer Gabarit
                     </button>
                  </div>
               </div>

               {/* Right: Realistic Preview */}
               <div className="hidden lg:flex flex-1 flex-col h-full bg-[#f0f2f5] overflow-hidden relative">
                  {/* Preview Controls */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-lg border border-white shadow-md shadow-black/5">
                     <div className="flex items-center gap-3">
                        <button onClick={() => setPreviewScale(Math.max(0.4, previewScale - 0.1))} className="p-2 hover:bg-gray-100 rounded-lg transition-all text-[#686868]"><Zap size={14} className="rotate-180" /></button>
                        <span className="text-[12px] font-semibold text-[#1c1c1c] w-14 text-center tracking-tighter">{Math.round(previewScale * 100)}%</span>
                        <button onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))} className="p-2 hover:bg-gray-100 rounded-lg transition-all text-[#686868]"><Plus size={14} /></button>
                     </div>
                     <div className="w-px h-5 bg-[#e5e5e5]"></div>
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-[#e5e5e5]">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: editingTemplate?.primaryColor || '#3ecf8e' }}></div>
                        <span className="text-[10px] font-semibold uppercase text-[#1c1c1c] tracking-widest">{editingTemplate?.type === 'BOTH' ? 'AUTO' : editingTemplate?.type}</span>
                     </div>
                  </div>

                  <div className="flex-1 overflow-auto p-12 lg:p-20 custom-scrollbar flex justify-center items-start">
                     {/* A4 Sheet Simulation */}
                     <div
                        className="bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] rounded-sm min-h-[1123px] w-[794px] transition-all duration-500 origin-top p-[20mm] border border-black/5"
                        style={{
                           scale: previewScale,
                           transformOrigin: 'top center'
                        }}
                     >
                        {/* PDF Header Rendering */}
                        <div className="flex items-start justify-between border-b-2 pb-10 mb-10" style={{ borderColor: (editingTemplate?.primaryColor || '#3ecf8e') + '20' }}>
                           <div className="space-y-4">
                              <div className="w-28 h-28 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-[#f0f0f0]">
                                 <Image size={40} className="text-[#e2e2e2]" />
                              </div>
                              <div className="space-y-1">
                                 <h1 className="text-3xl font-semibold text-[#1c1c1c] uppercase tracking-tighter" style={{ color: editingTemplate?.primaryColor || '#3ecf8e' }}>
                                    {editingTemplate?.type === 'INVOICE' ? 'Facture' : 'Devis'}
                                 </h1>
                                 <p className="text-[12px] font-semibold text-[#686868] uppercase tracking-[0.2em] opacity-40">N° 2024-0001 (SIMUL)</p>
                              </div>
                           </div>
                           <div className="text-right text-[12px] text-[#1c1c1c] font-semibold whitespace-pre-line leading-relaxed max-w-[300px] uppercase">
                              {editingTemplate?.headerContent?.replace(/\{\{.*?\}\}/g, '...') || 'SOS MOBILES SN\nPoint E, Dakar, Sénégal\nTél: +221 33 000 00 00\nNINEA: 000000000'}
                           </div>
                        </div>

                        {/* Client & Metadata Info */}
                        <div className="grid grid-cols-2 gap-16 mb-16">
                           <div className="space-y-4">
                              <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.3em]">Destinataire</p>
                              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                                 <p className="text-sm font-semibold text-[#1c1c1c] uppercase">M. Client de Test</p>
                                 <p className="text-sm text-[#686868] font-semibold">+221 77 000 00 00</p>
                              </div>
                           </div>
                           <div className="space-y-3 text-right">
                              <div className="inline-block px-4 py-1.5 rounded-lg text-white text-[12px] font-semibold uppercase tracking-widest" style={{ backgroundColor: editingTemplate?.primaryColor || '#3ecf8e' }}>
                                 Information
                              </div>
                              <div className="pt-3 space-y-1.5">
                                 <p className="text-[12px] font-semibold text-[#686868] uppercase tracking-tight">Émis le: <span className="text-[#1c1c1c]">{new Date().toLocaleDateString()}</span></p>
                                 <p className="text-[12px] font-semibold text-[#686868] uppercase tracking-tight">Appareil: <span className="text-[#1c1c1c]">iPhone 15 Pro Max</span></p>
                              </div>
                           </div>
                        </div>

                        {/* Items Simulation */}
                        <div className="mb-16">
                           <table className="w-full">
                              <thead>
                                 <tr className="border-b-4" style={{ borderColor: editingTemplate?.primaryColor || '#3ecf8e' }}>
                                    <th className="py-4 text-left text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-widest w-2/3">Désignation des Travaux</th>
                                    <th className="py-4 text-center text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-widest">Qté</th>
                                    <th className="py-4 text-right text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-widest">Montant</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {[1, 2].map(i => (
                                    <tr key={i}>
                                       <td className="py-6">
                                          <p className="text-xs font-semibold text-[#1c1c1c] uppercase">Maintenance / Service Expert {i}</p>
                                          <p className="text-[11px] text-[#9ca3af] font-semibold mt-1 uppercase tracking-tight">Intervention technique certifiée par SOS Mobiles.</p>
                                       </td>
                                       <td className="py-6 text-center text-xs font-semibold text-[#1c1c1c]">1</td>
                                       <td className="py-6 text-right text-xs font-semibold text-[#1c1c1c]">25 000 F</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>

                        {/* Totals Section */}
                        <div className="flex justify-end mb-20">
                           <div className="w-72 space-y-3 border-t-2 pt-6" style={{ borderColor: (editingTemplate?.primaryColor || '#3ecf8e') + '40' }}>
                              <div className="flex justify-between text-[12px] font-semibold text-[#686868] uppercase tracking-widest">
                                 <span>Sous-Total</span>
                                 <span className="text-[#1c1c1c]">50 000 F</span>
                              </div>
                              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                 <span className="text-[13px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em]">Net à Payer</span>
                                 <span className="text-base font-semibold text-[#1c1c1c]" style={{ color: editingTemplate?.primaryColor || '#3ecf8e' }}>50 000 F CFA</span>
                              </div>
                           </div>
                        </div>

                        {/* Terms & Conditions Branding */}
                        <div className="mt-auto space-y-4">
                           <div className="pt-10 border-t border-gray-100">
                              <div className="flex items-center gap-3 mb-3">
                                 <div className="w-6 h-1 rounded-full" style={{ backgroundColor: editingTemplate?.primaryColor || '#3ecf8e' }}></div>
                                 <span className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.3em]">Observations Légales</span>
                              </div>
                              <p className="text-[11px] text-[#686868] font-semibold leading-relaxed italic uppercase opacity-80 whitespace-pre-line px-2 border-l-2 border-gray-100">
                                 {editingTemplate?.termsConditions?.replace(/\{\{.*?\}\}/g, '...') || 'Garantie standard de 90 jours sur pièces et main d\'œuvre.\nLa garantie ne couvre pas les dommages accidentels ou l\'oxydation.'}
                              </p>
                           </div>

                           {/* PDF Footer Rendering */}
                           <div className="pt-10 text-center">
                              <p className="text-[10px] text-[#9ca3af] font-semibold uppercase tracking-[0.4em] whitespace-pre-line leading-loose">
                                 {editingTemplate?.footerContent?.replace(/\{\{.*?\}\}/g, '...') || 'SOS MOBILES - VOTRE PARTENAIRE MAINTENANCE DEPUIS 2010\nWWW.SOSMOBILES.SN'}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </Modal>

         {/* Hard Reset Confirmation Modal */}
         <Modal
            isOpen={isResetModalOpen}
            onClose={() => !isResetting && setIsResetModalOpen(false)}
            title={
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                     <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div>
                     <h2 className="text-[16px] font-semibold text-red-600 uppercase tracking-tight">OPÉRATION CRITIQUE</h2>
                     <p className="text-[11px] text-[#686868] font-semibold uppercase opacity-60">Confirmation de réinitialisation</p>
                  </div>
               </div>
            }
            size="md"
         >
            <form onSubmit={handleHardReset} className="space-y-4">
               <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-4">
                  <div className="mt-1">
                     <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div className="space-y-2">
                     <p className="text-sm font-semibold text-red-900 uppercase tracking-tight">Attention : Perte de données irréversible</p>
                     <p className="text-xs text-red-700 font-semibold leading-relaxed">
                        Vous êtes sur le point de remettre à zéro l'intégralité de la base de données opérationnelle.
                        Toutes vos archives, vos revenus et vos fiches clients seront <span className="underline font-semibold">supprimés sans aucun recours possible</span>.
                     </p>
                  </div>
               </div>

               <div>
                  <label className="block text-[10px] font-semibold text-[#686868] uppercase mb-1.5 px-1">Confirmez votre mot de passe administrateur</label>
                  <input
                     type="password"
                     value={resetPassword}
                     onChange={(e) => setResetPassword(e.target.value)}
                     className="sb-input w-full h-12 text-center text-sm font-semibold tracking-widest bg-gray-50 focus:bg-white"
                     placeholder="••••••••"
                     required
                     disabled={isResetting}
                  />
               </div>

               <div className="flex gap-3">
                  <button
                     type="button"
                     onClick={() => setIsResetModalOpen(false)}
                     disabled={isResetting}
                     className="flex-1 h-12 rounded-lg border-2 border-[#e5e5e5] text-xs font-semibold text-[#686868] uppercase tracking-widest hover:bg-gray-50 transition-all"
                  >
                     Annuler
                  </button>
                  <button
                     type="submit"
                     disabled={isResetting || !resetPassword}
                     className="flex-1 h-12 rounded-lg bg-red-600 text-white text-xs font-semibold uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2"
                  >
                     {isResetting ? (
                        <>
                           <RefreshCw size={16} className="animate-spin" />
                           Traitement...
                        </>
                     ) : (
                        "Confirmer la destruction"
                     )}
                  </button>
               </div>
            </form>
         </Modal>

         {deleteConfirm && (
            <ConfirmModal
               isOpen={!!deleteConfirm}
               onClose={() => setDeleteConfirm(null)}
               onConfirm={handleConfirmDelete}
               message={deleteConfirm.message}
            />
         )}
      </div>
   );
};

export default Settings;
