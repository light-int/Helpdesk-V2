
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
  headerRight?: React.ReactNode;
  width?: string;
  variant?: 'drawer' | 'fullscreen';
}

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  headerRight,
  width = '500px',
  variant = 'drawer'
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

  const isFullscreen = variant === 'fullscreen';

  return createPortal(
    <div className={`fixed inset-0 z-[100] ${isFullscreen ? 'flex items-center justify-center p-3 sm:p-6' : 'overflow-hidden'}`}>
      {/* Backdrop */}
      <div
        className={`${isFullscreen ? 'fixed' : 'absolute'} inset-0 bg-[#1c273c]/60 backdrop-blur-[2px] animate-backdrop`}
        onClick={onClose}
      />

        {/* Panel */}
      <div
        className={`relative bg-white shadow-xl flex flex-col transition-all duration-300 transform translate-x-0 overflow-hidden ${
          isFullscreen
            ? 'w-full max-w-[95vw] h-[95vh] rounded-xl border border-[#e5e5e5]'
            : 'absolute right-0 top-0 h-full w-full md:max-w-full border-l border-[#e5e5e5]'
        }`}
        style={isFullscreen ? {} : { width: window.innerWidth < 768 ? '100%' : width }}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f8f9fa] shrink-0">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-8 h-8 bg-white text-[#3ecf8e] flex items-center justify-center border border-[#e5e5e5] rounded-md">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-[12px] font-semibold text-[#1c1c1c] uppercase tracking-tight leading-none">{title}</h2>
              {subtitle && (
                <p className="text-[10px] text-[#8392a5] font-semibold mt-0.5 uppercase">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerRight}
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#e8eaed] text-[#5f6368] hover:text-[#1c1c1c] transition-all rounded-full"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar bg-white">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-3 border-t border-[#e5e5e5] bg-[#f8f9fa] shrink-0 w-full">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default Drawer;
