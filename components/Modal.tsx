
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]'
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#1c273c]/60 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Content - Rounded Edges */}
      <div className={`relative bg-white w-full ${sizeClasses[size]} max-h-[90vh] shadow-2xl animate-modal-entry overflow-hidden flex flex-col border border-[#e2e8f0] rounded-lg`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8f9fa] shrink-0">
          <h3 className="text-xs font-bold text-[#1c273c] uppercase tracking-wider">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-[#e8eaed] text-[#5f6368] hover:text-[#1c273c] transition-all rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default Modal;
