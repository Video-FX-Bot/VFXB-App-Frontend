#!/usr/bin/env node

/**
 * VFXB Backend Setup Script
 * Automated setup and verification for the AI-powered video editing platform
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

class SetupManager {
  constructor() {
    this.envConfig = {};
    this.setupSteps = [
      'checkNodeVersion',
      'checkFFmpeg',
      'checkMongoDB',
      'setupEnvironment',
      'installDependencies',
      'createDirectories',
      'verifySetup'
    ];
  }

  async run() {
    log('\n🚀 VFXB Backend Setup Script', 'cyan');
    log('=====================================\n', 'cyan');

    try {
      for (const step of this.setupSteps) {
        await this[step]();
      }
      
      log('\n✅ Setup completed successfully!', 'green');
      log('\n📚 Next steps:', 'yellow');
      log('1. Review your .env file and add your API keys', 'yellow');
      log('2. Start MongoDB if not already running', 'yellow');
      log('3. Run: npm run dev', 'yellow');
      log('4. Visit: http://localhost:5000/health\n', 'yellow');
      
    } catch (error) {
      log(`\n❌ Setup failed: ${error.message}`, 'red');
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkNodeVersion() {
    log('🔍 Checking Node.js version...', 'blue');
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
    }
    
    log(`✅ Node.js ${nodeVersion} detected`, 'green');
  }

  async checkFFmpeg() {
    log('🔍 Checking FFmpeg installation...', 'blue');
    
    try {
      const output = execSync('ffmpeg -version', { encoding: 'utf8', stdio: 'pipe' });
      const version = output.split('\n')[0];
      log(`✅ ${version}`, 'green');
    } catch (error) {
      log('❌ FFmpeg not found', 'red');
      log('\n📥 Install FFmpeg:', 'yellow');
      log('Windows: choco install ffmpeg', 'yellow');
      log('macOS: brew install ffmpeg', 'yellow');
      log('Ubuntu: sudo apt install ffmpeg\n', 'yellow');
      
      const proceed = await question('Continue without FFmpeg? (y/N): ');
      if (proceed.toLowerCase() !== 'y') {
        throw new Error('FFmpeg is required for video processing');
      }
    }
  }

  async checkMongoDB() {
    log('🔍 Checking MongoDB...', 'blue');
    
    try {
      // Try to connect to local MongoDB
      execSync('mongosh --eval "db.runCommand({ping: 1})" --quiet', { stdio: 'pipe' });
      log('✅ MongoDB is running locally', 'green');
      this.envConfig.MONGODB_URI = 'mongodb://localhost:27017/vfxb_app';
    } catch (error) {
      log('⚠️  Local MongoDB not detected', 'yellow');
      
      const useAtlas = await question('Use MongoDB Atlas (cloud)? (Y/n): ');
      if (useAtlas.toLowerCase() !== 'n') {
        const atlasUri = await question('Enter MongoDB Atlas connection string: ');
        if (atlasUri.trim()) {
          this.envConfig.MONGODB_URI = atlasUri.trim();
          log('✅ MongoDB Atlas configured', 'green');
        } else {
          this.envConfig.MONGODB_URI = 'mongodb://localhost:27017/vfxb_app';
          log('⚠️  Using default local MongoDB URI', 'yellow');
        }
      } else {
        this.envConfig.MONGODB_URI = 'mongodb://localhost:27017/vfxb_app';
        log('⚠️  Using default local MongoDB URI', 'yellow');
      }
    }
  }

  async setupEnvironment() {
    log('🔧 Setting up environment configuration...', 'blue');
    
    const envPath = path.join(__dirname, '.env');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    // Check if .env already exists
    if (fs.existsSync(envPath)) {
      const overwrite = await question('.env file exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        log('✅ Keeping existing .env file', 'green');
        return;
      }
    }
    
    // Basic configuration
    this.envConfig.PORT = '5000';
    this.envConfig.NODE_ENV = 'development';
    this.envConfig.JWT_SECRET = this.generateSecret();
    
    // API Keys setup
    log('\n🔑 API Keys Setup (press Enter to skip):', 'cyan');
    
    const openaiKey = await question('OpenAI API Key (required for AI features): ');
    if (openaiKey.trim()) {
      this.envConfig.OPENAI_API_KEY = openaiKey.trim();
    }
    
    const assemblyaiKey = await question('AssemblyAI API Key (for transcription): ');
    if (assemblyaiKey.trim()) {
      this.envConfig.ASSEMBLYAI_API_KEY = assemblyaiKey.trim();
    }
    
    const replicateKey = await question('Replicate API Token (for advanced AI): ');
    if (replicateKey.trim()) {
      this.envConfig.REPLICATE_API_TOKEN = replicateKey.trim();
    }
    
    // Email setup
    log('\n📧 Email Configuration (for notifications):', 'cyan');
    const emailService = await question('Email service (gmail/sendgrid/skip): ');
    
    if (emailService.toLowerCase() === 'gmail') {
      const emailUser = await question('Gmail address: ');
      const emailPass = await question('Gmail app password: ');
      if (emailUser.trim() && emailPass.trim()) {
        this.envConfig.EMAIL_SERVICE = 'gmail';
        this.envConfig.EMAIL_USER = emailUser.trim();
        this.envConfig.EMAIL_PASS = emailPass.trim();
      }
    } else if (emailService.toLowerCase() === 'sendgrid') {
      const sendgridKey = await question('SendGrid API Key: ');
      if (sendgridKey.trim()) {
        this.envConfig.EMAIL_SERVICE = 'sendgrid';
        this.envConfig.SENDGRID_API_KEY = sendgridKey.trim();
      }
    }
    
    // Cloud storage
    log('\n☁️  Cloud Storage (optional):', 'cyan');
    const useCloudinary = await question('Use Cloudinary for media storage? (y/N): ');
    
    if (useCloudinary.toLowerCase() === 'y') {
      const cloudName = await question('Cloudinary Cloud Name: ');
      const apiKey = await question('Cloudinary API Key: ');
      const apiSecret = await question('Cloudinary API Secret: ');
      
      if (cloudName.trim() && apiKey.trim() && apiSecret.trim()) {
        this.envConfig.CLOUDINARY_CLOUD_NAME = cloudName.trim();
        this.envConfig.CLOUDINARY_API_KEY = apiKey.trim();
        this.envConfig.CLOUDINARY_API_SECRET = apiSecret.trim();
      }
    }
    
    // Write .env file
    this.writeEnvFile(envPath);
    log('✅ Environment configuration created', 'green');
  }

  generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  writeEnvFile(envPath) {
    const envContent = Object.entries(this.envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    const fullEnvContent = `# VFXB Backend Environment Configuration
# Generated by setup script on ${new Date().toISOString()}

# Server Configuration
${envContent}

# Additional configuration can be added manually
# See .env.example for all available options
`;
    
    fs.writeFileSync(envPath, fullEnvContent);
  }

  async installDependencies() {
    log('📦 Installing dependencies...', 'blue');
    
    try {
      execSync('npm install', { stdio: 'inherit' });
      log('✅ Dependencies installed successfully', 'green');
    } catch (error) {
      throw new Error('Failed to install dependencies');
    }
  }

  async createDirectories() {
    log('📁 Creating required directories...', 'blue');
    
    const directories = [
      'uploads',
      'temp',
      'logs',
      'uploads/videos',
      'uploads/thumbnails',
      'uploads/exports'
    ];
    
    directories.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log(`  Created: ${dir}`, 'green');
      }
    });
    
    log('✅ Directories created', 'green');
  }

  async verifySetup() {
    log('🔍 Verifying setup...', 'blue');
    
    const checks = [
      { name: 'package.json', path: 'package.json' },
      { name: '.env file', path: '.env' },
      { name: 'uploads directory', path: 'uploads' },
      { name: 'main app file', path: 'src/app.js' }
    ];
    
    let allGood = true;
    
    checks.forEach(check => {
      const exists = fs.existsSync(path.join(__dirname, check.path));
      if (exists) {
        log(`  ✅ ${check.name}`, 'green');
      } else {
        log(`  ❌ ${check.name}`, 'red');
        allGood = false;
      }
    });
    
    if (!allGood) {
      throw new Error('Setup verification failed');
    }
    
    log('✅ Setup verification passed', 'green');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new SetupManager();
  setup.run().catch(error => {
    console.error('Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = SetupManager;