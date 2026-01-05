import { db } from '../db';
import { Material } from '../models/types';

type InputLineItem = {
  materialId: number;
  quantity: number;
};

type AssistRequest = {
  companyId: number;
  targetMargin?: number;
  buyerFocus?: string;
  lineItems: InputLineItem[];
};

type Recommendation = InputLineItem & {
  materialName: string;
  materialType: string;
  currentBasePrice: number;
  recommendedUnitPrice: number;
  recommendationDetail: string;
};

const loadMaterials = (ids: number[]): Material[] => {
  if (ids.length === 0) {
    return [];
  }
  const stmt = db.prepare<[number], Material>('SELECT * FROM materials WHERE id = ?');
  const results: Material[] = [];
  for (const id of ids) {
    const material = stmt.get(id);
    if (material) {
      results.push(material);
    }
  }
  return results;
};

const recommendUnitPrice = (
  material: Material,
  targetMargin: number,
  quantity: number
): number => {
  const markup = targetMargin + 0.07;
  const fairnessBuffer = Math.min(0.1, quantity / 1000);
  const base = Math.max(material.baseUnitPrice, material.costPerUnit * (1 + markup));
  return parseFloat((base * (1 + fairnessBuffer)).toFixed(2));
};

export const createBidRecommendations = (request: AssistRequest) => {
  const targetMargin = request.targetMargin ?? 0.18;
  const materialIds = request.lineItems.map((item) => item.materialId);
  const materials = loadMaterials(materialIds);
  const materialMap = new Map(materials.map((material) => [material.id, material]));

  const recommendations: Recommendation[] = request.lineItems.map((item) => {
    const material = materialMap.get(item.materialId);
    if (!material) {
      throw new Error(`Material ${item.materialId} not found`);
    }

    const recommendedUnitPrice = recommendUnitPrice(material, targetMargin, item.quantity);

    return {
      ...item,
      materialName: material.name,
      materialType: material.type,
      currentBasePrice: material.baseUnitPrice,
      recommendedUnitPrice,
      recommendationDetail: `Maintains roughly ${Math.round(targetMargin * 100)}% margin`
    };
  });

  const totalAmount = recommendations.reduce(
    (sum, item) => sum + item.quantity * item.recommendedUnitPrice,
    0
  );

  const summary = `Based on requesting ${recommendations.length} materials, we suggest pricing that keeps our margin near ${(targetMargin * 100).toFixed(
    1
  )}% while covering costs and offering a consistent uplift for partners.`;

  return {
    companyId: request.companyId,
    buyerFocus: request.buyerFocus ?? 'Balanced profitability',
    recommendations,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    summary
  };
};

