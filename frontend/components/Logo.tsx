'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const logoSize = sizes[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/praxis-logo.png"
        alt="Praxis"
        width={logoSize}
        height={logoSize}
        className="object-contain"
        priority
      />
      <span
        className="text-3xl font-light tracking-wider bg-gradient-to-b from-[#D4B896] to-[#B8956B] bg-clip-text text-transparent"
        style={{ fontFamily: 'var(--font-geist-sans)' }}
      >
        Praxis
      </span>
    </div>
  );
}

// Animated logo for login page
export function AnimatedLoginLogo() {
  return (
    <motion.div
      className="fixed top-8 left-8 z-40"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Logo size="md" />
    </motion.div>
  );
}