import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Index = () => {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Content */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Tagline */}
          <p className="animate-fade-up text-muted-foreground text-sm uppercase tracking-[0.3em] mb-6 font-body">
            Design Studio
          </p>
          
          {/* Main heading */}
          <h1 className="animate-fade-up-delay font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight mb-8">
            We craft{" "}
            <span className="text-gradient">digital</span>
            <br />
            experiences
          </h1>
          
          {/* Description */}
          <p className="animate-fade-up-delay-2 text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-12 font-body leading-relaxed">
            Transforming ideas into immersive digital products through thoughtful design and cutting-edge technology.
          </p>
          
          {/* CTA Buttons */}
          <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl">
              Start a project
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="heroOutline" size="xl">
              View our work
            </Button>
          </div>
        </div>
      </div>
      
      {/* Bottom decorative line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </main>
  );
};

export default Index;
