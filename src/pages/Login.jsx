import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { login, register, verifyOTP, resendOTP } = useAuth();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);
    const [showOTP, setShowOTP] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        let result;
        if (isLogin) {
            result = await login(username, password);
        } else {
            result = await register(username, password, email);
        }

        setLoading(false);

        if (result.success) {
            if (isLogin) {
                navigate('/');
            } else if (result.needsVerification) {
                // Show OTP input
                setOtpEmail(result.email || email);
                setShowOTP(true);
                setSuccessMessage('Account created! Check your email for a verification code.');
            } else {
                setIsLogin(true);
                setError('');
                setSuccessMessage("Account created successfully! Please log in.");
            }
        } else {
            setError(result.error);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        const result = await verifyOTP(otpEmail, otpCode);

        setLoading(false);

        if (result.success) {
            setShowOTP(false);
            setIsLogin(true);
            setSuccessMessage('Account verified! You can now log in.');
            setOtpCode('');
        } else {
            setError(result.error);
        }
    };

    const handleResendOTP = async () => {
        if (resendCooldown > 0) return;

        const result = await resendOTP(otpEmail);
        if (result.success) {
            setSuccessMessage('New verification code sent!');
            setResendCooldown(60);
            const interval = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setError(result.error);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-app)',
            color: 'var(--text-primary)'
        }}>
            {showOTP ? (
                /* OTP Verification Form */
                <form onSubmit={handleVerifyOTP} style={{
                    padding: '2rem',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    width: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📧</div>
                        <h2 style={{ margin: 0 }}>Verify Your Email</h2>
                        <p style={{ color: '#aaa', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            We sent a 6-digit code to<br />
                            <strong style={{ color: '#4ade80' }}>{otpEmail}</strong>
                        </p>
                    </div>

                    {error && <div style={{ color: '#ff6b6b', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(255,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
                    {successMessage && <div style={{ color: '#51cf66', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(0,255,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{successMessage}</div>}

                    <div>
                        <input
                            type="text"
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            autoFocus
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '2rem',
                                textAlign: 'center',
                                letterSpacing: '12px',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-subtle)',
                                color: '#4ade80',
                                borderRadius: '8px'
                            }}
                        />
                    </div>

                    <button type="submit" disabled={loading || otpCode.length !== 6} style={{
                        padding: '0.75rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: (loading || otpCode.length !== 6) ? 0.7 : 1
                    }}>
                        {loading ? "Verifying..." : "Verify Account"}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#aaa' }}>
                        Didn't receive the code?{' '}
                        <span
                            onClick={handleResendOTP}
                            style={{
                                color: resendCooldown > 0 ? '#666' : 'var(--accent-primary)',
                                cursor: resendCooldown > 0 ? 'default' : 'pointer',
                                textDecoration: resendCooldown > 0 ? 'none' : 'underline'
                            }}
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </span>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '0.85rem' }}>
                        <span
                            onClick={() => { setShowOTP(false); setError(''); setSuccessMessage(''); }}
                            style={{ color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            ← Back to Login
                        </span>
                    </div>
                </form>
            ) : (
                /* Login / Register Form */
                <form onSubmit={handleSubmit} style={{
                    padding: '2rem',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    width: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <img src="/logo.png" alt="Logo" style={{ height: '50px', marginBottom: '1rem' }} />
                        <h2 style={{ margin: 0 }}>{isLogin ? "Login" : "Create Account"}</h2>
                    </div>

                    {error && <div style={{ color: '#ff6b6b', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(255,0,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
                    {successMessage && <div style={{ color: '#51cf66', fontSize: '0.9rem', textAlign: 'center', background: 'rgba(0,255,0,0.1)', padding: '0.5rem', borderRadius: '4px' }}>{successMessage}</div>}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }}
                            required
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }}
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'white', borderRadius: '4px' }}
                            required
                            minLength={6}
                        />
                    </div>

                    <button type="submit" disabled={loading} style={{
                        padding: '0.75rem',
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: loading ? 0.7 : 1
                    }}>
                        {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: '0.5rem', color: '#aaa' }}>
                        {isLogin ? "New here? " : "Already have an account? "}
                        <span
                            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }}
                            style={{ color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            {isLogin ? "Create Account" : "Login"}
                        </span>
                    </div>
                </form>
            )}
        </div>
    );
}
