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

const SELLER_COMPANY_ID = 1;

const SellerBids = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBid, setSelectedBid] = useState<BidWithLineItems | null>(null);
  const [loadingBid, setLoadingBid] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesData, bidsData] = await Promise.all([
          fetchCompanies(),
          fetchBids()
        ]);
        
        const myCompany = companiesData.find(c => c.id === SELLER_COMPANY_ID);
        setCompany(myCompany || null);
        setBids(bidsData.filter(b => b.companyId === SELLER_COMPANY_ID));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredBids = bids.filter(b => 
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
      countered: "bg-amber-500/10 text-amber-600",
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

  const handleRespond = async (action: 'accept' | 'reject' | 'counter') => {
    if (!selectedBid) return;
    
    setResponding(true);
    try {
      const result = await respondToBid(selectedBid.id, action, responseNote);
      
      // Update local state
      setBids(prev => prev.map(b => 
        b.id === selectedBid.id 
          ? { ...b, status: result.status as Bid['status'], sellerResponse: result.sellerResponse }
          : b
      ));
      setSelectedBid(prev => prev ? { ...prev, status: result.status as Bid['status'], sellerResponse: result.sellerResponse } : null);
      setResponseNote("");
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
              <span className="font-display font-bold text-xl text-foreground">BlueView</span>
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
                Bid Inbox
              </Button>
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Bid Inbox
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and respond to incoming bid requests
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bids</SelectItem>
              <SelectItem value="submitted">Response Needed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bids Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading bids...
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Inbox className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No bids found</p>
              <p className="text-sm">Bid requests from buyers will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-display font-semibold text-foreground">Bid #</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Buyer</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Total Amount</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Date</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Status</TableHead>
                  <TableHead className="font-display font-semibold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBids.map((bid, index) => (
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
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => viewBidDetails(bid.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {bid.status === 'submitted' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700">
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                              <X className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Results info */}
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredBids.length} of {bids.length} bids
        </div>
      </main>

      {/* Bid Details Dialog */}
      <Dialog open={!!selectedBid} onOpenChange={(open) => { if (!open) { setSelectedBid(null); setResponseNote(""); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>Bid #{selectedBid?.id}</span>
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
            <div className="py-8 text-center text-muted-foreground">Loading bid details...</div>
          ) : selectedBid && (
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <Tabs defaultValue="items" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="items">
                    <Package className="w-4 h-4 mr-2" />
                    Items
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <FileText className="w-4 h-4 mr-2" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="respond">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Respond
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
                  {selectedBid.status === 'submitted' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Your Response (optional)</label>
                        <Textarea
                          value={responseNote}
                          onChange={(e) => setResponseNote(e.target.value)}
                          placeholder="Add notes to accompany your response, such as counter-offer details, questions, or terms..."
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleRespond('accept')}
                          disabled={responding}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          className="border-amber-500 text-amber-600 hover:bg-amber-500/10"
                          onClick={() => handleRespond('counter')}
                          disabled={responding}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Counter
                        </Button>
                        <Button 
                          variant="outline" 
                          className="text-destructive hover:text-destructive border-destructive/50"
                          onClick={() => handleRespond('reject')}
                          disabled={responding}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>

                      <div className="p-3 rounded-lg bg-muted/50 flex items-start gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                          <strong>Counter:</strong> Use this to negotiate terms. Add your counter-proposal in the notes above.
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
                        <div className="mt-4 p-4 rounded-lg bg-muted/50 text-left">
                          <p className="text-sm text-muted-foreground mb-1">Your response:</p>
                          <p className="text-sm">{selectedBid.sellerResponse}</p>
                        </div>
                      )}
                    </div>
                  )}
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

