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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Sparkles, Trash2, Plus, Send, Wand2, ShoppingCart, FileText,
  Truck, CreditCard, MessageSquare, Calendar, AlertCircle, 
  Zap, Target, TrendingDown, Clock, Shield, CheckCircle2, Lightbulb,
  BarChart3, PenLine, RefreshCw
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
  const [buyerName, setBuyerName] = useState("Enterprise Procurement");
  const [buyerEmail, setBuyerEmail] = useState("procurement@enterprise.com");
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
  const [activeTab, setActiveTab] = useState("materials");

  useEffect(() => {
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
              basePrice: material.baseUnitPrice
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
    setActiveTab('delivery');
  };

  const applyAiJustification = () => {
    if (!aiInsights) return;
    setBidTerms(prev => ({ 
      ...prev, 
      bidJustification: aiInsights.suggestedJustification 
    }));
    setActiveTab('notes');
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
    } catch (err) {
      console.error(err);
      setError("Failed to submit bid");
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
              <span className="font-display font-bold text-xl text-foreground">BlueView</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Buyer</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/buyer/companies">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Companies
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/buyer/home">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Button variant="ghost" className="text-primary font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Bid Builder
              </Button>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <span className="text-sm font-medium">Buyer Account</span>
                <div className="w-9 h-9 rounded-full gradient-hero flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
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
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Bid Package Builder
              </h1>
              <p className="text-muted-foreground mt-1">
                Create a bid package with AI-optimized pricing
              </p>
            </div>

            {/* Bid Info with Tabs */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-border px-4">
                  <TabsList className="h-12 bg-transparent">
                    <TabsTrigger value="materials" className="data-[state=active]:bg-muted">
                      <Package className="w-4 h-4 mr-2" />
                      Materials
                    </TabsTrigger>
                    <TabsTrigger value="details" className="data-[state=active]:bg-muted">
                      <FileText className="w-4 h-4 mr-2" />
                      Bid Details
                    </TabsTrigger>
                    <TabsTrigger value="delivery" className="data-[state=active]:bg-muted">
                      <Truck className="w-4 h-4 mr-2" />
                      Delivery
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="data-[state=active]:bg-muted">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Notes
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="materials" className="p-0 m-0">
                  {/* Materials Tab Content - We'll add the table below */}
                </TabsContent>

                <TabsContent value="details" className="p-6 space-y-4">
                  <h3 className="font-semibold">Buyer Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Company / Buyer Name *</label>
                      <Input
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        placeholder="Your company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Submit To *</label>
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
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Contact Email</label>
                      <Input
                        type="email"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        placeholder="email@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Contact Phone</label>
                      <Input
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <h3 className="font-semibold pt-4">Payment Terms</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Payment Terms</label>
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
                  </div>
                </TabsContent>

                <TabsContent value="delivery" className="p-6 space-y-4">
                  <h3 className="font-semibold">Delivery Preferences</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Delivery Type</label>
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
                      <label className="text-sm text-muted-foreground">Requested Delivery Date</label>
                      <Input
                        type="date"
                        value={bidTerms.deliveryDate}
                        onChange={(e) => setBidTerms(prev => ({ ...prev, deliveryDate: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Shipping Address</label>
                    <Textarea
                      value={bidTerms.shippingAddress}
                      onChange={(e) => setBidTerms(prev => ({ ...prev, shippingAddress: e.target.value }))}
                      placeholder="Enter full shipping address..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="p-6 space-y-4">
                  <h3 className="font-semibold">Bid Justification & Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    Explain your pricing rationale, volume commitments, or any factors the seller should consider when reviewing your bid.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Justification / Message to Seller</label>
                    <Textarea
                      value={bidTerms.bidJustification}
                      onChange={(e) => setBidTerms(prev => ({ ...prev, bidJustification: e.target.value }))}
                      placeholder="e.g., We are a long-term customer looking for a multi-year contract. Our volume projections for next year are 3x current order, which justifies the requested discount..."
                      rows={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Special Requirements</label>
                    <Textarea
                      value={bidTerms.specialRequirements}
                      onChange={(e) => setBidTerms(prev => ({ ...prev, specialRequirements: e.target.value }))}
                      placeholder="Any special packaging, certifications, documentation, or handling requirements..."
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Line Items - Moved inside conditional render based on tab */}
            {activeTab === "materials" && (
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-display font-semibold text-lg">Line Items</h2>
                  <Dialog open={addMaterialOpen} onOpenChange={setAddMaterialOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
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
                    <p className="text-sm">Click "Add Material" to start building your bid</p>
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
                    {bidTerms.deliveryPreference === 'rush' && (
                      <div className="flex items-center justify-between mb-2 text-amber-600">
                        <span className="text-sm flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Rush delivery surcharge (est.)
                        </span>
                        <span className="font-medium">+${(bidTotal * 0.15).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="font-display font-semibold">Estimated Total</span>
                      <span className="text-2xl font-display font-bold text-primary">
                        ${(bidTotal + (bidTerms.deliveryPreference === 'rush' ? bidTotal * 0.15 : 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* AI Assistant - Enhanced */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg gradient-hero flex items-center justify-center">
                    <Wand2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-lg">AI Bid Assistant</h2>
                    <p className="text-xs text-muted-foreground">Powered by market intelligence</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* AI Mode Selection */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'full' as AiMode, icon: Zap, label: 'Full Optimize' },
                    { mode: 'pricing' as AiMode, icon: TrendingDown, label: 'Pricing Only' },
                    { mode: 'delivery' as AiMode, icon: Truck, label: 'Terms' },
                    { mode: 'justification' as AiMode, icon: PenLine, label: 'Draft Notes' },
                  ].map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setAiMode(mode)}
                      className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                        aiMode === mode 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Configuration */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Target Savings</label>
                    <Select value={targetMargin} onValueChange={setTargetMargin}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.05">5% (Conservative)</SelectItem>
                        <SelectItem value="0.10">10% (Competitive)</SelectItem>
                        <SelectItem value="0.15">15% (Standard)</SelectItem>
                        <SelectItem value="0.18">18% (Balanced)</SelectItem>
                        <SelectItem value="0.22">22% (Aggressive)</SelectItem>
                        <SelectItem value="0.30">30% (Maximum)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Negotiation Priority</label>
                    <Select value={buyerFocus} onValueChange={setBuyerFocus}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Balanced profitability">Balanced approach</SelectItem>
                        <SelectItem value="Maximum savings">Maximum cost savings</SelectItem>
                        <SelectItem value="Long-term partnership">Long-term partnership</SelectItem>
                        <SelectItem value="Quick turnaround">Fast delivery priority</SelectItem>
                        <SelectItem value="Quality assurance">Quality & reliability focus</SelectItem>
                        <SelectItem value="Volume commitment">Volume commitment leverage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full gradient-hero text-primary-foreground h-11"
                  onClick={handleAiAssist}
                  disabled={lineItems.length === 0 || aiLoading}
                >
                  {aiLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {aiLoading ? 'Analyzing Bid...' : 'Analyze & Optimize'}
                </Button>
              </div>

              {/* AI Insights Panel */}
              {aiInsights && (
                <div className="border-t border-border">
                  {/* Scores */}
                  <div className="p-4 grid grid-cols-3 gap-3 bg-muted/30">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{aiInsights.acceptanceLikelihood}%</div>
                      <div className="text-xs text-muted-foreground">Acceptance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">${aiInsights.savingsOpportunity}</div>
                      <div className="text-xs text-muted-foreground">Est. Savings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent">{aiInsights.competitiveness}%</div>
                      <div className="text-xs text-muted-foreground">Competitive</div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {aiInsights.warnings.length > 0 && (
                    <div className="p-3 border-t border-border bg-amber-500/5">
                      <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium mb-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Warnings
                      </div>
                      <ul className="space-y-1">
                        {aiInsights.warnings.map((w, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tips */}
                  {aiInsights.tips.length > 0 && (
                    <div className="p-3 border-t border-border bg-primary/5">
                      <div className="flex items-center gap-1.5 text-primary text-xs font-medium mb-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        AI Recommendations
                      </div>
                      <ul className="space-y-1">
                        {aiInsights.tips.slice(0, 3).map((t, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Price Breakdown */}
                  {aiInsights.priceBreakdown.length > 0 && (
                    <div className="p-3 border-t border-border">
                      <div className="flex items-center gap-1.5 text-foreground text-xs font-medium mb-2">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Price Analysis
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {aiInsights.priceBreakdown.map((item, i) => {
                          const lineItem = lineItems.find(l => l.materialId === item.materialId);
                          return (
                            <div key={i} className="text-xs p-2 rounded bg-muted/50">
                              <div className="flex justify-between font-medium">
                                <span className="truncate">{lineItem?.materialName}</span>
                                <span className="text-green-600">-${item.savings.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-muted-foreground mt-0.5">
                                <span>${item.originalPrice.toFixed(2)} → ${item.suggestedPrice.toFixed(2)}</span>
                              </div>
                              <p className="text-muted-foreground mt-1 italic">{item.reason}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="p-3 border-t border-border space-y-2">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={applyAllAiSuggestions}
                    >
                      <Zap className="w-3.5 h-3.5 mr-1.5" />
                      Apply All Suggestions
                    </Button>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs h-8"
                        onClick={applyAiPricing}
                      >
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Prices
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs h-8"
                        onClick={applyAiDelivery}
                      >
                        <Truck className="w-3 h-3 mr-1" />
                        Terms
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs h-8"
                        onClick={applyAiJustification}
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        Notes
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Legacy AI Response (for pricing API) */}
              {aiResponse && !aiInsights && (
                <div className="p-4 border-t border-border bg-primary/5">
                  <p className="text-sm mb-3">{aiResponse.summary}</p>
                  <p className="text-lg font-display font-bold text-primary mb-3">
                    Suggested Total: ${aiResponse.totalAmount.toFixed(2)}
                  </p>
                  <Button 
                    size="sm" 
                    onClick={applyAiRecommendations}
                    className="w-full"
                  >
                    Apply Recommendations
                  </Button>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h2 className="font-display font-semibold text-lg mb-4">Submit Bid</h2>
              
              <Button 
                className="w-full mb-4"
                size="lg"
                onClick={handleSubmit}
                disabled={!selectedCompanyId || lineItems.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Bid Package
              </Button>

              {submitResult && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600">
                  <p className="font-medium">Bid Submitted Successfully!</p>
                  <p className="text-sm">
                    Bid #{submitResult.bidId} · ${submitResult.totalAmount.toFixed(2)}
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                  <p className="text-sm">{error}</p>
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

