const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const handleResponse = async (response: Response) => {
  console.log('[API] handleResponse called, status:', response.status, 'ok:', response.ok);
  if (!response.ok) {
    const text = await response.text();
    console.error('[API] handleResponse error - response not ok:', text);
    throw new Error(text || 'API request failed');
  }
  const data = await response.json();
  console.log('[API] handleResponse parsed JSON:', {
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : 'not an array',
    type: typeof data,
    constructor: data?.constructor?.name,
    keys: data && typeof data === 'object' ? Object.keys(data) : 'N/A'
  });
  
  // For buyer-leads endpoint, ensure we return an array
  if (response.url.includes('buyer-leads') && !Array.isArray(data)) {
    console.warn('[API] handleResponse WARNING: buyer-leads response is not an array, converting:', data);
    // If it's an object with a data property, use that
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    // Otherwise return empty array
    return [];
  }
  
  return data;
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

export const updateCompany = (
  id: number,
  data: Partial<Company>
): Promise<Company> => {
  return fetch(`${baseUrl}/api/companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse);
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

export type CreateMaterialPayload = {
  companyId: number;
  code?: string;
  name: string;
  type: string;
  description?: string;
  stock: number;
  baseUnitPrice: number;
  costPerUnit?: number;
  leadTimeDays: number;
};

export type CreateMaterialResponse = Material & {
  autoMappedCode?: boolean;
  mappedToCode?: string | null;
};

export const createMaterial = (payload: CreateMaterialPayload): Promise<CreateMaterialResponse> => {
  return fetch(`${baseUrl}/api/materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
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

export const cancelBid = (id: number): Promise<{ bidId: number; status: string }> => {
  return fetch(`${baseUrl}/api/bids/${id}/cancel`, {
    method: 'POST'
  }).then(handleResponse);
};

export const updateBidDetails = (
  id: number,
  details: BidTerms & { buyerName?: string }
): Promise<{ bidId: number; message: string }> => {
  return fetch(`${baseUrl}/api/bids/${id}/details`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details)
  }).then(handleResponse);
};

export type RevenueDataPoint = {
  label: string;
  revenue: number;
  count: number;
};
export type RevenueResponse = {
  period: string;
  data: RevenueDataPoint[];
  totalRevenue: number;
  totalBids: number;
  revenueChange: number;
  previousWindowRevenue?: number; // For edge case handling (R_prev === 0)
};

export const fetchRevenueData = (period: string = '1Y', companyId?: number): Promise<RevenueResponse> => {
  const params = new URLSearchParams({ period });
  if (companyId) {
    params.set('companyId', String(companyId));
  }
  return fetch(`${baseUrl}/api/stats/revenue?${params.toString()}`).then(handleResponse);
};

export type MaterialMatch = Material & {
  reasoning: string;
};

export type MaterialSearchResponse = {
  query: string;
  matches: MaterialMatch[];
};

export const findMaterialsWithAI = (description: string): Promise<MaterialSearchResponse> => {
  return fetch(`${baseUrl}/api/ai/find-materials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  }).then(handleResponse);
};

export type AuthAccount = {
  email: string;
  name: string;
  role: 'buyer' | 'seller';
  companyId?: number;
  company?: Company;
  onboarding?: OnboardingData | BuyerOnboardingData;
};

export type OnboardingData = {
  projectTypes: string[];
  role: string[];
  specialCategories: string[];
};

export type BuyerOnboardingData = {
  materialTypes: string[];
  buyerProjectTypes: string[];
  projectScale: string[];
  budgetRange?: string;
  urgencyLevel?: string;
};

export type SignUpPayload = {
  email: string;
  password: string;
  name: string;
  role: 'buyer' | 'seller';
  companyId?: number;
  onboarding?: OnboardingData;
};

export type SignInPayload = {
  email: string;
  password: string;
};

export type AuthResponse = {
  message: string;
  account: AuthAccount;
};

export const signUp = (payload: SignUpPayload): Promise<AuthResponse> => {
  return fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

export const signIn = (payload: SignInPayload): Promise<AuthResponse> => {
  return fetch(`${baseUrl}/api/auth/signin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

export type BuyerLead = {
  email: string;
  name: string;
  role: 'buyer';
  onboarding?: BuyerOnboardingData;
};

export const fetchBuyerLeads = (): Promise<BuyerLead[]> => {
  const url = `${baseUrl}/api/auth/buyer-leads`;
  console.log('[API] fetchBuyerLeads called, URL:', url);
  
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => {
      console.log('[API] fetchBuyerLeads response status:', response.status, response.statusText);
      console.log('[API] fetchBuyerLeads response ok:', response.ok);
      return handleResponse(response);
    })
    .then(data => {
      console.log('[API] fetchBuyerLeads parsed data:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'not an array',
        type: typeof data
      });
      return data;
    })
    .catch(error => {
      console.error('[API] fetchBuyerLeads error:', error);
      throw error;
    });
};

export type UpdatePreferencesPayload = {
  email: string;
  onboarding: OnboardingData | BuyerOnboardingData;
};

export const updatePreferences = (payload: UpdatePreferencesPayload): Promise<AuthResponse> => {
  return fetch(`${baseUrl}/api/auth/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

export type Conversation = {
  otherEmail: string;
  otherName: string;
  otherRole: 'buyer' | 'seller';
  lastMessageTime: string;
  lastMessage: string;
  unreadCount: number;
};

export type Message = {
  id: number;
  senderEmail: string;
  senderName: string;
  senderRole: 'buyer' | 'seller';
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'buyer' | 'seller';
  content: string;
  read: boolean;
  createdAt: string;
};

export type SendMessagePayload = {
  senderEmail: string;
  senderName: string;
  senderRole: 'buyer' | 'seller';
  recipientEmail: string;
  recipientName: string;
  recipientRole: 'buyer' | 'seller';
  content: string;
};

export const fetchConversations = (email: string): Promise<Conversation[]> => {
  return fetch(`${baseUrl}/api/messages/conversations/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(handleResponse);
};

export const fetchMessages = (email: string, otherEmail: string): Promise<Message[]> => {
  return fetch(`${baseUrl}/api/messages/messages/${encodeURIComponent(email)}/${encodeURIComponent(otherEmail)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(handleResponse);
};

export const sendMessage = (payload: SendMessagePayload): Promise<Message> => {
  return fetch(`${baseUrl}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).then(handleResponse);
};

export const markMessagesAsRead = (email: string, otherEmail: string): Promise<{ success: boolean }> => {
  return fetch(`${baseUrl}/api/messages/mark-read/${encodeURIComponent(email)}/${encodeURIComponent(otherEmail)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(handleResponse);
};
