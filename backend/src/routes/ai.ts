import { Router } from 'express';
import { createBidRecommendations } from '../services/aiAssistant';
import { db } from '../db';

const router = Router();

router.post('/bid-assist', (req, res) => {
  const payload = req.body;
  if (!payload || !Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    return res.status(400).json({ error: 'lineItems are required' });
  }

  try {
    const recommendation = createBidRecommendations(payload);
    res.json(recommendation);
  } catch (error) {
    console.error('AI assistant error', error);
    res.status(500).json({ error: 'Failed to build bid recommendation' });
  }
});

router.post('/find-materials', async (req, res) => {
  const { description } = req.body;

  if (!description || typeof description !== 'string' || !description.trim()) {
    return res.status(400).json({ error: 'description is required' });
  }

  try {
    // Get all materials from database
    const materialsQuery = `
      SELECT m.*, c.name AS companyName
      FROM materials m
      JOIN companies c ON c.id = m.companyId
      ORDER BY m.name
    `;
    const materials = db.prepare(materialsQuery).all() as Array<{
      id: number;
      code: string;
      name: string;
      type: string;
      description: string;
      stock: number;
      baseUnitPrice: number;
      companyName: string;
    }>;

    // Prepare materials data for Perplexity
    const materialsText = materials.map(m => 
      `- ${m.name} (Code: ${m.code}, Type: ${m.type}): ${m.description}`
    ).join('\n');

    // Call Perplexity API
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    if (!perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('PERPLEXITY')));
      return res.status(500).json({ error: 'Perplexity API key not configured' });
    }
    
    console.log('Using Perplexity API key (first 10 chars):', perplexityApiKey.substring(0, 10) + '...');

    // Extract key terms from description for better matching
    const descriptionLower = description.toLowerCase();
    const keyTerms = descriptionLower.split(/\s+/).filter(term => term.length > 2);
    
    // Map material type keywords to database types and synonyms
    const typeKeywordMap: Record<string, string[]> = {
      'steel': ['steel', 'stainless', 'chrome-moly', 'carbon steel', 'structural steel'],
      'aluminum': ['aluminum', 'aluminium', 'al-', 'aerospace aluminum'],
      'ceramic': ['ceramic', 'firebrick', 'refractory', 'porcelain'],
      'composite': ['composite', 'carbon fiber', 'fiberglass', 'fiber glass'],
      'metal': ['metal', 'steel', 'aluminum', 'titanium', 'copper', 'brass'],
      'plastic': ['plastic', 'polymer', 'pvc', 'polyethylene', 'nylon'],
      'polymer': ['polymer', 'plastic', 'resin', 'thermoplastic']
    };
    
    // Pre-filter and score materials based on keyword matches
    const materialScores = materials.map(m => {
      let score = 0;
      const materialText = `${m.name} ${m.type} ${m.description}`.toLowerCase();
      
      // High priority: exact material type matches (steel, aluminum, ceramic, etc.)
      for (const [typeKeyword, synonyms] of Object.entries(typeKeywordMap)) {
        if (descriptionLower.includes(typeKeyword)) {
          // Check if material matches any synonym for this type
          const matchesType = synonyms.some(synonym => materialText.includes(synonym));
          if (matchesType) {
            score += 100; // Very high priority for material type match
            break; // Only score once per material
          }
        }
      }
      
      // Medium priority: keyword matches in name
      for (const term of keyTerms) {
        if (m.name.toLowerCase().includes(term)) {
          score += 10;
        }
        if (m.description.toLowerCase().includes(term)) {
          score += 5;
        }
      }
      
      return { material: m, score };
    });
    
    // Sort by score and take top candidates for AI context (limit to 30 to keep prompt manageable)
    const topCandidates = materialScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((item: { material: typeof materials[0]; score: number }) => item.material);

    const topMaterialsText = topCandidates.map(m => 
      `- ${m.name} (Code: ${m.code}, Type: ${m.type}): ${m.description}`
    ).join('\n');

    const prompt = `Given this user requirement: "${description}"

IMPORTANT: If the user specifies a material TYPE (e.g., "steel", "aluminum", "ceramic"), prioritize materials that match that TYPE first, even if other materials have similar properties.

And these available materials (pre-filtered for relevance):
${topMaterialsText}

Find the top 3-5 most compatible materials. Priority rules:
1. Material TYPE must match if specified (e.g., if user asks for "steel", only consider materials with Type: Metal/Steel)
2. Then consider properties, compatibility, use cases, and technical specifications
3. Materials with higher keyword relevance scores are listed first - prioritize these

For each match, explain in 2-3 sentences why it matches the requirement, specifically addressing how it meets the material type requirement if one was specified.

Return your response as JSON with this structure:
{
  "matches": [
    {
      "materialName": "exact material name from the list above",
      "reasoning": "2-3 sentence explanation of why this material is compatible"
    }
  ]
}`;

    let response;
    try {
      const requestBody = {
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a materials expert assistant. Always respond with valid JSON only, no additional text. Format your response as a JSON object with a "matches" array. When a user specifies a material type, you MUST prioritize materials matching that type.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Lower temperature for more deterministic, type-focused results
        max_tokens: 2000
      };
      
      console.log('Calling Perplexity API...');
      
      response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to connect to Perplexity API',
        details: fetchError.message
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error - Status:', response.status, response.statusText);
      console.error('Perplexity API error - Response:', errorText);
      return res.status(500).json({ 
        error: 'Failed to query Perplexity API',
        details: errorText,
        status: response.status
      });
    }

    const perplexityData = await response.json();
    const aiContent = perplexityData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from AI response (it might have markdown code blocks)
    let matches = [];
    try {
      // Remove markdown code blocks if present
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiContent;
      const parsed = JSON.parse(jsonStr);
      matches = parsed.matches || [];
    } catch (parseError) {
      console.error('Failed to parse Perplexity response:', parseError);
      // Fallback: try to extract material names and create basic matches
      const materialNames = materials.map(m => m.name);
      matches = materialNames
        .filter(name => description.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(description.toLowerCase()))
        .slice(0, 5)
        .map(name => ({
          materialName: name,
          reasoning: `This material may be compatible based on keyword matching with your requirement.`
        }));
    }

    // Match AI suggestions to actual materials in database
    type MatchedMaterial = {
      material: typeof materials[0];
      reasoning: string;
      score: number;
    };

    const matchedMaterialsWithNulls: (MatchedMaterial | null)[] = matches.map((match: { materialName: string; reasoning: string }) => {
      // Try exact match first
      let material = materials.find(m => 
        m.name.toLowerCase() === match.materialName.toLowerCase()
      );
      
      // Then try partial matches
      if (!material) {
        material = materials.find(m => 
          m.name.toLowerCase().includes(match.materialName.toLowerCase()) ||
          match.materialName.toLowerCase().includes(m.name.toLowerCase())
        );
      }

      if (material) {
        return {
          material,
          reasoning: match.reasoning,
          score: materialScores.find(ms => ms.material.id === material!.id)?.score || 0
        };
      }
      return null;
    });

    const matchedMaterials: MatchedMaterial[] = matchedMaterialsWithNulls.filter((item: MatchedMaterial | null): item is MatchedMaterial => item !== null);

    // Re-sort by keyword score to ensure type matches are prioritized, even if AI ranks them differently
    const finalMatches = matchedMaterials
      .sort((a: MatchedMaterial, b: MatchedMaterial) => {
        // If both have the same material type requirement match, use AI ordering
        if (Math.abs(a.score - b.score) < 50) {
          return 0; // Keep AI's ordering
        }
        // Otherwise prioritize by keyword score
        return b.score - a.score;
      })
      .slice(0, 5)
      .map((item: MatchedMaterial) => ({
        id: item.material.id,
        code: item.material.code,
        name: item.material.name,
        type: item.material.type,
        description: item.material.description,
        stock: item.material.stock,
        baseUnitPrice: item.material.baseUnitPrice,
        companyName: item.material.companyName,
        reasoning: item.reasoning
      }));

    res.json({
      query: description,
      matches: finalMatches
    });

  } catch (error) {
    console.error('Material finder error:', error);
    res.status(500).json({ error: 'Failed to find materials' });
  }
});

export default router;


