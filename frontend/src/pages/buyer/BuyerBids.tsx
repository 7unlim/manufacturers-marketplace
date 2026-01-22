import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Sparkles, Trash2, Plus, Send, Wand2, ShoppingCart,
  Truck, MessageSquare, AlertCircle, Home, 
  Zap, TrendingDown, CheckCircle2, Lightbulb,
  BarChart3, PenLine, RefreshCw, ChevronRight, ChevronLeft, Check,
  MapPin, CreditCard, FileText, X, PartyPopper
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { 
  fetchCompanies, fetchMaterials, requestAiBid, createBid, submitBid,
  type Company, type Material, type AiAssistanceResponse, type BidTerms as ApiBidTerms
} from "@/lib/api";

type BidLineItem = {
  materialId: number;
  materialName: string;
  companyName: string;
  quantity: number;
  proposedUnitPrice: number;
  basePrice: number;
  itemNote: string;
  urgency: 'standard' | 'expedited' | 'rush';
};

type BidTerms = {
  deliveryPreference: string;
  deliveryDate: string;
  paymentTerms: string;
  shippingAddress: string;
  specialRequirements: string;
  bidJustification: string;
};

const BuyerBids = () => {
  const [searchParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [buyerName, setBuyerName] = useState("Buyer Account");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [lineItems, setLineItems] = useState<BidLineItem[]>([]);
  
  const [bidTerms, setBidTerms] = useState<BidTerms>({
    deliveryPreference: 'standard',
    deliveryDate: '',
    paymentTerms: 'net30',
    shippingAddress: '',
    specialRequirements: '',
    bidJustification: ''
  });
  
  const [aiResponse, setAiResponse] = useState<AiAssistanceResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [targetMargin, setTargetMargin] = useState("0.18");
  const [buyerFocus, setBuyerFocus] = useState("Balanced profitability");
  
  // Enhanced AI state
  type AiMode = 'pricing' | 'delivery' | 'justification' | 'full' | 'analysis';
  const [aiMode, setAiMode] = useState<AiMode>('full');
  const [aiInsights, setAiInsights] = useState<{
    competitiveness: number;
    savingsOpportunity: number;
    acceptanceLikelihood: number;
    suggestedDelivery: string;
    suggestedPayment: string;
    suggestedJustification: string;
    warnings: string[];
    tips: string[];
    priceBreakdown: { materialId: number; originalPrice: number; suggestedPrice: number; savings: number; reason: string }[];
  } | null>(null);
  
  const [submitResult, setSubmitResult] = useState<{ bidId: number; totalAmount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addMaterialOpen, setAddMaterialOpen] = useState(false);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const wizardSteps = [
    { number: 1, title: "Materials", icon: Package },
    { number: 2, title: "Your Info", icon: User },
    { number: 3, title: "Delivery & Terms", icon: Truck },
    { number: 4, title: "Review & Submit", icon: Send },
  ];

  useEffect(() => {
    // Load buyer account info
    const authAccount = localStorage.getItem("authAccount");
    if (authAccount) {
      try {
        const account = JSON.parse(authAccount);
        if (account.name) {
          setBuyerName(account.name);
        }
        if (account.email) {
          setBuyerEmail(account.email);
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }

    const loadData = async () => {
      try {
        const [companiesData, materialsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials()
        ]);
        setCompanies(companiesData);
        setMaterials(materialsData);

        const companyId = searchParams.get("companyId");
        const materialId = searchParams.get("materialId");
        
        if (companyId) {
          setSelectedCompanyId(companyId);
        }
        
        if (materialId) {
          const material = materialsData.find(m => m.id === Number(materialId));
          if (material) {
            setLineItems([{
              materialId: material.id,
              materialName: material.name,
              companyName: material.companyName,
              quantity: 10,
              proposedUnitPrice: material.baseUnitPrice,
              basePrice: material.baseUnitPrice,
              itemNote: '',
              urgency: 'standard'
            }]);
            setSelectedCompanyId(String(material.companyId));
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [searchParams]);

  const availableMaterials = useMemo(() => {
    if (!selectedCompanyId) return materials;
    return materials.filter(m => m.companyId === Number(selectedCompanyId));
  }, [materials, selectedCompanyId]);

  const bidTotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.proposedUnitPrice, 0);
  }, [lineItems]);

  // Wizard navigation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return selectedCompanyId !== "" && lineItems.length > 0;
      case 2:
        return buyerName.trim() !== "";
      case 3:
        return true; // Delivery is optional
      case 4:
        return true;
      default:
        return false;
    }
  }, [currentStep, selectedCompanyId, lineItems.length, buyerName]);

  const goNext = () => {
    if (canProceed && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    // Only allow going back or to completed steps
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const addMaterial = (material: Material) => {
    const existing = lineItems.find(item => item.materialId === material.id);
    if (existing) {
      setLineItems(prev => prev.map(item =>
        item.materialId === material.id
          ? { ...item, quantity: item.quantity + 10 }
          : item
      ));
    } else {
      setLineItems(prev => [...prev, {
        materialId: material.id,
        materialName: material.name,
        companyName: material.companyName,
        quantity: 10,
        proposedUnitPrice: material.baseUnitPrice,
        basePrice: material.baseUnitPrice,
        itemNote: '',
        urgency: 'standard'
      }]);
      if (!selectedCompanyId) {
        setSelectedCompanyId(String(material.companyId));
      }
    }
    setAddMaterialOpen(false);
  };

  const updateLineItem = <K extends keyof BidLineItem>(
    materialId: number, 
    field: K, 
    value: BidLineItem[K]
  ) => {
    setLineItems(prev => prev.map(item => {
      if (item.materialId !== materialId) return item;
      if (field === 'quantity') {
        return { ...item, [field]: Math.max(1, Math.round(value as number)) };
      }
      if (field === 'proposedUnitPrice') {
        return { ...item, [field]: Math.max(0, value as number) };
      }
      return { ...item, [field]: value };
    }));
  };

  const removeLineItem = (materialId: number) => {
    setLineItems(prev => prev.filter(item => item.materialId !== materialId));
  };

  const handleAiAssist = async () => {
    if (!selectedCompanyId || lineItems.length === 0) {
      setError("Add materials to get AI recommendations");
      return;
    }
    
    setAiLoading(true);
    setError(null);
    
    try {
      const response = await requestAiBid({
        companyId: Number(selectedCompanyId),
        targetMargin: Number(targetMargin),
        buyerFocus,
        lineItems: lineItems.map(({ materialId, quantity }) => ({
          materialId,
          quantity,
          proposedUnitPrice: 0
        }))
      });
      setAiResponse(response);
      
      // Generate comprehensive AI insights (simulated - in production this would come from backend)
      await generateAiInsights();
    } catch (err) {
      console.error(err);
      setError("AI assistant failed to generate recommendations");
    } finally {
      setAiLoading(false);
    }
  };

  const generateAiInsights = async () => {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const totalQuantity = lineItems.reduce((sum, item) => sum + item.quantity, 0);
    const avgDiscount = lineItems.reduce((sum, item) => {
      const discount = ((item.basePrice - item.proposedUnitPrice) / item.basePrice) * 100;
      return sum + discount;
    }, 0) / lineItems.length;
    
    const hasRushItems = lineItems.some(item => item.urgency === 'rush');
    const hasExpedited = lineItems.some(item => item.urgency === 'expedited');
    
    // Generate price breakdown with reasons
    const priceBreakdown = lineItems.map(item => {
      const bulkDiscount = item.quantity >= 100 ? 0.12 : item.quantity >= 50 ? 0.08 : item.quantity >= 20 ? 0.05 : 0;
      const urgencyPremium = item.urgency === 'rush' ? -0.05 : item.urgency === 'expedited' ? -0.02 : 0;
      const totalDiscount = bulkDiscount + urgencyPremium + Number(targetMargin) * 0.5;
      const suggestedPrice = item.basePrice * (1 - Math.min(totalDiscount, 0.25));
      
      let reason = '';
      if (item.quantity >= 100) reason = 'High volume qualifies for bulk discount';
      else if (item.quantity >= 50) reason = 'Medium volume with modest bulk savings';
      else if (item.urgency !== 'standard') reason = 'Urgency reduces negotiation leverage';
      else reason = 'Standard pricing with target margin applied';
      
      return {
        materialId: item.materialId,
        originalPrice: item.basePrice,
        suggestedPrice: Math.round(suggestedPrice * 100) / 100,
        savings: Math.round((item.basePrice - suggestedPrice) * item.quantity * 100) / 100,
        reason
      };
    });

    // Generate warnings
    const warnings: string[] = [];
    if (avgDiscount > 20) warnings.push('Aggressive discount may reduce acceptance likelihood');
    if (hasRushItems && bidTerms.paymentTerms === 'net60') warnings.push('Rush items with Net 60 payment is uncommon - consider faster payment');
    if (totalQuantity < 10) warnings.push('Low quantity orders typically have less negotiation room');
    if (!bidTerms.bidJustification) warnings.push('Adding justification significantly improves acceptance rates');
    
    // Generate tips
    const tips: string[] = [];
    if (totalQuantity >= 50) tips.push('Volume qualifies for bulk discount - mention long-term partnership');
    if (bidTerms.paymentTerms === 'prepaid') tips.push('Prepaid orders can negotiate 3-5% additional discount');
    if (!hasRushItems) tips.push('Standard delivery gives room for price negotiation');
    tips.push('Sellers respond 40% faster to bids with complete contact info');
    
    // Determine suggested delivery and payment
    let suggestedDelivery = 'standard';
    if (hasRushItems) suggestedDelivery = 'expedited';
    
    let suggestedPayment = 'net30';
    if (bidTotal > 50000) suggestedPayment = 'milestone';
    else if (bidTotal < 5000) suggestedPayment = 'prepaid';
    
    // Generate justification
    const companyName = companies.find(c => c.id === Number(selectedCompanyId))?.name || 'your company';
    const suggestedJustification = `We are submitting this bid for ${lineItems.length} material${lineItems.length > 1 ? 's' : ''} totaling ${totalQuantity} units. ${
      totalQuantity >= 50 
        ? `Given our volume commitment, we believe the proposed pricing reflects a fair bulk discount. ` 
        : ''
    }${
      bidTerms.paymentTerms === 'prepaid' 
        ? `We are prepared to pay upfront, which reduces your accounts receivable risk. `
        : bidTerms.paymentTerms === 'net15'
        ? `Our quick payment terms (Net 15) demonstrate our commitment to a smooth transaction. `
        : ''
    }We value ${companyName}'s quality and reliability, and are looking to establish a long-term procurement relationship. ${
      avgDiscount > 10 
        ? `The requested pricing reflects current market conditions and our projected annual volume increase of 25%.`
        : `We look forward to your response and are open to discussing terms.`
    }`;
    
    // Calculate scores
    const competitiveness = Math.min(100, Math.max(0, 70 + (avgDiscount * 1.5) - (hasRushItems ? 10 : 0)));
    const savingsOpportunity = Math.round(priceBreakdown.reduce((sum, p) => sum + p.savings, 0));
    const acceptanceLikelihood = Math.min(100, Math.max(20, 
      60 
      + (bidTerms.bidJustification ? 15 : 0) 
      + (bidTerms.paymentTerms === 'prepaid' ? 10 : 0)
      - (avgDiscount > 15 ? 15 : 0)
      + (totalQuantity >= 50 ? 10 : 0)
    ));
    
    setAiInsights({
      competitiveness,
      savingsOpportunity,
      acceptanceLikelihood,
      suggestedDelivery,
      suggestedPayment,
      suggestedJustification,
      warnings,
      tips,
      priceBreakdown
    });
  };

  const applyAiRecommendations = () => {
    if (!aiResponse) return;
    setLineItems(prev => prev.map(item => {
      const rec = aiResponse.recommendations.find(r => r.materialId === item.materialId);
      if (!rec) return item;
      return { ...item, proposedUnitPrice: rec.recommendedUnitPrice, quantity: rec.quantity };
    }));
    setAiResponse(null);
  };

  const applyAiPricing = () => {
    if (!aiInsights) return;
    setLineItems(prev => prev.map(item => {
      const priceRec = aiInsights.priceBreakdown.find(p => p.materialId === item.materialId);
      if (!priceRec) return item;
      return { ...item, proposedUnitPrice: priceRec.suggestedPrice };
    }));
  };

  const applyAiDelivery = () => {
    if (!aiInsights) return;
    setBidTerms(prev => ({ 
      ...prev, 
      deliveryPreference: aiInsights.suggestedDelivery,
      paymentTerms: aiInsights.suggestedPayment
    }));
    setCurrentStep(3); // Go to Delivery step
  };

  const applyAiJustification = () => {
    if (!aiInsights) return;
    setBidTerms(prev => ({ 
      ...prev, 
      bidJustification: aiInsights.suggestedJustification 
    }));
    setCurrentStep(4); // Go to Review step
  };

  const applyAllAiSuggestions = () => {
    if (!aiInsights) return;
    applyAiPricing();
    setBidTerms(prev => ({
      ...prev,
      deliveryPreference: aiInsights.suggestedDelivery,
      paymentTerms: aiInsights.suggestedPayment,
      bidJustification: aiInsights.suggestedJustification
    }));
  };

  const triggerCelebration = () => {
    // Fire confetti from both sides
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Left side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
      });
      
      // Right side
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']
      });
    }, 250);
  };

  const handleSubmit = async () => {
    if (!selectedCompanyId || lineItems.length === 0) {
      setError("Select a company and add materials");
      return;
    }
    
    setError(null);
    
    try {
      const result = await createBid({
        companyId: Number(selectedCompanyId),
        buyerName,
        lineItems: lineItems.map(({ materialId, quantity, proposedUnitPrice, itemNote, urgency }) => ({
          materialId,
          quantity,
          proposedUnitPrice,
          itemNote,
          urgency
        })),
        terms: {
          buyerEmail,
          buyerPhone,
          deliveryPreference: bidTerms.deliveryPreference,
          deliveryDate: bidTerms.deliveryDate,
          paymentTerms: bidTerms.paymentTerms,
          shippingAddress: bidTerms.shippingAddress,
          bidJustification: bidTerms.bidJustification,
          specialRequirements: bidTerms.specialRequirements
        }
      });
      
      // Also submit the bid immediately
      await submitBid(result.bidId);
      setSubmitResult(result);
      setShowCelebration(true);
      
      // Trigger confetti and toast
      triggerCelebration();
      toast.success("Bid Submitted Successfully!", {
        description: `Bid #${result.bidId} for $${result.totalAmount.toFixed(2)} has been sent to the supplier.`,
        duration: 5000,
      });
      
      // Hide celebration after a delay
      setTimeout(() => setShowCelebration(false), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to submit bid");
      toast.error("Failed to submit bid", {
        description: "Please try again or contact support.",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-hero rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">Waypoint</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Buyer</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/buyer/home">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/buyer/materials">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/buyer/companies">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Companies
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Button variant="ghost" className="text-primary font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Bid Builder
              </Button>
              <span className="text-border">|</span>
              <Link to="/buyer/bids/history">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <FileText className="w-4 h-4 mr-2" />
                  My Bids
                </Button>
              </Link>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <span className="text-sm font-medium">{buyerName}</span>
                <div className="w-9 h-9 rounded-full gradient-hero flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/buyer/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/buyer/settings" className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/auth" className="flex items-center text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wizard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Bid Builder
              </h1>
              <p className="text-muted-foreground mt-1">
                Create a bid with AI-optimized pricing
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center justify-between">
                {wizardSteps.map((step, index) => (
                  <div key={step.number} className="flex items-center flex-1">
                    <button
                      onClick={() => goToStep(step.number)}
                      className={`flex items-center gap-2 transition-colors ${
                        step.number < currentStep
                          ? 'cursor-pointer'
                          : step.number === currentStep
                          ? 'cursor-default'
                          : 'cursor-not-allowed opacity-50'
                      }`}
                      disabled={step.number > currentStep}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                          step.number < currentStep
                            ? 'bg-primary text-primary-foreground'
                            : step.number === currentStep
                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.number < currentStep ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="hidden sm:block">
                        <p className={`text-sm font-medium ${
                          step.number === currentStep ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Step {step.number}
                        </p>
                      </div>
                    </button>
                    {index < wizardSteps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-3 ${
                        step.number < currentStep ? 'bg-primary' : 'bg-border'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {/* Step 1: Materials */}
              {currentStep === 1 && (
                <div>
                  <div className="p-4 border-b border-border">
                    <h2 className="font-display font-semibold text-lg">Select Materials</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose a supplier and add materials to your bid
                    </p>
                  </div>

                  <div className="p-4 border-b border-border">
                    <label className="text-sm font-medium mb-2 block">Supplier *</label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier..." />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={String(company.id)}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-medium">Line Items</h3>
                    <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={!selectedCompanyId}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Material
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Add Material to Bid</DialogTitle>
                          <DialogDescription>
                            Select a material to add to your bid package
                          </DialogDescription>
                        </DialogHeader>
                        <div className="overflow-y-auto flex-1 -mx-6 px-6">
                          <div className="space-y-2 py-4">
                            {availableMaterials.map((material) => (
                              <button
                                key={material.id}
                                onClick={() => addMaterial(material)}
                                className="w-full p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{material.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {material.companyName} · {material.type}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-primary">
                                    ${material.baseUnitPrice.toFixed(2)}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {lineItems.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No materials added yet</p>
                      <p className="text-sm">Select a supplier and click "Add Material"</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {lineItems.map((item) => (
                        <div key={item.materialId} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{item.materialName}</p>
                                {item.urgency !== 'standard' && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    item.urgency === 'rush' 
                                      ? 'bg-destructive/10 text-destructive' 
                                      : 'bg-amber-500/10 text-amber-600'
                                  }`}>
                                    {item.urgency}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.companyName} · Base: ${item.basePrice.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLineItem(item.materialId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Quantity</label>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateLineItem(item.materialId, 'quantity', Number(e.target.value))}
                                className="h-9"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Unit Price</label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.proposedUnitPrice}
                                  onChange={(e) => updateLineItem(item.materialId, 'proposedUnitPrice', Number(e.target.value))}
                                  className="h-9 pl-6"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Urgency</label>
                              <Select 
                                value={item.urgency} 
                                onValueChange={(v) => updateLineItem(item.materialId, 'urgency', v as BidLineItem['urgency'])}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="expedited">Expedited</SelectItem>
                                  <SelectItem value="rush">Rush</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Line Total</label>
                              <div className="h-9 flex items-center font-semibold text-primary">
                                ${(item.quantity * item.proposedUnitPrice).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Item-level note */}
                          <Accordion type="single" collapsible className="mt-2">
                            <AccordionItem value="note" className="border-none">
                              <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline">
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" />
                                  {item.itemNote ? 'Edit note' : 'Add note for this item'}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <Textarea
                                  value={item.itemNote}
                                  onChange={(e) => updateLineItem(item.materialId, 'itemNote', e.target.value)}
                                  placeholder="Add specific notes for this material (e.g., preferred specifications, acceptable alternatives...)"
                                  rows={2}
                                  className="text-sm"
                                />
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      ))}
                    </div>
                  )}

                  {lineItems.length > 0 && (
                    <div className="p-4 border-t border-border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Subtotal ({lineItems.length} items)</span>
                        <span className="font-medium">${bidTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="font-display font-semibold">Estimated Total</span>
                        <span className="text-2xl font-display font-bold text-primary">
                          ${bidTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Your Info */}
              {currentStep === 2 && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="font-display font-semibold text-lg">Your Information</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Provide your contact details for the supplier
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company / Buyer Name *</label>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Your company name"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Email</label>
                        <Input
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          placeholder="email@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Phone</label>
                        <Input
                          value={buyerPhone}
                          onChange={(e) => setBuyerPhone(e.target.value)}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Summary */}
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground mb-2">Bid Summary</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {lineItems.length} material{lineItems.length !== 1 ? 's' : ''} to {companies.find(c => c.id === Number(selectedCompanyId))?.name || 'supplier'}
                      </span>
                      <span className="font-display font-bold text-primary">
                        ${bidTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Delivery & Terms */}
              {currentStep === 3 && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="font-display font-semibold text-lg">Delivery & Payment Terms</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Specify your delivery preferences and payment terms
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          Delivery Type
                        </label>
                        <Select 
                          value={bidTerms.deliveryPreference} 
                          onValueChange={(v) => setBidTerms(prev => ({ ...prev, deliveryPreference: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard Shipping</SelectItem>
                            <SelectItem value="expedited">Expedited (3-5 days)</SelectItem>
                            <SelectItem value="rush">Rush (1-2 days)</SelectItem>
                            <SelectItem value="pickup">Will Pickup</SelectItem>
                            <SelectItem value="freight">Freight / LTL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Requested Delivery Date</label>
                        <Input
                          type="date"
                          value={bidTerms.deliveryDate}
                          onChange={(e) => setBidTerms(prev => ({ ...prev, deliveryDate: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        Payment Terms
                      </label>
                      <Select 
                        value={bidTerms.paymentTerms} 
                        onValueChange={(v) => setBidTerms(prev => ({ ...prev, paymentTerms: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prepaid">Prepaid (100% upfront)</SelectItem>
                          <SelectItem value="net15">Net 15 days</SelectItem>
                          <SelectItem value="net30">Net 30 days</SelectItem>
                          <SelectItem value="net45">Net 45 days</SelectItem>
                          <SelectItem value="net60">Net 60 days</SelectItem>
                          <SelectItem value="cod">Cash on Delivery</SelectItem>
                          <SelectItem value="milestone">Milestone-based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        Shipping Address
                      </label>
                      <Textarea
                        value={bidTerms.shippingAddress}
                        onChange={(e) => setBidTerms(prev => ({ ...prev, shippingAddress: e.target.value }))}
                        placeholder="Enter full shipping address..."
                        rows={3}
                      />
                    </div>
                  </div>

                  {bidTerms.deliveryPreference === 'rush' && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Rush delivery may incur additional fees (typically 10-15% surcharge)
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="font-display font-semibold text-lg">Review & Submit</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Review your bid details and add any final notes before submitting
                    </p>
                  </div>

                  {/* Bid Summary */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg border border-border bg-muted/30">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Submitting to
                      </h3>
                      <p className="text-lg font-display font-semibold">
                        {companies.find(c => c.id === Number(selectedCompanyId))?.name}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg border border-border bg-muted/30">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        Materials ({lineItems.length})
                      </h3>
                      <div className="space-y-2">
                        {lineItems.map((item) => (
                          <div key={item.materialId} className="flex items-center justify-between text-sm">
                            <span>
                              {item.materialName} × {item.quantity}
                              {item.urgency !== 'standard' && (
                                <span className={`ml-2 text-xs ${
                                  item.urgency === 'rush' ? 'text-destructive' : 'text-amber-600'
                                }`}>
                                  ({item.urgency})
                                </span>
                              )}
                            </span>
                            <span className="font-medium">
                              ${(item.quantity * item.proposedUnitPrice).toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 mt-2 border-t border-border flex items-center justify-between font-medium">
                          <span>Total</span>
                          <span className="text-lg text-primary">${bidTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border border-border bg-muted/30">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          Buyer Info
                        </h3>
                        <p className="font-medium">{buyerName}</p>
                        {buyerEmail && <p className="text-sm text-muted-foreground">{buyerEmail}</p>}
                        {buyerPhone && <p className="text-sm text-muted-foreground">{buyerPhone}</p>}
                      </div>
                      <div className="p-4 rounded-lg border border-border bg-muted/30">
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-primary" />
                          Delivery & Payment
                        </h3>
                        <p className="text-sm capitalize">{bidTerms.deliveryPreference} delivery</p>
                        {bidTerms.deliveryDate && (
                          <p className="text-sm text-muted-foreground">By {bidTerms.deliveryDate}</p>
                        )}
                        <p className="text-sm text-muted-foreground capitalize">
                          {bidTerms.paymentTerms.replace(/([A-Z])/g, ' $1').replace('net', 'Net ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-4 pt-4 border-t border-border">
                    <h3 className="font-medium">Bid Justification & Notes</h3>
                    <p className="text-sm text-muted-foreground">
                      Add context to help the seller understand your pricing. Strong justifications improve acceptance rates.
                    </p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Message to Seller</label>
                      <Textarea
                        value={bidTerms.bidJustification}
                        onChange={(e) => setBidTerms(prev => ({ ...prev, bidJustification: e.target.value }))}
                        placeholder="e.g., We are a long-term customer looking for a multi-year contract. Our volume projections for next year are 3x current order, which justifies the requested discount..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Special Requirements (optional)</label>
                      <Textarea
                        value={bidTerms.specialRequirements}
                        onChange={(e) => setBidTerms(prev => ({ ...prev, specialRequirements: e.target.value }))}
                        placeholder="Any special packaging, certifications, documentation, or handling requirements..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Submit Section */}
                  <div className="pt-4 border-t border-border">
                    {!submitResult ? (
                      <Button 
                        className="w-full h-12 gradient-hero text-primary-foreground text-lg"
                        size="lg"
                        onClick={handleSubmit}
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Submit Bid Package
                      </Button>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-300">
                          <PartyPopper className="w-10 h-10 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-green-600 mb-2">
                          Bid Submitted! 🎉
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Your bid has been sent to the supplier
                        </p>
                        <div className="inline-block p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                          <p className="text-sm text-muted-foreground">Bid Reference</p>
                          <p className="text-2xl font-display font-bold text-green-600">
                            #{submitResult.bidId}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            ${submitResult.totalAmount.toFixed(2)}
                          </p>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                          <Link to="/buyer/bids/history">
                            <Button variant="outline">
                              <FileText className="w-4 h-4 mr-2" />
                              View My Bids
                            </Button>
                          </Link>
                          <Button onClick={() => {
                            setSubmitResult(null);
                            setLineItems([]);
                            setSelectedCompanyId("");
                            setCurrentStep(1);
                            setBidTerms({
                              deliveryPreference: 'standard',
                              deliveryDate: '',
                              paymentTerms: 'net30',
                              shippingAddress: '',
                              specialRequirements: '',
                              bidJustification: ''
                            });
                          }}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Bid
                          </Button>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              {currentStep < 4 && (
                <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={goBack}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Step {currentStep} of {totalSteps}
                  </div>
                  <Button
                    onClick={goNext}
                    disabled={!canProceed}
                    className="flex items-center gap-2"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Simplified */}
          <div className="space-y-6">
            {/* AI Assistant Trigger Card */}
            <div className="rounded-xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border border-primary/20 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                    <Wand2 className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-lg">AI Bid Assistant</h2>
                    <p className="text-sm text-muted-foreground">Get AI-powered optimization</p>
                  </div>
                </div>
                
                {aiInsights ? (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-card/80">
                      <div className="text-lg font-bold text-primary">{aiInsights.acceptanceLikelihood}%</div>
                      <div className="text-[10px] text-muted-foreground">Accept</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-card/80">
                      <div className="text-lg font-bold text-green-600">${aiInsights.savingsOpportunity}</div>
                      <div className="text-[10px] text-muted-foreground">Savings</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-card/80">
                      <div className="text-lg font-bold text-accent">{aiInsights.competitiveness}%</div>
                      <div className="text-[10px] text-muted-foreground">Score</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4">
                    Analyze your bid to get pricing suggestions, market insights, and recommendations
                  </p>
                )}
                
                <Sheet open={aiSheetOpen} onOpenChange={setAiSheetOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      className="w-full h-12 gradient-hero text-primary-foreground font-medium"
                      disabled={lineItems.length === 0}
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      {aiInsights ? 'View AI Analysis' : 'Open AI Assistant'}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader className="pb-6 border-b border-border">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
                          <Wand2 className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <SheetTitle className="font-display text-xl">AI Bid Assistant</SheetTitle>
                          <SheetDescription>Optimize your bid with market intelligence</SheetDescription>
                        </div>
                      </div>
                    </SheetHeader>
                    
                    <div className="py-6 space-y-6">
                      {/* Analysis Mode */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">Analysis Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { mode: 'full' as AiMode, icon: Zap, label: 'Full Optimize', desc: 'Complete analysis' },
                            { mode: 'pricing' as AiMode, icon: TrendingDown, label: 'Pricing', desc: 'Price suggestions' },
                            { mode: 'delivery' as AiMode, icon: Truck, label: 'Terms', desc: 'Shipping & payment' },
                            { mode: 'justification' as AiMode, icon: PenLine, label: 'Notes', desc: 'Auto-write notes' },
                          ].map(({ mode, icon: Icon, label, desc }) => (
                            <button
                              key={mode}
                              onClick={() => setAiMode(mode)}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                aiMode === mode 
                                  ? 'border-primary bg-primary/10' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <Icon className={`w-5 h-5 mb-2 ${aiMode === mode ? 'text-primary' : 'text-muted-foreground'}`} />
                              <p className={`font-medium text-sm ${aiMode === mode ? 'text-primary' : ''}`}>{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Configuration */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Target Savings</label>
                          <Select value={targetMargin} onValueChange={setTargetMargin}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.05">5% — Conservative</SelectItem>
                              <SelectItem value="0.10">10% — Competitive</SelectItem>
                              <SelectItem value="0.15">15% — Standard</SelectItem>
                              <SelectItem value="0.18">18% — Balanced</SelectItem>
                              <SelectItem value="0.22">22% — Aggressive</SelectItem>
                              <SelectItem value="0.30">30% — Maximum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Priority</label>
                          <Select value={buyerFocus} onValueChange={setBuyerFocus}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Balanced profitability">Balanced approach</SelectItem>
                              <SelectItem value="Maximum savings">Maximum savings</SelectItem>
                              <SelectItem value="Long-term partnership">Partnership</SelectItem>
                              <SelectItem value="Quick turnaround">Fast delivery</SelectItem>
                              <SelectItem value="Quality assurance">Quality focus</SelectItem>
                              <SelectItem value="Volume commitment">Volume leverage</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-12 gradient-hero text-primary-foreground"
                        onClick={handleAiAssist}
                        disabled={lineItems.length === 0 || aiLoading}
                      >
                        {aiLoading ? (
                          <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5 mr-2" />
                        )}
                        {aiLoading ? 'Analyzing...' : 'Analyze & Optimize'}
                      </Button>

                      {/* AI Results */}
                      {aiInsights && (
                        <div className="space-y-6 pt-6 border-t border-border">
                          {/* Score Cards */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                              <div className="text-2xl font-bold text-primary">{aiInsights.acceptanceLikelihood}%</div>
                              <div className="text-xs text-muted-foreground mt-1">Acceptance</div>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                              <div className="text-2xl font-bold text-green-600">${aiInsights.savingsOpportunity}</div>
                              <div className="text-xs text-muted-foreground mt-1">Savings</div>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-muted/50 border border-border">
                              <div className="text-2xl font-bold text-accent">{aiInsights.competitiveness}%</div>
                              <div className="text-xs text-muted-foreground mt-1">Score</div>
                            </div>
                          </div>

                          {/* Market Intelligence */}
                          <div className="p-4 rounded-xl bg-muted/30 border border-border">
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-primary" />
                              Market Intelligence
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Price vs. Market</span>
                                  <span className="text-green-600 font-medium">8% below</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full w-[42%] bg-green-500 rounded-full" />
                                </div>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Historical Accept Rate</span>
                                <span className="text-primary font-medium">72%</span>
                              </div>
                            </div>
                          </div>

                          {/* Warnings */}
                          {aiInsights.warnings.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2 text-amber-600">
                                <AlertCircle className="w-4 h-4" />
                                Warnings
                              </h4>
                              <div className="space-y-2">
                                {aiInsights.warnings.map((w, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                                    {w}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tips */}
                          {aiInsights.tips.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
                                <Lightbulb className="w-4 h-4" />
                                Recommendations
                              </h4>
                              <div className="space-y-2">
                                {aiInsights.tips.map((t, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                    {t}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Price Breakdown */}
                          {aiInsights.priceBreakdown.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-3 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-primary" />
                                Price Optimization
                              </h4>
                              <div className="space-y-2">
                                {aiInsights.priceBreakdown.map((item, i) => {
                                  const lineItem = lineItems.find(l => l.materialId === item.materialId);
                                  return (
                                    <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border">
                                      <div className="flex justify-between items-start">
                                        <span className="font-medium text-sm">{lineItem?.materialName}</span>
                                        <span className="text-green-600 font-semibold text-sm">-${item.savings.toFixed(2)}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <span className="line-through">${item.originalPrice.toFixed(2)}</span>
                                        <ChevronRight className="w-3 h-3" />
                                        <span className="text-primary font-medium">${item.suggestedPrice.toFixed(2)}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Apply Actions */}
                          <div className="pt-4 border-t border-border space-y-3">
                            <Button className="w-full h-11" onClick={() => { applyAllAiSuggestions(); setAiSheetOpen(false); }}>
                              <Zap className="w-4 h-4 mr-2" />
                              Apply All Suggestions
                            </Button>
                            <div className="grid grid-cols-3 gap-2">
                              <Button variant="outline" size="sm" onClick={() => { applyAiPricing(); setAiSheetOpen(false); }}>
                                Prices
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { applyAiDelivery(); setAiSheetOpen(false); }}>
                                Terms
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { applyAiJustification(); setAiSheetOpen(false); }}>
                                Notes
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Bid Summary Card */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="p-5 border-b border-border bg-muted/30">
                <h2 className="font-display font-semibold">Bid Summary</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Supplier</span>
                  <span className={`text-sm font-medium ${selectedCompanyId ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {selectedCompanyId 
                      ? companies.find(c => c.id === Number(selectedCompanyId))?.name 
                      : 'Not selected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Materials</span>
                  <span className={`text-sm font-medium ${lineItems.length > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {lineItems.length > 0 ? `${lineItems.length} items` : 'None'}
                  </span>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-display font-bold text-primary">
                      ${bidTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {currentStep < 4 && (
                <div className="p-5 pt-0">
                  <Button 
                    className="w-full"
                    onClick={() => setCurrentStep(4)}
                    disabled={!canProceed && currentStep === 1}
                    variant={currentStep === 1 && !canProceed ? 'outline' : 'default'}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Skip to Review
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BuyerBids;

