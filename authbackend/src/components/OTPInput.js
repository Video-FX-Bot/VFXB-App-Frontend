import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ length = 6, onComplete }) => {
  const [otp, setOtp] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  useEffect(() => {
    if (inputs.current[0]) {
      inputs.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const { value } = e.target;

    // Only allow single digit input
    if (value.match(/^\d$/)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move focus to the next input
      if (index < length - 1) {
        inputs.current[index + 1].focus();
      }

      // Check if OTP is complete
      if (newOtp.every(digit => digit !== '')) {
        onComplete && onComplete(newOtp.join(''));
      }
    }

    // Clear current input if empty value
    if (value === '') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && otp[index] === '') {
      // Move focus to previous input on backspace if current input is empty
      if (index > 0) {
        inputs.current[index - 1].focus();
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1].focus();
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, length);
    
    if (pasteData.match(/^\d+$/)) {
      const newOtp = [...otp];
      for (let i = 0; i < pasteData.length && i < length; i++) {
        newOtp[i] = pasteData[i];
      }
      setOtp(newOtp);
      
      if (newOtp.every(digit => digit !== '')) {
        onComplete && onComplete(newOtp.join(''));
      }
    }
  };

  return (
    <div className="otp-container">
      <div className="otp-inputs">
        {otp.map((digit, index) => (
          <input
            key={index}
            type="text"
            maxLength="1"
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            ref={(el) => (inputs.current[index] = el)}
            className="otp-input"
          />
        ))}
      </div>
    </div>
  );
};

export default OTPInput;
