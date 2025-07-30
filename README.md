# 🎬 VFXB App Frontend

**Video Effects Bot Application - Frontend Interface**

A modern, AI-powered video editing platform built with React, Vite, and TailwindCSS. This application provides an intuitive interface for video editing with conversational AI assistance, real-time processing, and professional-grade video effects.

## 🚀 Features

### 🎥 Video Editing
- **Video Upload & Management**: Support for multiple video formats (MP4, WebM, AVI, MOV, MKV, WMV, FLV)
- **Real-time Video Player**: Custom video player with full playback controls
- **Video Processing**: Trim, crop, resize, rotate, and flip operations
- **Audio Enhancement**: Noise reduction, audio quality improvement
- **Color Correction**: Brightness, contrast, saturation adjustments
- **Effects & Filters**: Vintage, sepia, black & white, and custom filters
- **Subtitles & Text**: Add subtitles, captions, and text overlays
- **Transitions**: Fade in/out and smooth transitions
- **Export Options**: Multiple formats and quality presets

### 🤖 AI-Powered Assistant
- **Conversational Interface**: Natural language processing for video editing commands
- **Intent Recognition**: Smart understanding of user requests
- **Contextual Suggestions**: AI-powered recommendations based on video content
- **Real-time Chat**: Interactive chat interface with typing indicators
- **Operation Execution**: Direct execution of editing operations through chat

### 🎨 User Interface
- **Modern Design**: Clean, professional interface with dark/light theme support
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Sidebar Navigation**: Collapsible sidebar with project management
- **Dashboard**: Overview of projects, recent activities, and quick actions
- **Project Management**: Create, save, and organize video projects
- **Template Library**: Pre-built templates for common video types

### ⚡ Performance & UX
- **Fast Loading**: Optimized with Vite for lightning-fast development and builds
- **Smooth Animations**: Framer Motion for fluid user interactions
- **Keyboard Shortcuts**: Comprehensive keyboard shortcuts for power users
- **Auto-save**: Automatic project saving to prevent data loss
- **Progress Tracking**: Real-time progress indicators for video processing

## 🛠️ Tech Stack

### Frontend Framework
- **React 19.1.0**: Latest React with concurrent features
- **Vite 7.0.4**: Next-generation frontend tooling
- **React Router DOM 7.7.1**: Client-side routing

### Styling & UI
- **TailwindCSS 4.1.11**: Utility-first CSS framework
- **Framer Motion 12.23.11**: Production-ready motion library
- **Lucide React 0.525.0**: Beautiful & consistent icon library

### State Management
- **Zustand 5.0.6**: Lightweight state management
- **React Hook Form 7.61.1**: Performant forms with easy validation

### Additional Libraries
- **React Dropzone 14.3.8**: File upload with drag & drop
- **Socket.io Client 4.8.1**: Real-time communication
- **Autoprefixer & PostCSS**: CSS processing and optimization

## 📁 Project Structure

```
src/
├── Pages/                    # Main application pages
│   ├── Dashboard.jsx         # Main dashboard
│   ├── AIEditor.jsx          # AI-powered video editor
│   ├── Projects.jsx          # Project management
│   ├── Templates.jsx         # Template library
│   ├── Settings.jsx          # User settings
│   ├── Login.jsx             # Authentication
│   └── Signup.jsx            # User registration
├── components/               # Reusable UI components
│   ├── ui/                   # Base UI components
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Loading.jsx
│   ├── video/                # Video-specific components
│   │   ├── VideoPlayer.jsx
│   │   └── VideoUpload.jsx
│   ├── chat/                 # AI chat interface
│   │   └── ChatInterface.jsx
│   ├── layout/               # Layout components
│   │   └── Sidebar.jsx
│   └── dashboard/            # Dashboard components
│       └── DashboardLayout.jsx
├── services/                 # API and external services
│   ├── aiService.js          # AI processing service
│   └── apiService.js         # HTTP API client
├── context/                  # Zustand stores
│   ├── chatStore.js          # Chat state management
│   ├── uiStore.js            # UI state management
│   └── videoStore.js         # Video state management
├── hooks/                    # Custom React hooks
│   ├── useChat.js            # Chat functionality
│   ├── useUI.js              # UI interactions
│   └── useVideo.js           # Video operations
├── constants/                # Application constants
│   └── index.js              # API endpoints, configs, etc.
├── utils/                    # Utility functions
│   └── index.js              # Helper functions
└── types/                    # Type definitions
    └── index.js              # TypeScript-like type definitions
```

## 🚀 Getting Started

### Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (or yarn/pnpm)
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Video-FX-Bot/VFXB-App-Frontend.git
   cd VFXB-App-Frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_WEBSOCKET_URL=ws://localhost:3001
   VITE_UPLOAD_MAX_SIZE=500000000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## 🎮 Usage Guide

### Getting Started with Video Editing

1. **Upload a Video**
   - Navigate to the AI Editor
   - Drag and drop a video file or click to browse
   - Supported formats: MP4, WebM, AVI, MOV, MKV, WMV, FLV

2. **Use AI Assistant**
   - Type natural language commands like:
     - "Enhance the audio quality"
     - "Trim the video from 10 seconds to 30 seconds"
     - "Add subtitles to this video"
     - "Apply a vintage filter"
     - "Export as MP4 in high quality"

