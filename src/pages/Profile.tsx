import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  User, Mail, Calendar, LogOut, ShieldCheck, 
  Fingerprint, HardDrive, Share2, Award 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { getScanHistory } from '@/lib/detection';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Logic to fetch user impact data
  const scans = user ? getScanHistory(user.id) : [];
  const totalScans = scans.length;
  const fakesCaught = scans.filter(s => s.result === 'fake').length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Left Column: Identity Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="glass rounded-3xl p-8 border border-border/50 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              
              <div className="relative mx-auto w-24 h-24 mb-4">
                <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse" />
                <div className="relative w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center border border-white/10 shadow-2xl">
                  <User className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>

              <h1 className="font-heading text-xl font-bold text-foreground truncate">{user.name}</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6">Verified Analyst</p>
              
              <div className="pt-6 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Account Security</span>
                  <span className="text-success font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> High
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-2xl p-4 border border-border/50">
              <Button 
                onClick={handleLogout} 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-xl h-12 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="w-4 h-4" /> 
                <span className="font-bold text-xs uppercase tracking-widest">Terminate Session</span>
              </Button>
            </div>
          </div>

          {/* Right Column: Detailed Info & Stats */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass rounded-3xl p-8 border border-border/50">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-primary" /> Credentials & Data
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-3 mb-1">
                    <Mail className="w-4 h-4 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Email Endpoint</p>
                  </div>
                  <p className="font-medium text-foreground truncate pl-7">{user.email}</p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-3 mb-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Registration Date</p>
                  </div>
                  <p className="font-medium text-foreground pl-7">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Impact Metrics */}
              <div className="mt-8">
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Award className="w-4 h-4 text-warning" /> Forensic Impact
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4">
                    <p className="text-2xl font-bold text-foreground">{totalScans}</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Total Scans</p>
                  </div>
                  <div className="text-center p-4 border-x border-border/50">
                    <p className="text-2xl font-bold text-destructive">{fakesCaught}</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Fakes Exposed</p>
                  </div>
                  <div className="text-center p-4">
                    <p className="text-2xl font-bold text-success">
                      {totalScans > 0 ? Math.round((fakesCaught / totalScans) * 100) : 0}%
                    </p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Detection Rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage/Plan Info */}
            <div className="glass rounded-3xl p-6 border border-border/50 bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-background border border-primary/20 flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Storage Utilization</h4>
                  <p className="text-xs text-muted-foreground">Analyst Plan - Gain a deeper understanding of your data</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-[10px] font-black uppercase tracking-tighter">
                Manage Plan
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Profile;