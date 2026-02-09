import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const [isLogin, setIsLogin] = useState(true);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState(''); // Only for registration

    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // Success state
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage(''); // Clear previous success
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
                // Determine redirect path
                // Wait for context to update (user state)
                // Actually navigate happens only after login. Registration doesn't login anymore.
                navigate('/');
            } else {
                // Registration Success
                setIsLogin(true);
                setError('');
                // Maybe a success state to show message
                // I will add a successMessage state
                setSuccessMessage("Account created successfully! Please log in.");
            }
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
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isLogin ? "Create Account" : "Login"}
                    </span>
                </div>
            </form>
        </div>
    );
}