3. **Manual Editing**
   - Use the video player controls for precise editing
   - Access tools through the sidebar
   - Apply effects and filters
   - Preview changes in real-time

### Keyboard Shortcuts

#### General
- `Ctrl + B`: Toggle sidebar
- `Ctrl + Shift + T`: Toggle theme
- `Ctrl + K`: Open search
- `Ctrl + S`: Save project
- `Ctrl + Z`: Undo
- `Ctrl + Y`: Redo

#### Video Player
- `Space`: Play/Pause
- `←/→`: Seek backward/forward
- `↑/↓`: Volume up/down
- `M`: Mute/Unmute
- `F`: Fullscreen

#### Timeline Editor
- `S`: Split clip
- `Delete`: Delete selected clip
- `Ctrl + C`: Copy
- `Ctrl + V`: Paste
- `Ctrl + A`: Select all

## 🔧 Configuration

### API Configuration
The application connects to a backend API for video processing and AI services. Configure the API endpoints in `src/constants/index.js`:

```javascript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};
```

### Upload Limits
Configure file upload limits:

```javascript
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_AUDIO_SIZE: 100 * 1024 * 1024, // 100MB
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
};
```

### Video Processing
Customize video processing presets:

```javascript
export const VIDEO_PROCESSING = {
  QUALITY_PRESETS: {
    LOW: { width: 480, height: 360, bitrate: '500k' },
    MEDIUM: { width: 720, height: 480, bitrate: '1000k' },
    HIGH: { width: 1280, height: 720, bitrate: '2500k' },
    ULTRA: { width: 1920, height: 1080, bitrate: '5000k' },
  },
};
```

## 🎨 Theming & Customization

### Theme Configuration
The application supports light and dark themes. Customize colors in `src/constants/index.js`:

```javascript
export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: {
      500: '#3b82f6', // Blue
      600: '#2563eb',
      // ... other shades
    },
    // ... other color schemes
  },
};
```

### TailwindCSS Customization
Modify `tailwind.config.js` to customize the design system:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Custom colors
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

## 🧪 Testing

### Running Tests
```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Testing Strategy
- **Unit Tests**: Component testing with React Testing Library
- **Integration Tests**: API integration and service testing
- **E2E Tests**: Full user journey testing with Playwright

## 📦 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

### Netlify
1. Build the application: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure redirects for SPA routing

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🔒 Security

### Best Practices
- Environment variables for sensitive configuration
- Input validation and sanitization
- HTTPS enforcement in production
- Content Security Policy (CSP) headers
- Regular dependency updates

### File Upload Security
- File type validation
- Size limits enforcement
- Virus scanning (backend)
- Secure file storage

## 🚀 Performance Optimization

### Code Splitting
- Route-based code splitting with React.lazy()
- Component-level lazy loading
- Dynamic imports for heavy libraries

### Asset Optimization
- Image optimization with WebP format
- Video compression and streaming
- CSS and JavaScript minification
- Gzip compression

### Caching Strategy
- Browser caching for static assets
- Service worker for offline functionality
- API response caching
- Local storage for user preferences

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style
- ESLint configuration for code quality
- Prettier for code formatting
- Conventional commits for commit messages
- Component documentation with JSDoc

### Pull Request Guidelines
- Include tests for new features
- Update documentation as needed
- Ensure all tests pass
- Follow the existing code style
- Add screenshots for UI changes

## 📚 API Documentation

### AI Service Integration
The application integrates with an AI service for natural language processing:

```javascript
// Example AI service usage
import aiService from './services/aiService';

const response = await aiService.processMessage(
  "Enhance the audio quality",
  { videoId: "123", currentTime: 30 }
);
```

### Video Processing API
Video operations are handled through RESTful API endpoints:

```javascript
// Example video processing
const result = await apiService.post('/video/process', {
  videoId: '123',
  operation: 'audio_enhance',
  parameters: { noiseReduction: true }
});
```

## 🐛 Troubleshooting

### Common Issues

**Video Upload Fails**
- Check file size limits (500MB max)
- Verify supported file formats
- Ensure stable internet connection

**AI Chat Not Responding**
- Verify API endpoint configuration
- Check network connectivity
- Review browser console for errors

**Performance Issues**
- Clear browser cache
- Check available system memory
- Reduce video quality settings

### Debug Mode
Enable debug mode by setting:
```env
VITE_DEBUG=true
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team**: For the amazing React framework
- **Vite Team**: For the lightning-fast build tool
- **TailwindCSS**: For the utility-first CSS framework
- **Framer Motion**: For smooth animations
- **Lucide**: For beautiful icons
- **Open Source Community**: For the incredible ecosystem

## 📞 Support

- **Documentation**: [docs.vfxb.app](https://docs.vfxb.app)
- **Issues**: [GitHub Issues](https://github.com/Video-FX-Bot/VFXB-App-Frontend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Video-FX-Bot/VFXB-App-Frontend/discussions)
- **Email**: support@vfxb.app

---

**Built with ❤️ by the VFXB Team**

*Making video editing accessible to everyone through the power of AI*
