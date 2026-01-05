const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'API request failed');
  }
  return response.json();
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

export const fetchCompanies = () => {
  return fetch(`${baseUrl}/api/companies`).then(handleResponse);
};

export const fetchMaterials = (filters: MaterialFilterOptions) => {
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
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(handleResponse);
};

export const createBid = (payload: {
  companyId: number;
  buyerName: string;
  lineItems: BidItemPayload[];
}) => {
  return fetch(`${baseUrl}/api/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }).then(handleResponse);
};

