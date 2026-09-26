import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      // Normalize so mobile auto-capitalization, stray spaces, or .co/.com don't block login
      const email = credentials.email.trim().toLowerCase();
      const validEmail = email === 'admin@hotelbridge.co' || email === 'admin@hotelbridge.com';
      if (validEmail && credentials.password === 'admin123') {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', 'admin@hotelbridge.co');
        toast.success('Welcome back!', { description: 'Redirecting to your dashboard...' });
        navigate('/crm');
      } else {
        toast.error('Invalid credentials', { description: 'Please check your email and password.' });
      }
      setIsLoading(false);
    }, 900);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden cta-gradient">
      {/* Animated orbs */}
      <div className="orb w-[600px] h-[600px] bg-secondary/15 -top-40 -left-40 animate-float-slow" />
      <div className="orb w-[500px] h-[500px] bg-blue-400/10 -bottom-40 -right-40 animate-float" />
      <div className="orb w-72 h-72 bg-secondary/10 top-1/2 right-10 animate-float" style={{ animationDelay: '1.5s' }} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 w-full max-w-6xl px-4 grid lg:grid-cols-2 gap-10 items-center">

        {/* Left side — branding & marketing */}
        <div className="hidden lg:block text-white animate-fade-up">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-secondary mb-12 transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to website
          </Link>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-yellow-300 mb-8">
            <Sparkles className="w-4 h-4" />
            Partner CRM Portal
          </div>

          <h1 className="font-serif text-5xl lg:text-6xl font-bold leading-[1.05] mb-6">
            Welcome<br />
            <span className="text-shimmer">back.</span>
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed mb-10 max-w-md">
            Manage your hotels, operators, and bookings — all from one elegant command center.
          </p>

          {/* Feature pills */}
          <div className="space-y-4">
            {[
              { icon: ShieldCheck, title: 'Bank-grade security', desc: 'Encrypted at rest and in transit' },
              { icon: Sparkles, title: 'AI-powered insights', desc: 'Smart recommendations on every booking' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 rounded-2xl glass-dark border border-white/10 max-w-md">
                <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">{title}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side — login card */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto animate-scale-in">
          <div className="glass-dark rounded-3xl p-8 lg:p-10 shadow-2xl border border-white/10">
            {/* Logo */}
            <Link to="/" className="inline-block mb-8 lg:hidden">
              <div className="text-3xl font-bold text-white">
                Hotel<span className="text-shimmer">Bridge</span>
              </div>
            </Link>

            <h2 className="font-serif text-3xl font-bold text-white mb-2">Sign in</h2>
            <p className="text-sm text-gray-400 mb-8">Access your hotel partner dashboard</p>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-secondary transition-colors" />
                  <Input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    placeholder="you@hotelbridge.co"
                    required
                    className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-secondary focus:ring-1 focus:ring-secondary transition-all rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Password
                  </label>
                  <Link to="#" className="text-xs text-secondary hover:text-yellow-300 transition-colors">
                    Forgot?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-secondary transition-colors" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    className="pl-11 pr-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:bg-white/10 focus:border-secondary focus:ring-1 focus:ring-secondary transition-all rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 btn-gold text-white border-0 rounded-xl font-semibold text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

            </form>

            <p className="text-center text-xs text-gray-500 mt-8">
              Not a partner yet?{' '}
              <Link to="/contact" className="text-secondary hover:text-yellow-300 font-semibold transition-colors">
                Get in touch
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
