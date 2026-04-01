import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, Upload, Zap, Lock, ArrowRight, CheckCircle, 
  BarChart3, Globe, ShieldCheck, Cpu, HelpCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const features = [
  { icon: Upload, title: 'Easy Upload', desc: 'Drag & drop images, videos, or audio files', color: 'bg-primary/10 text-primary' },
  { icon: Zap, title: 'Instant Results', desc: 'Get real-time analysis with confidence scores', color: 'bg-warning/10 text-warning' },
  { icon: Lock, title: 'Fully Private', desc: 'All processing happens locally on your device', color: 'bg-success/10 text-success' },
  { icon: CheckCircle, title: 'AI Powered', desc: 'Advanced deep learning detection models', color: 'bg-pink/10 text-pink' },
];

const stats = [
  { label: 'Accuracy Rate', value: '99.2%', icon: ShieldCheck },
  { label: 'Files Analyzed', value: '2M+', icon: BarChart3 },
  { label: 'Global Users', value: '50k+', icon: Globe },
];

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav - Keep Existing */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading text-lg font-bold text-foreground">DeepGuard</span>
          </div>
          <div className="flex gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button className="rounded-xl gradient-primary text-primary-foreground font-semibold">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost" className="rounded-xl">Sign In</Button></Link>
                <Link to="/signup"><Button className="rounded-xl gradient-primary text-primary-foreground font-semibold">Get Started</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero - Keep Existing */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-soft opacity-60" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 sm:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="w-3.5 h-3.5" /> AI-Powered Protection
            </div>
            <h1 className="font-heading text-4xl sm:text-6xl font-bold text-foreground leading-tight">
              Detect Deepfakes<br />
              <span className="text-gradient">in Seconds</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-xl mx-auto">
              Upload any image, video, or audio file and our AI will analyze it for manipulation. Fast, accurate, and completely private.
            </p>
            <div className="flex gap-3 justify-center mt-8">
              <Link to={user ? '/detect' : '/signup'}>
                <Button size="lg" className="rounded-xl gradient-primary text-primary-foreground font-semibold h-12 px-8 shadow-lg shadow-primary/20">
                  Start Detecting <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Floating elements */}
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-20 left-[10%] w-16 h-16 rounded-2xl bg-primary/10 blur-xl" />
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute bottom-20 right-[15%] w-20 h-20 rounded-full bg-pink-500/10 blur-xl" />
        </div>
      </section>

      {/* Stats Section - NEW */}
      <section className="border-y border-border/50 bg-secondary/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center space-y-2">
                <stat.icon className="w-6 h-6 text-primary" />
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Existing with subtle hover tweak */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold text-foreground uppercase tracking-tight">How it works</h2>
          <div className="h-1 w-20 bg-primary mx-auto mt-4 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${f.color}`}>
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-foreground mb-3 text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison Preview Section - NEW */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="glass rounded-3xl overflow-hidden border-border/50">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Advanced Neural Analysis</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our engine looks beyond what the human eye can see. By analyzing pixel-level inconsistencies and frequency patterns, we identify synthetic artifacts with high precision.
              </p>
              <ul className="space-y-3">
                {['Frame-by-frame verification', 'Metadata integrity check', 'Biometric consistency analysis'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-4 h-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted flex items-center justify-center p-8 border-l border-border/50 relative">
               <div className="w-full aspect-square rounded-xl bg-slate-800 flex flex-col items-center justify-center text-slate-500 overflow-hidden shadow-2xl">
                  {/* Visual placeholder for the UI dashboard */}
                  <div className="w-full h-8 bg-slate-700/50 flex items-center px-4 gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 w-full">
                    <div className="w-full h-4 bg-slate-700 rounded-full mb-4 animate-pulse" />
                    <div className="w-2/3 h-4 bg-slate-700 rounded-full mb-8 animate-pulse" />
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center">
                       <Shield className="w-12 h-12 opacity-20" />
                    </div>
                  </div>
               </div>
               <div className="absolute top-1/4 right-1 transform -translate-x-1/20 -translate-y-1/2 bg-background border border-border px-4 py-2 rounded-full shadow-xl text-xs font-bold whitespace-nowrap">
                 SCANNING IN PROGRESS...
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - NEW */}
      <section className="max-w-3xl mx-auto px-4 py-24">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <HelpCircle className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold text-center">Frequently Asked Questions</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-border/50">
            <AccordionTrigger className="hover:no-underline font-semibold">How accurate is the detection?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              DeepGuard currently achieves a 99.2% accuracy rate on industry-standard datasets. However, we always recommend reviewing the confidence scores provided for each scan.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="border-border/50">
            <AccordionTrigger className="hover:no-underline font-semibold">Is my data secure?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Absolutely. We utilize client-side processing where possible, and any cloud-based analysis is encrypted end-to-end. Your files are never stored or used to train public models.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3" className="border-border/50">
            <AccordionTrigger className="hover:no-underline font-semibold">What file formats are supported?</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              We support all major formats including MP4, AVI, MOV for video; JPG, PNG, WEBP for images; and MP3, WAV for audio.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Final CTA - NEW */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="gradient-primary rounded-3xl p-12 text-center text-primary-foreground space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to secure your digital content?</h2>
          <p className="max-w-2xl mx-auto opacity-90">
            Join thousands of users protecting themselves from digital misinformation. Start your first scan in less than 30 seconds.
          </p>
          <div className="pt-4">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="rounded-xl font-bold h-12 px-10">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer - Existing */}
      <footer className="border-t border-border py-12 bg-secondary/20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="font-bold text-foreground">DeepGuard</span>
          </div>
          <p>© 2026 DeepGuard. Built with ❤️ for a safer internet.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;