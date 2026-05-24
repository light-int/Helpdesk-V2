import React from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message = 'Chargement...' }) => {
  if (!isOpen) return null;

  const getPortalRoot = () => {
    let root = document.getElementById('loading-modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'loading-modal-root';
      document.body.appendChild(root);
    }
    return root;
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#1c273c]/60 backdrop-blur-[2px]" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-5 min-w-[300px] animate-modal-entry">
        <div className="relative">
          <Loader2 size={48} className="text-[#3ecf8e] animate-spin" />
          <div className="absolute inset-0 bg-[#3ecf8e]/10 rounded-full animate-ping opacity-20" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-[#1c1c1c]">{message}</p>
          <p className="text-xs text-[#686868] mt-1 font-medium">Veuillez patienter...</p>
        </div>
      </div>
    </div>,
    getPortalRoot()
  );
};

export default LoadingModal;
