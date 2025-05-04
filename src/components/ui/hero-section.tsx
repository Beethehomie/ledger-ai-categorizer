
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "./aurora-background";
import { AnimatedGroup } from "./animated-group";

export function HeroSection() {
  return (
    <AuroraBackground>
      <div className="container px-4 md:px-6 flex flex-col items-center justify-center min-h-screen text-center">
        <AnimatedGroup className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-4">
            Welcome to our Financial Management Platform
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-[700px] mx-auto">
            Intelligent transaction categorization powered by AI embeddings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/">Learn More</Link>
            </Button>
          </div>
        </AnimatedGroup>
      </div>
    </AuroraBackground>
  );
}
