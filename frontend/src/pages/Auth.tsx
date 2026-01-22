import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate } from "react-router-dom";
import { Package, ShoppingCart, Factory, ArrowRight, Loader2, Mail, Lock, User, Sparkles, CheckCircle2 } from "lucide-react";
import { signUp, signIn, type AuthAccount } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import SellerOnboarding, { type OnboardingData } from "@/components/SellerOnboarding";
import BuyerOnboarding, { type BuyerOnboardingData } from "@/components/BuyerOnboarding";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingType, setOnboardingType] = useState<"seller" | "buyer" | null>(null);
  const [pendingAccount, setPendingAccount] = useState<AuthAccount | null>(null);
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "buyer" as "buyer" | "seller",
  });

  // Scrolling words animation
  const words = ["manufacturing", "supply chain", "procurement", "logistics", "operations"];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    }, 3000); // Change word every 3 seconds

    return () => clearInterval(interval);
  }, [words.length]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await signIn({
        email: signInData.email,
        password: signInData.password,
      });

      // Store auth data
      localStorage.setItem("authAccount", JSON.stringify(response.account));
      localStorage.setItem("isAuthenticated", "true");

      toast({
        title: "Signed in successfully",
        description: `Welcome back, ${response.account.name}!`,
      });

      // Redirect based on role
      if (response.account.role === "buyer") {
        navigate("/buyer/home");
      } else {
        navigate("/seller/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await signUp({
        email: signUpData.email,
        password: signUpData.password,
        name: signUpData.name,
        role: signUpData.role,
      });

      // Store auth data
      localStorage.setItem("authAccount", JSON.stringify(response.account));
      localStorage.setItem("isAuthenticated", "true");

      // Show onboarding based on role
      setPendingAccount(response.account);
      if (response.account.role === "seller") {
        setOnboardingType("seller");
        setShowOnboarding(true);
      } else {
        setOnboardingType("buyer");
        setShowOnboarding(true);
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSellerOnboardingComplete = async (onboardingData: OnboardingData) => {
    if (!pendingAccount) return;

    try {
      // Save onboarding data to localStorage
      const accountWithOnboarding = {
        ...pendingAccount,
        onboarding: onboardingData
      };
      localStorage.setItem("authAccount", JSON.stringify(accountWithOnboarding));

      toast({
        title: "Account created successfully",
        description: `Welcome, ${pendingAccount.name}!`,
      });

      navigate("/seller/dashboard");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      const accountWithOnboarding = {
        ...pendingAccount,
        onboarding: onboardingData
      };
      localStorage.setItem("authAccount", JSON.stringify(accountWithOnboarding));
      navigate("/seller/dashboard");
    }
  };

  const handleBuyerOnboardingComplete = async (onboardingData: BuyerOnboardingData) => {
    if (!pendingAccount) return;

    try {
      // Save onboarding data to localStorage
      const accountWithOnboarding = {
        ...pendingAccount,
        onboarding: onboardingData
      };
      localStorage.setItem("authAccount", JSON.stringify(accountWithOnboarding));

      toast({
        title: "Account created successfully",
        description: `Welcome, ${pendingAccount.name}! We'll help you find the perfect materials.`,
      });

      navigate("/buyer/home");
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      const accountWithOnboarding = {
        ...pendingAccount,
        onboarding: onboardingData
      };
      localStorage.setItem("authAccount", JSON.stringify(accountWithOnboarding));
      navigate("/buyer/home");
    }
  };

  const handleSkipOnboarding = () => {
    if (pendingAccount) {
      const role = pendingAccount.role;
      toast({
        title: "Account created successfully",
        description: `Welcome, ${pendingAccount.name}! You can complete your profile later.`,
      });
      navigate(role === "seller" ? "/seller/dashboard" : "/buyer/home");
    }
  };

  // Show onboarding if user just signed up
  if (showOnboarding && pendingAccount && onboardingType === "seller") {
    return (
      <SellerOnboarding
        onComplete={handleSellerOnboardingComplete}
        onSkip={handleSkipOnboarding}
      />
    );
  }

  if (showOnboarding && pendingAccount && onboardingType === "buyer") {
    return (
      <BuyerOnboarding
        onComplete={handleBuyerOnboardingComplete}
        onSkip={handleSkipOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-slate-900">Waypoint</span>
          </Link>
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
            Back to home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        <div className="w-full max-w-5xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left side - Welcome message */}
            <div className="hidden md:block space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-medium text-slate-700">Your Manufacturing Waypoint</span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                  Welcome to the future of
                  <span className="block relative h-[1.4em] overflow-hidden mt-2">
                    <div className="relative h-full word-scroll-container">
                      {words.map((word, index) => {
                        const isActive = index === currentWordIndex;
                        const offset = index - currentWordIndex;
                        
                        return (
                          <span
                            key={`${word}-${index}`}
                            className={`word-scroll-item absolute inset-0 flex items-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 ${
                              isActive ? "active" : ""
                            }`}
                            data-offset={offset}
                          >
                            {word}
                          </span>
                        );
                      })}
                    </div>
                  </span>
                </h1>
                <p className="text-lg text-slate-600 leading-relaxed">
                  Connect with suppliers, manage bids, and streamline your operations with our powerful marketplace platform.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                  <ShoppingCart className="w-6 h-6 text-indigo-600 mb-2" />
                  <h3 className="font-semibold text-slate-900 mb-1">For Buyers</h3>
                  <p className="text-sm text-slate-600">Source materials and create bids</p>
                </div>
                <div className="p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-sm">
                  <Factory className="w-6 h-6 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-slate-900 mb-1">For Sellers</h3>
                  <p className="text-sm text-slate-600">Manage inventory and bids</p>
                </div>
              </div>
            </div>

            {/* Right side - Auth form */}
            <div className="w-full">
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="space-y-1 pb-4">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl gradient-hero">
                    <Package className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-center text-slate-900">Get Started</CardTitle>
                  <CardDescription className="text-center text-slate-600">
                    Sign in to your account or create a new one
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100/50">
                      <TabsTrigger value="signin" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin" className="space-y-4 mt-6">
                      <form onSubmit={handleSignIn} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="signin-email" className="text-slate-700 font-medium">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="signin-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signInData.email}
                              onChange={(e) =>
                                setSignInData({ ...signInData, email: e.target.value })
                              }
                              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signin-password" className="text-slate-700 font-medium">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="signin-password"
                              type="password"
                              placeholder="Enter your password"
                              value={signInData.password}
                              onChange={(e) =>
                                setSignInData({ ...signInData, password: e.target.value })
                              }
                              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-11 gradient-hero text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            <>
                              Sign In
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>
                      <div className="relative pt-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white text-slate-500">Quick Access</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Pre-populated accounts:</p>
                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex items-start gap-2">
                            <Factory className="w-3.5 h-3.5 text-indigo-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">Sellers:</span> Use company email (e.g., <code className="bg-white px-1.5 py-0.5 rounded text-indigo-600">sales@northforge.com</code>)<br />
                              Password: <code className="bg-white px-1.5 py-0.5 rounded text-indigo-600">password123</code>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <ShoppingCart className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="font-medium">Buyer:</span> <code className="bg-white px-1.5 py-0.5 rounded text-blue-600">buyer@example.com</code><br />
                              Password: <code className="bg-white px-1.5 py-0.5 rounded text-blue-600">password123</code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-4 mt-6">
                      <form onSubmit={handleSignUp} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-slate-700 font-medium">
                            Full Name
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="signup-name"
                              type="text"
                              placeholder="John Doe"
                              value={signUpData.name}
                              onChange={(e) =>
                                setSignUpData({ ...signUpData, name: e.target.value })
                              }
                              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-slate-700 font-medium">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="you@example.com"
                              value={signUpData.email}
                              onChange={(e) =>
                                setSignUpData({ ...signUpData, email: e.target.value })
                              }
                              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-role" className="text-slate-700 font-medium">
                            Account Type
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setSignUpData({ ...signUpData, role: "buyer" })}
                              className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                signUpData.role === "buyer"
                                  ? "border-indigo-500 bg-indigo-50 shadow-md"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <ShoppingCart className={`w-6 h-6 mb-2 ${signUpData.role === "buyer" ? "text-indigo-600" : "text-slate-400"}`} />
                              <span className={`font-medium text-sm ${signUpData.role === "buyer" ? "text-indigo-900" : "text-slate-600"}`}>
                                Buyer
                              </span>
                              {signUpData.role === "buyer" && (
                                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-indigo-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignUpData({ ...signUpData, role: "seller" })}
                              className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                                signUpData.role === "seller"
                                  ? "border-blue-500 bg-blue-50 shadow-md"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <Factory className={`w-6 h-6 mb-2 ${signUpData.role === "seller" ? "text-blue-600" : "text-slate-400"}`} />
                              <span className={`font-medium text-sm ${signUpData.role === "seller" ? "text-blue-900" : "text-slate-600"}`}>
                                Seller
                              </span>
                              {signUpData.role === "seller" && (
                                <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-blue-600" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-slate-700 font-medium">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="signup-password"
                              type="password"
                              placeholder="At least 6 characters"
                              value={signUpData.password}
                              onChange={(e) =>
                                setSignUpData({ ...signUpData, password: e.target.value })
                              }
                              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                              required
                              minLength={6}
                            />
                          </div>
                          <p className="text-xs text-slate-500">Must be at least 6 characters long</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-confirm" className="text-slate-700 font-medium">
                            Confirm Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                              id="signup-confirm"
                              type="password"
                              placeholder="Confirm your password"
                              value={signUpData.confirmPassword}
                              onChange={(e) =>
                                setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                              }
                              className="pl-10 h-11 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                              required
                              minLength={6}
                            />
                          </div>
                        </div>
                        <Button 
                          type="submit" 
                          className="w-full h-11 gradient-hero text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            <>
                              Create Account
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .word-scroll-container {
          perspective: 1000px;
        }
        .word-scroll-item {
          transform: translateY(100%);
          opacity: 0;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: transform, opacity;
        }
        .word-scroll-item.active {
          transform: translateY(0);
          opacity: 1;
        }
        .word-scroll-item[data-offset="-1"] {
          transform: translateY(-100%);
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default Auth;
