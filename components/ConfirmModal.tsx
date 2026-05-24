import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    danger?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirmer la suppression",
    message,
    confirmText = "Supprimer",
    cancelText = "Annuler",
    isLoading = false,
    danger = true
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-red-600 animate-shake' : 'bg-amber-50 text-amber-600'}`}>
                        {danger ? <Trash2 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-[#1c1c1c] leading-relaxed">
                            {message}
                        </p>
                        <p className="text-xs text-[#686868] mt-1 italic">
                            Cette action est irréversible.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-sb-outline flex-1 sm:flex-none uppercase tracking-widest text-[10px] font-bold"
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-white text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${danger
                                ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-200'
                                : 'bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 shadow-md shadow-[#3ecf8e]/20'
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {danger && <Trash2 size={14} />}
                                {confirmText}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfirmModal;
