# 🎬 VFXB - AI-Powered Video Editing Platform

**Video Effects Bot Application - Complete Full-Stack Solution**

VFXB is a cutting-edge, AI-powered video editing platform that combines professional-grade video processing with conversational AI assistance. Built with modern web technologies, it provides an intuitive interface for both beginners and professionals to create stunning videos through natural language commands and traditional editing tools.

> 📚 **Complete Documentation**: For comprehensive documentation, architecture details, API references, and development guides, see the [`docs/`](./docs/) folder.

## 🌟 Key Features

- **🤖 AI-Powered Editing**: Natural language video editing with GPT-4
- **🎥 Professional Tools**: Complete video editing suite with timeline
- **⚡ Real-time Processing**: Instant preview with FFmpeg integration
- **☁️ Cloud Integration**: OpenAI, Replicate, ElevenLabs, Cloudinary
- **🎨 Modern UI**: React + TailwindCSS with responsive design
- **🔄 Real-time Collaboration**: Socket.io powered features

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- FFmpeg
- API keys for OpenAI, Replicate, ElevenLabs, Cloudinary

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VFXB_APP
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure environment variables in .env
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd VFXB-App-Frontend
   npm install
   npm run dev
   ```

### Environment Variables

Configure the following in `backend/.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/vfxb

# JWT
JWT_SECRET=your-jwt-secret

# AI Services
OPENAI_API_KEY=your-openai-key
REPLICATE_API_TOKEN=your-replicate-token
ELEVENLABS_API_KEY=your-elevenlabs-key

# Media Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🛠️ Tech Stack

**Frontend:** React + Vite + TailwindCSS + Framer Motion  
**Backend:** Node.js + Express + MongoDB + Socket.io  
**AI Services:** OpenAI GPT-4 + Replicate + ElevenLabs  
**Media:** Cloudinary + FFmpeg
- **Vite**: Lightning-fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Lucide React**: Beautiful, customizable icons
- **React Router**: Client-side routing
- **Socket.IO Client**: Real-time communication

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Fast, unopinionated web framework
- **Socket.IO**: Real-time bidirectional communication
- **FFmpeg**: Video processing and manipulation
- **Multer**: File upload handling
- **Winston**: Comprehensive logging
- **Helmet**: Security middleware

### AI & External Services
- **OpenAI GPT-4**: Conversational AI and content analysis
- **Replicate**: Video upscaling and style transfer
- **ElevenLabs**: High-quality voice synthesis
- **Custom AI Models**: Video analysis and enhancement

## 📁 Project Structure

```
VFXB_APP/
├── 📁 VFXB-App-Frontend/          # React frontend application
│   ├── 📁 src/
│   │   ├── 📁 components/          # Reusable UI components
│   │   │   ├── 📁 ui/              # Basic UI components
│   │   │   ├── 📁 video/           # Video player components
│   │   │   ├── 📁 effects/         # Effects library
│   │   │   ├── 📁 chat/            # AI chat interface
│   │   │   └── 📁 timeline/        # Timeline editor
│   │   ├── 📁 Pages/               # Page components
│   │   ├── 📁 services/            # API services
│   │   ├── 📁 hooks/               # Custom React hooks
│   │   └── 📁 utils/               # Utility functions
│   ├── 📄 package.json
│   └── 📄 vite.config.js
├── 📁 backend/                     # Node.js backend application
│   ├── 📁 src/
│   │   ├── 📁 routes/              # API route handlers
│   │   ├── 📁 services/            # Business logic services
│   │   ├── 📁 models/              # Data models
│   │   ├── 📁 middleware/          # Express middleware
│   │   ├── 📁 utils/               # Utility functions
│   │   └── 📁 sockets/             # Socket.IO handlers
│   ├── 📁 uploads/                 # File storage
│   ├── 📁 docs/                    # API documentation
│   └── 📄 package.json
├── 📄 README.md                    # This file
└── 📄 AI_Video_Editor_Market_Research.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **FFmpeg**: Required for video processing
- **Git**: For version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VFXB_APP
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your API keys
   
   # Start backend server
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd VFXB-App-Frontend
   npm install
   
   # Create environment file
   echo "VITE_API_URL=http://localhost:3001/api" > .env
   
   # Start frontend server
   npm run dev
   ```

4. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`
   - Health Check: `http://localhost:3001/api/health`

## ⚙️ Environment Configuration

### Backend Environment Variables
Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key_here
REPLICATE_API_TOKEN=your_replicate_token_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=500000000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

### Frontend Environment Variables
Create a `.env` file in the `VFXB-App-Frontend` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WEBSOCKET_URL=ws://localhost:3001

# Upload Configuration
VITE_UPLOAD_MAX_SIZE=500000000
VITE_SUPPORTED_FORMATS=mp4,mov,avi,mkv,webm

# Feature Flags
VITE_ENABLE_AI_FEATURES=true
VITE_ENABLE_PREMIUM_EFFECTS=true
```

## 📚 API Documentation

### Core Endpoints

#### Health Check
```http
GET /api/health
```
Returns server status, uptime, and version information.

#### Video Processing
```http
POST /api/video/upload
POST /api/video/trim
POST /api/video/crop
POST /api/video/apply-filter
POST /api/video/add-text
POST /api/video/export
```

#### AI Services
```http
POST /api/ai/chat
POST /api/ai/upscale
POST /api/ai/style-transfer
POST /api/ai/voice-generation
```

#### Project Management
```http
GET /api/projects
POST /api/projects
GET /api/projects/:id
PUT /api/projects/:id
DELETE /api/projects/:id
```

For detailed API documentation, see the [Backend Documentation](./backend/docs/API.md).

## 🏗️ Build for Production

### Frontend Build
```bash
cd VFXB-App-Frontend
npm run build
```
This creates an optimized production build in the `dist` directory.

### Backend Production
```bash
cd backend
npm run build  # If using TypeScript
npm start      # Production server
```

## 🚀 Deployment

### Frontend Deployment
- **Vercel**: Connect your GitHub repository for automatic deployments
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **AWS S3 + CloudFront**: Upload build files to S3 and configure CloudFront

### Backend Deployment
- **Railway**: Simple deployment with automatic scaling
- **Heroku**: Easy deployment with add-ons for databases
- **AWS EC2**: Full control over server configuration
- **DigitalOcean**: Cost-effective VPS hosting

### Environment Variables for Production
Ensure all environment variables are properly configured in your deployment platform.

## 🧪 Testing

### Frontend Testing
```bash
cd VFXB-App-Frontend
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
npm run test:coverage # Generate coverage report
```

### Backend Testing
```bash
cd backend
npm test            # Run all tests
npm run test:unit   # Unit tests only
npm run test:integration # Integration tests
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests** for new functionality
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FFmpeg** - Powerful video processing capabilities
- **OpenAI** - Advanced AI language models
- **Replicate** - AI model hosting and inference
- **ElevenLabs** - High-quality voice synthesis
- **React Community** - Amazing frontend framework and ecosystem
- **Node.js Community** - Robust backend runtime and packages

## 📞 Support

- **Documentation**: Check our comprehensive docs
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact us at support@vfxb.app

---

**Built with ❤️ by the VFXB Team**

*Making professional video editing accessible to everyone through the power of AI.*

**Built with ❤️ by the VFXB Team**

*Making video editing accessible to everyone through the power of AI*
