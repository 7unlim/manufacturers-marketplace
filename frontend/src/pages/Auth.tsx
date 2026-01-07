import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Package, ShoppingCart, Factory, ArrowRight } from "lucide-react";

const Auth = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navigation */}
      <nav className="bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">BlueView</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Welcome to BlueView
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Choose how you'd like to use the platform. Are you looking to source materials or sell them?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Buyer Card */}
            <Link 
              to="/buyer/home"
              className="group block"
            >
              <div className="h-full p-8 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-8 h-8 text-primary" />
                </div>
                
                <h2 className="font-display font-semibold text-2xl text-foreground mb-3">
                  I'm a Buyer
                </h2>
                <p className="text-muted-foreground mb-6">
                  Browse manufacturing partners, explore their material catalogs, and create bid packages with AI-assisted pricing.
                </p>

                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Search materials across suppliers
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Build and submit bid packages
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    AI-powered price optimization
                  </li>
                </ul>

                <div className="flex items-center text-primary font-medium group-hover:gap-3 gap-2 transition-all">
                  Continue as Buyer
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Seller Card */}
            <Link 
              to="/seller/dashboard"
              className="group block"
            >
              <div className="h-full p-8 rounded-2xl bg-card border border-border hover:border-accent hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Factory className="w-8 h-8 text-accent" />
                </div>
                
                <h2 className="font-display font-semibold text-2xl text-foreground mb-3">
                  I'm a Seller
                </h2>
                <p className="text-muted-foreground mb-6">
                  List your materials, manage inventory, and receive bid requests from enterprise buyers looking for your products.
                </p>

                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Manage your material catalog
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Receive and review bid requests
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    Accept, counter, or decline bids
                  </li>
                </ul>

                <div className="flex items-center text-accent font-medium group-hover:gap-3 gap-2 transition-all">
                  Continue as Seller
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{" "}
            <Link to="/auth" className="text-primary hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Auth;

