import { ShieldAlert } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-background overflow-hidden selection:bg-primary/30">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/login-bg.png`} 
          alt="Dashboard Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="bg-card/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-[0_0_30px_rgba(0,240,255,0.2)] mb-6">
              <img 
                src={`${import.meta.env.BASE_URL}images/logo.png`} 
                alt="AIWatch Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-3">
              AIWatch
            </h1>
            <p className="text-muted-foreground">
              Unified intelligence feed for the AI industry. Track models, pricing, and API changes.
            </p>
          </div>

          <div className="space-y-4">
            <a 
              href="/api/login?returnTo=/"
              className="flex items-center justify-center w-full py-4 px-6 rounded-xl bg-foreground text-background font-semibold text-lg hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/10"
            >
              Authenticate with Replit
            </a>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/50 border border-white/5 text-sm text-muted-foreground mt-6">
              <ShieldAlert className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p>Secure access via OpenID Connect. Authorized personnel only.</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
