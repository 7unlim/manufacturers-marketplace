import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { 
  Package, Building2, ChevronDown, LogOut, Settings, User, 
  Factory, Inbox, Plus, Search, Edit, Trash2, Upload, FileSpreadsheet,
  Camera, CheckCircle, AlertCircle, Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchCompanies, fetchMaterials, type Company, type Material } from "@/lib/api";

const SELLER_COMPANY_ID = 1;

type ParsedMaterial = {
  name: string;
  type: string;
  stock: number;
  unitPrice: number;
  leadTime: number;
  description: string;
};

type ImportResult = {
  status: 'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error';
  parsedData: ParsedMaterial[];
  message: string;
};

const SellerMaterials = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>({
    status: 'idle',
    parsedData: [],
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companiesData, materialsData] = await Promise.all([
          fetchCompanies(),
          fetchMaterials({ companyId: SELLER_COMPANY_ID })
        ]);
        
        const myCompany = companiesData.find(c => c.id === SELLER_COMPANY_ID);
        setCompany(myCompany || null);
        setMaterials(materialsData.filter(m => m.companyId === SELLER_COMPANY_ID));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simulate parsing an Excel file (CSV format for simplicity)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult({ status: 'parsing', parsedData: [], message: 'Parsing spreadsheet...' });

    // Simulate parsing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Parse CSV content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      setImportResult({ 
        status: 'error', 
        parsedData: [], 
        message: 'File appears empty or invalid. Expected columns: Name, Type, Stock, Unit Price, Lead Time, Description' 
      });
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const parsedData: ParsedMaterial[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 4) {
        parsedData.push({
          name: values[headers.indexOf('name')] || values[0] || 'Unknown Material',
          type: values[headers.indexOf('type')] || values[1] || 'Other',
          stock: parseInt(values[headers.indexOf('stock')] || values[2]) || 0,
          unitPrice: parseFloat(values[headers.indexOf('unit price')] || values[headers.indexOf('price')] || values[3]) || 0,
          leadTime: parseInt(values[headers.indexOf('lead time')] || values[4]) || 7,
          description: values[headers.indexOf('description')] || values[5] || ''
        });
      }
    }

    if (parsedData.length === 0) {
      setImportResult({ 
        status: 'error', 
        parsedData: [], 
        message: 'Could not parse any valid materials from the file.' 
      });
      return;
    }

    setImportResult({ 
      status: 'preview', 
      parsedData, 
      message: `Found ${parsedData.length} materials ready to import` 
    });
  };

  // Simulate OCR parsing from an image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportResult({ status: 'parsing', parsedData: [], message: 'Analyzing image with OCR...' });

    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Simulated OCR result - in real implementation this would call an OCR API
    const mockOcrData: ParsedMaterial[] = [
      { name: 'Aluminum Sheet 6061', type: 'Metal', stock: 500, unitPrice: 45.00, leadTime: 5, description: 'Aircraft grade aluminum' },
      { name: 'Stainless Steel Rod', type: 'Metal', stock: 200, unitPrice: 32.50, leadTime: 7, description: '304 grade, 1" diameter' },
      { name: 'Copper Wire', type: 'Metal', stock: 1000, unitPrice: 18.75, leadTime: 3, description: 'Pure copper, 12 gauge' },
    ];

    setImportResult({ 
      status: 'preview', 
      parsedData: mockOcrData, 
      message: `OCR detected ${mockOcrData.length} materials from image` 
    });
  };

  const confirmImport = async () => {
    setImportResult(prev => ({ ...prev, status: 'importing', message: 'Importing materials...' }));
    
    // Simulate import delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Add to local materials (in real implementation, would call backend API)
    const newMaterials: Material[] = importResult.parsedData.map((item, idx) => ({
      id: materials.length + idx + 100,
      companyId: SELLER_COMPANY_ID,
      name: item.name,
      type: item.type,
      description: item.description,
      stock: item.stock,
      baseUnitPrice: item.unitPrice,
      costPerUnit: item.unitPrice * 0.7,
      companyName: company?.name || '',
      leadTimeDays: item.leadTime
    }));

    setMaterials(prev => [...prev, ...newMaterials]);
    setImportResult({ 
      status: 'success', 
      parsedData: [], 
      message: `Successfully imported ${newMaterials.length} materials!` 
    });

    // Reset after delay
    setTimeout(() => {
      setImportResult({ status: 'idle', parsedData: [], message: '' });
      setImportOpen(false);
    }, 2000);
  };

  const resetImport = () => {
    setImportResult({ status: 'idle', parsedData: [], message: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
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
              <Button variant="ghost" className="text-primary font-medium">
                <Package className="w-4 h-4 mr-2" />
                Materials
              </Button>
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Material Inventory
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your listed materials and pricing
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) resetImport(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import Materials</DialogTitle>
                  <DialogDescription>
                    Upload a spreadsheet or image to bulk import materials
                  </DialogDescription>
                </DialogHeader>
                
                {importResult.status === 'idle' && (
                  <Tabs defaultValue="spreadsheet" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="spreadsheet">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Spreadsheet
                      </TabsTrigger>
                      <TabsTrigger value="image">
                        <Camera className="w-4 h-4 mr-2" />
                        Image/OCR
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="spreadsheet" className="space-y-4">
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload CSV or Excel file with columns:<br />
                          <code className="text-xs bg-muted px-2 py-1 rounded">Name, Type, Stock, Unit Price, Lead Time, Description</code>
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleExcelUpload}
                          className="hidden"
                        />
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-4 h-4 mr-2" />
                          Choose File
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="image" className="space-y-4">
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent transition-colors">
                        <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload an image of your inventory list,<br />
                          invoice, or product catalog to auto-extract materials
                        </p>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button variant="outline" onClick={() => imageInputRef.current?.click()}>
                          <Camera className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {importResult.status === 'parsing' && (
                  <div className="py-12 text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
                    <p className="text-muted-foreground">{importResult.message}</p>
                  </div>
                )}

                {importResult.status === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <p className="font-medium">{importResult.message}</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Stock</TableHead>
                            <TableHead className="text-xs">Price</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.parsedData.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm font-medium">{item.name}</TableCell>
                              <TableCell className="text-sm">{item.type}</TableCell>
                              <TableCell className="text-sm">{item.stock}</TableCell>
                              <TableCell className="text-sm">${item.unitPrice.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={resetImport}>
                        Cancel
                      </Button>
                      <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={confirmImport}>
                        Import {importResult.parsedData.length} Materials
                      </Button>
                    </div>
                  </div>
                )}

                {importResult.status === 'importing' && (
                  <div className="py-12 text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent animate-spin" />
                    <p className="text-muted-foreground">{importResult.message}</p>
                  </div>
                )}

                {importResult.status === 'success' && (
                  <div className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                    <p className="font-medium text-green-600">{importResult.message}</p>
                  </div>
                )}

                {importResult.status === 'error' && (
                  <div className="py-8 text-center space-y-4">
                    <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
                    <p className="text-destructive">{importResult.message}</p>
                    <Button variant="outline" onClick={resetImport}>
                      Try Again
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Material
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Material</DialogTitle>
                <DialogDescription>
                  Add a new material to your inventory listing
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Material Name</label>
                  <Input placeholder="e.g., Carbon Steel Sheet" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <Input placeholder="e.g., Metal" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stock</label>
                    <Input type="number" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit Price ($)</label>
                    <Input type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lead Time (days)</label>
                    <Input type="number" placeholder="7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input placeholder="Brief description..." />
                </div>
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  Add Material
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card"
            />
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
                  <TableHead className="font-display font-semibold text-foreground">Material</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Type</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Stock</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Unit Price</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Cost</TableHead>
                  <TableHead className="font-display font-semibold text-foreground">Lead Time</TableHead>
                  <TableHead className="font-display font-semibold text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material, index) => (
                    <TableRow 
                      key={material.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{material.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {material.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-accent/10 text-accent text-xs font-medium">
                          {material.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{material.stock.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        ${material.baseUnitPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        ${material.costPerUnit?.toFixed(2) || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{material.leadTimeDays} days</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => setEditingMaterial(material)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No materials found
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

      {/* Edit Material Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
            <DialogDescription>
              Update material details and pricing
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Material Name</label>
                <Input defaultValue={editingMaterial.name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Input defaultValue={editingMaterial.type} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stock</label>
                  <Input type="number" defaultValue={editingMaterial.stock} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit Price ($)</label>
                  <Input type="number" step="0.01" defaultValue={editingMaterial.baseUnitPrice} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lead Time (days)</label>
                  <Input type="number" defaultValue={editingMaterial.leadTimeDays} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input defaultValue={editingMaterial.description} />
              </div>
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerMaterials;

