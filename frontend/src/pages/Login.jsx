import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock authentication - will be replaced with actual API call
    setTimeout(() => {
      if (credentials.email === 'admin@hotelbridge.com' && credentials.password === 'admin123') {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', credentials.email);
        toast.success('Login successful!');
        navigate('/crm');
      } else {
        toast.error('Invalid credentials', {
          description: 'Please check your email and password.'
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80">
      <div className="w-full max-w-md px-4">
        <Card className="shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="text-3xl font-bold text-primary mb-2">
              Hotel<span className="text-secondary">Bridge</span>
            </div>
            <CardTitle className="text-2xl">CRM Login</CardTitle>
            <p className="text-sm text-gray-500 mt-2">Sign in to access your dashboard</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  placeholder="Enter your email"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  className="mt-2"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-secondary hover:bg-secondary/90" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
