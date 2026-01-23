import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Factory, Inbox, Check, X, MessageSquare, Eye, Truck, CreditCard,
  FileText, Clock, AlertTriangle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  fetchCompanies, fetchBids, fetchBid, respondToBid,
  type Company, type Bid, type BidWithLineItems 
} from "@/lib/api";
import confetti from "canvas-confetti";

const SellerBids = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBid, setSelectedBid] = useState<BidWithLineItems | null>(null);
  const [loadingBid, setLoadingBid] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [responding, setResponding] = useState(false);
  const [counterNotes, setCounterNotes] = useState<Record<number, string>>({});
  const [counterSummary, setCounterSummary] = useState("");
  const [justCountered, setJustCountered] = useState(false);
  const [activeTab, setActiveTab] = useState<"items" | "details" | "respond" | "counter">("items");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [accountName, setAccountName] = useState<string>("");

  useEffect(() => {
    // Load seller account info to get companyId
    const authAccount = localStorage.getItem("authAccount");
    let sellerCompanyId: number | null = null;
    
    if (authAccount) {
      try {
        const account = JSON.parse(authAccount);
        if (account.companyId) {
          sellerCompanyId = account.companyId;
          setCompanyId(sellerCompanyId);
        }
        if (account.name) {
          setAccountName(account.name);
        }
        if (account.company) {
          setCompany(account.company);
        }
      } catch (error) {
        console.error("Error parsing auth account:", error);
      }
    }

    const loadData = async () => {
      if (!sellerCompanyId) {
        setLoading(false);
        return;
      }

      try {
        const [companiesData, bidsData] = await Promise.all([
          fetchCompanies(),
          fetchBids()
        ]);
        
        setCompany(prevCompany => {
          if (prevCompany) return prevCompany;
          const myCompany = companiesData.find(c => c.id === sellerCompanyId);
          return myCompany || null;
        });
        setBids(bidsData.filter(b => b.companyId === sellerCompanyId));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredPOs = bids.filter(b => 
    statusFilter === "all" || b.status === statusFilter
  );

  const viewBidDetails = async (bidId: number) => {
    setLoadingBid(true);
    try {
      const bidDetails = await fetchBid(bidId);
      setSelectedBid(bidDetails);
    } catch (error) {
      console.error("Failed to load bid details:", error);
    } finally {
      setLoadingBid(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
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

  const handleRespond = async (action: 'accept' | 'reject' | 'counter', overrideNote?: string) => {
    if (!selectedBid) return;
    
    setResponding(true);
    try {
      const noteToSend = overrideNote ?? responseNote;
      const result = await respondToBid(selectedBid.id, action, noteToSend);
      
      // Update local state
      setBids(prev => prev.map(b => 
        b.id === selectedBid.id 
          ? { ...b, status: result.status as Bid['status'], sellerResponse: result.sellerResponse }
          : b
      ));
      setSelectedBid(prev => prev ? { ...prev, status: result.status as Bid['status'], sellerResponse: result.sellerResponse } : null);
      setResponseNote("");
      setCounterNotes({});
      setCounterSummary("");

      // If we just countered, show a success state and confetti
      if (action === "counter" && result.status === "countered") {
        setJustCountered(true);
        setActiveTab("counter");
        try {
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.3 },
            scalar: 0.8,
          });
        } catch {
          // ignore confetti errors in non-browser environments
        }
      } else {
        setJustCountered(false);
      }
    } catch (error) {
      console.error("Failed to respond to bid:", error);
    } finally {
      setResponding(false);
    }
  };

  const getDeliveryLabel = (preference?: string) => {
    const labels: Record<string, string> = {
      standard: 'Standard Shipping',
      expedited: 'Expedited (3-5 days)',
      rush: 'Rush (1-2 days)',
      pickup: 'Will Pickup',
      freight: 'Freight / LTL'
    };
    return labels[preference || ''] || preference || 'Not specified';
  };

  const getPaymentLabel = (terms?: string) => {
    const labels: Record<string, string> = {
      prepaid: 'Prepaid (100% upfront)',
      net15: 'Net 15 days',
      net30: 'Net 30 days',
      net45: 'Net 45 days',
      net60: 'Net 60 days',
      cod: 'Cash on Delivery',
      milestone: 'Milestone-based'
    };
    return labels[terms || ''] || terms || 'Not specified';
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
              <Link to="/seller/dashboard">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Building2 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Link to="/seller/materials">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Package className="w-4 h-4 mr-2" />
                  Materials
                </Button>
              </Link>
              <span className="text-border">|</span>
              <Button variant="ghost" className="text-primary font-medium">
                <Inbox className="w-4 h-4 mr-2" />
                PO Inbox
              </Button>
            </div>
          </div>

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
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              PO Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and respond to incoming PO requests
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All POs</SelectItem>
              <SelectItem value="submitted">Response Needed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* POs Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading POs...
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Inbox className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No POs found</p>
              <p className="text-sm">PO requests from buyers will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-display font-semibold text-foreground">PO #</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Buyer</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Total Amount</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Date</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-display font-semibold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((bid, index) => (
                  <TableRow 
                    key={bid.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono text-sm">#{bid.id}</TableCell>
                    <TableCell className="font-medium">{bid.buyerName}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      ${bid.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(bid.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(bid.status)}`}>
                        {getStatusLabel(bid.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => viewBidDetails(bid.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Results info */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredPOs.length} of {bids.length} bids
        </div>
      </main>

      {/* PO Details Dialog */}
      <Dialog
        open={!!selectedBid}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBid(null);
            setResponseNote("");
            setCounterNotes({});
            setCounterSummary("");
            setJustCountered(false);
            setActiveTab("items");
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>PO #{selectedBid?.id}</span>
              {selectedBid && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedBid.status)}`}>
                  {getStatusLabel(selectedBid.status)}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              From {selectedBid?.buyerName} · {selectedBid && new Date(selectedBid.createdAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          {loadingBid ? (
            <div className="py-8 text-center text-muted-foreground">Loading PO details...</div>
          ) : selectedBid && (
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <Tabs
                value={activeTab}
                onValueChange={(val) => {
                  setActiveTab(val as typeof activeTab);
                  if (val !== "counter") {
                    setJustCountered(false);
                  }
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="items">
                    <Package className="w-4 h-4 mr-2" />
                    Items
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="respond" className="relative">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Respond
                    {selectedBid.status === 'submitted' && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="counter" className="relative">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Counter
                    {selectedBid.status === 'submitted' && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="items" className="space-y-4 mt-4">
                  {/* Line Items */}
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Material</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBid.lineItems?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{item.materialName || `Material #${item.materialId}`}</p>
                                  {item.urgency && item.urgency !== 'standard' && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      item.urgency === 'rush' 
                                        ? 'bg-destructive/10 text-destructive' 
                                        : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                      {item.urgency}
                                    </span>
                                  )}
                                </div>
                                {item.materialType && (
                                  <p className="text-xs text-muted-foreground">{item.materialType}</p>
                                )}
                                {item.itemNote && (
                                  <p className="text-xs text-primary mt-1 italic">"{item.itemNote}"</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>${item.proposedUnitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${(item.quantity * item.proposedUnitPrice).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <span className="font-semibold">Total Bid Amount</span>
                    <span className="text-2xl font-display font-bold text-primary">
                      ${selectedBid.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {/* Buyer Contact */}
                  <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Buyer Contact
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Company</p>
                        <p className="font-medium">{selectedBid.buyerName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">{selectedBid.buyerEmail || '—'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedBid.buyerPhone || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery & Payment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        Delivery
                      </h4>
                      <div className="text-sm space-y-2">
                        <div>
                          <p className="text-muted-foreground">Preference</p>
                          <p className="font-medium">{getDeliveryLabel(selectedBid.deliveryPreference)}</p>
                        </div>
                        {selectedBid.deliveryDate && (
                          <div>
                            <p className="text-muted-foreground">Requested Date</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(selectedBid.deliveryDate).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {selectedBid.shippingAddress && (
                          <div>
                            <p className="text-muted-foreground">Address</p>
                            <p className="font-medium text-xs">{selectedBid.shippingAddress}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment
                      </h4>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Terms</p>
                        <p className="font-medium">{getPaymentLabel(selectedBid.paymentTerms)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Notes */}
                  {(selectedBid.bidJustification || selectedBid.specialRequirements) && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-primary">
                        <MessageSquare className="w-4 h-4" />
                        Buyer's Notes
                      </h4>
                      {selectedBid.bidJustification && (
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">Justification</p>
                          <p className="bg-background p-3 rounded-md">{selectedBid.bidJustification}</p>
                        </div>
                      )}
                      {selectedBid.specialRequirements && (
                        <div className="text-sm">
                          <p className="text-muted-foreground mb-1">Special Requirements</p>
                          <p className="bg-background p-3 rounded-md">{selectedBid.specialRequirements}</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="respond" className="space-y-4 mt-4">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-5">
                    {selectedBid.status === 'submitted' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            Your Response (optional)
                          </label>
                          <Textarea
                            value={responseNote}
                            onChange={(e) => setResponseNote(e.target.value)}
                            placeholder="Add notes to accompany your response, such as clarifications, questions, or key terms..."
                            rows={4}
                            className="bg-background border-primary/20 focus:border-primary/40"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <Button 
                            className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all"
                            onClick={() => handleRespond('accept')}
                            disabled={responding}
                            size="lg"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept PO
                          </Button>
                          <Button 
                            variant="outline" 
                            className="text-destructive hover:text-destructive border-destructive/50 hover:bg-destructive/10 shadow-sm hover:shadow-md transition-all"
                            onClick={() => handleRespond('reject')}
                            disabled={responding}
                            size="lg"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Decline PO
                          </Button>
                        </div>

                        <div className="p-3 rounded-lg bg-background/80 border border-primary/10 flex items-start gap-2 text-sm text-muted-foreground">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                          <p>
                            Use <strong className="text-foreground">Counter</strong> for detailed line-by-line negotiation on this proposal.
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(selectedBid.status)}`}>
                          {selectedBid.status === 'accepted' && <Check className="w-4 h-4" />}
                          {selectedBid.status === 'rejected' && <X className="w-4 h-4" />}
                          {selectedBid.status === 'countered' && <MessageSquare className="w-4 h-4" />}
                          Bid {getStatusLabel(selectedBid.status)}
                        </div>
                        
                        {selectedBid.sellerResponse && (
                          <div className="mt-4 p-4 rounded-lg bg-background/80 border border-primary/10 text-left">
                            <p className="text-sm text-muted-foreground mb-1 font-medium">Your response:</p>
                            <p className="text-sm text-foreground">{selectedBid.sellerResponse}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="counter" className="space-y-4 mt-4">
                  <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-5 space-y-5">
                    {selectedBid.status === 'submitted' || justCountered ? (
                      <>
                        {justCountered ? (
                          <div className="text-center py-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/30 text-sm font-medium">
                              <Check className="w-4 h-4" />
                              Bid successfully countered
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="pb-2 border-b border-purple-500/10">
                              <p className="text-sm text-foreground flex items-start gap-2">
                                <MessageSquare className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>
                                  Review the full proposal and add <span className="font-semibold text-purple-600">marks and comments</span> to specific line items. 
                              These notes will be sent back to the buyer as part of your counter-offer.
                            </span>
                          </p>
                        </div>

                        <div className="rounded-lg border border-purple-500/20 bg-background overflow-hidden shadow-sm">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-purple-500/10">
                                <TableHead className="font-semibold">Material</TableHead>
                                <TableHead className="font-semibold">Qty</TableHead>
                                <TableHead className="font-semibold">Price</TableHead>
                                <TableHead className="font-semibold">Seller Comments</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedBid.lineItems?.map((item) => (
                                <TableRow key={item.id} className="align-top hover:bg-purple-500/5 transition-colors">
                                  <TableCell>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">{item.materialName || `Material #${item.materialId}`}</p>
                                        {item.urgency && item.urgency !== 'standard' && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                            item.urgency === 'rush' 
                                              ? 'bg-destructive/10 text-destructive' 
                                              : 'bg-purple-500/10 text-purple-600'
                                          }`}>
                                            {item.urgency}
                                          </span>
                                        )}
                                      </div>
                                      {item.materialType && (
                                        <p className="text-xs text-muted-foreground">{item.materialType}</p>
                                      )}
                                      {item.itemNote && (
                                        <p className="text-xs text-primary mt-1 italic">Buyer note: "{item.itemNote}"</p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap font-medium">{item.quantity}</TableCell>
                                  <TableCell className="whitespace-nowrap font-medium">
                                    ${item.proposedUnitPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <Textarea
                                      className="min-h-[60px] text-xs border-purple-500/20 focus:border-purple-500/40 bg-background"
                                      placeholder="Add a note about this line (e.g., suggest a different price, quantity, or alternative material)..."
                                      value={counterNotes[item.id] ?? ""}
                                      onChange={(e) =>
                                        setCounterNotes((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600" />
                            Overall Counter Summary
                          </label>
                          <Textarea
                            value={counterSummary}
                            onChange={(e) => setCounterSummary(e.target.value)}
                            placeholder="Summarize your counter-offer: key price changes, lead times, alternative suggestions, or conditions..."
                            rows={3}
                            className="bg-background border-purple-500/20 focus:border-purple-500/40"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-purple-500/10">
                          <p className="text-xs text-muted-foreground max-w-md">
                            When you send this counter, all line comments and the summary will be bundled and stored 
                            as your seller response for this bid.
                          </p>
                          <Button
                            variant="outline"
                            className="border-purple-500 text-purple-600 hover:bg-purple-500/10 hover:border-purple-500 shadow-sm hover:shadow-md transition-all"
                            disabled={responding}
                            onClick={() => {
                              if (!selectedBid) return;

                              const linesWithNotes = selectedBid.lineItems
                                .filter((item) => counterNotes[item.id]?.trim())
                                .map((item) => {
                                  const note = counterNotes[item.id].trim();
                                  return `- ${item.materialName || `Material #${item.materialId}`} (qty ${item.quantity}, $${item.proposedUnitPrice.toFixed(2)}): ${note}`;
                                })
                                .join("\n");

                              const composed = [
                                counterSummary.trim() && `Summary:\n${counterSummary.trim()}`,
                                linesWithNotes && `\nLine item notes:\n${linesWithNotes}`,
                              ]
                                .filter(Boolean)
                                .join("\n\n");

                              void handleRespond('counter', composed || "Counter-offer with line-by-line comments (no additional text provided).");
                            }}
                            size="lg"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Send Counter Offer
                          </Button>
                        </div>
                          </>
                        )}
                      </>
                    ) : selectedBid.status === 'countered' ? (
                      <div className="py-10 text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-700 border border-purple-500/30 text-sm font-medium">
                          <Check className="w-4 h-4" />
                          Bid successfully countered
                        </div>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Your counter offer has been sent to the buyer. You can still review the details in the other tabs.
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-8 text-center">
                        Countering is only available while the bid is in <span className="font-medium text-foreground">Response Needed</span> status.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerBids;

