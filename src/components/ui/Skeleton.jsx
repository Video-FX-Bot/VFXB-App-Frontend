import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

// Base skeleton component
export const Skeleton = ({ className, ...props }) => {
  return (
    <motion.div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      {...props}
    />
  );
};

// Card skeleton
export const CardSkeleton = ({ className }) => {
  return (
    <div className={cn("p-4 border rounded-lg bg-card", className)}>
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      <Skeleton className="h-32 w-full mb-3" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
};

// Project card skeleton
export const ProjectCardSkeleton = ({ className }) => {
  return (
    <div className={cn("p-4 border rounded-lg bg-card", className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full mb-3 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="flex space-x-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
};

// Template card skeleton
export const TemplateCardSkeleton = ({ className }) => {
  return (
    <div className={cn("p-4 border rounded-lg bg-card", className)}>
      <Skeleton className="h-48 w-full mb-3 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

// Timeline skeleton
export const TimelineSkeleton = ({ className }) => {
  return (
    <div className={cn("p-4 bg-card border rounded-lg", className)}>
      {/* Timeline header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      
      {/* Timeline tracks */}
      <div className="space-y-3">
        {[1, 2, 3].map((track) => (
          <div key={track} className="flex items-center space-x-3">
            <Skeleton className="h-8 w-16" />
            <div className="flex-1 h-12 bg-muted rounded flex items-center px-2">
              <Skeleton className="h-8 w-32 mr-2" />
              <Skeleton className="h-8 w-24 mr-2" />
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Video player skeleton
export const VideoPlayerSkeleton = ({ className }) => {
  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      <Skeleton className="w-full aspect-video bg-gray-800" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-full bg-gray-700" />
          <Skeleton className="flex-1 h-2 bg-gray-700" />
          <Skeleton className="h-6 w-12 bg-gray-700" />
        </div>
      </div>
    </div>
  );
};

// Effects panel skeleton
export const EffectsPanelSkeleton = ({ className }) => {
  return (
    <div className={cn("p-4 bg-card border rounded-lg", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      
      {/* Effect categories */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="p-3 border rounded-lg">
            <Skeleton className="h-8 w-8 mb-2 rounded" />
            <Skeleton className="h-3 w-full mb-1" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        ))}
      </div>
      
      {/* Effect controls */}
      <div className="space-y-3">
        {[1, 2, 3].map((control) => (
          <div key={control} className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Dashboard stats skeleton
export const DashboardStatsSkeleton = ({ className }) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {[1, 2, 3, 4].map((stat) => (
        <div key={stat} className="p-4 bg-card border rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-6 rounded" />
          </div>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
};

// List skeleton
export const ListSkeleton = ({ items = 5, className }) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-16 rounded" />
        </div>
      ))}
    </div>
  );
};

// Table skeleton
export const TableSkeleton = ({ rows = 5, columns = 4, className }) => {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Table header */}
      <div className="flex border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="flex-1 p-3">
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex border-b last:border-b-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 p-3">
              <Skeleton className={`h-3 ${colIndex === 0 ? 'w-full' : 'w-2/3'}`} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Skeleton;