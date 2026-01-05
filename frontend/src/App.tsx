import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { fetchCompanies, fetchMaterials, requestAiBid, createBid } from './api';
import type { MaterialFilterOptions, AiAssistanceResponse } from './api';

type Company = {
  id: number;
  name: string;
  phone: string;
  email: string;
  location: string;
  description: string;
};

type Material = {
  id: number;
  companyId: number;
  name: string;
  type: string;
  description: string;
  stock: number;
  baseUnitPrice: number;
  companyName: string;
  leadTimeDays: number;
};

type BidLineItem = {
  materialId: number;
  materialName: string;
  companyName: string;
  quantity: number;
  proposedUnitPrice: number;
};

function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filters, setFilters] = useState<MaterialFilterOptions>({ sortBy: 'name', sortOrder: 'asc' });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [bidLineItems, setBidLineItems] = useState<BidLineItem[]>([]);
  const [buyerName, setBuyerName] = useState('Enterprise Procurement');
  const [bidCompanyId, setBidCompanyId] = useState<number | ''>('');
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AiAssistanceResponse | null>(null);
  const [aiTargetMargin, setAiTargetMargin] = useState(0.18);
  const [aiFocus, setAiFocus] = useState('Balanced profitability');
  const [bidResult, setBidResult] = useState<{ bidId: number; totalAmount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'all-materials'>('companies');

  // Price estimator state
  const [estimateMaterial, setEstimateMaterial] = useState<Material | null>(null);
  const [estimateQty, setEstimateQty] = useState(100);
  const [estimateDiscount, setEstimateDiscount] = useState<'none' | 'volume5' | 'volume10' | 'volume15'>('none');

  const companyMaterials = useMemo(() => {
    if (!selectedCompany) return [];
    return materials.filter((m) => m.companyId === selectedCompany.id);
  }, [selectedCompany, materials]);

  const materialTypes = useMemo(() => {
    return Array.from(new Set(materials.map((m) => m.type)));
  }, [materials]);

  const bidTotal = useMemo(() => {
    return bidLineItems.reduce((sum, item) => sum + item.quantity * item.proposedUnitPrice, 0);
  }, [bidLineItems]);

  const estimatedPrice = useMemo(() => {
    if (!estimateMaterial) return null;
    const base = estimateMaterial.baseUnitPrice * estimateQty;
    const discountMap = { none: 0, volume5: 0.05, volume10: 0.1, volume15: 0.15 };
    const discount = discountMap[estimateDiscount];
    const discounted = base * (1 - discount);
    return { base, discount, discounted, perUnit: discounted / estimateQty };
  }, [estimateMaterial, estimateQty, estimateDiscount]);

  useEffect(() => {
    fetchCompanies().then(setCompanies).catch(console.error);
  }, []);

  useEffect(() => {
    loadMaterials(filters);
  }, [filters]);

  const loadMaterials = async (opts: MaterialFilterOptions) => {
    setMaterialsLoading(true);
    setError(null);
    try {
      const list = await fetchMaterials(opts);
      setMaterials(list);
    } catch (err) {
      console.error(err);
      setError('Unable to load materials');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof MaterialFilterOptions, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompanyClick = (company: Company) => {
    setSelectedCompany(company);
    setEstimateMaterial(null);
  };

  const handleBackToCompanies = () => {
    setSelectedCompany(null);
    setEstimateMaterial(null);
  };

  const addMaterialToBid = (material: Material) => {
    setBidLineItems((prev) => {
      const existing = prev.find((item) => item.materialId === material.id);
      if (existing) {
        return prev.map((item) =>
          item.materialId === material.id
            ? { ...item, quantity: item.quantity + 10 }
            : item
        );
      }
      return [
        ...prev,
        {
          materialId: material.id,
          materialName: material.name,
          companyName: material.companyName,
          quantity: estimateMaterial?.id === material.id ? estimateQty : 10,
          proposedUnitPrice: estimatedPrice && estimateMaterial?.id === material.id
            ? estimatedPrice.perUnit
            : material.baseUnitPrice
        }
      ];
    });
    if (!bidCompanyId) {
      setBidCompanyId(material.companyId);
    }
  };

  const updateLineItem = (materialId: number, field: 'quantity' | 'proposedUnitPrice', value: number) => {
    setBidLineItems((prev) =>
      prev.map((item) => {
        if (item.materialId !== materialId) return item;
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) return item;
        const sanitizedValue = field === 'quantity'
          ? Math.max(1, Math.round(numericValue))
          : Math.max(0, numericValue);
        return { ...item, [field]: sanitizedValue };
      })
    );
  };

  const handleRemoveItem = (materialId: number) => {
    setBidLineItems((prev) => prev.filter((item) => item.materialId !== materialId));
  };

  const handleAiAssist = async () => {
    if (!bidCompanyId || bidLineItems.length === 0) {
      setError('Select a company and add materials before asking the AI assistant.');
      return;
    }
    setError(null);
    try {
      const response = await requestAiBid({
        companyId: Number(bidCompanyId),
        targetMargin: aiTargetMargin,
        buyerFocus: aiFocus,
        lineItems: bidLineItems.map(({ materialId, quantity }) => ({
          materialId,
          quantity,
          proposedUnitPrice: 0
        }))
      });
      setAiResponse(response);
    } catch (err) {
      console.error(err);
      setError('AI assistant failed to generate recommendations.');
    }
  };

  const applyAiRecommendations = () => {
    if (!aiResponse) return;
    setBidLineItems((prev) =>
      prev.map((item) => {
        const rec = aiResponse.recommendations.find((r) => r.materialId === item.materialId);
        if (!rec) return item;
        return { ...item, proposedUnitPrice: rec.recommendedUnitPrice, quantity: rec.quantity };
      })
    );
  };

  const handleSubmitBid = async () => {
    if (!bidCompanyId || bidLineItems.length === 0) {
      setError('Choose a manufacturer and populate the bid before submitting.');
      return;
    }
    setError(null);
    try {
      const response = await createBid({
        companyId: Number(bidCompanyId),
        buyerName,
        lineItems: bidLineItems.map(({ materialId, quantity, proposedUnitPrice }) => ({
          materialId,
          quantity,
          proposedUnitPrice
        }))
      });
      setBidResult(response);
    } catch (err) {
      console.error(err);
      setError('Bid submission failed');
    }
  };

  return (
    <div className="app-shell">
      <header className="header">
      <div>
          <h1>Manufacturers Marketplace</h1>
          <p>Browse suppliers, explore materials, and build profitable bid packages</p>
      </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => { setActiveTab('companies'); setSelectedCompany(null); }}
        >
          Partner Companies
        </button>
        <button
          className={`tab-btn ${activeTab === 'all-materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('all-materials')}
        >
          All Materials
        </button>
      </div>

      {activeTab === 'companies' && !selectedCompany && (
        <section className="panel">
          <div className="panel-header">
            <h2>Partner Companies</h2>
            <p>Click on a company to view their inventory and get price estimates</p>
          </div>
          <div className="company-grid">
            {companies.map((company) => (
              <article
                key={company.id}
                className="company-card"
                onClick={() => handleCompanyClick(company)}
              >
                <h3>{company.name}</h3>
                <p className="location">{company.location}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'companies' && selectedCompany && (
        <section className="panel">
          <div className="company-detail">
            <div className="company-info">
              <h3>{selectedCompany.name}</h3>
              <p className="desc">{selectedCompany.description}</p>
              <ul className="contact-list">
                <li>
                  <span className="label">Location</span>
                  <span>{selectedCompany.location}</span>
                </li>
                <li>
                  <span className="label">Phone</span>
                  <span>{selectedCompany.phone}</span>
                </li>
                <li>
                  <span className="label">Email</span>
                  <span>{selectedCompany.email}</span>
                </li>
              </ul>
              <button className="back-btn" onClick={handleBackToCompanies}>
                ← Back to companies
              </button>
            </div>

            <div className="materials-section">
              <h4>Available Materials ({companyMaterials.length})</h4>
              {materialsLoading ? (
                <p className="text-muted text-sm">Loading...</p>
              ) : companyMaterials.length === 0 ? (
                <p className="text-muted text-sm">No materials found for this supplier</p>
              ) : (
                <div className="materials-list">
                  {companyMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="material-row"
                      onClick={() => setEstimateMaterial(material)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <div className="name">{material.name}</div>
                        <div className="type">{material.type} · {material.leadTimeDays} day lead</div>
                      </div>
                      <div className="stock">{material.stock} in stock</div>
                      <div className="price">${material.baseUnitPrice.toFixed(2)}/unit</div>
                      <button
                        className="add-btn"
                        onClick={(e) => { e.stopPropagation(); addMaterialToBid(material); }}
                      >
                        Add to bid
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Estimator */}
              <div className="price-estimator">
                <h4>Price Estimator</h4>
                {!estimateMaterial ? (
                  <p className="text-muted text-sm">Click on a material above to configure a price estimate</p>
                ) : (
                  <div className="estimator-form">
                    <div className="form-group">
                      <label>Material</label>
                      <input type="text" value={estimateMaterial.name} readOnly />
                    </div>
                    <div className="form-group">
                      <label>Base Unit Price</label>
                      <input type="text" value={`$${estimateMaterial.baseUnitPrice.toFixed(2)}`} readOnly />
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={estimateQty}
                        onChange={(e) => setEstimateQty(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div className="form-group">
                      <label>Volume Discount</label>
                      <select
                        value={estimateDiscount}
                        onChange={(e) => setEstimateDiscount(e.target.value as typeof estimateDiscount)}
                      >
                        <option value="none">No discount</option>
                        <option value="volume5">5% (100+ units)</option>
                        <option value="volume10">10% (500+ units)</option>
                        <option value="volume15">15% (1000+ units)</option>
                      </select>
                    </div>
                    {estimatedPrice && (
                      <div className="estimate-result">
                        <div>
                          <div className="label">Estimated Total</div>
                          <div className="breakdown">
                            {estimateQty} units × ${estimatedPrice.perUnit.toFixed(2)}/unit
                            {estimateDiscount !== 'none' && ` (${estimateDiscount.replace('volume', '')}% off)`}
                          </div>
                        </div>
                        <div className="amount">${estimatedPrice.discounted.toFixed(2)}</div>
                      </div>
                    )}
                    <button
                      className="add-btn"
                      style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}
                      onClick={() => addMaterialToBid(estimateMaterial)}
                    >
                      Add to bid with these settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'all-materials' && (
        <section className="panel">
          <div className="panel-header">
            <h2>All Materials</h2>
            <p>Search and filter materials across all suppliers</p>
          </div>
          <div className="filters-bar">
            <input
              type="search"
              placeholder="Search by name..."
              value={filters.search ?? ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <select
              value={filters.type ?? ''}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All types</option>
              {materialTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filters.companyId ?? ''}
              onChange={(e) => handleFilterChange('companyId', e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">All suppliers</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filters.sortBy ?? 'name'}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="name">Sort by name</option>
              <option value="type">Sort by type</option>
              <option value="baseUnitPrice">Sort by price</option>
              <option value="stock">Sort by stock</option>
            </select>
            <select
              value={filters.sortOrder ?? 'asc'}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          {materialsLoading ? (
            <p className="text-muted text-sm">Loading materials...</p>
          ) : materials.length === 0 ? (
            <p className="text-muted text-sm">No materials found</p>
          ) : (
            <div className="materials-list">
              {materials.map((material) => (
                <div key={material.id} className="material-row">
                  <div>
                    <div className="name">{material.name}</div>
                    <div className="type">{material.type} · {material.companyName}</div>
                  </div>
                  <div className="stock">{material.stock} in stock</div>
                  <div className="price">${material.baseUnitPrice.toFixed(2)}/unit</div>
                  <button className="add-btn" onClick={() => addMaterialToBid(material)}>
                    Add to bid
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Bid Package Editor */}
      <section className="panel">
        <div className="panel-header">
          <h2>Bid Package</h2>
          <p>Review your selections, adjust prices, and use AI assistance to optimize</p>
        </div>

        <div className="buyer-controls">
          <div className="form-group">
            <label>Buyer Name</label>
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Submit To</label>
            <select
              value={bidCompanyId}
              onChange={(e) => setBidCompanyId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bid-section">
          <div className="bid-table-wrap">
            {bidLineItems.length === 0 ? (
              <div className="empty-bid">
                Add materials from a company or the materials list to start building your bid
              </div>
            ) : (
              <table className="bid-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Supplier</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bidLineItems.map((item) => (
                    <tr key={item.materialId}>
                      <td>{item.materialName}</td>
                      <td className="text-muted">{item.companyName}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.materialId, 'quantity', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.proposedUnitPrice}
                          onChange={(e) => updateLineItem(item.materialId, 'proposedUnitPrice', Number(e.target.value))}
                        />
                      </td>
                      <td>${(item.quantity * item.proposedUnitPrice).toFixed(2)}</td>
                      <td>
                        <button className="remove-btn" onClick={() => handleRemoveItem(item.materialId)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Total</td>
                    <td colSpan={2}>${bidTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="ai-assistant">
            <h4>AI Bid Assistant</h4>
            <div className="ai-form">
              <div className="form-group">
                <label>Target Margin</label>
                <select
                  value={aiTargetMargin}
                  onChange={(e) => setAiTargetMargin(Number(e.target.value))}
                >
                  <option value={0.1}>10% (Competitive)</option>
                  <option value={0.15}>15% (Standard)</option>
                  <option value={0.18}>18% (Balanced)</option>
                  <option value={0.22}>22% (Premium)</option>
                  <option value={0.3}>30% (High Margin)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Negotiation Focus</label>
                <input
                  type="text"
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                  placeholder="e.g., Quick delivery, bulk discount..."
                />
              </div>
              <button
                className="ai-btn"
                onClick={handleAiAssist}
                disabled={bidLineItems.length === 0}
              >
                Generate Balanced Prices
              </button>
            </div>

            {aiResponse && (
              <div className="ai-response">
                <p className="summary">{aiResponse.summary}</p>
                <p className="suggested-total">Suggested: ${aiResponse.totalAmount.toFixed(2)}</p>
                <button className="apply-btn" onClick={applyAiRecommendations}>
                  Apply Recommendations
                </button>
              </div>
            )}

            <div className="bid-actions">
              <button
                className="submit-btn"
                onClick={handleSubmitBid}
                disabled={!bidCompanyId || bidLineItems.length === 0}
              >
                Submit Bid Package
              </button>
              {bidResult && (
                <p className="success-msg">
                  Bid #{bidResult.bidId} created · ${bidResult.totalAmount.toFixed(2)}
                </p>
              )}
              {error && <p className="error-msg">{error}</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
