import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search, Package, Building2, ChevronDown, LogOut, Settings, User, MapPin, Phone, Mail, Sparkles, ShoppingCart, Star, Award, Shield, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchCompanies, fetchMaterials, type Company, type Material } from "@/lib/api";

const FAVORITES_KEY = 'blueview_favorite_companies';

const BuyerCompanies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

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
              <Button variant="ghost" className="text-primary font-medium">
                <Building2 className="w-4 h-4 mr-2" />
                Companies
              </Button>
              <span className="text-border">|</span>
              <Link to="/buyer/home">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
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
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Partner Companies
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse manufacturing partners and their available materials
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading companies...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <div 
                key={company.id}
                className={`group p-6 rounded-2xl bg-card border hover-lift transition-colors ${
                  isFavorite(company.id) ? 'border-amber-400/50 bg-amber-500/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Building2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(company.id)}
                      className={`p-2 rounded-lg transition-all ${
                        isFavorite(company.id)
                          ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                          : 'text-muted-foreground hover:text-amber-400 hover:bg-muted'
                      }`}
                      title={isFavorite(company.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-5 h-5 ${isFavorite(company.id) ? 'fill-current' : ''}`} />
                    </button>
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {getMaterialCount(company.id)} materials
                    </span>
                  </div>
                </div>

                <h3 className="font-display font-semibold text-xl text-foreground mb-2 flex items-center gap-2">
                  {company.name}
                  {isFavorite(company.id) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 font-medium">
                      Favorite
                    </span>
                  )}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {company.description}
                </p>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{company.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{company.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{company.email}</span>
                  </div>
                </div>

                {/* Certifications */}
                {getCertifications(company).length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                      <Shield className="w-3.5 h-3.5" />
                      Certifications
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getCertifications(company).map((cert, idx) => (
                        <span 
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 text-xs font-medium"
                        >
                          <Award className="w-3 h-3" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Link to={`/buyer/home?companyId=${company.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Materials
                    </Button>
                  </Link>
                  <Link to={`/buyer/bids?companyId=${company.id}`} className="flex-1">
                    <Button className="w-full gradient-hero text-primary-foreground">
                      Start Bid
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results info */}
        <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredCompanies.length} of {companies.length} companies</span>
          {favorites.length > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <Star className="w-4 h-4 fill-current" />
              {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </main>
    </div>
  );
};

export default BuyerCompanies;

