import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
  className?: string;
}

const FeatureCard = ({ icon, title, description, index, className }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ 
        rotate: index % 2 === 0 ? 1 : -1, 
        scale: 1.02,
        transition: { duration: 0.2 } 
      }}
      className={cn(
        "relative p-6 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-exam-purple/5 via-exam-blue/5 to-exam-teal/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-exam-purple to-exam-blue text-white mb-4 transition-transform group-hover:scale-110 duration-300">
          {icon}
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-exam-purple transition-colors duration-200">
          {title}
        </h3>
        
        <p className="text-gray-600">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

export default FeatureCard;
