// Template Service for managing project templates

class TemplateService {
  constructor() {
    this.storageKey = 'vfxb_project_templates';
    this.initializeDefaultTemplates();
  }

  // Initialize default templates if none exist
  initializeDefaultTemplates() {
    const existingTemplates = this.getTemplates();
    if (existingTemplates.length === 0) {
      const defaultTemplates = [
        {
          id: 'social-media-video',
          name: 'Social Media Video',
          description: 'Perfect for Instagram, TikTok, and YouTube Shorts',
          category: 'Social Media',
          thumbnail: '/api/placeholder/300/200',
          duration: '15-60s',
          aspectRatio: '9:16',
          resolution: '1080x1920',
          features: ['Vertical format', 'Quick cuts', 'Text overlays', 'Trending music'],
          tags: ['social', 'vertical', 'short-form'],
          difficulty: 'Beginner',
          estimatedTime: '30 minutes',
          assets: {
            videoClips: 3,
            audioTracks: 1,
            textElements: 5,
            effects: 8
          }
        },
        {
          id: 'youtube-intro',
          name: 'YouTube Channel Intro',
          description: 'Professional intro for YouTube channels',
          category: 'Branding',
          thumbnail: '/api/placeholder/300/200',
          duration: '5-10s',
          aspectRatio: '16:9',
          resolution: '1920x1080',
          features: ['Logo animation', 'Brand colors', 'Sound effects', 'Professional look'],
          tags: ['youtube', 'intro', 'branding'],
          difficulty: 'Intermediate',
          estimatedTime: '45 minutes',
          assets: {
            videoClips: 1,
            audioTracks: 1,
            textElements: 2,
            effects: 12
          }
        },
        {
          id: 'product-showcase',
          name: 'Product Showcase',
          description: 'Highlight your product features and benefits',
          category: 'Marketing',
          thumbnail: '/api/placeholder/300/200',
          duration: '30-90s',
          aspectRatio: '16:9',
          resolution: '1920x1080',
          features: ['Product shots', 'Feature highlights', 'Call-to-action', 'Professional transitions'],
          tags: ['product', 'marketing', 'commercial'],
          difficulty: 'Intermediate',
          estimatedTime: '60 minutes',
          assets: {
            videoClips: 5,
            audioTracks: 1,
            textElements: 8,
            effects: 15
          }
        },
        {
          id: 'travel-vlog',
          name: 'Travel Vlog',
          description: 'Document your adventures with cinematic style',
          category: 'Lifestyle',
          thumbnail: '/api/placeholder/300/200',
          duration: '3-10min',
          aspectRatio: '16:9',
          resolution: '1920x1080',
          features: ['Cinematic transitions', 'Location titles', 'Music sync', 'Color grading'],
          tags: ['travel', 'vlog', 'cinematic'],
          difficulty: 'Advanced',
          estimatedTime: '120 minutes',
          assets: {
            videoClips: 15,
            audioTracks: 2,
            textElements: 10,
            effects: 20
          }
        },
        {
          id: 'corporate-presentation',
          name: 'Corporate Presentation',
          description: 'Professional presentation for business use',
          category: 'Business',
          thumbnail: '/api/placeholder/300/200',
          duration: '2-5min',
          aspectRatio: '16:9',
          resolution: '1920x1080',
          features: ['Clean design', 'Data visualization', 'Professional fonts', 'Smooth transitions'],
          tags: ['corporate', 'business', 'presentation'],
          difficulty: 'Beginner',
          estimatedTime: '45 minutes',
          assets: {
            videoClips: 3,
            audioTracks: 1,
            textElements: 12,
            effects: 8
          }
        },
        {
          id: 'music-video',
          name: 'Music Video',
          description: 'Creative music video with visual effects',
          category: 'Entertainment',
          thumbnail: '/api/placeholder/300/200',
          duration: '3-5min',
          aspectRatio: '16:9',
          resolution: '1920x1080',
          features: ['Beat sync', 'Visual effects', 'Color grading', 'Creative transitions'],
          tags: ['music', 'creative', 'effects'],
          difficulty: 'Advanced',
          estimatedTime: '180 minutes',
          assets: {
            videoClips: 20,
            audioTracks: 1,
            textElements: 5,
            effects: 30
          }
        }
      ];
      
      this.saveTemplates(defaultTemplates);
    }
  }

  // Get all templates
  getTemplates() {
    try {
      const templates = localStorage.getItem(this.storageKey);
      return templates ? JSON.parse(templates) : [];
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  // Get templates by category
  getTemplatesByCategory(category) {
    const templates = this.getTemplates();
    return category === 'All' ? templates : templates.filter(template => template.category === category);
  }

  // Get template by ID
  getTemplateById(id) {
    const templates = this.getTemplates();
    return templates.find(template => template.id === id);
  }

  // Get all categories
  getCategories() {
    const templates = this.getTemplates();
    const categories = [...new Set(templates.map(template => template.category))];
    return ['All', ...categories];
  }

  // Search templates
  searchTemplates(query) {
    const templates = this.getTemplates();
    const lowercaseQuery = query.toLowerCase();
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(lowercaseQuery) ||
      template.description.toLowerCase().includes(lowercaseQuery) ||
      template.category.toLowerCase().includes(lowercaseQuery) ||
      template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Filter templates by difficulty
  getTemplatesByDifficulty(difficulty) {
    const templates = this.getTemplates();
    return difficulty === 'All' ? templates : templates.filter(template => template.difficulty === difficulty);
  }

  // Save templates to localStorage
  saveTemplates(templates) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  // Create project from template
  createProjectFromTemplate(templateId, projectName) {
    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Generate unique project ID
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create project data based on template
    const projectData = {
      id: projectId,
      title: projectName || `${template.name} Project`,
      description: `Created from ${template.name} template`,
      template: {
        id: template.id,
        name: template.name
      },
      status: 'draft',
      duration: template.duration,
      aspectRatio: template.aspectRatio,
      resolution: template.resolution,
      thumbnail: template.thumbnail,
      createdAt: new Date().toISOString(),
      lastEdited: new Date().toISOString(),
      assets: {
        ...template.assets
      },
      settings: {
        aspectRatio: template.aspectRatio,
        resolution: template.resolution,
        frameRate: 30
      },
      timeline: {
        tracks: [
          {
            id: 'video-1',
            type: 'video',
            name: 'Main Video',
            clips: []
          },
          {
            id: 'audio-1',
            type: 'audio',
            name: 'Background Music',
            clips: []
          },
          {
            id: 'text-1',
            type: 'text',
            name: 'Text Overlays',
            clips: []
          }
        ]
      }
    };

    return projectData;
  }

  // Add custom template
  addTemplate(templateData) {
    const templates = this.getTemplates();
    const newTemplate = {
      ...templateData,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    templates.push(newTemplate);
    this.saveTemplates(templates);
    return newTemplate;
  }

  // Delete template
  deleteTemplate(templateId) {
    const templates = this.getTemplates();
    const filteredTemplates = templates.filter(template => template.id !== templateId);
    this.saveTemplates(filteredTemplates);
  }

  // Update template
  updateTemplate(templateId, updates) {
    const templates = this.getTemplates();
    const templateIndex = templates.findIndex(template => template.id === templateId);
    
    if (templateIndex !== -1) {
      templates[templateIndex] = {
        ...templates[templateIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveTemplates(templates);
      return templates[templateIndex];
    }
    
    return null;
  }
}

const templateService = new TemplateService();
export default templateService;