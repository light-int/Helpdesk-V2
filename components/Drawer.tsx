
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

const Drawer: React.FC<DrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  subtitle, 
  icon, 
  children, 
  footer,
  width = '500px' 
}) => {
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

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1c273c]/40 backdrop-blur-[1px] animate-backdrop"
        onClick={onClose}
      />
      
      {/* Drawer Panel - DashForge style */}
      <div 
        className="absolute right-0 top-0 h-full bg-white shadow-2xl flex flex-col transition-all duration-300 transform translate-x-0 w-full md:max-w-full border-l border-[#e2e8f0]"
        style={{ width: window.innerWidth < 768 ? '100%' : width }}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8f9fa] shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 bg-white text-[#1a73e8] flex items-center justify-center border border-[#e2e8f0] rounded-md shadow-sm">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-[#1c273c] uppercase tracking-tight leading-none">{title}</h2>
              {subtitle && (
                <p className="text-[10px] text-[#8392a5] font-semibold mt-1 uppercase">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-[#e8eaed] text-[#5f6368] hover:text-[#1c273c] transition-all rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-[#e2e8f0] bg-[#f8f9fa] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default Drawer;
