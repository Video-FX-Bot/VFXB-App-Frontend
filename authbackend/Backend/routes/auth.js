const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// Generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email address'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Save reset token to user (expires in 1 hour)
        user.resetToken = resetToken;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        // Email content
        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { background-color: #f1f1f1; padding: 20px; text-align: center; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Password Reset Request</h2>
                    </div>
                    <div class="content">
                        <p>Hello ${user.name},</p>
                        <p>We received a request to reset your password. Click the button below to reset your password:</p>
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #4CAF50;">${resetUrl}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request this password reset, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>Best regards,<br>Your App Team</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email
        const emailSent = await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            html: emailHtml
        });

        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Email could not be sent'
            });
        }

        res.json({
            success: true,
            message: 'Password reset link has been sent to your email'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Find user with valid reset token
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Update password
        user.password = password; // Will be hashed by pre-save hook
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        // Send confirmation email
        const confirmationHtml = `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                    <h2>Password Reset Successful</h2>
                </div>
                <div style="padding: 20px;">
                    <p>Hello ${user.name},</p>
                    <p>Your password has been successfully reset.</p>
                    <p>If you didn't make this change, please contact our support team immediately.</p>
                </div>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Password Reset Successful',
            html: confirmationHtml
        });

        res.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Verify Token Route (for your AuthContext)
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// OTP Routes for your existing OTP system
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Save OTP to user (expires in 10 minutes)
        user.otp = otp;
        user.otpExpiry = Date.now() + 600000; // 10 minutes
        await user.save();

        // Send OTP email
        const otpHtml = `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
                    <h2>Your OTP Code</h2>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <p>Hello ${user.name},</p>
                    <p>Your OTP code is:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #2196F3; margin: 0; font-size: 36px;">${otp}</h1>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Your OTP Code',
            html: otpHtml
        });

        res.json({
            success: true,
            message: 'OTP sent to your email'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email,
            otp,
            otpExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired OTP'
            });
        }

        // Clear OTP and mark as verified
        user.otp = null;
        user.otpExpiry = null;
        user.isVerified = true;
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new OTP
        const otp = generateOTP();
        
        user.otp = otp;
        user.otpExpiry = Date.now() + 600000; // 10 minutes
        await user.save();

        // Send OTP email (reuse the same HTML from send-otp)
        const otpHtml = `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
                    <h2>Your New OTP Code</h2>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <p>Hello ${user.name},</p>
                    <p>Your new OTP code is:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #2196F3; margin: 0; font-size: 36px;">${otp}</h1>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: 'Your New OTP Code',
            html: otpHtml
        });

        res.json({
            success: true,
            message: 'New OTP sent to your email'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
