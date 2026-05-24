
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
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
    sm: 'max-w-sm rounded-lg',
    md: 'max-w-xl rounded-lg',
    lg: 'max-w-3xl rounded-lg',
    xl: 'max-w-5xl rounded-lg',
    full: 'max-w-[98vw] h-[98vh] rounded-xl'
  };

  const getPortalRoot = () => {
    let portalRoot = document.getElementById('modal-root');
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = 'modal-root';
      document.body.appendChild(portalRoot);
    }
    return portalRoot;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1c273c]/80 backdrop-blur-[4px] transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative bg-white w-full ${sizeClasses[size]} shrink-0 shadow-2xl animate-modal-entry overflow-hidden flex flex-col border border-[#e5e5e5] max-h-[90vh]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e5e5] bg-[#f8f9fa] shrink-0">
          <h3 className="text-[11px] font-semibold text-[#1c1c1c] uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#e8eaed] text-[#5f6368] hover:text-[#1c1c1c] transition-all rounded-full"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    getPortalRoot()
  );
};

export default Modal;
