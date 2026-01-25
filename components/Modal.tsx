
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative bg-white w-full ${sizeClasses[size]} max-h-[90vh] rounded-lg shadow-2xl animate-modal overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dadce0] bg-[#f8f9fa] shrink-0">
          <h3 className="text-base font-medium text-[#3c4043]">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#e8eaed] text-[#5f6368] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - This will now correctly scroll because parent has max-h */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default Modal;
