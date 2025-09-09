import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Lock,
  Bell,
  Palette,
  Monitor,
  Shield,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Camera,
  Edit3,
  Check,
  X,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Volume2,
  Wifi,
  HardDrive,
  Zap,
  Globe,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../useAuth';
import { useUI } from '../hooks/useUI';

const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useUI();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || 'John',
    lastName: user?.lastName || 'Doe',
    email: user?.email || 'john.doe@example.com',
    username: user?.username || 'johndoe',
    bio: user?.bio || 'Video creator and editor passionate about storytelling.',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    notifications: {
      email: true,
      push: true,
      marketing: false,
      updates: true
    },
    privacy: {
      profilePublic: true,
      showEmail: false,
      allowMessages: true
    },
    preferences: {
      autoSave: true,
      highQuality: true,
      darkMode: theme === 'dark',
      language: 'en',
      timezone: 'UTC-5'
    }
  });

  // Keep the Dark Mode toggle in sync with the global theme
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        darkMode: theme === 'dark'
      }
    }));
  }, [theme]);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'preferences', name: 'Preferences', icon: SettingsIcon },
    { id: 'privacy', name: 'Privacy', icon: Lock },
    { id: 'storage', name: 'Storage', icon: HardDrive }
  ];

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = () => {
    console.log('Saving settings:', formData);
    setIsEditing(false);
    // API call to save settings
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
  };

  const renderProfileTab = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile Picture */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="relative flex-shrink-0">
           <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-primary rounded-full flex items-center justify-center text-primary-foreground text-lg sm:text-2xl font-bold border-2 border-border shadow-elevation-2">
             {formData.firstName[0]}{formData.lastName[0]}
           </div>
           <button className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 bg-purple-600 hover:bg-purple-700 text-white p-1.5 sm:p-2 rounded-full transition-colors">
             <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
           </button>
         </div>
        <div className="text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">{formData.firstName} {formData.lastName}</h3>
          <p className="text-gray-400 text-sm sm:text-base">@{formData.username}</p>
          <button className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm mt-1 flex items-center justify-center sm:justify-start space-x-1">
            <Edit3 className="w-3 h-3" />
            <span>Change Photo</span>
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="sm:col-span-1">
          <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">First Name</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange(null, 'firstName', e.target.value)}
            disabled={!isEditing}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">Last Name</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange(null, 'lastName', e.target.value)}
            disabled={!isEditing}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange(null, 'username', e.target.value)}
            disabled={!isEditing}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange(null, 'email', e.target.value)}
            disabled={!isEditing}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5 sm:mb-2">Bio</label>
        <textarea
          value={formData.bio}
          onChange={(e) => handleInputChange(null, 'bio', e.target.value)}
          disabled={!isEditing}
          rows={3}
          className="w-full bg-background border border-border rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none transition-colors sm:rows-4"
          placeholder="Tell us about yourself..."
        />
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-yellow-600 mb-2">
          <Shield className="w-5 h-5" />
          <span className="font-medium">Security Notice</span>
        </div>
        <p className="text-yellow-700 text-sm">
          Always use a strong password and enable two-factor authentication for better security.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleInputChange(null, 'currentPassword', e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleInputChange(null, 'newPassword', e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Confirm New Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange(null, 'confirmPassword', e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-3 pr-12 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
        <div className="bg-muted rounded-lg p-6 border-2 border-border shadow-elevation-2">
          <h4 className="font-medium text-foreground mb-4 text-lg">Two-Factor Authentication</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-2">Add an extra layer of security to your account</p>
              <p className="text-muted-foreground text-xs">Not enabled</p>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-elevation-2 hover:shadow-elevation-3">
              Enable 2FA
            </button>
          </div>
        </div>
    </div>
  );

     const renderNotificationsTab = () => (
     <div className="space-y-6">
       {Object.entries({
         email: { label: 'Email Notifications', desc: 'Receive notifications via email', icon: Mail },
         push: { label: 'Push Notifications', desc: 'Receive push notifications in browser', icon: Smartphone },
         marketing: { label: 'Marketing Emails', desc: 'Receive promotional and marketing emails', icon: Globe },
         updates: { label: 'Product Updates', desc: 'Get notified about new features and updates', icon: Zap }
       }).map(([key, config]) => {
         const IconComponent = config.icon;
         return (
          <div key={key} className="flex items-center justify-between p-6 bg-muted rounded-lg border-2 border-border shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-background rounded-lg border border-border">
                  <IconComponent className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-base">{config.label}</h4>
                  <p className="text-muted-foreground text-sm">{config.desc}</p>
                </div>
              </div>
             <label className="relative inline-flex items-center cursor-pointer">
               <input
                 type="checkbox"
                 checked={formData.notifications[key]}
                 onChange={(e) => handleInputChange('notifications', key, e.target.checked)}
                 className="sr-only peer"
               />
               <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-purple-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 relative">
                 <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${formData.notifications[key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
               </div>
             </label>
           </div>
         );
       })}
     </div>
   );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Language</label>
          <select
            value={formData.preferences.language}
            onChange={(e) => handleInputChange('preferences', 'language', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="en" className="text-black">English</option>
            <option value="es" className="text-black">Spanish</option>
            <option value="fr" className="text-black">French</option>
            <option value="de" className="text-black">German</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
          <select
            value={formData.preferences.timezone}
            onChange={(e) => handleInputChange('preferences', 'timezone', e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="UTC-5" className="text-black">Eastern Time (UTC-5)</option>
            <option value="UTC-6" className="text-black">Central Time (UTC-6)</option>
            <option value="UTC-7" className="text-black">Mountain Time (UTC-7)</option>
            <option value="UTC-8" className="text-black">Pacific Time (UTC-8)</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries({
          autoSave: { label: 'Auto Save', desc: 'Automatically save your work every few minutes' },
          highQuality: { label: 'High Quality Previews', desc: 'Use higher quality for video previews (uses more bandwidth)' },
          darkMode: { label: 'Dark Mode', desc: 'Use dark theme throughout the application' }
        }).map(([key, config]) => (
          <div key={key} className="flex items-center justify-between p-6 bg-muted rounded-lg border-2 border-border shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-200">
             <div>
               <h4 className="font-semibold text-foreground text-base">{config.label}</h4>
               <p className="text-muted-foreground text-sm">{config.desc}</p>
             </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.preferences[key]}
                onChange={(e) => {
                  handleInputChange('preferences', key, e.target.checked);
                  if (key === 'darkMode') toggleTheme();
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-purple-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/20 relative">
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${formData.preferences[key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

    const renderStorageTab = () => (
    <div className="space-y-6">
      <div className="bg-muted rounded-lg p-8 border-2 border-border shadow-elevation-2 hover:shadow-elevation-3 transition-all duration-200">
        <h4 className="font-semibold text-foreground mb-6 text-lg">Storage Usage</h4>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground">Videos</span>
              <span className="text-muted-foreground">2.4 GB / 10 GB</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: '24%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground">Projects</span>
              <span className="text-muted-foreground">1.8 GB / 10 GB</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '18%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-foreground">Cache</span>
              <span className="text-muted-foreground">512 MB</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '5%' }}></div>
            </div>
          </div>
        </div>
           <div className="flex space-x-4 mt-8">
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-elevation-2 hover:shadow-elevation-3">
            Upgrade Storage
          </button>
          <button className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 shadow-elevation-2 hover:shadow-elevation-3">
            Clear Cache
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile': return renderProfileTab();
      case 'security': return renderSecurityTab();
      case 'notifications': return renderNotificationsTab();
      case 'preferences': return renderPreferencesTab();
      case 'storage': return renderStorageTab();
      default: return renderProfileTab();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2 pb-2">
            Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-4">
              <nav className="space-y-2">
                {tabs.map(tab => {
                  const IconComponent = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-1 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-foreground border border-pink-500/30'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <IconComponent className="w-5 h-5" />
                      <span className="font-medium">{tab.name}</span>
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-card backdrop-blur-sm border border-border rounded-xl p-6">
              {/* Tab Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {tabs.find(tab => tab.id === activeTab)?.name}
                </h2>
                {activeTab === 'profile' && (
                  <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-3">
                    {isEditing ? (
                      <>
                        <motion.button
                          onClick={handleCancel}
                          className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors text-sm sm:text-base"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Cancel</span>
                        </motion.button>
                        <motion.button
                           onClick={handleSave}
                           className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-0 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm sm:text-base"
                           whileHover={{ scale: 1.02 }}
                           whileTap={{ scale: 0.98 }}
                         >
                           <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                           <span>Save</span>
                         </motion.button>
                      </>
                    ) : (
                      <motion.button
                         onClick={() => setIsEditing(true)}
                         className="flex items-center justify-center sm:justify-start space-x-1 sm:space-x-2 px-3 py-2 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
                         whileHover={{ scale: 1.02 }}
                         whileTap={{ scale: 0.98 }}
                       >
                         <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                         <span>Edit Profile</span>
                       </motion.button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Content */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderTabContent()}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;