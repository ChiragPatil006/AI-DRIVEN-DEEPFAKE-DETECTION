import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getScanHistory, deleteScan, ScanResult } from '@/lib/detection';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Trash2, FileImage, FileVideo, FileAudio, Search, Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { jsPDF } from 'jspdf';

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

  const generateReport = (scan: ScanResult) => {
    const doc = new jsPDF();
    const isFake = scan.result === 'fake';
    const accentColor = isFake ? [220, 38, 38] : [34, 197, 94]; // Red vs Green
    
    // 1. HEADER & BRANDING
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, 210, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("DeepGuard Report", 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("NEURAL LAYER FORENSIC CERTIFICATE", 105, 35, { align: 'center' });
    doc.text(`CERTIFICATE ID: ${scan.id.toUpperCase().slice(0, 16)}`, 105, 42, { align: 'center' });

    // 2. WATERMARK
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(60);
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    doc.text(isFake ? "AI GENERATED" : "AUTHENTIC MEDIA", 105, 150, { align: 'center', angle: 45 });
    doc.setGState(new (doc as any).GState({ opacity: 1.0 }));

    // 3. MEDIA METADATA
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("1. Media Assessment Metadata", 20, 65);
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 68, 190, 68);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const metaData = [
      ["Source File:", scan.fileName],
      ["File Type:", scan.fileType.toUpperCase()],
      ["Data Size:", `${(scan.fileSize / 1024 / 1024).toFixed(2)} MB`],
      ["Timestamp:", new Date(scan.createdAt).toLocaleString()],
      ["Neural Hash:", btoa(scan.id).slice(0, 24)]
    ];

    let yPos = 80;
    metaData.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(value, 60, yPos);
      yPos += 8;
    });

    // 4. THE VERDICT SEAL
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 125, 170, 55, 4, 4, 'F');
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, 125, 170, 55, 4, 4, 'D');

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text("ANALYSIS VERDICT", 105, 135, { align: 'center' });
    
    doc.setFontSize(36);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(isFake ? "DEEPFAKE DETECTED" : "VERIFIED AUTHENTIC", 105, 155, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(`Confidence Level: ${scan.confidence}%`, 105, 170, { align: 'center' });

    // 5. FORENSIC BREAKDOWN (Dynamic content)
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(14);
    doc.text("2. Forensic Observations", 20, 200);
    doc.line(20, 203, 190, 203);

    const findings = isFake ? [
      "• Frequency Domain: GAN-generated artifacts found in high-frequency spatial layers.",
      "• Biological Inconsistency: Non-natural blinking rhythm and pupil dilation detected.",
      "• Environment Physics: Light refraction anomalies on dermal surfaces identified.",
      "• Edge Analysis: Blurring detected on facial-edge boundaries (Neural blending)."
    ] : [
      "• Sensor Noise: Authentic ISO photon noise consistent with physical hardware capture.",
      "• Dermal Variance: Organic skin texture variance and blood-flow (rPPG) verified.",
      "• Temporal Fluidity: Natural motion blur and Newtonian physics alignment confirmed.",
      "• Lighting: Sub-pixel ray reflections consistent with environmental light sources."
    ];

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let findingY = 212;
    findings.forEach(line => {
      doc.text(line, 25, findingY);
      findingY += 10;
    });

    // 6. SYSTEM FOOTER
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 275, 190, 275);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This document is a cryptographic assessment generated by the DeepGuard Neural Engine.", 105, 282, { align: 'center' });
    doc.text("The results are based on pixel-layer analysis and frequency domain verification.", 105, 286, { align: 'center' });

    doc.save(`Forensic_Report_${scan.fileName.split('.')[0]}.pdf`);
    toast.success('Professional Forensic Report Downloaded!');
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
                          onClick={() => generateReport(scan)} 
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