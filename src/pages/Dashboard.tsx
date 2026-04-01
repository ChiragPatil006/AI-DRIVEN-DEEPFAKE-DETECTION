  import { useState } from 'react';
  import JSZip from 'jszip';
  import { saveAs } from 'file-saver';
  import { jsPDF } from 'jspdf';
  import { useAuth } from '@/contexts/AuthContext';
  import { getScanHistory, ScanResult } from '@/lib/detection';
  import { motion } from 'framer-motion';
  import { 
    Upload, Shield, AlertTriangle, CheckCircle, ArrowRight, 
    Activity, Zap, Info, ShieldCheck, Clock, FileText, Download
  } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { Link } from 'react-router-dom';
  import AppLayout from '@/components/AppLayout';
  import { toast } from 'sonner';

  const Dashboard = () => {
    const { user } = useAuth();
    const scans = user ? getScanHistory(user.id) : [];
    
    // Stats calculation
    const fakeCount = scans.filter(s => s.result === 'fake').length;
    const realCount = scans.filter(s => s.result === 'real').length;

    const stats = [
      { label: 'Total Scans', value: scans.length, icon: Shield, color: 'bg-primary/10 text-primary' },
      { label: 'Fake Detected', value: fakeCount, icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
      { label: 'Verified Real', value: realCount, icon: CheckCircle, color: 'bg-success/10 text-success' },
    ];

    // Helper: Generate single PDF Blob for ZIP
    const generatePDFBlob = (scan: ScanResult) => {
      const doc = new jsPDF();
      const isFake = scan.result === 'fake';
      doc.setFillColor(isFake ? 220 : 34, isFake ? 38 : 197, isFake ? 38 : 94);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("FORENSIC ANALYSIS REPORT", 105, 25, { align: 'center' });
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(12);
      doc.text(`File Name: ${scan.fileName}`, 20, 60);
      doc.text(`Scan Date: ${new Date(scan.createdAt).toLocaleString()}`, 20, 70);
      doc.text(`Verdict: ${scan.result.toUpperCase()}`, 20, 80);
      doc.text(`Confidence: ${scan.confidence}%`, 20, 90);
      const splitExplanation = doc.splitTextToSize(scan.explanation, 170);
      doc.text(splitExplanation, 20, 105);
      return doc.output('blob');
    };

    // NEW FEATURE: Bulk ZIP Download
    const handleBulkExport = async () => {
      if (scans.length === 0) {
        toast.error("No scans found in history to export.");
        return;
      }

      const zip = new JSZip();
      const folder = zip.folder("DeepGuard_Scans_Export");
      
      toast.loading("Zipping reports...");

      scans.forEach((scan) => {
        const blob = generatePDFBlob(scan);
        folder?.file(`Report_${scan.id.slice(0, 5)}_${scan.fileName}.pdf`, blob);
      });

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `DeepGuard_Bulk_History_${new Date().getTime()}.zip`);
      toast.dismiss();
      toast.success("Bulk history downloaded! Check your downloads folder.");
    };

    // Helper for single report (Quick Tools)
    const handleLatestReport = () => {
      if (scans.length === 0) return toast.error("No scans available.");
      const blob = generatePDFBlob(scans[0]);
      saveAs(blob, `Latest_Report_${scans[0].fileName}.pdf`);
      toast.success("Latest report downloaded.");
    };

    

    return (
      <AppLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
          
          {/* Welcome & Security Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                Hey, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">Your identity protection is active and monitoring.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> System Secured
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass rounded-2xl p-5 border border-border/50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* CTA / Upload Box */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="glass rounded-2xl p-8 text-center gradient-soft border border-primary/10 relative overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <Upload className="w-12 h-12 mx-auto text-primary mb-4" />
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">New Deepfake Analysis</h2>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Analyze visual or auditory media using our latest neural detection engine.</p>
                <Link to="/detect">
                  <Button className="rounded-xl gradient-primary text-primary-foreground font-semibold px-8 h-12 shadow-lg shadow-primary/20 transition-transform hover:scale-105">
                    Start Detection <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </motion.div>


              {/* Recent scans */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold text-foreground">Recent Scans</h2>
                  <Link to="/history" className="text-sm text-primary hover:underline font-medium">View all history</Link>
                </div>
                {scans.length > 0 ? (
                  <div className="space-y-3">
                    {scans.slice(0, 4).map((scan) => (
                      <ScanCard key={scan.id} scan={scan} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl">
                    <p className="text-muted-foreground">No scans detected yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6 border border-border/50">
                <h3 className="font-heading font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-warning" /> Quick Tools
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleLatestReport}
                    className="justify-start gap-3 rounded-xl border-border/50 h-11 text-sm hover:bg-primary/5 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-primary" /> Latest Report
                  </Button>
                  
                  {/* Updated Bulk History -> ZIP Download Button */}
                  <Button 
                    variant="outline" 
                    onClick={handleBulkExport}
                    className="w-full justify-start gap-3 rounded-xl border-border/50 h-11 text-sm hover:bg-pink-500/5 hover:text-pink-500 transition-colors"
                  >
                    <Download className="w-4 h-4 text-pink-500" /> Download Bulk ZIP
                  </Button>

                  <Link to="/history" className="w-full">
                    <Button variant="outline" className="w-full justify-start gap-3 rounded-xl border-border/50 h-11 text-sm hover:bg-success/5 transition-colors">
                      <Clock className="w-4 h-4 text-success" /> View History
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="glass rounded-2xl p-6 border border-border/50 bg-primary/5">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Info className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Detection Tip</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Deepfakes often show inconsistencies in <strong>eye blinking patterns</strong>. Our Vision Engine v4.2 now prioritizes these artifacts.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AppLayout>
    );
  };

  const ScanCard = ({ scan }: { scan: ScanResult }) => (
    <motion.div 
      whileHover={{ x: 4 }}
      className="glass rounded-xl p-4 flex items-center justify-between border border-border/40 hover:border-primary/30 transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scan.result === 'fake' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
          {scan.result === 'fake' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-medium text-foreground text-sm truncate max-w-48">{scan.fileName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {new Date(scan.createdAt).toLocaleDateString()}
            </p>
            <span className="w-1 h-1 rounded-full bg-border" />
            <p className="text-[10px] text-muted-foreground uppercase">Media</p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-xs font-black px-2 py-0.5 rounded-md inline-block mb-1 ${scan.result === 'fake' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
          {scan.result === 'fake' ? 'FAKE' : 'REAL'}
        </div>
        <p className="text-sm font-mono font-bold text-foreground">{scan.confidence}%</p>
      </div>
    </motion.div>
  );

  export default Dashboard;