import { useState, useEffect } from "react";
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
import { Link } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Sparkles, ShoppingCart, FileText, Eye, Edit2, X, Clock,
  CheckCircle2, XCircle, MessageSquare, AlertCircle, Truck,
  CreditCard, MapPin, RefreshCw, Send
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  fetchBids, fetchBid, cancelBid, updateBidDetails, updateBid, submitBid,
  type Bid, type BidWithLineItems, type BidItemPayload
} from "@/lib/api";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  submitted: { label: 'Submitted', color: 'bg-blue-500/10 text-blue-600', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-500/10 text-green-600', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  countered: { label: 'Countered', color: 'bg-purple-500/10 text-purple-600', icon: MessageSquare },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: X },
};

const BuyerBidsHistory = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<BidWithLineItems | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bidToCancel, setBidToCancel] = useState<Bid | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit form state
  const [editForm, setEditForm] = useState({
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    deliveryPreference: '',
    deliveryDate: '',
    paymentTerms: '',
    shippingAddress: '',
    bidJustification: '',
    specialRequirements: '',
  });
  
  // Line items editing state (for countered bids)
  const [editLineItems, setEditLineItems] = useState<Array<{
    id: number;
    materialId: number;
    materialName: string;
    quantity: number;
    proposedUnitPrice: number;
    itemNote: string;
    urgency: 'standard' | 'expedited' | 'rush';
  }>>([]);

  useEffect(() => {
    loadBids();
  }, []);

  const loadBids = async () => {
    try {
      const data = await fetchBids();
      setBids(data);
    } catch (error) {
      console.error("Failed to load bids:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBid = async (bid: Bid) => {
    try {
      const fullBid = await fetchBid(bid.id);
      setSelectedBid(fullBid);
      setViewDialogOpen(true);
    } catch (error) {
      console.error("Failed to load bid details:", error);
    }
  };

  const handleEditBid = async (bid: Bid) => {
    try {
      const fullBid = await fetchBid(bid.id);
      setSelectedBid(fullBid);
      setEditForm({
        buyerName: fullBid.buyerName || '',
        buyerEmail: fullBid.buyerEmail || '',
        buyerPhone: fullBid.buyerPhone || '',
        deliveryPreference: fullBid.deliveryPreference || 'standard',
        deliveryDate: fullBid.deliveryDate || '',
        paymentTerms: fullBid.paymentTerms || 'net30',
        shippingAddress: fullBid.shippingAddress || '',
        bidJustification: fullBid.bidJustification || '',
        specialRequirements: fullBid.specialRequirements || '',
      });
      // Initialize line items for editing (if countered, allow editing line items)
      if (fullBid.status === 'countered' && fullBid.lineItems) {
        setEditLineItems(fullBid.lineItems.map(item => ({
          id: item.id,
          materialId: item.materialId,
          materialName: item.materialName || `Material #${item.materialId}`,
          quantity: item.quantity,
          proposedUnitPrice: item.proposedUnitPrice,
          itemNote: item.itemNote || '',
          urgency: item.urgency || 'standard',
        })));
      }
      setEditDialogOpen(true);
    } catch (error) {
      console.error("Failed to load bid for editing:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedBid) return;
    
    setActionLoading(true);
    try {
      // If countered and line items were edited, update line items first
      if (selectedBid.status === 'countered' && editLineItems.length > 0) {
        const lineItemsPayload: BidItemPayload[] = editLineItems.map(item => ({
          materialId: item.materialId,
          quantity: item.quantity,
          proposedUnitPrice: item.proposedUnitPrice,
          itemNote: item.itemNote,
          urgency: item.urgency,
        }));
        await updateBid(selectedBid.id, lineItemsPayload);
      }
      
      // Update bid details
      await updateBidDetails(selectedBid.id, editForm);
      await loadBids();
      setEditDialogOpen(false);
      setSelectedBid(null);
      setEditLineItems([]);
    } catch (error) {
      console.error("Failed to update bid:", error);
      alert("Failed to update bid. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleResubmitBid = async () => {
    if (!selectedBid) return;
    
    setActionLoading(true);
    try {
      // Update line items if edited
      if (editLineItems.length > 0) {
        const lineItemsPayload: BidItemPayload[] = editLineItems.map(item => ({
          materialId: item.materialId,
          quantity: item.quantity,
          proposedUnitPrice: item.proposedUnitPrice,
          itemNote: item.itemNote,
          urgency: item.urgency,
        }));
        await updateBid(selectedBid.id, lineItemsPayload);
      }
      
      // Update details
      await updateBidDetails(selectedBid.id, editForm);
      
      // Resubmit
      await submitBid(selectedBid.id);
      await loadBids();
      setEditDialogOpen(false);
      setSelectedBid(null);
      setEditLineItems([]);
    } catch (error) {
      console.error("Failed to resubmit bid:", error);
      alert("Failed to resubmit bid. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBid = async () => {
    if (!bidToCancel) return;
    
    setActionLoading(true);
    try {
      await cancelBid(bidToCancel.id);
      await loadBids();
      setCancelDialogOpen(false);
      setBidToCancel(null);
    } catch (error) {
      console.error("Failed to cancel bid:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBids = bids.filter(bid => {
    if (statusFilter === "all") return true;
    return bid.status === statusFilter;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <Button variant="ghost" className="text-primary font-medium">
                <FileText className="w-4 h-4 mr-2" />
                My Bids
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            My Bids
          </h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your submitted bid packages
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Bids', value: bids.length, color: 'text-foreground' },
            { label: 'Submitted', value: bids.filter(b => b.status === 'submitted').length, color: 'text-blue-600' },
            { label: 'Accepted', value: bids.filter(b => b.status === 'accepted').length, color: 'text-green-600' },
            { label: 'Countered', value: bids.filter(b => b.status === 'countered').length, color: 'text-purple-600' },
            { label: 'Rejected', value: bids.filter(b => b.status === 'rejected').length, color: 'text-destructive' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border">
              <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="countered">Countered</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadBids} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Bids Table */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
              <p>Loading bids...</p>
            </div>
          ) : filteredBids.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No bids found</p>
              <p className="text-sm mt-1">
                {statusFilter === "all" 
                  ? "You haven't submitted any bids yet" 
                  : `No bids with status "${statusFilter}"`}
              </p>
              <Link to="/buyer/bids">
                <Button className="mt-4">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create New Bid
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bid #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBids.map((bid) => {
                  const status = statusConfig[bid.status] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  const canEdit = bid.status === 'submitted' || bid.status === 'countered';
                  const canCancel = bid.status === 'submitted' || bid.status === 'countered';
                  
                  return (
                    <TableRow key={bid.id}>
                      <TableCell className="font-medium">#{bid.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bid.companyName}</p>
                          <p className="text-xs text-muted-foreground">{bid.buyerName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-display font-semibold text-primary">
                          ${bid.totalAmount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(bid.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewBid(bid)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {canEdit && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditBid(bid)}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                          {canCancel && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setBidToCancel(bid);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>

      {/* View Bid Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Bid #{selectedBid?.id}
            </DialogTitle>
            <DialogDescription>
              Submitted to {selectedBid?.companyName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBid && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig[selectedBid.status]?.color}`}>
                  {statusConfig[selectedBid.status]?.label}
                </span>
              </div>

              {/* Seller Counter Response - Prominently displayed */}
              {selectedBid.status === 'countered' && selectedBid.sellerResponse && (
                <div className="p-5 rounded-lg bg-purple-500/10 border-2 border-purple-500/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <p className="text-base font-semibold text-foreground">Seller Counter Offer</p>
                  </div>
                  <div className="bg-background p-4 rounded-md border border-purple-500/20">
                    <p className="text-sm whitespace-pre-wrap">{selectedBid.sellerResponse}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    You can edit your proposal and resubmit to respond to this counter.
                  </p>
                </div>
              )}
              
              {/* Seller Response (for other statuses) */}
              {selectedBid.status !== 'countered' && selectedBid.sellerResponse && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Seller Response
                  </p>
                  <p className="text-sm">{selectedBid.sellerResponse}</p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <h3 className="font-semibold mb-3">Materials</h3>
                <div className="space-y-2">
                  {selectedBid.lineItems?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div>
                        <p className="font-medium">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × ${item.proposedUnitPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-semibold text-primary">
                        ${(item.quantity * item.proposedUnitPrice).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-display font-bold text-primary">
                      ${selectedBid.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Delivery</p>
                  <p className="font-medium capitalize">{selectedBid.deliveryPreference || 'Standard'}</p>
                  {selectedBid.deliveryDate && (
                    <p className="text-sm text-muted-foreground">By {selectedBid.deliveryDate}</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Payment</p>
                  <p className="font-medium capitalize">{selectedBid.paymentTerms?.replace('net', 'Net ') || 'Net 30'}</p>
                </div>
              </div>

              {selectedBid.shippingAddress && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Shipping Address</p>
                  <p className="font-medium">{selectedBid.shippingAddress}</p>
                </div>
              )}

              {selectedBid.bidJustification && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Your Notes</p>
                  <p className="text-sm">{selectedBid.bidJustification}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Bid Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Edit Bid #{selectedBid?.id}
            </DialogTitle>
            <DialogDescription>
              {selectedBid?.status === 'countered' 
                ? "Update your proposal based on the seller's counter offer. You can modify line items, pricing, and other details."
                : "Update your bid details. Note: You cannot edit line items after submission."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Show seller counter prominently if countered - Always visible */}
          {selectedBid?.status === 'countered' && selectedBid.sellerResponse && (
            <div className="p-5 rounded-lg bg-purple-500/10 border-2 border-purple-500/30 mt-4 mb-4 sticky top-0 z-10">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <p className="text-base font-semibold text-foreground">Seller Counter Offer</p>
              </div>
              <div className="bg-background p-4 rounded-md border border-purple-500/20 max-h-48 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedBid.sellerResponse}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Review their feedback below and adjust your proposal accordingly.
              </p>
            </div>
          )}
          
          <Tabs defaultValue={selectedBid?.status === 'countered' ? "items" : "info"} className="mt-4">
            <TabsList className="w-full">
              {selectedBid?.status === 'countered' && (
                <TabsTrigger value="items" className="flex-1">
                  <Package className="w-4 h-4 mr-2" />
                  Line Items
                </TabsTrigger>
              )}
              <TabsTrigger value="info" className="flex-1">
                <User className="w-4 h-4 mr-2" />
                Your Info
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex-1">
                <Truck className="w-4 h-4 mr-2" />
                Delivery
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">
                <MessageSquare className="w-4 h-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            {selectedBid?.status === 'countered' && (
              <TabsContent value="items" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Adjust quantities, prices, or notes for each line item based on the seller's counter offer.
                  </p>
                  {editLineItems.map((item, index) => (
                    <div key={item.id} className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.materialName}</p>
                          {item.itemNote && (
                            <p className="text-xs text-muted-foreground mt-1">Note: {item.itemNote}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...editLineItems];
                              newItems[index].quantity = parseInt(e.target.value) || 1;
                              setEditLineItems(newItems);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Unit Price</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.proposedUnitPrice}
                            onChange={(e) => {
                              const newItems = [...editLineItems];
                              newItems[index].proposedUnitPrice = parseFloat(e.target.value) || 0;
                              setEditLineItems(newItems);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-muted-foreground">Total</label>
                          <div className="h-10 flex items-center px-3 rounded-md border border-border bg-background">
                            <span className="font-semibold text-primary">
                              ${(item.quantity * item.proposedUnitPrice).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Item Note</label>
                        <Textarea
                          value={item.itemNote}
                          onChange={(e) => {
                            const newItems = [...editLineItems];
                            newItems[index].itemNote = e.target.value;
                            setEditLineItems(newItems);
                          }}
                          placeholder="Add a note about this line item..."
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-xl font-display font-bold text-primary">
                      ${editLineItems.reduce((sum, item) => sum + (item.quantity * item.proposedUnitPrice), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </TabsContent>
            )}
            
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company / Buyer Name</label>
                <Input
                  value={editForm.buyerName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, buyerName: e.target.value }))}
                  placeholder="Your company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={editForm.buyerEmail}
                    onChange={(e) => setEditForm(prev => ({ ...prev, buyerEmail: e.target.value }))}
                    placeholder="email@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    value={editForm.buyerPhone}
                    onChange={(e) => setEditForm(prev => ({ ...prev, buyerPhone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="delivery" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    Delivery Type
                  </label>
                  <Select 
                    value={editForm.deliveryPreference} 
                    onValueChange={(v) => setEditForm(prev => ({ ...prev, deliveryPreference: v }))}
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
                  <label className="text-sm font-medium">Delivery Date</label>
                  <Input
                    type="date"
                    value={editForm.deliveryDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  Payment Terms
                </label>
                <Select 
                  value={editForm.paymentTerms} 
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, paymentTerms: v }))}
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Shipping Address
                </label>
                <Textarea
                  value={editForm.shippingAddress}
                  onChange={(e) => setEditForm(prev => ({ ...prev, shippingAddress: e.target.value }))}
                  placeholder="Full shipping address..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bid Justification</label>
                <Textarea
                  value={editForm.bidJustification}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bidJustification: e.target.value }))}
                  placeholder="Explain your pricing rationale..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Special Requirements</label>
                <Textarea
                  value={editForm.specialRequirements}
                  onChange={(e) => setEditForm(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  placeholder="Any special requirements..."
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => {
              setEditDialogOpen(false);
              setEditLineItems([]);
            }}>
              Cancel
            </Button>
            {selectedBid?.status === 'countered' ? (
              <>
                <Button variant="outline" onClick={handleSaveEdit} disabled={actionLoading}>
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
                <Button onClick={handleResubmitBid} disabled={actionLoading}>
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Resubmit Bid
                </Button>
              </>
            ) : (
              <Button onClick={handleSaveEdit} disabled={actionLoading}>
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Cancel Bid
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel Bid #{bidToCancel?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 rounded-lg bg-muted/50 mt-4">
            <p className="font-medium">{bidToCancel?.companyName}</p>
            <p className="text-sm text-muted-foreground">
              Total: ${bidToCancel?.totalAmount.toFixed(2)}
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Bid
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelBid}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Yes, Cancel Bid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerBidsHistory;
