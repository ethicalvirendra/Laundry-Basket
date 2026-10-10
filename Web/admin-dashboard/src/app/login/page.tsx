"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
  ? 'http://localhost:5000/api' 
  : '/api';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json();

      if (res.ok && data.role === 'admin') {
        localStorage.setItem('lb_auth_token', data.token);
        localStorage.setItem('lb_user_role', data.role);
        router.push('/');
      } else {
        setError(data.error || "Invalid Admin Credentials");
      }
    } catch (err) {
      setError("Connection to backend failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="glass-card w-full max-w-md p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden bg-white mb-6">
            <img src="/admin/logo.png" alt="LB" className="w-full h-full object-contain p-1" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-center">Laundry Basket</h1>
          <p className="text-[10px] text-text-secondary font-bold tracking-widest uppercase mt-2">Central Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary ml-1 mb-2 block">Admin Username</label>
            <input 
              type="text" 
              className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 outline-none focus:border-primary transition-all font-bold"
              placeholder="admin"
              value={user}
              onChange={e => setUser(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-text-secondary ml-1 mb-2 block">Secret Password</label>
            <input 
              type="password" 
              className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 outline-none focus:border-primary transition-all font-bold"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-bold p-4 rounded-xl text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-4 text-lg font-black shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Access Dashboard →"}
          </button>
        </form>

        <p className="text-center mt-10 text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-50">
          Secure Operational Access Only
        </p>
      </div>
    </div>
  );
}
