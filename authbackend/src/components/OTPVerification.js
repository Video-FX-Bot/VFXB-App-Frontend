import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import OTPInput from './OTPInput';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Your backend URL

const OTPVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(timer - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOTPComplete = async (otpValue) => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-otp`, {
        email,
        otp: otpValue
      });

      if (response.data.success) {
        navigate('/dashboard');
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError('');

    try {
      await axios.post(`${API_BASE_URL}/api/auth/resend-otp`, { email });
      setTimer(30);
      setCanResend(false);
      alert('OTP has been resent to your email');
    } catch (error) {
      setError('Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Verify OTP</h2>
        <p>Enter the 6-digit code sent to {email}</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <OTPInput length={6} onComplete={handleOTPComplete} />
        
        {loading && <div className="loading">Verifying...</div>}
        
        <div className="resend-section">
          {canResend ? (
            <button 
              onClick={handleResendOTP} 
              disabled={resendLoading}
              className="resend-btn"
            >
              {resendLoading ? 'Sending...' : 'Resend OTP'}
            </button>
          ) : (
            <p>Resend OTP in {timer} seconds</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
