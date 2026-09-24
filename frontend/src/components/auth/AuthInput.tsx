import React from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  id,
  label,
  icon,
  rightElement,
  error,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <label
          htmlFor={id}
          className="block text-xs font-bold text-[#94A3B8] tracking-wider uppercase"
        >
          {label}
        </label>
        {rightElement}
      </div>

      <div className="relative group">
        {/* Left Icon with subtle glow brightening on focus */}
        <span
          className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#94A3B8] group-focus-within:text-[#39FF14] group-focus-within:drop-shadow-[0_0_6px_rgba(57,255,20,0.6)] transition-all duration-200 pointer-events-none"
          aria-hidden="true"
        >
          {icon}
        </span>

        {/* Input Field */}
        <input
          id={id}
          disabled={disabled}
          {...props}
          className={`w-full pl-10 pr-4 py-3 bg-[rgba(4,17,31,0.85)] border border-[rgba(148,163,184,0.20)] hover:border-[rgba(163,255,0,0.40)] focus:border-[#39FF14] focus:outline-none rounded-xl text-white placeholder-[#64748B] text-sm font-medium transition-all duration-200 focus:shadow-[0_0_0_3px_rgba(57,255,20,0.08),0_0_20px_rgba(57,255,20,0.10)] disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500/80 focus:border-red-500' : ''
          } ${className}`}
        />
      </div>

      {error && (
        <p className="mt-1 text-xs text-rose-400 font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
