import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Link, useSearchParams } from "react-router-dom";
import { 
  Inbox, MessageSquare, Send, User, ChevronDown, LogOut, Settings, 
  Package, Building2, ShoppingCart, FileText, Home, Search, Sparkles,
  TrendingUp, Target, Star, Info, Edit, Users, Plus, Mail, Bell,
  CheckCircle2, Clock, DollarSign, FileCheck
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
import { Textarea } from "@/components/ui/textarea";
import { 
  fetchConversations, fetchMessages, sendMessage, markMessagesAsRead,
  fetchCompanies, fetchMaterials, fetchBids, type Company, type Material, type Bid,
  type Conversation, type Message, type BuyerOnboardingData
} from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const BuyerHome = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [buyerName, setBuyerName] = useState<string>("Buyer Account");
  const [buyerEmail, setBuyerEmail] = useState<string>("");
  const [buyerRole, setBuyerRole] = useState<"buyer" | "seller">("buyer");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Company | null>(null);
  const [initialMessage, setInitialMessage] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [onboardingData, setOnboardingData] = useState<BuyerOnboardingData | null>(null);

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
        if (account.role) {
          setBuyerRole(account.role);
        }
        if (account.onboarding) {
          setOnboardingData(account.onboarding);
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }

    // Load companies, materials, and bids
    const loadData = async () => {
      try {
        const [companiesData, materialsData, bidsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials(),
          fetchBids()
        ]);
        setCompanies(companiesData);
        setMaterials(materialsData);
        // Filter bids for this buyer
        const buyerBids = bidsData.filter(bid => 
          bid.buyerEmail?.toLowerCase() === buyerEmail?.toLowerCase() || 
          bid.buyerName === buyerName
        );
        setBids(buyerBids);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [buyerEmail, buyerName]);

  useEffect(() => {
    if (buyerEmail) {
      loadConversations();
      const interval = setInterval(() => {
        loadConversations();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [buyerEmail]);

  useEffect(() => {
    const sellerEmail = searchParams.get("seller");
    if (sellerEmail) {
      setSelectedConversation(sellerEmail);
      setInboxOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedConversation && buyerEmail) {
      const load = async () => {
        try {
          await loadMessages(selectedConversation);
          await markMessagesAsRead(buyerEmail, selectedConversation);
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
  }, [selectedConversation, buyerEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    if (!buyerEmail) return;
    try {
      const convs = await fetchConversations(buyerEmail);
      setConversations(convs || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      setConversations([]);
    }
  };

  const loadMessages = async (otherEmail: string) => {
    if (!buyerEmail) return;
    try {
      const msgs = await fetchMessages(buyerEmail, otherEmail);
      setMessages(msgs);
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !buyerEmail || !buyerName) {
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
        senderEmail: buyerEmail,
        senderName: buyerName,
        senderRole: buyerRole,
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

  const handleStartNewConversation = async () => {
    if (!selectedSeller || !initialMessage.trim() || !buyerEmail || !buyerName) {
      return;
    }

    setSending(true);
    try {
      await sendMessage({
        senderEmail: buyerEmail,
        senderName: buyerName,
        senderRole: "buyer",
        recipientEmail: selectedSeller.email,
        recipientName: selectedSeller.name,
        recipientRole: "seller",
        content: initialMessage.trim(),
      });
      setNewMessageDialogOpen(false);
      setInitialMessage("");
      setSelectedSeller(null);
      await loadConversations();
      // Open the conversation
      setSelectedConversation(selectedSeller.email);
      setInboxOpen(true);
      setSearchParams({ seller: selectedSeller.email });
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!conv || !conv.otherName || !conv.otherEmail) return false;
    const search = searchTerm.toLowerCase();
    return conv.otherName.toLowerCase().includes(search) ||
           conv.otherEmail.toLowerCase().includes(search);
  });

  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  // Get preferred material types
  const preferredMaterialTypes = useMemo(() => {
    if (!onboardingData?.materialTypes) return [];
    return onboardingData.materialTypes
      .map(type => type.replace(/^Other: /, ''))
      .filter(type => type.length > 0);
  }, [onboardingData]);

  // Calculate match score for materials
  const getMaterialMatchScore = (material: Material): number => {
    if (!onboardingData) return 0;
    let score = 0;
    
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

  // Get recommended materials
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

  // Get recommended companies
  const recommendedCompanies = useMemo(() => {
    if (!onboardingData?.buyerProjectTypes || onboardingData.buyerProjectTypes.length === 0) return [];
    return companies.slice(0, 4);
  }, [companies, onboardingData]);

  // User-specific stats
  const userStats = useMemo(() => {
    const activeBids = bids.filter(b => b.status === 'submitted' || b.status === 'draft').length;
    const acceptedBids = bids.filter(b => b.status === 'accepted').length;
    const totalSpent = bids
      .filter(b => b.status === 'accepted')
      .reduce((sum, b) => sum + b.totalAmount, 0);
    const pendingBids = bids.filter(b => b.status === 'submitted').length;
    
    return {
      totalBids: bids.length,
      activeBids,
      acceptedBids,
      totalSpent,
      pendingBids,
      matchingMaterials: materials.filter(m => getMaterialMatchScore(m) > 0).length,
      unreadMessages: totalUnread
    };
  }, [bids, materials, totalUnread]);

  const getProjectTypeIcon = (type: string) => {
    if (type.toLowerCase().includes('home') || type.toLowerCase().includes('residential')) return Home;
    if (type.toLowerCase().includes('commercial')) return Building2;
    if (type.toLowerCase().includes('industrial')) return Building2;
    if (type.toLowerCase().includes('infrastructure') || type.toLowerCase().includes('civil')) return Building2;
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
                <Button variant="ghost" className="text-primary font-medium">
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

          <div className="flex items-center gap-3">
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
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Messages</SheetTitle>
                  <SheetDescription>
                    Connect with sellers and manage your conversations
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessageDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Message
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredConversations.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No messages yet</p>
                        <p className="text-sm mt-2">Start a conversation with a seller</p>
                      </div>
                    ) : (
                      filteredConversations.map((conv) => {
                        if (!conv || !conv.otherEmail) return null;
                        return (
                          <button
                            key={conv.otherEmail}
                            onClick={() => {
                              setSelectedConversation(conv.otherEmail);
                              setSearchParams({ seller: conv.otherEmail });
                            }}
                            className={`w-full p-3 text-left rounded-lg border transition-colors ${
                              selectedConversation === conv.otherEmail 
                                ? "bg-primary/5 border-primary" 
                                : "bg-card border-border hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-foreground truncate">
                                    {conv.otherName || "Unknown"}
                                  </p>
                                  {conv.unreadCount > 0 && (
                                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                                      {conv.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {conv.lastMessage || "No message"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
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

                  {selectedConversation && (
                    <div className="border-t pt-4 mt-4">
                      <div className="mb-3">
                        <p className="font-semibold text-foreground">
                          {conversations.find(c => c.otherEmail === selectedConversation)?.otherName || "Conversation"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {conversations.find(c => c.otherEmail === selectedConversation)?.otherEmail}
                        </p>
                      </div>
                      <div className="h-[300px] overflow-y-auto space-y-3 mb-3 p-3 bg-muted/30 rounded-lg">
                        {messages.map((msg) => {
                          const isSender = msg.senderEmail === buyerEmail;
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
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
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
              </SheetContent>
            </Sheet>

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
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section with Preferences */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                Welcome Back, {buyerName}
              </h1>
              <p className="text-muted-foreground text-lg">
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

          {/* Preferences Display */}
          {onboardingData && (
            <Card className="border-primary/20 bg-primary/5 mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Your Preferences
                  </CardTitle>
                  <Link to="/buyer/profile">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                </div>
                <CardDescription>
                  Materials and projects tailored to your needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {onboardingData.materialTypes && onboardingData.materialTypes.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-2 block">Material Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {onboardingData.materialTypes.slice(0, 5).map((type, idx) => (
                        <Badge key={idx} variant="secondary">
                          {type.replace(/^Other: /, '')}
                        </Badge>
                      ))}
                      {onboardingData.materialTypes.length > 5 && (
                        <Badge variant="secondary">
                          +{onboardingData.materialTypes.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {onboardingData.buyerProjectTypes && onboardingData.buyerProjectTypes.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-2 block">Project Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {onboardingData.buyerProjectTypes.slice(0, 4).map((type, idx) => {
                        const Icon = getProjectTypeIcon(type);
                        return (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {type.replace(/^.*? - /, '')}
                          </Badge>
                        );
                      })}
                      {onboardingData.buyerProjectTypes.length > 4 && (
                        <Badge variant="secondary">
                          +{onboardingData.buyerProjectTypes.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {onboardingData.projectScale && onboardingData.projectScale.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-foreground mb-2 block">Project Scale</Label>
                    <div className="flex flex-wrap gap-2">
                      {onboardingData.projectScale.map((scale, idx) => (
                        <Badge key={idx} variant="outline">
                          {scale.replace(/^Other: /, '')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!onboardingData && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Get personalized recommendations!</strong> Set your material preferences and project types in your{" "}
                <Link to="/buyer/profile" className="underline font-medium">profile</Link> to see materials tailored to your needs.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* User-Specific Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Bids</p>
                  <p className="text-xl font-bold text-foreground">{userStats.totalBids}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Active Bids</p>
                  <p className="text-xl font-bold text-blue-600">{userStats.activeBids}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Accepted</p>
                  <p className="text-xl font-bold text-green-600">{userStats.acceptedBids}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-xl font-bold text-foreground">${userStats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Matching Materials</p>
                  <p className="text-xl font-bold text-primary">{userStats.matchingMaterials}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Unread Messages</p>
                  <p className="text-xl font-bold text-foreground">{userStats.unreadMessages}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Partner Companies</p>
                  <p className="text-xl font-bold text-foreground">{companies.length}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout: Inbox + Recommended Materials */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Compact Inbox */}
          <Card className="lg:col-span-1 border-0 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  Messages
                  {totalUnread > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {totalUnread}
                    </Badge>
                  )}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setInboxOpen(true)}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setNewMessageDialogOpen(true)}
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Start Conversation
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.slice(0, 5).map((conv) => {
                      if (!conv || !conv.otherEmail) return null;
                      return (
                        <button
                          key={conv.otherEmail}
                          onClick={() => {
                            setSelectedConversation(conv.otherEmail);
                            setInboxOpen(true);
                            setSearchParams({ seller: conv.otherEmail });
                          }}
                          className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                            selectedConversation === conv.otherEmail ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm text-foreground truncate">
                                  {conv.otherName || "Unknown"}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="destructive" className="h-4 min-w-4 px-1 text-xs">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {conv.lastMessage || "No message"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
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
                {conversations.length > 5 && (
                  <div className="p-3 border-t border-border">
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs"
                      onClick={() => setInboxOpen(true)}
                    >
                      View {conversations.length - 5} more conversation{conversations.length - 5 !== 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Materials */}
          <div className="lg:col-span-2">
            {recommendedMaterials.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-foreground">Recommended for You</h2>
                    <Badge variant="secondary">
                      {recommendedMaterials.length} matches
                    </Badge>
                  </div>
                  <Link to="/buyer/materials">
                    <Button variant="outline" size="sm">
                      View All Materials
                    </Button>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedMaterials.map((material) => {
                    const isMatch = getMaterialMatchScore(material) > 0;
                    return (
                      <Card key={material.id} className={`border-2 transition-all hover:shadow-lg ${isMatch ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base mb-1">{material.name}</CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {material.type}
                                </Badge>
                                {material.code && (
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                    {material.code}
                                  </code>
                                )}
                              </div>
                            </div>
                            {isMatch && (
                              <Star className="w-4 h-4 text-primary fill-primary" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span>{material.companyName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Price</p>
                              <p className="font-bold text-foreground">${material.baseUnitPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Stock</p>
                              <p className="font-semibold text-foreground">{material.stock.toLocaleString()}</p>
                            </div>
                          </div>
                          <Link to={`/buyer/bids?materialId=${material.id}&companyId=${material.companyId}`}>
                            <Button className="w-full" size="sm">
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Bid
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground mb-2">No recommendations yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {onboardingData ? "Try adjusting your preferences" : "Set your preferences to see personalized recommendations"}
                  </p>
                  <Link to={onboardingData ? "/buyer/profile" : "/buyer/materials"}>
                    <Button variant="outline" size="sm">
                      {onboardingData ? "Edit Preferences" : "Browse Materials"}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Recommended Companies */}
        {recommendedCompanies.length > 0 && onboardingData && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Recommended Partners</h2>
              </div>
              <Link to="/buyer/companies">
                <Button variant="outline" size="sm">
                  View All Companies
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommendedCompanies.map((company) => (
                <Card key={company.id} className="border-border hover:border-primary/50 transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{company.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">{company.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {materials.filter(m => m.companyId === company.id).length} materials
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/buyer/companies`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View
                        </Button>
                      </Link>
                      <Button 
                        variant="default" 
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedSeller(company);
                          setNewMessageDialogOpen(true);
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/buyer/materials">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Browse Materials</h3>
                    <p className="text-sm text-muted-foreground">Search and filter materials</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/buyer/bids">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Create Bid</h3>
                    <p className="text-sm text-muted-foreground">Build and submit bids</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card 
            className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setInboxOpen(true)}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Messages</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalUnread > 0 ? `${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}` : 'View conversations'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* New Message Dialog */}
      <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Message to Seller</DialogTitle>
            <DialogDescription>
              Start a conversation with a seller
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedSeller ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="seller-search">Select a Seller</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="seller-search"
                      placeholder="Search companies..."
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {companies.slice(0, 10).map((company) => (
                    <button
                      key={company.id}
                      onClick={() => setSelectedSeller(company)}
                      className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 hover:border-primary transition-colors"
                    >
                      <p className="font-semibold text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">{company.location}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">{selectedSeller.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedSeller.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedSeller.location}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSeller(null)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Hi, I'm interested in learning more about your materials..."
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    className="mt-2 min-h-[120px]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewMessageDialogOpen(false);
                      setInitialMessage("");
                      setSelectedSeller(null);
                    }}
                    disabled={sending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleStartNewConversation}
                    disabled={!initialMessage.trim() || sending}
                  >
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerHome;
