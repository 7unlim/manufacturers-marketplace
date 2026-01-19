import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Factory, Inbox, TrendingUp, DollarSign, Info
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
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { fetchCompanies, fetchMaterials, fetchBids, updateCompany, fetchRevenueData, type Company, type Material, type Bid, type RevenueResponse } from "@/lib/api";

const SELLER_COMPANY_ID = 1;

const SellerDashboard = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueResponse | null>(null);
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL'>('1Y');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesData, materialsData, bidsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials({ companyId: SELLER_COMPANY_ID }),
          fetchBids()
        ]);
        
        const myCompany = companiesData.find(c => c.id === SELLER_COMPANY_ID);
        setCompany(myCompany || null);
        setMaterials(materialsData.filter(m => m.companyId === SELLER_COMPANY_ID));
        setBids(bidsData.filter(b => b.companyId === SELLER_COMPANY_ID));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch revenue data when period changes
  useEffect(() => {
    setLoadingRevenue(true);
    fetchRevenueData(chartPeriod)
      .then(data => {
        setRevenueData(data);
        setLoadingRevenue(false);
      })
      .catch(err => {
        console.error('Failed to fetch revenue data:', err);
        setLoadingRevenue(false);
      });
  }, [chartPeriod]);

  const stats = useMemo(() => {
    const totalInventoryValue = materials.reduce((sum, m) => sum + (m.stock * m.baseUnitPrice), 0);
    const pendingBids = bids.filter(b => b.status === 'submitted' || b.status === 'draft').length;
    const totalBidValue = bids.reduce((sum, b) => sum + b.totalAmount, 0);
    
    return {
      materialCount: materials.length,
      totalStock: materials.reduce((sum, m) => sum + m.stock, 0),
      inventoryValue: totalInventoryValue,
      pendingBids,
      totalBidValue
    };
  }, [materials, bids]);

  const recentBids = bids.slice(0, 5);

  const getStatusBadge = (status: Bid["status"]) => {
    const styles: Record<Bid["status"], string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-primary/10 text-primary",
      accepted: "bg-green-500/10 text-green-600",
      rejected: "bg-destructive/10 text-destructive",
      countered: "bg-purple-500/10 text-purple-600",
      cancelled: "bg-muted text-muted-foreground",
    };
    return styles[status] || styles.draft;
  };

  const getStatusLabel = (status: Bid["status"]) => {
    const labels: Record<Bid["status"], string> = {
      draft: "Draft",
      submitted: "Response Needed",
      accepted: "Accepted",
      rejected: "Rejected",
      countered: "Countered",
      cancelled: "Cancelled",
    };
    return labels[status] ?? status;
  };
  
  const chartData = useMemo(() => {
    if (!revenueData) return [];
    
    // Calculate cumulative revenue for each point (reset at window start)
    let cumulative = 0;
    return revenueData.data.map(point => {
      cumulative += point.revenue;
      return {
        label: point.label,
        revenue: point.revenue, // Event revenue (for bars)
        cumulative: cumulative, // Cumulative revenue (for line)
        count: point.count // Event count
      };
    });
  }, [revenueData]);

  // Use percentage change from backend (rolling window comparison)
  const totalRevenue = revenueData?.totalRevenue || 0;
  const revenueChange = revenueData?.revenueChange || 0;
  const isPositive = revenueChange >= 0;
  
  // Format the change display
  const revenueChangeDisplay = revenueChange !== 0
    ? `${isPositive ? '+' : ''}${Math.round(revenueChange)}%`
    : '0%';

  const handleEditProfile = () => {
    if (company) {
      setEditingCompany({
        name: company.name,
        phone: company.phone,
        email: company.email,
        location: company.location,
        description: company.description,
        certifications: company.certifications
      });
      setEditDialogOpen(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!company) return;
    
    setSaving(true);
    try {
      const updated = await updateCompany(company.id, editingCompany);
      setCompany(updated);
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update company:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Factory className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-foreground">Waypoint</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Seller</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" className="text-primary font-medium">
                <Building2 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-border">|</span>
              <Link to="/seller/materials">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/seller/bids">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Inbox className="w-4 h-4 mr-2" />
                  Bid Inbox
                </Button>
              </Link>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3">
                <span className="text-sm font-medium">{company?.name || "Seller"}</span>
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Company Profile
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
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="mb-6">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                Welcome back, {company?.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's an overview of your materials and incoming bids
              </p>
            </div>

            {/* Revenue Chart - Robinhood Style */}
            <div className="rounded-xl bg-card border border-border p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl md:text-4xl font-display font-bold text-foreground">
                      ${loadingRevenue ? '...' : totalRevenue.toLocaleString()}
                    </span>
                    {(chartData.length > 1 || chartPeriod === 'YTD') && (
                      <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-500' : 'text-destructive'}`}>
                        <TrendingUp className={`w-4 h-4 mr-1 ${!isPositive && 'rotate-180'}`} />
                        {revenueChangeDisplay}
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button type="button" className="ml-1.5 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                              <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[280px]">
                            <p className="text-xs leading-relaxed">
                              <span className="font-semibold">Percentage Change:</span> Compares total revenue in the selected period to the immediately preceding period of equal length. For example, 1M compares last 30 days vs. the 30 days before that.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {loadingRevenue ? 'Loading...' : `${revenueData?.totalBids || 0} accepted bids`}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        chartPeriod === period 
                          ? 'bg-accent text-accent-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-[200px] md:h-[280px] -mx-2">
                {loadingRevenue ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Loading revenue data...
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No revenue data available for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
                      <defs>
                        <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(38 92% 55%)" stopOpacity={1} />
                          <stop offset="100%" stopColor="hsl(38 92% 45%)" stopOpacity={1} />
                        </linearGradient>
                        <filter id="barShadow">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="hsl(38 92% 50%)" floodOpacity="0.15" />
                        </filter>
                      </defs>
                      <XAxis 
                        dataKey="label" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)', fontWeight: 500 }}
                        dy={10}
                        angle={chartPeriod === '1D' ? -45 : 0}
                        height={chartPeriod === '1D' ? 60 : 36}
                        interval={chartPeriod === '1D' ? 6 : chartPeriod === '1W' ? 2 : chartPeriod === '1M' ? 5 : chartPeriod === '3M' ? 10 : chartPeriod === 'ALL' ? Math.floor(chartData.length / 6) : 'preserveStartEnd'}
                      />
                      <YAxis 
                        hide
                        yAxisId="revenue"
                        domain={[0, 'dataMax + Math.max(1000, dataMax * 0.1)']}
                      />
                      <YAxis 
                        hide
                        yAxisId="cumulative"
                        orientation="right"
                        domain={[0, 'dataMax + Math.max(1000, dataMax * 0.1)']}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          fontSize: '13px',
                          padding: '12px',
                          boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)'
                        }}
                        cursor={{ fill: 'hsl(var(--accent) / 0.1)', stroke: 'hsl(var(--accent))', strokeWidth: 1, strokeDasharray: '3 3' }}
                        formatter={(value: number, name: string, props: any) => {
                          if (name === 'revenue') {
                            return [`$${value.toLocaleString()}`, 'Event Revenue'];
                          } else if (name === 'cumulative') {
                            return [`$${value.toLocaleString()}`, 'Cumulative'];
                          }
                          return [value, name];
                        }}
                        labelStyle={{ 
                          color: 'hsl(var(--foreground))', 
                          fontWeight: 600, 
                          marginBottom: '4px',
                          fontSize: '12px'
                        }}
                        itemStyle={{ padding: '2px 0' }}
                      />
                      {/* Event markers (bars) - primary visual */}
                      <Bar
                        yAxisId="revenue"
                        dataKey="revenue"
                        fill="url(#revenueBarGradient)"
                        radius={[4, 4, 0, 0]}
                        opacity={0.95}
                        filter="url(#barShadow)"
                      />
                      {/* Cumulative overlay line - secondary, de-emphasized */}
                      <Line
                        yAxisId="cumulative"
                        type="monotone"
                        dataKey="cumulative"
                        stroke="hsl(221 83% 53%)"
                        strokeWidth={2}
                        strokeOpacity={0.35}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ 
                          r: 4, 
                          fill: 'hsl(221 83% 53%)', 
                          stroke: 'hsl(var(--card))', 
                          strokeWidth: 2,
                          opacity: 0.8
                        }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { 
                  label: "Listed Materials", 
                  value: stats.materialCount.toString(), 
                  icon: Package, 
                  color: "accent",
                  link: "/seller/materials"
                },
                { 
                  label: "Total Stock", 
                  value: stats.totalStock.toLocaleString(), 
                  icon: Building2, 
                  color: "primary" 
                },
                { 
                  label: "Inventory Value", 
                  value: `$${stats.inventoryValue.toLocaleString()}`, 
                  icon: DollarSign, 
                  color: "primary" 
                },
                { 
                  label: "Pending Bids", 
                  value: stats.pendingBids.toString(), 
                  icon: Inbox, 
                  color: "accent",
                  link: "/seller/bids"
                },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-display font-bold text-foreground mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-lg ${stat.color === 'accent' ? 'bg-accent' : 'gradient-hero'} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.color === 'accent' ? 'text-accent-foreground' : 'text-primary-foreground'}`} />
                    </div>
                  </div>
                  {stat.link && (
                    <Link to={stat.link} className="text-xs text-primary hover:underline mt-2 inline-block">
                      View details →
                    </Link>
                  )}
                </div>
              ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Bids */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-display font-semibold text-lg">Recent Bids</h2>
                  <Link to="/seller/bids">
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
                {recentBids.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Inbox className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No bids received yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentBids.map((bid) => (
                      <div key={bid.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{bid.buyerName}</p>
                            <p className="text-sm text-muted-foreground">
                              Bid #{bid.id} · {new Date(bid.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">${bid.totalAmount.toFixed(2)}</p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusBadge(bid.status)}`}
                            >
                              {getStatusLabel(bid.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Company Info */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-lg">Company Profile</h2>
                </div>
                {company && (
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Company Name</p>
                      <p className="font-medium text-lg">{company.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="text-foreground">{company.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Location</p>
                        <p className="font-medium">{company.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{company.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{company.email}</p>
                    </div>
                    <Button variant="outline" className="w-full mt-4" onClick={handleEditProfile}>
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Company Profile</DialogTitle>
            <DialogDescription>
              Update your company information. Changes will be visible to buyers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={editingCompany.name || ''}
                onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                placeholder="Enter company name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editingCompany.phone || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingCompany.email || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editingCompany.location || ''}
                onChange={(e) => setEditingCompany({ ...editingCompany, location: e.target.value })}
                placeholder="Enter location (e.g., City, State)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingCompany.description || ''}
                onChange={(e) => setEditingCompany({ ...editingCompany, description: e.target.value })}
                placeholder="Enter company description"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboard;
