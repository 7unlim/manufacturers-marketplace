import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Factory, Inbox, TrendingUp, DollarSign, Info, Users, Target, Star, Edit, Mail, Phone, AlertCircle, MessageSquare, Send, Search, Plus
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { fetchCompanies, fetchMaterials, fetchBids, updateCompany, fetchRevenueData, fetchBuyerLeads, sendMessage, fetchConversations, fetchMessages, markMessagesAsRead, type Company, type Material, type Bid, type RevenueResponse, type BuyerLead, type OnboardingData, type Conversation, type Message } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

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
  const [buyerLeads, setBuyerLeads] = useState<BuyerLead[]>([]);
  const [sellerOnboarding, setSellerOnboarding] = useState<OnboardingData | null>(null);
  const [sellerCompanyId, setSellerCompanyId] = useState<number | null>(null);
  const [accountName, setAccountName] = useState<string>("");
  const [sellerEmail, setSellerEmail] = useState<string>("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerLead | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showAllRecommended, setShowAllRecommended] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug: Track buyerLeads changes
  useEffect(() => {
    console.log('Dashboard - buyerLeads state changed:', {
      count: buyerLeads.length,
      leads: buyerLeads,
      sampleEmails: buyerLeads.slice(0, 3).map(b => b?.email)
    });
  }, [buyerLeads]);

  // Load conversations for seller inbox
  useEffect(() => {
    if (sellerEmail) {
      loadConversations();
      const interval = setInterval(() => {
        loadConversations();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sellerEmail]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation && sellerEmail) {
      const load = async () => {
        try {
          await loadMessages(selectedConversation);
          await markMessagesAsRead(sellerEmail, selectedConversation);
        } catch (error) {
          console.error("Error loading messages:", error);
        }
      };
      load();
      const interval = setInterval(() => {
        load();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, sellerEmail]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!sellerEmail) return;
    try {
      const convs = await fetchConversations(sellerEmail);
      setConversations(convs || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversations([]);
    }
  };

  const loadMessages = async (otherEmail: string) => {
    if (!sellerEmail) return;
    try {
      const msgs = await fetchMessages(sellerEmail, otherEmail);
      setMessages(msgs);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !sellerEmail || !company) {
      return;
    }

    const conversation = conversations.find(c => c && c.otherEmail === selectedConversation);
    if (!conversation || !conversation.otherName || !conversation.otherRole) {
      console.error("Conversation not found or invalid", { selectedConversation, conversations });
      return;
    }

    setSending(true);
    try {
      await sendMessage({
        senderEmail: sellerEmail,
        senderName: company.name,
        senderRole: "seller",
        recipientEmail: selectedConversation,
        recipientName: conversation.otherName,
        recipientRole: conversation.otherRole as "buyer" | "seller",
        content: newMessage.trim(),
      });
      setNewMessage("");
      await loadMessages(selectedConversation);
      await loadConversations();
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!conv || !searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      conv.otherName?.toLowerCase().includes(search) ||
      conv.otherEmail?.toLowerCase().includes(search) ||
      conv.lastMessage?.toLowerCase().includes(search)
    );
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  // Function to refresh onboarding data from localStorage
  const refreshOnboardingData = useCallback(() => {
    const authAccount = localStorage.getItem("authAccount");
    console.log('Dashboard - refreshOnboardingData called');
    if (authAccount) {
      try {
        const account = JSON.parse(authAccount);
        console.log('Dashboard - Account from localStorage:', { hasOnboarding: !!account.onboarding, onboarding: account.onboarding });
        if (account.onboarding) {
          console.log('Dashboard - Setting sellerOnboarding:', account.onboarding);
          setSellerOnboarding(account.onboarding);
        } else {
          console.log('Dashboard - No onboarding data in account');
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    } else {
      console.log('Dashboard - No authAccount in localStorage');
    }
  }, []);

  useEffect(() => {
    // Load seller account info to get companyId
    const authAccount = localStorage.getItem("authAccount");
    let companyId: number | null = null;
    
    if (authAccount) {
      try {
        const account = JSON.parse(authAccount);
        if (account.companyId) {
          companyId = account.companyId;
          setSellerCompanyId(companyId);
        }
        if (account.name) {
          setAccountName(account.name);
        }
        if (account.email) {
          setSellerEmail(account.email);
        }
        if (account.company) {
          // Use company from account if available
          setCompany(account.company);
        }
        if (account.onboarding) {
          console.log('Dashboard - Initial load: Setting sellerOnboarding from localStorage:', account.onboarding);
          setSellerOnboarding(account.onboarding);
        } else {
          console.log('Dashboard - Initial load: No onboarding data in account');
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }

    // Function to load buyer leads (doesn't require companyId)
    const loadBuyerLeads = async () => {
      try {
        console.log('Dashboard - Fetching buyer leads from API...');
        console.log('Dashboard - API URL should be: http://localhost:4000/api/auth/buyer-leads');
        
        const leadsData = await fetchBuyerLeads();
        
        console.log('Dashboard - Buyer leads API response received:', {
          isArray: Array.isArray(leadsData),
          count: Array.isArray(leadsData) ? leadsData.length : 'not an array',
          type: typeof leadsData,
          constructor: leadsData?.constructor?.name,
          data: leadsData
        });
        
        // Ensure we have an array
        const leadsArray = Array.isArray(leadsData) ? leadsData : [];
        
        console.log('Dashboard - Setting buyerLeads with:', {
          count: leadsArray.length,
          sampleEmails: leadsArray.slice(0, 3).map(b => b?.email || 'no email'),
          withOnboarding: leadsArray.filter(b => b?.onboarding).length,
          withoutOnboarding: leadsArray.filter(b => !b?.onboarding).length,
          firstBuyer: leadsArray[0] || null
        });
        
        if (leadsArray.length === 0) {
          console.warn('Dashboard - WARNING: API returned empty array. Check backend console for logs.');
        }
        
        setBuyerLeads(leadsArray);
        console.log('Dashboard - setBuyerLeads called with', leadsArray.length, 'leads');
      } catch (leadsError) {
        console.error('Dashboard - Error fetching buyer leads:', leadsError);
        console.error('Dashboard - Error details:', {
          message: leadsError instanceof Error ? leadsError.message : 'Unknown error',
          name: leadsError instanceof Error ? leadsError.name : undefined,
          stack: leadsError instanceof Error ? leadsError.stack : undefined,
          error: leadsError
        });
        // Set empty array on error so the component doesn't break
        setBuyerLeads([]);
      }
    };

    const loadData = async () => {
      console.log('Dashboard - loadData called, companyId:', companyId);
      
      // Always load buyer leads, regardless of companyId
      loadBuyerLeads();
      
      if (!companyId) {
        console.log('Dashboard - loadData: No companyId, skipping companies/materials/POs but buyer leads loaded');
        setLoading(false);
        return;
      }

      console.log('Dashboard - loadData: Starting to fetch companies, materials, POs...');
      try {
        const [companiesData, materialsData, bidsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials({ companyId }),
          fetchBids()
        ]);
        console.log('Dashboard - loadData: Fetched companies, materials, POs successfully');
        
        // If company wasn't set from account, find it from companies list
        setCompany(prevCompany => {
          if (prevCompany) return prevCompany;
          const myCompany = companiesData.find(c => c.id === companyId);
          return myCompany || null;
        });
        setMaterials(materialsData.filter(m => m.companyId === companyId));
        setBids(bidsData.filter(b => b.companyId === companyId));
        
        // Refresh onboarding data after loading buyer leads to ensure we have latest data
        refreshOnboardingData();
        console.log('Dashboard - loadData: Completed successfully');
      } catch (error) {
        console.error("Dashboard - Failed to load data:", error);
        console.error("Dashboard - Error details:", {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      } finally {
        setLoading(false);
        console.log('Dashboard - loadData: Finished (finally block)');
      }
    };
    console.log('Dashboard - useEffect: About to call loadData');
    loadData();
  }, []);

  // Refresh onboarding data when component becomes visible or on focus
  useEffect(() => {
    refreshOnboardingData();
    
    const handleFocus = () => {
      refreshOnboardingData();
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authAccount') {
        refreshOnboardingData();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch revenue data when period changes
  useEffect(() => {
    if (!sellerCompanyId) {
      // Set empty data if no companyId
      setRevenueData({
        period: chartPeriod,
        data: [],
        totalRevenue: 0,
        revenueChange: 0,
        totalBids: 0,
      });
      setLoadingRevenue(false);
      return;
    }
    setLoadingRevenue(true);
    fetchRevenueData(chartPeriod, sellerCompanyId)
      .then(data => {
        setRevenueData(data);
        setLoadingRevenue(false);
      })
      .catch(err => {
        console.error('Failed to fetch revenue data:', err);
        // Set empty data on error
        setRevenueData({
          period: chartPeriod,
          data: [],
          totalRevenue: 0,
          revenueChange: 0,
          totalBids: 0,
        });
        setLoadingRevenue(false);
      });
  }, [chartPeriod, sellerCompanyId]);

  // Calculate recommended buyers - using the same logic as SellerProfile
  const calculateRecommendedBuyers = useCallback((leads: BuyerLead[], sellerPrefs: OnboardingData): BuyerLead[] => {
    const calculateMatchScore = (buyer: BuyerLead): number => {
      if (!buyer.onboarding) return 0;
      
      let score = 0;
      const buyerPrefs = buyer.onboarding;

      // Match project types
      if (sellerPrefs.projectTypes && buyerPrefs.buyerProjectTypes) {
        const sellerProjectTypes = sellerPrefs.projectTypes.map(t => t.toLowerCase());
        const buyerProjectTypes = buyerPrefs.buyerProjectTypes.map(t => t.toLowerCase().replace(/^.*? - /, ''));
        
        const matches = sellerProjectTypes.some(sellerType => {
          return buyerProjectTypes.some(buyerType => {
            if ((sellerType.includes('residential') || sellerType.includes('single-family') || sellerType.includes('apartments')) &&
                (buyerType.includes('home') || buyerType.includes('residential'))) return true;
            if (sellerType.includes('commercial') && buyerType.includes('commercial')) return true;
            if (sellerType.includes('industrial') && buyerType.includes('industrial')) return true;
            if ((sellerType.includes('infrastructure') || sellerType.includes('civil')) &&
                (buyerType.includes('infrastructure') || buyerType.includes('civil'))) return true;
            if ((sellerType.includes('high-rise') || sellerType.includes('skyscraper')) &&
                (buyerType.includes('high-rise') || buyerType.includes('tower'))) return true;
            return false;
          });
        });
        
        if (matches) score += 15;
      }

      // Match seller role with buyer project scale
      if (sellerPrefs.role && buyerPrefs.projectScale) {
        const sellerRoles = sellerPrefs.role.map(r => r.toLowerCase());
        const buyerScales = buyerPrefs.projectScale.map(s => s.toLowerCase());
        
        if ((sellerRoles.some(r => r.includes('general contractor') || r.includes('design-build') || r.includes('epc'))) &&
            buyerScales.some(s => s.includes('large') || s.includes('enterprise'))) {
          score += 10;
        }
        if (sellerRoles.some(r => r.includes('subcontractor'))) {
          score += 5;
        }
      }

      // Match special categories
      if (sellerPrefs.specialCategories && buyerPrefs.buyerProjectTypes) {
        const specialCats = sellerPrefs.specialCategories.map(c => c.toLowerCase());
        const buyerProjects = buyerPrefs.buyerProjectTypes.map(p => p.toLowerCase());
        
        if (specialCats.includes('green construction firms') && 
            buyerProjects.some(p => p.includes('green') || p.includes('sustainable'))) {
          score += 10;
        }
        if (specialCats.includes('renovation / remodeling companies') &&
            buyerProjects.some(p => p.includes('home') || p.includes('residential'))) {
          score += 10;
        }
      }

      return score;
    };

    return leads
      .map(buyer => ({
        buyer,
        score: calculateMatchScore(buyer)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.buyer);
  }, []);

  // Get recommended buyers based on preferences
  const recommendedBuyers = useMemo(() => {
    // Debug logging
    console.log('Dashboard - Calculating recommended buyers:', {
      hasOnboarding: !!sellerOnboarding,
      buyerLeadsCount: buyerLeads.length,
      sellerOnboarding: sellerOnboarding,
      buyerLeads: buyerLeads
    });
    
    if (!sellerOnboarding) {
      console.log('Dashboard - Early return: missing sellerOnboarding');
      return [];
    }
    
    if (buyerLeads.length === 0) {
      console.log('Dashboard - Early return: buyerLeads is empty');
      return [];
    }
    
    // Pass all buyer leads to calculation function (it handles filtering internally)
    // This matches the original SellerProfile behavior
    const recommended = calculateRecommendedBuyers(buyerLeads, sellerOnboarding);
    console.log('Dashboard - Recommended buyers calculated:', recommended.length, recommended);
    return recommended;
  }, [buyerLeads, sellerOnboarding, calculateRecommendedBuyers]);

  const stats = useMemo(() => {
    const totalInventoryValue = materials.reduce((sum, m) => sum + (m.stock * m.baseUnitPrice), 0);
    const pendingBids = bids.filter(b => b.status === 'submitted' || b.status === 'draft').length;
    const totalBidValue = bids.reduce((sum, b) => sum + b.totalAmount, 0);
    
    return {
      materialCount: materials.length,
      totalStock: materials.reduce((sum, m) => sum + m.stock, 0),
      inventoryValue: totalInventoryValue,
      pendingBids,
      totalBidValue,
      recommendedLeads: recommendedBuyers.length,
      totalLeads: buyerLeads.length
    };
  }, [materials, bids, recommendedBuyers, buyerLeads]);

  const recentBids = bids.slice(0, 5);

  const getStatusBadge = (status: Bid["status"]) => {
    const styles: Record<Bid["status"], string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-primary/10 text-primary",
      accepted: "bg-green-500/10 text-green-600",
      rejected: "bg-destructive/10 text-destructive",
      countered: "bg-purple-500/10 text-purple-600",
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
    };
    return labels[status] ?? status;
  };
  
  const chartData = useMemo(() => {
    if (!revenueData || revenueData.data.length === 0) {
      // Return a single data point with 0 values
      return [{
        label: 'No Data',
        revenue: 0,
        cumulative: 0,
        count: 0
      }];
    }
    
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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <Factory className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-slate-900">Waypoint</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Seller</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" className="text-indigo-600 font-medium">
                <Building2 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <span className="text-slate-300">|</span>
              <Link to="/seller/materials">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/seller/bids">
                <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
                  <Inbox className="w-4 h-4 mr-2" />
                  PO Inbox
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Sheet open={inboxOpen} onOpenChange={setInboxOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="relative">
                  <Inbox className="w-5 h-5" />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
                <SheetHeader className="flex-shrink-0">
                  <SheetTitle>Messages</SheetTitle>
                  <SheetDescription>
                    Connect with buyers and manage your conversations
                  </SheetDescription>
                </SheetHeader>
                
                <div className="flex-1 flex flex-col min-h-0 mt-6 space-y-4">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col min-h-0">
                    {!selectedConversation ? (
                      <div className="flex-1 overflow-y-auto space-y-2">
                        {filteredConversations.length === 0 ? (
                          <div className="p-8 text-center text-muted-foreground">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No messages yet</p>
                            <p className="text-sm mt-2">Start a conversation with a buyer</p>
                          </div>
                        ) : (
                          filteredConversations.map((conv) => {
                            if (!conv || !conv.otherEmail) return null;
                            const initials = (conv.otherName || "U").split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                            return (
                              <button
                                key={conv.otherEmail}
                                onClick={() => {
                                  setSelectedConversation(conv.otherEmail);
                                }}
                                className={`w-full p-4 text-left rounded-lg border transition-colors ${
                                  selectedConversation === conv.otherEmail 
                                    ? "bg-primary/5 border-primary" 
                                    : "bg-card border-border hover:bg-muted/50"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                    conv.unreadCount > 0 
                                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {initials}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <p className="font-semibold text-sm text-foreground truncate">
                                        {conv.otherName || "Unknown"}
                                      </p>
                                      {conv.unreadCount > 0 && (
                                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                                          {conv.unreadCount}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground truncate mb-1">
                                      {conv.lastMessage || "No message"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {conv.lastMessageTime ? (() => {
                                        try {
                                          return formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true });
                                        } catch {
                                          return 'Recently';
                                        }
                                      })() : 'Just now'}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-0 border-t pt-4 mt-4">
                        <div className="mb-3 flex-shrink-0">
                          <p className="font-semibold text-foreground">
                            {conversations.find(c => c.otherEmail === selectedConversation)?.otherName || "Conversation"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {conversations.find(c => c.otherEmail === selectedConversation)?.otherEmail}
                          </p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-3 p-3 bg-muted/30 rounded-lg min-h-0">
                          {messages.map((msg) => {
                            const isSender = msg.senderEmail === sellerEmail;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                                    isSender
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-card text-foreground border border-border"
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap break-words">
                                    {msg.content}
                                  </p>
                                  <p
                                    className={`text-xs mt-1 ${
                                      isSender
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {msg.createdAt ? (() => {
                                      try {
                                        return formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true });
                                      } catch {
                                        return 'Just now';
                                      }
                                    })() : 'Just now'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                        <div className="flex gap-2 flex-shrink-0 pt-2">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sending}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3 px-3">
                  <span className="text-sm font-medium">{company?.name || accountName || "Seller Account"}</span>
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
                    <User className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/seller/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Company Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/seller/settings" className="flex items-center">
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
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-500">
            Loading...
          </div>
        ) : (
          <>
            {/* Welcome Section with Preferences */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900">
                    Welcome back, {company?.name || accountName || "Seller"}
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Here's an overview of your materials, POs, and potential buyers
                  </p>
                </div>
                {!sellerOnboarding && (
                  <Link to="/seller/profile">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Set Preferences
                    </Button>
                  </Link>
                )}
              </div>

              {/* Preferences Display */}
              {sellerOnboarding && (
                <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 mb-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-amber-600" />
                        Your Company Profile
                      </CardTitle>
                      <Link to="/seller/profile">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                    <CardDescription>
                      We use this to match you with relevant buyers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sellerOnboarding.projectTypes?.slice(0, 3).map((type, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                          {type.replace(/^.*? - /, '')}
                        </Badge>
                      ))}
                      {sellerOnboarding.role?.slice(0, 2).map((role, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                          {role}
                        </Badge>
                      ))}
                      {sellerOnboarding.specialCategories?.slice(0, 2).map((cat, idx) => (
                        <Badge key={idx} variant="outline" className="border-green-300 text-green-700">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!sellerOnboarding && (
                <Alert className="mb-6 border-indigo-200 bg-indigo-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Get matched with buyers!</strong> Set your company preferences in your{" "}
                    <Link to="/seller/profile" className="underline font-medium">profile</Link> to see buyers who match your expertise.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Recommended Buyer Leads */}
            <Card className="border-0 shadow-lg mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-indigo-600" />
                    <CardTitle>Recommended Buyer Leads</CardTitle>
                    {recommendedBuyers.length > 0 && (
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                        {recommendedBuyers.length} matches
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {sellerOnboarding 
                    ? "Buyers whose project needs align with your company's expertise"
                    : "Set your preferences to see recommended buyers"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!sellerOnboarding ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-50" />
                    <p className="text-slate-600 mb-2">No preferences set yet</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Set your project types and specializations to see buyers that match your expertise
                    </p>
                    <Link to="/seller/profile">
                      <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Set Preferences
                      </Button>
                    </Link>
                  </div>
                ) : recommendedBuyers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-50" />
                    <p className="text-slate-600 mb-2">No matching buyers found</p>
                    <p className="text-sm text-slate-500">
                      We'll show buyers here as they sign up and match your preferences
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(showAllRecommended ? recommendedBuyers : recommendedBuyers.slice(0, 6)).map((buyer) => {
                      return (
                        <Card key={buyer.email} className="border-indigo-200 bg-indigo-50/30 hover:shadow-md transition-all">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base mb-1">{buyer.name}</CardTitle>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail className="w-3.5 h-3.5" />
                                  <span className="truncate">{buyer.email}</span>
                                </div>
                              </div>
                              <Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {buyer.onboarding && (
                              <>
                                {buyer.onboarding.buyerProjectTypes && buyer.onboarding.buyerProjectTypes.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700 mb-1">Project Types</p>
                                    <div className="flex flex-wrap gap-1">
                                      {buyer.onboarding.buyerProjectTypes.slice(0, 2).map((type, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                          {type.replace(/^.*? - /, '')}
                                        </Badge>
                                      ))}
                                      {buyer.onboarding.buyerProjectTypes.length > 2 && (
                                        <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                          +{buyer.onboarding.buyerProjectTypes.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {buyer.onboarding.materialTypes && buyer.onboarding.materialTypes.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700 mb-1">Material Interests</p>
                                    <div className="flex flex-wrap gap-1">
                                      {buyer.onboarding.materialTypes.slice(0, 2).map((type, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                                          {type.replace(/^Other: /, '')}
                                        </Badge>
                                      ))}
                                      {buyer.onboarding.materialTypes.length > 2 && (
                                        <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                                          +{buyer.onboarding.materialTypes.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {buyer.onboarding.budgetRange && (
                                    <div className="pt-2 border-t border-indigo-200">
                                    <p className="text-xs text-slate-600">
                                      <span className="font-semibold">Budget:</span> {buyer.onboarding.budgetRange}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => {
                                  console.log('Message Buyer button clicked', { buyer, sellerEmail, company });
                                  setSelectedBuyer(buyer);
                                  setMessageDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Message Buyer
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                      })}
                    </div>
                    {recommendedBuyers.length > 6 && (
                      <div className="mt-4 text-center">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllRecommended(!showAllRecommended)}
                        >
                          {showAllRecommended ? (
                            <>
                              Show Less
                            </>
                          ) : (
                            <>
                              See All Recommended ({recommendedBuyers.length} total)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Revenue Chart */}
            <Card className="border-0 shadow-lg mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-slate-600">Total Revenue</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl md:text-4xl font-display font-bold text-slate-900">
                        ${loadingRevenue ? '...' : totalRevenue.toLocaleString()}
                      </span>
                      {(chartData.length > 1 || chartPeriod === 'YTD') && (
                        <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          <TrendingUp className={`w-4 h-4 mr-1 ${!isPositive && 'rotate-180'}`} />
                          {revenueChangeDisplay}
                          <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button type="button" className="ml-1.5 inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[280px]">
                              <p className="text-xs leading-relaxed">
                                <span className="font-semibold">Percentage Change:</span> Compares total revenue in the selected period to the immediately preceding period of equal length.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {loadingRevenue ? 'Loading...' : `${revenueData?.totalBids || 0} accepted POs`}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setChartPeriod(period)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          chartPeriod === period 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-[200px] md:h-[280px] -mx-2">
                  {loadingRevenue ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Loading revenue data...
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
                          tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
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
                            backgroundColor: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            fontSize: '13px',
                            padding: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                          }}
                          cursor={{ fill: 'rgba(251, 191, 36, 0.1)', stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '3 3' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'revenue') {
                              return [`$${value.toLocaleString()}`, 'Event Revenue'];
                            } else if (name === 'cumulative') {
                              return [`$${value.toLocaleString()}`, 'Cumulative'];
                            }
                            return [value, name];
                          }}
                          labelStyle={{ 
                            color: '#1e293b', 
                            fontWeight: 600, 
                            marginBottom: '4px',
                            fontSize: '12px'
                          }}
                          itemStyle={{ padding: '2px 0' }}
                        />
                        <Bar
                          yAxisId="revenue"
                          dataKey="revenue"
                          fill="url(#revenueBarGradient)"
                          radius={[4, 4, 0, 0]}
                          opacity={0.95}
                          filter="url(#barShadow)"
                        />
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
                            stroke: 'white', 
                            strokeWidth: 2,
                            opacity: 0.8
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {[
                { 
                  label: "Materials", 
                  value: stats.materialCount.toString(), 
                  icon: Package, 
                  color: "amber",
                  link: "/seller/materials"
                },
                { 
                  label: "Total Stock", 
                  value: stats.totalStock.toLocaleString(), 
                  icon: Building2, 
                  color: "slate" 
                },
                { 
                  label: "Inventory Value", 
                  value: `$${stats.inventoryValue.toLocaleString()}`, 
                  icon: DollarSign, 
                  color: "slate" 
                },
                { 
                  label: "Pending POs", 
                  value: stats.pendingBids.toString(), 
                  icon: Inbox, 
                  color: "amber",
                  link: "/seller/POs"
                },
                { 
                  label: "Matching Leads", 
                  value: stats.recommendedLeads.toString(), 
                  icon: Users, 
                  color: "green",
                  subtitle: `${stats.totalLeads} total buyers`
                },
              ].map((stat, i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">{stat.label}</p>
                        <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                        {stat.subtitle && (
                          <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                        )}
                      </div>
                      <div className={`w-10 h-10 rounded-lg ${
                        stat.color === 'amber' ? 'bg-indigo-100' : 
                        stat.color === 'green' ? 'bg-green-100' : 
                        'bg-slate-100'
                      } flex items-center justify-center`}>
                        <stat.icon className={`w-5 h-5 ${
                          stat.color === 'amber' ? 'text-indigo-600' : 
                          stat.color === 'green' ? 'text-green-600' : 
                          'text-slate-600'
                        }`} />
                      </div>
                    </div>
                    {stat.link && (
                      <Link to={stat.link} className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
                        View →
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Compact Inbox */}
              <Card className="lg:col-span-1 border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Inbox className="w-5 h-5 text-primary" />
                      </div>
                      <span>Messages</span>
                      {totalUnread > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs ml-1.5">
                          {totalUnread}
                        </Badge>
                      )}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setInboxOpen(true)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/5"
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[450px] overflow-y-auto">
                    {conversations.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-muted-foreground opacity-40" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
                        <p className="text-xs text-muted-foreground mb-4">Start conversations with buyers</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {conversations.slice(0, 5).map((conv) => {
                          if (!conv || !conv.otherEmail) return null;
                          const initials = (conv.otherName || "U").split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                          return (
                            <button
                              key={conv.otherEmail}
                              onClick={() => {
                                setSelectedConversation(conv.otherEmail);
                                setInboxOpen(true);
                              }}
                              className={`w-full p-4 text-left hover:bg-muted/50 transition-all duration-200 ${
                                selectedConversation === conv.otherEmail ? "bg-primary/5 border-l-2 border-l-primary" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                  conv.unreadCount > 0 
                                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-semibold text-sm text-foreground truncate">
                                      {conv.otherName || "Unknown"}
                                    </p>
                                    {conv.unreadCount > 0 && (
                                      <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0">
                                        {conv.unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate mb-1">
                                    {conv.lastMessage || "No message"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {conv.lastMessageTime ? (() => {
                                      try {
                                        return formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true });
                                      } catch {
                                        return 'Recently';
                                      }
                                    })() : 'Just now'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {conversations.length > 5 && (
                    <div className="p-4 border-t border-border/50 bg-muted/20">
                      <Button 
                        variant="ghost" 
                        className="w-full text-sm font-medium"
                        onClick={() => setInboxOpen(true)}
                      >
                        View {conversations.length - 5} more conversation{conversations.length - 5 !== 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Bids */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Recent POs</CardTitle>
                    <Link to="/seller/POs">
                      <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {recentBids.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Inbox className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>No POs received yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {recentBids.map((bid) => (
                        <div key={bid.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{bid.buyerName}</p>
                              <p className="text-sm text-slate-500">
                                Bid #{bid.id} · {new Date(bid.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">${bid.totalAmount.toFixed(2)}</p>
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
                </CardContent>
              </Card>

              {/* Company Info */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="border-b border-slate-200">
                  <CardTitle className="text-lg">Company Profile</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {company ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-600">Company Name</p>
                        <p className="font-medium text-lg text-slate-900">{company.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Description</p>
                        <p className="text-slate-900">{company.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600">Location</p>
                          <p className="font-medium text-slate-900">{company.location}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Phone</p>
                          <p className="font-medium text-slate-900">{company.phone}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Email</p>
                        <p className="font-medium text-slate-900">{company.email}</p>
                      </div>
                      <Button variant="outline" className="w-full mt-4" onClick={handleEditProfile}>
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </div>
                  ) : (
                    <p className="text-slate-500">No company information available</p>
                  )}
                </CardContent>
              </Card>
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

      {/* Message Buyer Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Message to {selectedBuyer?.name}</DialogTitle>
            <DialogDescription>
              Start a conversation with this buyer. They'll see your message in their inbox.
            </DialogDescription>
          </DialogHeader>
          {selectedBuyer && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-semibold text-foreground mb-1">{selectedBuyer.name}</p>
                <p className="text-xs text-muted-foreground">{selectedBuyer.email}</p>
                {selectedBuyer.onboarding?.buyerProjectTypes && selectedBuyer.onboarding.buyerProjectTypes.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Project Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedBuyer.onboarding.buyerProjectTypes.slice(0, 3).map((type, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {type.replace(/^.*? - /, '')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Hi, I noticed your project needs align with our expertise. I'd love to discuss how we can help with your material requirements..."
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
                    setSelectedBuyer(null);
                  }}
                  disabled={sendingMessage}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    console.log('Send message button clicked', { 
                      messageText: messageText.trim(), 
                      sellerEmail, 
                      company, 
                      selectedBuyer,
                      accountName,
                      hasMessage: !!messageText.trim(),
                      hasEmail: !!sellerEmail,
                      hasCompany: !!company,
                      hasBuyer: !!selectedBuyer
                    });
                    
                    if (!messageText.trim()) {
                      alert("Please enter a message");
                      return;
                    }
                    if (!sellerEmail) {
                      alert("Seller email not found. Please sign in again.");
                      return;
                    }
                    if (!selectedBuyer) {
                      alert("Buyer information not found.");
                      return;
                    }
                    
                    // Get company name from company object or account name as fallback
                    let senderName = company?.name || accountName || "Seller";
                    
                    // Try to get company name from localStorage if company object is not available
                    if (!senderName || senderName === "Seller") {
                      try {
                        const authAccount = localStorage.getItem("authAccount");
                        if (authAccount) {
                          const account = JSON.parse(authAccount);
                          if (account.company?.name) {
                            senderName = account.company.name;
                          } else if (account.name) {
                            senderName = account.name;
                          }
                        }
                      } catch (error) {
                        console.error("Error getting company name from localStorage:", error);
                      }
                    }
                    
                    if (!senderName || senderName === "Seller") {
                      alert("Company name not found. Please sign in again.");
                      return;
                    }
                    
                    setSendingMessage(true);
                    try {
                      console.log('Sending message...', {
                        senderEmail: sellerEmail,
                        senderName: senderName,
                        recipientEmail: selectedBuyer.email,
                        content: messageText.trim()
                      });
                      
                      await sendMessage({
                        senderEmail: sellerEmail,
                        senderName: senderName,
                        senderRole: "seller",
                        recipientEmail: selectedBuyer.email,
                        recipientName: selectedBuyer.name,
                        recipientRole: "buyer",
                        content: messageText.trim(),
                      });
                      
                      console.log('Message sent successfully');
                      setMessageDialogOpen(false);
                      setMessageText("");
                      setSelectedBuyer(null);
                      // Reload conversations to show the new message
                      if (sellerEmail) {
                        loadConversations();
                      }
                      alert("Message sent successfully! The buyer will see it in their inbox.");
                    } catch (error) {
                      console.error("Failed to send message:", error);
                      alert("Failed to send message. Please try again.");
                    } finally {
                      setSendingMessage(false);
                    }
                  }}
                  disabled={!messageText.trim() || sendingMessage}
                >
                  {sendingMessage ? 'Sending...' : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboard;
