import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getScanHistory, deleteScan, ScanResult } from '@/lib/detection';
import { generateReport } from '@/lib/reportGenerator';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Trash2, FileImage, FileVideo, FileAudio, Search, Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

const HistoryPage = () => {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanResult[]>(user ? getScanHistory(user.id) : []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'real' | 'fake'>('all');

  const filtered = scans.filter(s => {
    if (filter !== 'all' && s.result !== filter) return false;
    if (search && !s.fileName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = (id: string) => {
    deleteScan(id);
    setScans(prev => prev.filter(s => s.id !== id));
    toast.success('Scan deleted');
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all scans? This cannot be undone.")) {
      scans.forEach(s => deleteScan(s.id));
      setScans([]);
      toast.success('All history cleared');
    }
  };

  const getIcon = (type: string) => {
    if (type === 'video') return FileVideo;
    if (type === 'audio') return FileAudio;
    return FileImage;
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-heading text-4xl font-extrabold text-foreground tracking-tight">Scan History</h1>
            <p className="text-muted-foreground mt-1">Found {scans.length} forensic records in your database</p>
          </div>
          {scans.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Clear Records
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Filter by filename..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-11 h-12 rounded-2xl glass border-none ring-1 ring-border/50 focus:ring-primary/40 transition-all" 
            />
          </div>
          <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl">
            {(['all', 'real', 'fake'] as const).map(f => (
              <Button 
                key={f} 
                variant="ghost" 
                size="sm" 
                onClick={() => setFilter(f)}
                className={`rounded-xl h-10 px-6 capitalize transition-all ${filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          <AnimatePresence mode='popLayout'>
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-3xl p-20 text-center border-dashed border-2 border-border/50">
                <p className="text-muted-foreground font-medium">No records matching your search criteria.</p>
              </motion.div>
            ) : (
              filtered.map((scan) => {
                const Icon = getIcon(scan.fileType);
                const isFake = scan.result === 'fake';
                return (
                  <motion.div 
                    key={scan.id} 
                    layout 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, x: -20 }}
                    className="glass group rounded-2xl p-5 flex items-center gap-5 border border-white/5 hover:ring-1 hover:ring-primary/30 transition-all"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isFake ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                      {isFake ? <AlertTriangle className="w-7 h-7" /> : <CheckCircle className="w-7 h-7" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary shrink-0" />
                        <p className="font-bold text-foreground text-base truncate">{scan.fileName}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                          {new Date(scan.createdAt).toLocaleDateString()}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <p className="text-[11px] text-muted-foreground font-medium uppercase">
                          {(scan.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className={`text-xl font-black tracking-tighter ${isFake ? 'text-destructive' : 'text-success'}`}>
                          {scan.confidence}%
                        </span>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase leading-none mt-1">Accuracy</p>
                      </div>

                      <div className="h-10 w-[1px] bg-border mx-2" />

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => {
                            generateReport(scan);
                            toast.success('Report downloaded successfully!');
                          }}
                          className="h-10 w-10 rounded-xl glass border-none ring-1 ring-border/50 hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(scan.id)} 
                          className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default HistoryPage;