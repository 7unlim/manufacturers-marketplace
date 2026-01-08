const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed');
  }
  return response.json();
};

export type Company = {
  id: number;
  name: string;
  phone: string;
  email: string;
  location: string;
  description: string;
  certifications?: string; // JSON string of certifications array
};

export type Material = {
  id: number;
  companyId: number;
  code: string;
  name: string;
  type: string;
  description: string;
  stock: number;
  baseUnitPrice: number;
  costPerUnit: number;
  companyName: string;
  leadTimeDays: number;
};

export type MaterialFilterOptions = {
  search?: string;
  type?: string;
  companyId?: number | '';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type BidItemPayload = {
  materialId: number;
  quantity: number;
  proposedUnitPrice: number;
};

export type AiRecommendation = {
  materialId: number;
  materialName: string;
  materialType: string;
  quantity: number;
  recommendedUnitPrice: number;
  currentBasePrice: number;
  recommendationDetail: string;
};

export type AiAssistanceResponse = {
  companyId: number;
  buyerFocus: string;
  recommendations: AiRecommendation[];
  totalAmount: number;
  summary: string;
};

export type BidTerms = {
  buyerEmail?: string;
  buyerPhone?: string;
  deliveryPreference?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  shippingAddress?: string;
  bidJustification?: string;
  specialRequirements?: string;
};

export type Bid = {
  id: number;
  companyId: number;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'countered';
  totalAmount: number;
  deliveryPreference?: string;
  deliveryDate?: string;
  paymentTerms?: string;
  shippingAddress?: string;
  bidJustification?: string;
  specialRequirements?: string;
  sellerResponse?: string;
  createdAt: string;
  companyName?: string;
};

export type BidLineItem = {
  id: number;
  bidId: number;
  materialId: number;
  quantity: number;
  proposedUnitPrice: number;
  itemNote?: string;
  urgency?: 'standard' | 'expedited' | 'rush';
  materialName?: string;
  materialType?: string;
};

export type BidWithLineItems = Bid & {
  lineItems: BidLineItem[];
};

export const fetchCompanies = (): Promise<Company[]> => {
  return fetch(`${baseUrl}/api/companies`).then(handleResponse);
};

export const fetchCompany = (id: number): Promise<Company> => {
  return fetch(`${baseUrl}/api/companies/${id}`).then(handleResponse);
};

export const fetchMaterials = (filters: MaterialFilterOptions = {}): Promise<Material[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });
  const query = params.toString();
  const url = query ? `${baseUrl}/api/materials?${query}` : `${baseUrl}/api/materials`;
  return fetch(url).then(handleResponse);
};

export const requestAiBid = (payload: {
  companyId: number;
  lineItems: BidItemPayload[];
  targetMargin?: number;
  buyerFocus?: string;
}): Promise<AiAssistanceResponse> => {
  return fetch(`${baseUrl}/api/ai/bid-assist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(handleResponse);
};

export type LineItemWithNote = BidItemPayload & {
  itemNote?: string;
  urgency?: 'standard' | 'expedited' | 'rush';
};

export const createBid = (payload: {
  companyId: number;
  buyerName: string;
  lineItems: LineItemWithNote[];
  terms?: BidTerms;
}): Promise<{ bidId: number; totalAmount: number }> => {
  return fetch(`${baseUrl}/api/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(handleResponse);
};

export const respondToBid = (
  id: number,
  action: 'accept' | 'reject' | 'counter',
  sellerResponse?: string
): Promise<{ bidId: number; status: string; sellerResponse?: string }> => {
  return fetch(`${baseUrl}/api/bids/${id}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, sellerResponse })
  }).then(handleResponse);
};

export const updateSellerNotes = (
  id: number,
  sellerResponse: string
): Promise<{ bidId: number; sellerResponse: string }> => {
  return fetch(`${baseUrl}/api/bids/${id}/seller-notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sellerResponse })
  }).then(handleResponse);
};

export const fetchBids = (): Promise<Bid[]> => {
  return fetch(`${baseUrl}/api/bids`).then(handleResponse);
};

export const fetchBid = (id: number): Promise<BidWithLineItems> => {
  return fetch(`${baseUrl}/api/bids/${id}`).then(handleResponse);
};

export const updateBid = (
  id: number,
  lineItems: BidItemPayload[]
): Promise<{ bidId: number; totalAmount: number }> => {
  return fetch(`${baseUrl}/api/bids/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lineItems })
  }).then(handleResponse);
};

export const submitBid = (id: number): Promise<{ bidId: number; status: string }> => {
  return fetch(`${baseUrl}/api/bids/${id}/submit`, {
    method: 'POST'
  }).then(handleResponse);
};

