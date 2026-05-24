
import React, { useState, useEffect } from 'react';
import {
    RefreshCw, Wrench, Plus, Trash2, Package, Tag, Activity, Clock,
    ClipboardList, CheckCircle2, X, Zap, ShieldCheck, Lock, Book, User
} from 'lucide-react';
import { useData, useNotifications, useUser } from '../App';
import { Ticket, InterventionReport, UsedPart, Part, StockReservation } from '../types';
import Modal from './Modal';
import { ApiService } from '../services/apiService';

const PREDEFINED_ACTIONS = [
    "Nettoyage complet",
    "Contrôle circuit gaz",
    "Remplacement thermostat",
    "Mise à jour firmware",
    "Calibrage capteurs",
    "Serrage connectiques",
    "Test de charge",
    "Lubrification mécanique",
    "Dépoussiérage filtres",
    "Remplacement joints"
];

interface InterventionModalProps {
    isOpen: boolean;
    onClose: () => void;
    ticket: Ticket;
    onSuccess?: (updatedTicket: Ticket) => void;
}

const InterventionModal: React.FC<InterventionModalProps> = ({ isOpen, onClose, ticket, onSuccess }) => {
    const { parts, refreshAll, saveTicket, savePart, addStockMovement } = useData();
    const { currentUser } = useUser();
    const { addNotification } = useNotifications();

    const [reportData, setReportData] = useState<Partial<InterventionReport>>({});
    const [downTimeHours, setDownTimeHours] = useState<number>(0);
    const [usedParts, setUsedParts] = useState<UsedPart[]>([]);
    const [currentActionInput, setCurrentActionInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [repairFlow, setRepairFlow] = useState<'Atelier' | 'Sur site' | 'Retour logistique' | 'Commande pièce' | 'Non réparable'>('Atelier');

    useEffect(() => {
        if (ticket) {
            const existingReport = ticket.interventionReport || {};
            // Calculer la durée depuis transmission au technicien (lastUpdate) si pas déjà définie
            let calculatedDurationMs = existingReport.durationMs || 0;
            if (!calculatedDurationMs && ticket.lastUpdate) {
                const startTime = new Date(ticket.lastUpdate).getTime();
                const now = new Date().getTime();
                calculatedDurationMs = Math.max(0, now - startTime);
            }
            setReportData({
                equipmentStatus: existingReport.equipmentStatus || 'Bon',
                actionsTaken: existingReport.actionsTaken || [],
                recommendations: existingReport.recommendations || '',
                detailedDiagnostic: existingReport.detailedDiagnostic || '',
                repairProcedure: existingReport.repairProcedure || '',
                internalNotes: existingReport.internalNotes || '',
                isWarrantyValid: existingReport.isWarrantyValid ?? true,
                durationMs: calculatedDurationMs,
                startedAt: existingReport.startedAt || ticket.lastUpdate || new Date().toISOString()
            });
            setDownTimeHours(ticket.downTimeHours || 0);
            setUsedParts(existingReport.partsUsed || []);
            setRepairFlow(ticket.repairFlow || 'Atelier');
        }
    }, [ticket, isOpen]);

    const addAction = (action: string) => {
        if (ticket.status === 'Fermé') return;
        const trimmed = action.trim();
        if (!trimmed) return;
        const currentActions = reportData.actionsTaken || [];
        if (!currentActions.includes(trimmed)) {
            setReportData({ ...reportData, actionsTaken: [...currentActions, trimmed] });
        }
        setCurrentActionInput('');
    };

    const removeAction = (index: number) => {
        if (ticket.status === 'Fermé') return;
        const currentActions = [...(reportData.actionsTaken || [])];
        currentActions.splice(index, 1);
        setReportData({ ...reportData, actionsTaken: currentActions });
    };

    const handleAddPart = () => {
        if (ticket.status === 'Fermé') return;
        setUsedParts([...usedParts, { name: '', quantity: 1, unitPrice: 0 }]);
    };

    const handleRemovePart = (index: number) => {
        if (ticket.status === 'Fermé') return;
        setUsedParts(usedParts.filter((_, i) => i !== index));
    };

    const handlePartChange = (index: number, field: keyof UsedPart, value: any) => {
        if (ticket.status === 'Fermé') return;
        const updated = [...usedParts];
        if (field === 'name') {
            const part = (parts || []).find((p: Part) => p.name === value);
            if (part) {
                updated[index] = {
                    ...updated[index],
                    name: part.name,
                    unitPrice: part.unitPrice,
                    purchasePrice: part.purchasePrice,
                    id: part.id
                };
            } else {
                // Permettre la saisie libre (divers)
                updated[index] = { ...updated[index], name: value, id: undefined };
            }
        } else {
            updated[index] = { ...updated[index], [field]: value };
        }
        setUsedParts(updated);
    };

    const handleSaveReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticket || ticket.status === 'Fermé') return;

        if (!reportData.equipmentStatus) {
            addNotification({ title: 'Rapport incomplet', message: 'Veuillez sélectionner un diagnostic final.', type: 'warning' });
            return;
        }

        const cleanedParts = usedParts.filter((p: UsedPart) => p.name.trim() !== '');

        // --- VALIDATION DU STOCK (Uniquement pour les pièces inventoriées) ---
        for (const usedPart of cleanedParts) {
            if (usedPart.id) {
                const dbPart = (parts || []).find((p: Part) => p.id === usedPart.id);
                if (dbPart && usedPart.quantity > dbPart.currentStock) {
                    addNotification({
                        title: 'Rupture',
                        message: `Stock insuffisant pour "${dbPart.name}". Dispo: ${dbPart.currentStock}.`,
                        type: 'error'
                    });
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            // 1. GESTION DES RÉSERVATIONS ET DU STOCK
            const partUpdates: Record<string, Partial<Part>> = {};

            // Récupérer les réservations
            const allReservationsRaw = await ApiService.stockReservations.getAll();
            // Support snake_case/camelCase for ticketId
            const ticketReservations = (allReservationsRaw as any[]).filter(r => (r.ticketId === ticket.id || r.ticket_id === ticket.id));

            // Libérer les réservations
            for (const r of ticketReservations) {
                await ApiService.stockReservations.delete(r.id);
                const pId = r.partId || r.part_id;
                if (pId) {
                    if (!partUpdates[pId]) {
                        const p = (parts || []).find((p: Part) => p.id === pId);
                        partUpdates[pId] = { reservedQuantity: Math.max(0, (p?.reservedQuantity || 0) - (r.quantity || r.reserved_quantity || 0)) };
                    } else {
                        partUpdates[pId].reservedQuantity = Math.max(0, (partUpdates[pId].reservedQuantity || 0) - (r.quantity || r.reserved_quantity || 0));
                    }
                }
            }

            // Déduire le stock pour les pièces utilisées
            for (const usedPart of cleanedParts) {
                if (usedPart.id) {
                    const dbPart = (parts || []).find((p: Part) => p.id === usedPart.id);
                    if (dbPart) {
                        // Mise à jour du stock
                        if (!partUpdates[dbPart.id]) {
                            partUpdates[dbPart.id] = { currentStock: dbPart.currentStock - usedPart.quantity };
                        } else {
                            partUpdates[dbPart.id].currentStock = (partUpdates[dbPart.id].currentStock ?? dbPart.currentStock) - usedPart.quantity;
                        }

                        // Enregistrement du mouvement de stock
                        if (addStockMovement) {
                            await addStockMovement({
                                id: `SM-INT-${Date.now()}-${dbPart.id}`,
                                partId: dbPart.id,
                                partName: dbPart.name,
                                quantity: usedPart.quantity,
                                type: 'OUT',
                                reason: `Intervention Ticket #${ticket.id}`,
                                date: new Date().toISOString(),
                                performedBy: currentUser?.name || 'Technicien'
                            });
                        }
                    }
                }
            }

            // 2. SAUVEGARDE DES PIÈCES
            for (const partId in partUpdates) {
                const original = (parts || []).find((p: Part) => p.id === partId);
                if (original && savePart) {
                    await savePart({ ...original, ...partUpdates[partId] });
                }
            }

            // 3. MISE À JOUR DU TICKET
            const updatedTicket: Ticket = {
                ...ticket,
                status: "En attente de devis",
                lastUpdate: new Date().toISOString(),
                downTimeHours: downTimeHours,
                repairFlow: repairFlow,
                interventionReport: {
                    ...ticket.interventionReport,
                    ...reportData,
                    partsUsed: cleanedParts,
                    performedAt: new Date().toISOString(),
                    startedAt: ticket.interventionReport?.startedAt || ticket.lastUpdate,
                    durationMs: reportData.durationMs || (ticket.lastUpdate ? (Date.now() - new Date(ticket.lastUpdate).getTime()) : 0)
                }
            };

            await saveTicket(updatedTicket);
            addNotification({ title: 'Rapport Transmis', message: 'Dossier synchronisé et stock mis à jour.', type: 'success' });
            onClose();
            if (onSuccess) onSuccess(updatedTicket);
            refreshAll();
        } catch (error) {
            console.error(error);
            addNotification({ title: 'Erreur', message: 'Échec de l\'enregistrement de l\'intervention.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!ticket || ticket.status === 'Fermé') return;
        setIsSaving(true);
        try {
            const cleanedParts = usedParts.filter((p: UsedPart) => p.name.trim() !== '');
            const draftTicket: Ticket = {
                ...ticket,
                lastUpdate: new Date().toISOString(),
                downTimeHours: downTimeHours,
                repairFlow: repairFlow,
                interventionReport: {
                    ...ticket.interventionReport,
                    ...reportData,
                    partsUsed: cleanedParts,
                    startedAt: ticket.interventionReport?.startedAt || ticket.lastUpdate,
                    durationMs: reportData.durationMs || (ticket.lastUpdate ? (Date.now() - new Date(ticket.lastUpdate).getTime()) : 0)
                }
            };
            await saveTicket(draftTicket);
            addNotification({ title: 'Brouillon enregistré', message: 'Les données de l\'intervention ont été sauvegardées.', type: 'success' });
            onClose();
            if (onSuccess) onSuccess(draftTicket);
            refreshAll();
        } catch (error) {
            console.error(error);
            addNotification({ title: 'Erreur', message: 'Échec de la sauvegarde du brouillon.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center justify-between w-full pr-8">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#3ecf8e]/10 rounded-lg">
                            <Wrench size={14} className="text-[#3ecf8e]" />
                        </div>
                        <div>
                            <h2 className="text-[13px] font-semibold text-[#1c1c1c] uppercase tracking-tight">Rapport d'Intervention Technique</h2>
                            <p className="text-[10px] text-[#686868] font-semibold">DOSSIER TICKET #{ticket.id} • {ticket.customerName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-semibold text-[#686868] uppercase tracking-widest leading-none">Chronomètre</span>
                            <span className="text-[12px] font-mono font-semibold text-[#1c1c1c] leading-none mt-1">
                                {Math.floor((reportData.durationMs || 0) / 3600000)}h {Math.floor(((reportData.durationMs || 0) % 3600000) / 60000)}m
                            </span>
                        </div>
                        <div className="h-8 w-px bg-[#e5e5e5]" />
                        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${reportData.isWarrantyValid ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                            <ShieldCheck size={14} className={reportData.isWarrantyValid ? 'text-emerald-500' : 'text-rose-500'} />
                            <span className="text-[10px] font-semibold uppercase tracking-tighter">
                                {reportData.isWarrantyValid ? 'Garantie Active' : 'Hors Garantie'}
                            </span>
                        </div>
                    </div>
                </div>
            }
            size="full"
        >
            <div className="flex flex-col lg:flex-row h-full gap-3 overflow-hidden -m-8">
                {/* LEFT: THE EDITOR */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-4 pb-20">
                        {/* 1. DIAGNOSTIC PRIMARY */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-[#f5f5f5] pb-2">
                                <Activity size={14} className="text-[#3ecf8e]" />
                                <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em]">Diagnostic Primaire</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-[#f8f9fa] border border-[#e5e5e5] rounded-xl space-y-3">
                                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">État final de l'équipement</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Excellent', 'Bon', 'Critique', 'À remplacer'].map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setReportData({ ...reportData, equipmentStatus: status as any })}
                                                className={`h-9 px-3 rounded-lg text-[10px] font-semibold transition-all border ${reportData.equipmentStatus === status
                                                    ? 'bg-[#1c1c1c] text-white border-[#1c1c1c] shadow-sm shadow-black/10'
                                                    : 'bg-white text-[#686868] border-[#e5e5e5] hover:border-[#3ecf8e]/30'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 bg-[#f8f9fa] border border-[#e5e5e5] rounded-xl space-y-3">
                                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest">Flux logistique</label>
                                    <div className="space-y-2">
                                        <select
                                            value={repairFlow}
                                            onChange={(e) => setRepairFlow(e.target.value as any)}
                                            className="w-full h-10 px-4 text-[13px] font-semibold rounded-lg border-[#e5e5e5] bg-white focus:ring-2 focus:ring-[#3ecf8e]/20 focus:border-[#3ecf8e] transition-all"
                                        >
                                            <option value="Atelier">En Atelier (Standard)</option>
                                            <option value="Sur site">Intervention sur site</option>
                                            <option value="Retour logistique">Retour Logistique</option>
                                            <option value="Commande pièce">En attente de pièce</option>
                                            <option value="Non réparable">Non réparable / Rebut</option>
                                        </select>
                                        <p className="text-[9px] text-[#9ca3af] font-semibold px-1">Définit l'étape suivante du flux opérationnel.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. ANALYSE TECHNIQUE */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-[#f5f5f5] pb-2">
                                <ClipboardList size={14} className="text-[#3ecf8e]" />
                                <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em]">Expertise Technique</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest px-1">Diagnostic Détaillé (Points de contrôle)</label>
                                    <textarea
                                        value={reportData.detailedDiagnostic || ''}
                                        onChange={e => setReportData({ ...reportData, detailedDiagnostic: e.target.value })}
                                        placeholder="Décrivez les pannes constatées et les tests effectués..."
                                        rows={4}
                                        className="w-full text-[13px] font-semibold p-4 rounded-xl border-[#e5e5e5] bg-white focus:border-[#3ecf8e] focus:ring-4 focus:ring-[#3ecf8e]/5 transition-all resize-none shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-[#686868] uppercase tracking-widest px-1">Procédure de Réparation (Travaux)</label>
                                    <textarea
                                        value={reportData.repairProcedure || ''}
                                        onChange={e => setReportData({ ...reportData, repairProcedure: e.target.value })}
                                        placeholder="Énumérez les étapes de la remise en état..."
                                        rows={4}
                                        className="w-full text-[13px] font-semibold p-4 rounded-xl border-[#e5e5e5] bg-white focus:border-[#3ecf8e] focus:ring-4 focus:ring-[#3ecf8e]/5 transition-all resize-none shadow-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 3. PIÈCES ET ACTIONS */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-[#f5f5f5] pb-2">
                                <Package size={14} className="text-[#3ecf8e]" />
                                <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-[0.2em]">Gestion des Ressources</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white border border-[#e5e5e5] rounded-xl overflow-hidden flex flex-col h-[300px]">
                                    <div className="p-3 border-b border-[#f5f5f5] bg-[#fcfcfc] flex items-center justify-between">
                                        <label className="text-[9px] font-semibold text-[#1c1c1c] uppercase tracking-widest">Actions Rapides</label>
                                        <div className="flex gap-1">
                                            <input
                                                list="predefined-actions-iv"
                                                value={currentActionInput}
                                                onChange={e => setCurrentActionInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAction(currentActionInput))}
                                                placeholder="Ajouter..."
                                                className="h-7 w-32 text-[10px] font-semibold rounded-lg border-[#e5e5e5] focus:ring-0 focus:border-[#3ecf8e]"
                                            />
                                            <datalist id="predefined-actions-iv">
                                                {PREDEFINED_ACTIONS.map(a => <option key={a} value={a} />)}
                                            </datalist>
                                            <button onClick={() => addAction(currentActionInput)} className="w-7 h-7 bg-[#1c1c1c] text-white rounded-lg flex items-center justify-center hover:bg-black transition-colors">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
                                        {reportData.actionsTaken?.map((a: string, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-[#f8f9fa] border border-[#e5e5e5] rounded-lg group text-[10px] font-semibold text-[#4b5563]">
                                                <span>{a}</span>
                                                <button onClick={() => removeAction(idx)} className="text-[#9ca3af] hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                                            </div>
                                        ))}
                                        {(!reportData.actionsTaken || reportData.actionsTaken.length === 0) && (
                                            <div className="h-full flex items-center justify-center text-[#9ca3af] italic text-[10px]">Aucune action listée</div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-[#f0fdf4]/30 border border-[#dcfce7] rounded-xl overflow-hidden flex flex-col h-[300px]">
                                    <div className="p-3 border-b border-[#dcfce7] bg-[#f0fdf4]/50 flex items-center justify-between">
                                        <label className="text-[9px] font-semibold text-[#1c1c1c] uppercase tracking-widest italic">Pièces Utilisées</label>
                                        <button onClick={handleAddPart} className="px-2 py-1 bg-white text-[#3ecf8e] text-[9px] font-semibold uppercase rounded-lg border border-[#3ecf8e]/20 hover:shadow-sm transition-all flex items-center gap-1">
                                            <Plus size={12} /> Ajouter
                                        </button>
                                    </div>
                                    <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
                                        {usedParts.map((part: UsedPart, idx: number) => {
                                            const selectedPart = (parts || []).find((p: Part) => p.name === part.name || p.id === part.id);
                                            const availableStock = selectedPart?.currentStock || 0;
                                            const isStockInsufficient = part.id && part.quantity > availableStock;

                                            return (
                                                <div key={idx} className="bg-white/80 p-2.5 rounded-lg border border-[#dcfce7] space-y-2 shadow-sm animate-sb-entry">
                                                    <div className="flex gap-2">
                                                        <div className="flex-1">
                                                            <input
                                                                list="parts-list-iv"
                                                                className="w-full h-8 text-[11px] font-semibold border-transparent bg-transparent focus:ring-0 rounded-lg p-0"
                                                                placeholder="Pièce..."
                                                                value={part.name}
                                                                onChange={e => handlePartChange(idx, 'name', e.target.value)}
                                                            />
                                                            <datalist id="parts-list-iv">
                                                                {(parts || []).map((p: Part) => (
                                                                    <option key={p.id} value={p.name}>{p.name} (Stock: {p.currentStock})</option>
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            className={`w-12 h-8 text-[11px] font-semibold text-center rounded-lg border-[#e5e5e5] focus:ring-0 ${isStockInsufficient ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white'}`}
                                                            value={part.quantity}
                                                            onChange={e => handlePartChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                        <button onClick={() => handleRemovePart(idx)} className="text-[#9ca3af] hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[9px] font-semibold uppercase">
                                                        <span className={availableStock > 0 ? 'text-[#3ecf8e]' : 'text-rose-500'}>
                                                            Dispo: {availableStock}
                                                        </span>
                                                        <span className="text-[#1c1c1c]">Total: {(part.quantity * (part.unitPrice || 0)).toLocaleString()} F</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {usedParts.length === 0 && (
                                            <div className="h-full flex items-center justify-center text-[#9ca3af] italic text-[10px]">Aucune pièce enregistrée</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* RIGHT: TICKET CONTEXT & ACTION PANEL */}
                <div className="w-full lg:w-[400px] border-l border-[#f5f5f5] bg-[#fcfcfc] flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        {/* CLIENT & DEVICE SUMMARY */}
                        <div className="bg-white p-3 rounded-xl border border-[#e5e5e5] shadow-sm space-y-4">
                            <h3 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                                <User size={14} className="text-[#3ecf8e]" /> Contexte Dossier
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-0.5">Client</p>
                                    <p className="text-[12px] font-semibold text-[#1c1c1c]">{ticket.customerName}</p>
                                    <p className="text-[11px] font-semibold text-[#686868]">{ticket.customerPhone}</p>
                                </div>
                                <div className="h-px bg-[#f5f5f5]" />
                                <div>
                                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-0.5">Équipement</p>
                                    <p className="text-[12px] font-semibold text-[#1c1c1c]">{ticket.productName}</p>
                                    <p className="text-[11px] font-mono font-semibold text-[#3ecf8e]">SN: {ticket.serialNumber}</p>
                                </div>
                                <div className="h-px bg-[#f5f5f5]" />
                                <div>
                                    <p className="text-[10px] font-semibold text-[#686868] uppercase mb-0.5">Symptômes Client</p>
                                    <p className="text-[11px] font-semibold text-[#c53030] leading-relaxed italic bg-rose-50/50 p-2 rounded-lg border border-rose-100">
                                        "{ticket.description || 'Aucun symptôme spécifié'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* FINAL NOTES & DOWN TIME */}
                        <div className="bg-white p-3 rounded-xl border border-[#e5e5e5] shadow-sm space-y-5">
                            <h3 className="text-[10px] font-semibold text-[#1c1c1c] uppercase tracking-widest flex items-center gap-2">
                                <Zap size={14} className="text-[#3ecf8e]" /> Paramètres Finaux
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 px-1">
                                        <Clock size={12} className="text-[#3ecf8e]" /> Immobilisation (Heures)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={downTimeHours}
                                            onChange={e => setDownTimeHours(parseFloat(e.target.value) || 0)}
                                            className="w-full h-9 px-4 text-[12px] font-semibold rounded-lg border-[#e5e5e5] bg-[#f8f9fa] focus:ring-0 focus:border-[#3ecf8e] transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#9ca3af] uppercase">Heures</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-semibold text-[#686868] uppercase tracking-widest flex items-center gap-2 px-1">
                                        <ShieldCheck size={12} className="text-[#3ecf8e]" /> Préconisations Client
                                    </label>
                                    <textarea
                                        value={reportData.recommendations || ''}
                                        onChange={e => setReportData({ ...reportData, recommendations: e.target.value })}
                                        placeholder="Conseils d'utilisation..."
                                        rows={3}
                                        className="w-full text-[11px] font-semibold p-3 rounded-lg border-[#e5e5e5] bg-[#f8f9fa] focus:ring-0 focus:border-[#3ecf8e] resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-semibold text-rose-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                        <Lock size={12} /> Notes Internes
                                    </label>
                                    <textarea
                                        value={reportData.internalNotes || ''}
                                        onChange={e => setReportData({ ...reportData, internalNotes: e.target.value })}
                                        placeholder="Confidentiel..."
                                        rows={3}
                                        className="w-full text-[11px] font-semibold p-3 rounded-lg border-rose-50 bg-rose-50/20 focus:ring-0 focus:border-rose-100 resize-none italic"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION PANEL FOOTER */}
                    <div className="p-3 bg-white border-t border-[#f5f5f5] space-y-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-[9px] font-semibold text-emerald-800 uppercase tracking-widest">Coût estimé des pièces</span>
                            <span className="text-[13px] font-semibold text-[#1c1c1c]">
                                {usedParts.reduce((s, p) => s + (p.quantity * (p.unitPrice || 0)), 0).toLocaleString()} F
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleSaveDraft}
                                disabled={isSaving}
                                className="flex-1 h-10 text-[10px] font-semibold uppercase tracking-widest text-[#686868] bg-[#f5f5f5] hover:bg-[#e5e5e5] rounded-lg transition-all disabled:opacity-50"
                            >
                                {isSaving ? <RefreshCw className="animate-spin inline-block" size={14} /> : 'Enregistrer brouillon'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveReport}
                                disabled={isSaving}
                                className="flex-[2] h-10 bg-[#3ecf8e] hover:bg-[#34b27b] text-white text-[11px] font-semibold uppercase tracking-[0.1em] rounded-lg shadow-md shadow-[#3ecf8e]/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                            >
                                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <><CheckCircle2 size={16} /> Transmettre Rapport</>}
                            </button>
                        </div>
                        <p className="text-center text-[9px] text-[#9ca3af] font-semibold uppercase tracking-tighter">
                            Cette action clôturera votre étape technique et notifiera l'agent.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default InterventionModal;
