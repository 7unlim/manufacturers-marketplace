import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Package, Users, Building2, ChevronDown, LogOut, Settings, User, Plus, Sparkles, ShoppingCart, Shield, Award, FileText, Wand2, Loader2, TrendingUp, Target, Star, Info, Edit, Home, Factory, Briefcase, Wrench, DollarSign, Clock } from "lucide-react";
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
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { fetchCompanies, fetchMaterials, findMaterialsWithAI, type Company, type Material, type MaterialMatch } from "@/lib/api";
import { type BuyerOnboardingData } from "@/lib/api";

const BuyerHome = () => {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [aiFinderOpen, setAiFinderOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiMatches, setAiMatches] = useState<MaterialMatch[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<BuyerOnboardingData | null>(null);
  const [buyerName, setBuyerName] = useState<string>("Buyer Account");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesData, materialsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials()
        ]);
        setCompanies(companiesData);
        setMaterials(materialsData);
        
        // Check for companyId in URL params
        const companyId = searchParams.get("companyId");
        if (companyId) {
          setCompanyFilter(companyId);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Load buyer account info
    const authAccount = localStorage.getItem("authAccount");
    if (authAccount) {
      try {
        const account = JSON.parse(authAccount);
        if (account.name) {
          setBuyerName(account.name);
        }
        if (account.onboarding) {
          setOnboardingData(account.onboarding);
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }
  }, [searchParams]);

  const materialTypes = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.type)));
  }, [materials]);

  // Get preferred material types (without "Other:" prefix)
  const preferredMaterialTypes = useMemo(() => {
    if (!onboardingData?.materialTypes) return [];
    return onboardingData.materialTypes
      .map(type => type.replace(/^Other: /, ''))
      .filter(type => type.length > 0);
  }, [onboardingData]);

  // Calculate match score for materials based on preferences
  const getMaterialMatchScore = (material: Material): number => {
    if (!onboardingData) return 0;
    let score = 0;
    
    // Check if material type matches preferred types
    if (preferredMaterialTypes.length > 0) {
      const materialTypeLower = material.type.toLowerCase();
      const matchesType = preferredMaterialTypes.some(pref => {
        const prefLower = pref.toLowerCase();
        return materialTypeLower.includes(prefLower) || prefLower.includes(materialTypeLower);
      });
      if (matchesType) score += 10;
    }
    
    return score;
  };

  // Get recommended materials based on preferences
  const recommendedMaterials = useMemo(() => {
    if (!onboardingData || preferredMaterialTypes.length === 0) return [];
    
    return materials
      .map(m => ({
        material: m,
        score: getMaterialMatchScore(m)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.material);
  }, [materials, onboardingData, preferredMaterialTypes]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch = searchTerm === "" ||
        m.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === "all" || m.type === categoryFilter;
      const matchesCompany = companyFilter === "all" || m.companyId === Number(companyFilter);
      
      return matchesSearch && matchesCategory && matchesCompany;
    });
  }, [materials, searchTerm, categoryFilter, companyFilter]);

  const stats = useMemo(() => ({
    totalMaterials: materials.length,
    activePartners: companies.length,
    totalStock: materials.reduce((sum, m) => sum + m.stock, 0),
    recommendedCount: recommendedMaterials.length,
    matchingMaterials: materials.filter(m => getMaterialMatchScore(m) > 0).length
  }), [materials, companies, recommendedMaterials]);

  const getCertifications = (company: Company | null): string[] => {
    if (!company?.certifications) return [];
    try {
      return JSON.parse(company.certifications);
    } catch {
      return [];
    }
  };

  const handleAISearch = async () => {
    if (!aiDescription.trim()) return;
    
    setAiLoading(true);
    setAiMatches([]);
    try {
      const result = await findMaterialsWithAI(aiDescription);
      setAiMatches(result.matches || []);
    } catch (error) {
      console.error("Failed to find materials with AI:", error);
      alert("Failed to search materials. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const getProjectTypeIcon = (type: string) => {
    if (type.toLowerCase().includes('home') || type.toLowerCase().includes('residential')) return Home;
    if (type.toLowerCase().includes('commercial')) return Briefcase;
    if (type.toLowerCase().includes('industrial')) return Factory;
    if (type.toLowerCase().includes('infrastructure') || type.toLowerCase().includes('civil')) return Wrench;
    return Building2;
  };

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
              <Button variant="ghost" className="text-primary font-medium">
                <Package className="w-4 h-4 mr-2" />
                Materials
              </Button>
              <span className="text-border">|</span>
              <Link to="/buyer/companies">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Companies
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/buyer/bids">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Sparkles className="w-4 h-4 mr-2" />
                  PO Builder
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/buyer/bids/history">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <FileText className="w-4 h-4 mr-2" />
                  My POs
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
        {/* Welcome Section with Preferences */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-900 mb-2">
                Welcome Back, {buyerName}
              </h1>
              <p className="text-slate-600 text-lg">
                Find the perfect materials for your projects
              </p>
            </div>
            {!onboardingData && (
              <Link to="/buyer/profile">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Set Preferences
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Materials</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalMaterials.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Partner Companies</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.activePartners}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Matching Materials</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.matchingMaterials}</p>
                  <p className="text-xs text-slate-500 mt-1">Based on your preferences</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Star className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Stock</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalStock.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Materials Section */}
        {recommendedMaterials.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-slate-900">Recommended for You</h2>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {recommendedMaterials.length} matches
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedMaterials.map((material) => {
                const isMatch = getMaterialMatchScore(material) > 0;
                return (
                  <Card key={material.id} className={`border-2 transition-all hover:shadow-lg ${isMatch ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-1">{material.name}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">
                              {material.type}
                            </Badge>
                            {material.code && (
                              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                {material.code}
                              </code>
                            )}
                          </div>
                        </div>
                        {isMatch && (
                          <Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="w-4 h-4" />
                        <span>{material.companyName}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Price</p>
                          <p className="font-bold text-slate-900">${material.baseUnitPrice.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Stock</p>
                          <p className="font-semibold text-slate-900">{material.stock.toLocaleString()}</p>
                        </div>
                      </div>
                      <Link to={`/buyer/bids?materialId=${material.id}&companyId=${material.companyId}`}>
                        <Button className="w-full" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add to PO
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filter Section */}
        <Card className="mb-6 border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Search Materials</CardTitle>
            <CardDescription>Find materials by type, company, or search term</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {materialTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by code, material, company, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Sheet open={aiFinderOpen} onOpenChange={setAiFinderOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI Finder
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>AI Material Finder</SheetTitle>
                    <SheetDescription>
                      Describe what you're looking for and AI will find the most compatible materials from our inventory.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Material Description</label>
                      <Textarea
                        placeholder="e.g., High-strength aluminum alloy for aerospace applications requiring corrosion resistance..."
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                        className="min-h-[120px]"
                        disabled={aiLoading}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleAISearch} 
                      disabled={!aiDescription.trim() || aiLoading}
                      className="w-full"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Finding matches...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Find Materials
                        </>
                      )}
                    </Button>

                    {aiMatches.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">Found {aiMatches.length} Match{aiMatches.length !== 1 ? 'es' : ''}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="w-3.5 h-3.5 text-accent" />
                            <span>AI-Powered Results</span>
                          </div>
                        </div>
                        {aiMatches.map((match, index) => (
                          <div key={match.id} className="group relative p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 space-y-4">
                            <div className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white text-xs font-bold shadow-sm">
                              {index + 1}
                            </div>

                            <div className="pr-10">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-lg text-slate-900 mb-1.5">{match.name}</h4>
                                  <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 font-medium text-xs">
                                      {match.type}
                                    </span>
                                    <code className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-mono text-xs">
                                      {match.code}
                                    </code>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                                <Building2 className="w-4 h-4" />
                                <span>{match.companyName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <div className="flex-1">
                                <p className="text-xs text-slate-500 mb-0.5">Price</p>
                                <p className="text-lg font-bold text-slate-900">${match.baseUnitPrice.toFixed(2)}</p>
                              </div>
                              <div className="w-px h-8 bg-slate-200"></div>
                              <div className="flex-1">
                                <p className="text-xs text-slate-500 mb-0.5">Stock Available</p>
                                <p className="text-lg font-semibold text-slate-900">{match.stock.toLocaleString()} units</p>
                              </div>
                            </div>
                            
                            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-blue-600" />
                                <p className="text-sm font-semibold text-slate-900">Why this matches:</p>
                              </div>
                              <p className="text-sm text-slate-700 leading-relaxed">{match.reasoning}</p>
                            </div>
                            
                            <div className="pt-2">
                              <Link 
                                to={`/buyer/bids?materialId=${match.id}&companyId=${match.companyId}`}
                                className="block"
                                onClick={() => setAiFinderOpen(false)}
                              >
                                <Button className="w-full" size="sm">
                                  <ShoppingCart className="w-4 h-4 mr-2" />
                                  Add to PO
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {/* Materials Table */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>All Materials</CardTitle>
            <CardDescription>
              {filteredMaterials.length} of {materials.length} materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading materials...
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Material</TableHead>
                      <TableHead className="font-semibold">Company</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Stock</TableHead>
                      <TableHead className="font-semibold">Per Unit</TableHead>
                      <TableHead className="font-semibold">Lead Time</TableHead>
                      <TableHead className="font-semibold"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMaterials.length > 0 ? (
                      filteredMaterials.map((material) => {
                        const isMatch = getMaterialMatchScore(material) > 0;
                        return (
                          <TableRow 
                            key={material.id}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${isMatch ? 'bg-indigo-50/50 border-l-4 border-l-indigo-400' : ''}`}
                            onClick={() => {
                              const company = companies.find(c => c.id === material.companyId);
                              if (company) setSelectedCompany(company);
                            }}
                          >
                            <TableCell>
                              <code className="px-2 py-1 rounded bg-slate-100 text-xs font-mono text-slate-700">
                                {material.code || '—'}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isMatch && <Star className="w-4 h-4 text-indigo-600 fill-indigo-600" />}
                                <div>
                                  <span className="font-medium text-slate-900">{material.name}</span>
                                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{material.description}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">{material.companyName}</TableCell>
                            <TableCell>
                              <Badge variant={isMatch ? "default" : "secondary"} className={isMatch ? "bg-indigo-600" : ""}>
                                {material.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">{material.stock.toLocaleString()}</TableCell>
                            <TableCell className="font-medium text-slate-900">${material.baseUnitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-slate-600">{material.leadTimeDays} days</TableCell>
                            <TableCell>
                              <Link to={`/buyer/bids?materialId=${material.id}`} onClick={(e) => e.stopPropagation()}>
                                <Button size="sm" variant="outline" className="h-8">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                          No materials found matching your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Company Details Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selectedCompany?.name}</DialogTitle>
            <DialogDescription>{selectedCompany?.description}</DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Location</p>
                  <p className="font-medium">{selectedCompany.location}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Phone</p>
                  <p className="font-medium">{selectedCompany.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-slate-600">Email</p>
                  <p className="font-medium">{selectedCompany.email}</p>
                </div>
              </div>

              {getCertifications(selectedCompany).length > 0 && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                    <Shield className="w-4 h-4" />
                    Certifications
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getCertifications(selectedCompany).map((cert, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-green-100 text-green-700">
                        <Award className="w-3 h-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 mb-2">Materials from this company</p>
                <p className="text-2xl font-display font-bold text-indigo-600">
                  {materials.filter(m => m.companyId === selectedCompany.id).length} items
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setCompanyFilter(String(selectedCompany.id));
                    setSelectedCompany(null);
                  }}
                >
                  View Materials
                </Button>
                <Link to={`/buyer/bids?companyId=${selectedCompany.id}`} className="flex-1">
                  <Button className="w-full gradient-hero text-white">
                    Start PO
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerHome;
