export interface Company {
  id: number;
  name: string;
  phone: string;
  email: string;
  location: string;
  description: string;
}

export interface Material {
  id: number;
  companyId: number;
  name: string;
  type: string;
  description: string;
  stock: number;
  baseUnitPrice: number;
  costPerUnit: number;
  leadTimeDays: number;
}

export interface BidLineItem {
  materialId: number;
  quantity: number;
  proposedUnitPrice: number;
}

export interface Bid {
  id: number;
  companyId: number;
  buyerName: string;
  status: 'draft' | 'submitted';
  totalAmount: number;
  createdAt: string;
}

export interface BidPackage {
  bid: Bid;
  lineItems: Array<BidLineItem & { materialName: string; materialType: string }>;
}


