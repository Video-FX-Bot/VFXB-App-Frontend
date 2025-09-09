/**
 * Video Effects Management Hook
 * Specialized hook for managing video effects, filters, and transformations
 */
import { useCallback, useMemo, useEffect } from 'react';
import { useVideoStore, useCacheStore, videoSelectors } from '../store';
import { videoService } from '../services/videoService';

export const useEffects = () => {
  // Selective subscriptions for effects-specific state
  const appliedEffects = useVideoStore(videoSelectors.appliedEffects);
  const availableEffects = useVideoStore(state => state.availableEffects);
  const currentVideo = useVideoStore(videoSelectors.currentVideo);
  const selectedClips = useVideoStore(videoSelectors.selectedClips);
  
  // Get effects actions
  const {
    addEffect,
    updateEffect,
    removeEffect,
    clearEffects,
    setAvailableEffects,
    reorderEffects,
  } = useVideoStore();
  
  // Cache for effect presets and previews
  const { getCache, setCache, invalidateCache } = useCacheStore();
  
  // Load available effects
  const loadAvailableEffects = useCallback(async () => {
    try {
      const cacheKey = 'available_effects';
      const cached = getCache(cacheKey);
      
      if (cached) {
        setAvailableEffects(cached);
        return cached;
      }
      
      const effects = await videoService.getAvailableEffects();
      setCache(cacheKey, effects, 3600000); // 1 hour
      setAvailableEffects(effects);
      
      return effects;
    } catch (error) {
      console.error('Error loading available effects:', error);
      return [];
    }
  }, [getCache, setCache, setAvailableEffects]);
  
  // Apply effect to video or selected clips
  const applyEffect = useCallback((effectType, settings = {}, targetClips = null) => {
    const effectId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targets = targetClips || (selectedClips.length > 0 ? selectedClips : ['global']);
    
    const effect = {
      id: effectId,
      type: effectType,
      settings: {
        intensity: 1,
        ...settings
      },
      targets,
      enabled: true,
      timestamp: Date.now(),
      order: appliedEffects.length
    };
    
    addEffect(effect);
    return effectId;
  }, [addEffect, appliedEffects.length, selectedClips]);
  
  // Update effect settings
  const updateEffectSettings = useCallback((effectId, newSettings) => {
    const effect = appliedEffects.find(e => e.id === effectId);
    if (effect) {
      updateEffect(effectId, {
        settings: {
          ...effect.settings,
          ...newSettings
        }
      });
    }
  }, [appliedEffects, updateEffect]);
  
  // Toggle effect on/off
  const toggleEffect = useCallback((effectId) => {
    const effect = appliedEffects.find(e => e.id === effectId);
    if (effect) {
      updateEffect(effectId, { enabled: !effect.enabled });
    }
  }, [appliedEffects, updateEffect]);
  
  // Duplicate effect
  const duplicateEffect = useCallback((effectId) => {
    const effect = appliedEffects.find(e => e.id === effectId);
    if (effect) {
      const newEffectId = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const duplicatedEffect = {
        ...effect,
        id: newEffectId,
        timestamp: Date.now(),
        order: appliedEffects.length
      };
      
      addEffect(duplicatedEffect);
      return newEffectId;
    }
    return null;
  }, [appliedEffects, addEffect]);
  
  // Reorder effects (for effect chain management)
  const moveEffect = useCallback((effectId, newOrder) => {
    const effect = appliedEffects.find(e => e.id === effectId);
    if (effect && newOrder >= 0 && newOrder < appliedEffects.length) {
      // Create new effects array with updated order
      const updatedEffects = appliedEffects.map(e => {
        if (e.id === effectId) {
          return { ...e, order: newOrder };
        } else if (e.order >= newOrder && e.id !== effectId) {
          return { ...e, order: e.order + 1 };
        }
        return e;
      });
      
      reorderEffects(updatedEffects);
    }
  }, [appliedEffects, reorderEffects]);
  
  // Effect presets management
  const saveEffectPreset = useCallback(async (name, effectIds) => {
    try {
      const effects = appliedEffects.filter(e => effectIds.includes(e.id));
      const preset = {
        id: `preset_${Date.now()}`,
        name,
        effects: effects.map(({ id, ...effect }) => effect), // Remove IDs for preset
        timestamp: Date.now()
      };
      
      const result = await videoService.saveEffectPreset(preset);
      
      // Update cache
      const cacheKey = 'effect_presets';
      const cachedPresets = getCache(cacheKey) || [];
      setCache(cacheKey, [...cachedPresets, result], 3600000);
      
      return result;
    } catch (error) {
      console.error('Error saving effect preset:', error);
      throw error;
    }
  }, [appliedEffects, getCache, setCache]);
  
  const loadEffectPreset = useCallback(async (presetId) => {
    try {
      const preset = await videoService.getEffectPreset(presetId);
      
      // Apply all effects from preset
      const appliedEffectIds = [];
      for (const effectData of preset.effects) {
        const effectId = applyEffect(effectData.type, effectData.settings, effectData.targets);
        appliedEffectIds.push(effectId);
      }
      
      return appliedEffectIds;
    } catch (error) {
      console.error('Error loading effect preset:', error);
      throw error;
    }
  }, [applyEffect]);
  
  const getEffectPresets = useCallback(async () => {
    try {
      const cacheKey = 'effect_presets';
      const cached = getCache(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const presets = await videoService.getEffectPresets();
      setCache(cacheKey, presets, 3600000);
      
      return presets;
    } catch (error) {
      console.error('Error getting effect presets:', error);
      return [];
    }
  }, [getCache, setCache]);
  
  // Effect preview generation
  const generateEffectPreview = useCallback(async (effectType, settings = {}) => {
    if (!currentVideo) return null;
    
    try {
      const cacheKey = `effect_preview_${currentVideo.id}_${effectType}_${JSON.stringify(settings)}`;
      const cached = getCache(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      const preview = await videoService.generateEffectPreview(
        currentVideo.id,
        effectType,
        settings
      );
      
      setCache(cacheKey, preview, 300000); // 5 minutes
      return preview;
    } catch (error) {
      console.error('Error generating effect preview:', error);
      return null;
    }
  }, [currentVideo, getCache, setCache]);
  
  // Batch effect operations
  const applyEffectBatch = useCallback((effectsData) => {
    const appliedIds = [];
    
    effectsData.forEach(({ type, settings, targets }) => {
      const effectId = applyEffect(type, settings, targets);
      appliedIds.push(effectId);
    });
    
    return appliedIds;
  }, [applyEffect]);
  
  const removeEffectBatch = useCallback((effectIds) => {
    effectIds.forEach(id => removeEffect(id));
  }, [removeEffect]);
  
  // Effect categories and filtering
  const getEffectsByCategory = useCallback((category) => {
    return availableEffects.filter(effect => effect.category === category);
  }, [availableEffects]);
  
  const searchEffects = useCallback((query) => {
    const lowercaseQuery = query.toLowerCase();
    return availableEffects.filter(effect => 
      effect.name.toLowerCase().includes(lowercaseQuery) ||
      effect.description?.toLowerCase().includes(lowercaseQuery) ||
      effect.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }, [availableEffects]);
  
  // Load available effects on mount
  useEffect(() => {
    if (availableEffects.length === 0) {
      loadAvailableEffects();
    }
  }, [availableEffects.length, loadAvailableEffects]);
  
  // Computed values
  const enabledEffects = useMemo(() => {
    return appliedEffects.filter(effect => effect.enabled);
  }, [appliedEffects]);
  
  const effectsByTarget = useMemo(() => {
    const grouped = {};
    appliedEffects.forEach(effect => {
      effect.targets.forEach(target => {
        if (!grouped[target]) {
          grouped[target] = [];
        }
        grouped[target].push(effect);
      });
    });
    return grouped;
  }, [appliedEffects]);
  
  const effectCategories = useMemo(() => {
    const categories = new Set();
    availableEffects.forEach(effect => {
      if (effect.category) {
        categories.add(effect.category);
      }
    });
    return Array.from(categories).sort();
  }, [availableEffects]);
  
  const hasEffects = useMemo(() => {
    return appliedEffects.length > 0;
  }, [appliedEffects]);
  
  const hasEnabledEffects = useMemo(() => {
    return enabledEffects.length > 0;
  }, [enabledEffects]);
  
  return {
    // State
    appliedEffects,
    availableEffects,
    enabledEffects,
    effectsByTarget,
    effectCategories,
    hasEffects,
    hasEnabledEffects,
    
    // Effect management
    loadAvailableEffects,
    applyEffect,
    updateEffect,
    updateEffectSettings,
    removeEffect,
    clearEffects,
    toggleEffect,
    duplicateEffect,
    moveEffect,
    
    // Batch operations
    applyEffectBatch,
    removeEffectBatch,
    
    // Presets
    saveEffectPreset,
    loadEffectPreset,
    getEffectPresets,
    
    // Preview
    generateEffectPreview,
    
    // Filtering and search
    getEffectsByCategory,
    searchEffects,
    
    // Cache utilities
    invalidateCache,
  };
};

export default useEffects;