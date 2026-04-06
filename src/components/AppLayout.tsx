import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Upload, History, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/detect', icon: Upload, label: 'Detect' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="w-full px-4 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">DeepGuard</span>
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className="relative px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-muted">
                  <span className={active ? 'text-primary' : 'text-muted-foreground'}>
                    <item.icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                  {active && (
                    <motion.div layoutId="nav-active" className="absolute inset-0 rounded-xl bg-primary/10 -z-10" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
