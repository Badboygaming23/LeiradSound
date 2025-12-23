import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '', position = 'top' }) => {
  return (
    <div className={`group/tooltip relative flex flex-col items-center ${className}`}>
      {children}
      
      <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} hidden flex-col items-center group-hover/tooltip:flex w-max max-w-[200px] z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 delay-100`}>
        <div className="bg-[#0f0f0f] text-[11px] text-gray-300 px-3 py-2 rounded-lg border border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-center leading-relaxed backdrop-blur-sm relative">
           {/* Decorative corner accents for tech feel */}
           <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-gray-500 rounded-tl-sm"></div>
           <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-gray-500 rounded-tr-sm"></div>
           <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-gray-500 rounded-bl-sm"></div>
           <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-gray-500 rounded-br-sm"></div>
           
           <span className="relative z-10">{content}</span>
        </div>
        {/* Arrow */}
        <div className={`w-2 h-2 bg-[#0f0f0f] border-r border-b border-gray-800 transform rotate-45 ${position === 'top' ? '-mt-1 border-t-0 border-l-0' : '-mb-1 border-r-0 border-b-0 rotate-[225deg] order-first'}`}></div>
      </div>
    </div>
  );
};

export default Tooltip;