import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface NotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning';
    actionLabel?: string;
    onAction?: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type,
    actionLabel = 'Continuer',
    onAction
}) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isSuccess = type === 'success';
    const isError = type === 'error';

    const getPortalRoot = () => {
        let root = document.getElementById('notif-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'notif-modal-root';
            document.body.appendChild(root);
        }
        return root;
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-[#1c273c]/80 backdrop-blur-[4px] animate-in fade-in"
                onClick={onClose}
            />
            {/* Card */}
            <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl animate-modal-entry p-8 border border-[#e5e5e5]">
                <div className="text-center">
                    {/* Animated Icon */}
                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${isSuccess ? 'bg-[#3ecf8e]/10' : isError ? 'bg-red-50' : 'bg-amber-50'
                        }`}>
                        {isSuccess ? (
                            <CheckCircle2 size={32} className="text-[#3ecf8e]" />
                        ) : (
                            <AlertCircle size={32} className={isError ? 'text-red-500' : 'text-amber-500'} />
                        )}
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-[#1c1c1c] mb-2">{title}</h3>
                    <p className="text-[#686868] font-medium leading-relaxed mb-8">{message}</p>

                    {/* Action Button */}
                    <button
                        onClick={onAction || onClose}
                        className={`w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${isSuccess
                                ? 'bg-[#3ecf8e] text-white shadow-lg shadow-[#3ecf8e]/20 hover:bg-[#3ecf8e]/90'
                                : isError
                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600'
                                    : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600'
                            }`}
                    >
                        {actionLabel} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>,
        getPortalRoot()
    );
};

export default NotificationModal;
