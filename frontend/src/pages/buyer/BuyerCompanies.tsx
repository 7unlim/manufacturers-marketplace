import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Search, Package, Building2, ChevronDown, LogOut, Settings, User, MapPin, Phone, Mail, Sparkles, ShoppingCart, Star, Award, Shield, FileText, MessageSquare, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchCompanies, fetchMaterials, sendMessage, type Company, type Material, type BuyerOnboardingData } from "@/lib/api";

const FAVORITES_KEY = 'blueview_favorite_companies';

const BuyerCompanies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyerName, setBuyerName] = useState<string>("Buyer Account");
  const [buyerEmail, setBuyerEmail] = useState<string>("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<Company | null>(null);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [onboardingData, setOnboardingData] = useState<BuyerOnboardingData | null>(null);
  const [expandedCerts, setExpandedCerts] = useState<Set<number>>(new Set());

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
        if (account.onboarding) {
          setOnboardingData(account.onboarding);
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
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleFavorite = (companyId: number) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (companyId: number) => favorites.includes(companyId);

  const filteredCompanies = useMemo(() => {
    const filtered = companies.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort favorites to the top
    return filtered.sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
  }, [companies, searchTerm, favorites]);

  const getMaterialCount = (companyId: number) => 
    materials.filter(m => m.companyId === companyId).length;

  const getCertifications = (company: Company): string[] => {
    if (!company.certifications) return [];
    try {
      return JSON.parse(company.certifications);
    } catch {
      return [];
    }
  };

  // Get recommended companies
  const recommendedCompanies = useMemo(() => {
    if (!onboardingData?.buyerProjectTypes || onboardingData.buyerProjectTypes.length === 0) return [];
    return companies.slice(0, 4);
  }, [companies, onboardingData]);

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
              <Button variant="ghost" className="text-primary font-medium">
                <Building2 className="w-4 h-4 mr-2" />
                Companies
              </Button>
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Partner Companies
              </h1>
              <p className="text-muted-foreground mt-1">
                Browse manufacturing partners and their available materials
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search companies by name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-border shadow-sm focus:shadow-md transition-shadow"
            />
          </div>
        </div>

        {/* Recommended Companies */}
        {recommendedCompanies.length > 0 && onboardingData && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Recommended Partners</h2>
                  <p className="text-sm text-muted-foreground">Companies that match your project needs</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {recommendedCompanies.map((company) => (
                <Card key={company.id} className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                  <CardHeader className="pb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold">{company.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">{company.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium text-muted-foreground">Materials</span>
                      <span className="text-sm font-bold text-foreground">
                        {materials.filter(m => m.companyId === company.id).length}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedCompanyForView(company);
                          setCompanyModalOpen(true);
                        }}
                      >
                        View
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        className="flex-1 gradient-hero text-primary-foreground shadow-sm"
                        onClick={() => {
                          setSelectedCompany(company);
                          setMessageDialogOpen(true);
                        }}
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Companies Grid */}
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 opacity-50 animate-pulse" />
            </div>
            <p className="text-lg font-medium">Loading companies...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-muted-foreground opacity-40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {searchTerm 
                ? `No companies match "${searchTerm}". Try a different search term.`
                : "No companies available at the moment."}
            </p>
            {searchTerm && (
              <Button variant="outline" onClick={() => setSearchTerm("")}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => {
              const certifications = getCertifications(company);
              const showAllCerts = expandedCerts.has(company.id);
              const displayedCerts = showAllCerts ? certifications : certifications.slice(0, 3);
              const remainingCerts = certifications.length - 3;
              
              return (
                <Card
                  key={company.id}
                  className={`group border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] overflow-hidden flex flex-col ${
                    isFavorite(company.id) 
                      ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/5 to-amber-500/0' 
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <CardHeader className="pb-4 flex-shrink-0">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                        <Building2 className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(company.id)}
                          className={`p-2.5 rounded-xl transition-all shadow-sm ${
                            isFavorite(company.id)
                              ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/20'
                              : 'text-muted-foreground hover:text-amber-400 hover:bg-muted border border-border'
                          }`}
                          title={isFavorite(company.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-5 h-5 ${isFavorite(company.id) ? 'fill-current' : ''}`} />
                        </button>
                        <Badge className="px-3 py-1.5 bg-primary/10 text-primary border-primary/20 font-semibold">
                          {getMaterialCount(company.id)} materials
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mb-2">
                      <CardTitle className="text-xl font-bold text-foreground flex-1">
                        {company.name}
                      </CardTitle>
                      {isFavorite(company.id) && (
                        <Badge variant="secondary" className="bg-amber-400/20 text-amber-700 border-amber-400/30">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          Favorite
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {company.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Contact Information */}
                    <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50 flex-shrink-0">
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-foreground font-medium">{company.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-foreground">{company.phone}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-foreground truncate">{company.email}</span>
                      </div>
                    </div>

                    {/* Certifications */}
                    {certifications.length > 0 && (
                      <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/5 to-green-500/0 border border-green-500/20 flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
                          <Shield className="w-4 h-4 text-green-600" />
                          Certifications
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {displayedCerts.map((cert, idx) => (
                            <Badge 
                              key={idx}
                              variant="secondary"
                              className="bg-green-500/10 text-green-700 border-green-300/50 flex items-center gap-1.5 font-medium"
                            >
                              <Award className="w-3 h-3" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                        {!showAllCerts && remainingCerts > 0 && (
                          <button
                            onClick={() => setExpandedCerts(prev => new Set(prev).add(company.id))}
                            className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium underline"
                          >
                            View all
                          </button>
                        )}
                        {showAllCerts && certifications.length > 3 && (
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedCerts);
                              newSet.delete(company.id);
                              setExpandedCerts(newSet);
                            }}
                            className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium underline"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 mt-auto">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs h-10 shadow-sm hover:shadow-md border-border hover:border-primary/50 hover:bg-primary/5 transition-all font-medium"
                        onClick={() => {
                          setSelectedCompanyForView(company);
                          setCompanyModalOpen(true);
                        }}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                        <span className="truncate">View</span>
                      </Button>
                      <Link to={`/buyer/materials?companyId=${company.id}`} className="min-w-0">
                        <Button variant="outline" size="sm" className="w-full text-xs h-10 shadow-sm hover:shadow-md border-border hover:border-primary/50 hover:bg-primary/5 transition-all font-medium">
                          <Package className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                          <span className="truncate">Materials</span>
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full text-xs h-10 shadow-sm hover:shadow-md border-border hover:border-primary/50 hover:bg-primary/5 transition-all font-medium"
                        onClick={() => {
                          setSelectedCompany(company);
                          setMessageDialogOpen(true);
                        }}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                        <span className="truncate">Message</span>
                      </Button>
                      <Link to={`/buyer/bids?companyId=${company.id}`} className="min-w-0">
                        <Button size="sm" className="w-full gradient-hero text-primary-foreground text-xs h-10 shadow-md hover:shadow-lg transition-all font-semibold">
                          <Sparkles className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                          <span className="truncate">Start PO</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Results info */}
        {!loading && filteredCompanies.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="px-4 py-2 rounded-lg bg-muted/50 border border-border">
                  <span className="text-sm font-medium text-foreground">
                    Showing <span className="font-bold text-primary">{filteredCompanies.length}</span> of{' '}
                    <span className="font-bold">{companies.length}</span> companies
                  </span>
                </div>
                {favorites.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-400/20">
                    <Star className="w-4 h-4 text-amber-600 fill-current" />
                    <span className="text-sm font-medium text-amber-700">
                      {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Message to {selectedCompany?.name}</DialogTitle>
            <DialogDescription>
              Start a conversation with this seller
            </DialogDescription>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-900 mb-1">{selectedCompany.name}</p>
                <p className="text-xs text-slate-600">{selectedCompany.email}</p>
                <p className="text-xs text-slate-500 mt-1">{selectedCompany.location}</p>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Hi, I'm interested in learning more about your materials..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMessageDialogOpen(false);
                    setMessageText("");
                    setSelectedCompany(null);
                  }}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!messageText.trim() || !buyerEmail || !buyerName || !selectedCompany) return;
                    setSending(true);
                    try {
                      await sendMessage({
                        senderEmail: buyerEmail,
                        senderName: buyerName,
                        senderRole: "buyer",
                        recipientEmail: selectedCompany.email,
                        recipientName: selectedCompany.name,
                        recipientRole: "seller",
                        content: messageText.trim(),
                      });
                      setMessageDialogOpen(false);
                      setMessageText("");
                      setSelectedCompany(null);
                      alert("Message sent successfully!");
                    } catch (error) {
                      console.error("Failed to send message:", error);
                      alert("Failed to send message. Please try again.");
                    } finally {
                      setSending(false);
                    }
                  }}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Company Info Dialog */}
      <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              {selectedCompanyForView?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedCompanyForView?.location}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompanyForView && (
            <div className="space-y-6 mt-4">
              {/* Description */}
              {selectedCompanyForView.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedCompanyForView.description}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground mb-2">Contact Information</h3>
                <div className="space-y-2">
                  {selectedCompanyForView.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedCompanyForView.location}</span>
                    </div>
                  )}
                  {selectedCompanyForView.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedCompanyForView.phone}</span>
                    </div>
                  )}
                  {selectedCompanyForView.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedCompanyForView.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certifications */}
              {getCertifications(selectedCompanyForView).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {getCertifications(selectedCompanyForView).map((cert, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="bg-green-500/10 text-green-700 border-green-300 flex items-center gap-1.5"
                      >
                        <Award className="w-3 h-3" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials Count */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Available Materials</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {materials.filter(m => m.companyId === selectedCompanyForView.id).length}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Link to={`/buyer/materials?companyId=${selectedCompanyForView.id}`} className="flex-1">
                  <Button variant="outline" className="w-full border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Package className="w-4 h-4 mr-2" />
                    View Materials
                  </Button>
                </Link>
                <Link to={`/buyer/bids?companyId=${selectedCompanyForView.id}`} className="flex-1">
                  <Button className="w-full gradient-hero text-primary-foreground shadow-md hover:shadow-lg transition-all">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Bid
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  className="flex-1 border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => {
                    setCompanyModalOpen(false);
                    setSelectedCompany(selectedCompanyForView);
                    setMessageDialogOpen(true);
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerCompanies;

