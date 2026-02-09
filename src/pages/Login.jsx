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
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let result;
        if (isLogin) {
            result = await login(username, password);
        } else {
            result = await register(username, password, email);
        }

        setLoading(false);

        if (result.success) {
            // Check context user role or wait for AuthProvider to update?
            // Actually result doesn't return user object directly here in my context impl, 
            // but context updates state. We can redirect.
            // But to be safe, we can pull role from localStorage or wait.
            // MVP: detailed redirect in App.jsx based on role? 
            // The ProtectedRoute handles access control. 
            // We need to know WHERE to send them.
            // Let's assume generic redirect to root, and App will redirect to /shop if customer?
            // Existing App logic: 
            // <Route path="/" element={<ProtectedRoute...><Dashboard/></ProtectedRoute>} />
            // If customer goes to /, ProtectedRoute says:
            // if (!allowedRoles.includes(role)) -> if customer -> ?
            // I added logic in ProtectedRoute:
            // if (user.role === 'employee') return <Navigate to="/pos" />;
            // I need to add: if (user.role === 'customer') return <Navigate to="/shop" />;

            // Wait, I should update App.jsx ProtectedRoute logic too!

            navigate('/');
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
