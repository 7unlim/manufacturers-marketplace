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
import { Link } from "react-router-dom";
import { Search, Package, Users, Building2, ChevronDown, LogOut, Settings, User, Plus, Sparkles, ShoppingCart, Shield, Award, FileText, Wand2, Loader2 } from "lucide-react";
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

const BuyerHome = () => {
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesData, materialsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials()
        ]);
        setCompanies(companiesData);
        setMaterials(materialsData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const materialTypes = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.type)));
  }, [materials]);

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
    totalStock: materials.reduce((sum, m) => sum + m.stock, 0)
  }), [materials, companies]);

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
              <Link to="/buyer/companies">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Companies
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Button variant="ghost" className="text-primary font-medium">
                <Package className="w-4 h-4 mr-2" />
                Materials
              </Button>
              <span className="text-border">|</span>
              <Link to="/buyer/bids">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Bid Builder
                </Button>
              </Link>
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Material Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and search materials from your partner network
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Materials", value: stats.totalMaterials.toLocaleString(), icon: Package, color: "primary" },
            { label: "Partner Companies", value: stats.activePartners.toLocaleString(), icon: Users, color: "accent" },
            { label: "Total Stock", value: stats.totalStock.toLocaleString(), icon: Building2, color: "primary" },
          ].map((stat, i) => (
            <div key={i} className="p-5 rounded-xl bg-card border border-border hover-lift">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${stat.color === 'accent' ? 'bg-accent' : 'gradient-hero'} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color === 'accent' ? 'text-accent-foreground' : 'text-primary-foreground'}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-card">
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
              <SelectTrigger className="w-full sm:w-48 bg-card">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, material, company, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>

            <Sheet open={aiFinderOpen} onOpenChange={setAiFinderOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="bg-card">
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
                      className="min-h-[120px] bg-card"
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
                        <h3 className="font-semibold text-lg text-foreground">Found {aiMatches.length} Match{aiMatches.length !== 1 ? 'es' : ''}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <span>AI-Powered Results</span>
                        </div>
                      </div>
                      {aiMatches.map((match, index) => (
                        <div key={match.id} className="group relative p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 space-y-4">
                          {/* Badge for match rank */}
                          <div className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold shadow-sm">
                            {index + 1}
                          </div>

                          {/* Header */}
                          <div className="pr-10">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-lg text-foreground mb-1.5">{match.name}</h4>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-medium text-xs">
                                    {match.type}
                                  </span>
                                  <code className="px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-mono text-xs">
                                    {match.code}
                                  </code>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <Building2 className="w-4 h-4" />
                              <span>{match.companyName}</span>
                            </div>
                          </div>

                          {/* Price & Stock Info */}
                          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-0.5">Price</p>
                              <p className="text-lg font-bold text-foreground">${match.baseUnitPrice.toFixed(2)}</p>
                            </div>
                            <div className="w-px h-8 bg-border"></div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-0.5">Stock Available</p>
                              <p className="text-lg font-semibold text-foreground">{match.stock.toLocaleString()} units</p>
                            </div>
                          </div>
                          
                          {/* AI Reasoning */}
                          <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-accent" />
                              <p className="text-sm font-semibold text-foreground">Why this matches:</p>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{match.reasoning}</p>
                          </div>
                          
                          {/* Description */}
                          <div className="pt-2 pb-1">
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{match.description}</p>
                          </div>

                          {/* Action Button */}
                          <div className="pt-2">
                            <Link 
                              to={`/buyer/bids?materialId=${match.id}&companyId=${match.companyId}`}
                              className="block"
                              onClick={() => setAiFinderOpen(false)}
                            >
                              <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" size="sm" variant="default">
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Add to Bid
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
        </div>

        {/* Materials Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading materials...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-display font-semibold text-foreground">Code</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Material</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Company</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Type</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Stock</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Per Unit</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Lead Time</TableHead>
                  <TableHead className="font-display font-semibold text-foreground"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material, index) => (
                    <TableRow 
                      key={material.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const company = companies.find(c => c.id === material.companyId);
                        if (company) setSelectedCompany(company);
                      }}
                    >
                      <TableCell>
                        <code className="px-2 py-1 rounded bg-muted text-xs font-mono text-foreground">
                          {material.code || '—'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-foreground">{material.name}</span>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{material.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{material.companyName}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          {material.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{material.stock.toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-foreground">${material.baseUnitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">{material.leadTimeDays} days</TableCell>
                      <TableCell>
                        <Link to={`/buyer/bids?materialId=${material.id}`} onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" className="h-8">
                            <Plus className="w-3 h-3 mr-1" />
                            Add to Bid
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      No materials found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Results info */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredMaterials.length} of {materials.length} materials
        </div>
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
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedCompany.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedCompany.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCompany.email}</p>
                </div>
              </div>

              {/* Certifications */}
              {getCertifications(selectedCompany).length > 0 && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                    <Shield className="w-4 h-4" />
                    Certifications
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getCertifications(selectedCompany).map((cert, idx) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-700 text-xs font-medium"
                      >
                        <Award className="w-3 h-3" />
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Materials from this company</p>
                <p className="text-2xl font-display font-bold text-primary">
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
                  <Button className="w-full gradient-hero text-primary-foreground">
                    Start Bid
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

