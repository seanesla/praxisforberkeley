'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 64,
    xl: 240,
  };

  const logoSize = sizes[size];
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <Image
          src="/praxis-logo.png"
          alt="Praxis"
          width={logoSize}
          height={logoSize}
          className="object-contain"
          priority
          onError={(e) => {
            console.error('Logo image failed to load');
            // Fallback to symbol if image fails
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Fallback symbol if image fails to load */}
        <div 
          className="hidden items-center justify-center bg-gradient-to-br from-[#D4B896] to-[#B8956B] rounded-lg"
          style={{ width: logoSize, height: logoSize, display: 'none' }}
        >
          <span className="text-white font-bold" style={{ fontSize: logoSize * 0.5 }}>
            π
          </span>
        </div>
      </div>
      {showText && (
        <span
          className={`${textSizes[size]} font-light tracking-wider bg-gradient-to-b from-[#D4B896] to-[#B8956B] bg-clip-text text-transparent`}
          style={{ fontFamily: 'var(--font-geist-sans)' }}
        >
          Praxis
        </span>
      )}
    </div>
  );
}

// Animated logo for login page
export function AnimatedLoginLogo() {
  return (
    <motion.div
      className="flex justify-center -mb-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Logo size="xl" showText={false} />
    </motion.div>
  );
}