import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Mail, Link2, Users, Calendar, Check, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

const ShareModal = ({ isOpen, onClose, project, onShare }) => {
  const [shareType, setShareType] = useState('link'); // 'link' or 'user'
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [expiresIn, setExpiresIn] = useState('7'); // days
  const [shareLink, setShareLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn));
      
      const response = await fetch(`/api/projects/${project.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          shareType: 'link',
          role,
          expiresAt: expiresAt.toISOString()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShareLink(data.data.shareUrl);
        onShare?.(data.data);
      } else {
        setError(data.message || 'Failed to generate share link');
      }
    } catch (err) {
      setError('Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInviteUser = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch(`/api/projects/${project.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          shareType: 'user',
          email: email.trim(),
          role
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEmail('');
        onShare?.(data.data);
        // Show success message
        setError('');
      } else {
        setError(data.message || 'Failed to invite user');
      }
    } catch (err) {
      setError('Failed to invite user');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const resetModal = () => {
    setShareType('link');
    setEmail('');
    setRole('viewer');
    setExpiresIn('7');
    setShareLink('');
    setError('');
    setCopied(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Share Project"
      size="md"
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Project Info */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          {project?.thumbnailUrl && (
            <img 
              src={project.thumbnailUrl} 
              alt={project.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{project?.title}</h3>
            <p className="text-sm text-gray-500">Video Project</p>
          </div>
        </div>

        {/* Share Type Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setShareType('link')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              shareType === 'link'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Share Link</span>
          </button>
          <button
            onClick={() => setShareType('user')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              shareType === 'user'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Invite User</span>
          </button>
        </div>

        {/* Share Content */}
        <AnimatePresence mode="wait">
          {shareType === 'link' ? (
            <motion.div
              key="link"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Level
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="editor">Editor - Can view and edit</option>
                </select>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Link Expires In
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>

              {/* Generate Link Button */}
              {!shareLink && (
                <Button
                  onClick={handleGenerateLink}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? 'Generating...' : 'Generate Share Link'}
                </Button>
              )}

              {/* Generated Link */}
              {shareLink && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-gray-50"
                    />
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Anyone with this link can {role === 'viewer' ? 'view' : 'view and edit'} your project.
                    Link expires in {expiresIn} day{expiresIn !== '1' ? 's' : ''}.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="user"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Access Level
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="editor">Editor - Can view and edit</option>
                </select>
              </div>

              {/* Invite Button */}
              <Button
                onClick={handleInviteUser}
                disabled={isGenerating || !email.trim()}
                className="w-full"
              >
                {isGenerating ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>

              <p className="text-xs text-gray-500">
                The user will receive an email invitation to collaborate on your project.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

export default ShareModal;