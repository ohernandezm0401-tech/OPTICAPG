'use client';

import React from 'react';
import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <motion.div
      key={pathname}
      initial={{ y: 8 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}
