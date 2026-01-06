// Mock inference engine for demo purposes
// In production, this calls the /prove API endpoint

// Import API client (functions only, not types - avoids circular dependency)
// Note: api-client.ts imports BorrowerFeatures as a type-only import
import { 
  proveCreditScore, 
  isApiAvailable, 
  ApiError, 
  NetworkError, 
  TimeoutError,
  ValidationError 
} from './api-client';

export interface BorrowerFeatures {
  // Loan Details
  loan_amnt: number;
  term: 36 | 60;
  purpose: string;
  
  // Income & Employment
  annual_inc: number;
  verification_status: 'Verified' | 'Source Verified' | 'Not Verified';
  emp_length: number;
  home_ownership: 'RENT' | 'OWN' | 'MORTGAGE' | 'OTHER';
  
  // Credit Profile
  dti: number;
  inq_last_6mths: number;
  open_acc: number;
  revol_bal: number;
  revol_util: number;
  delinq_2yrs: number;
  pub_rec: number;
  total_acc: number;
}

export interface ShapExplanation {
  feature: string;
  impact: number;
  direction: 'positive' | 'negative';
  description: string;
}

export interface InferenceResult {
  score: number;
  explanations: ShapExplanation[];
  confidence: number;
}

export interface ProofResult {
  proofHash: string;
  publicInputs: {
    score: number;
    explanationHashes: string[];
  };
  proofData: string;
  verificationKey: string;
}

// Loan purpose options
export const LOAN_PURPOSES = [
  'debt_consolidation',
  'credit_card',
  'home_improvement',
  'major_purchase',
  'small_business',
  'car',
  'medical',
  'moving',
  'vacation',
  'house',
  'wedding',
  'renewable_energy',
  'other',
] as const;

// Feature descriptions for tooltips
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  loan_amnt: 'The total amount of the loan requested ($1,000 - $40,000)',
  term: 'The number of months for loan repayment',
  purpose: 'The stated purpose of the loan',
  annual_inc: 'Your total annual income before taxes',
  verification_status: 'Whether income has been verified by the lender',
  emp_length: 'Years at current employer (0-10+)',
  home_ownership: 'Your current housing situation',
  dti: 'Debt-to-Income ratio - monthly debt payments divided by monthly income',
  inq_last_6mths: 'Number of credit inquiries in the last 6 months',
  open_acc: 'Number of currently open credit accounts',
  revol_bal: 'Total revolving credit balance (credit cards, lines of credit)',
  revol_util: 'Revolving credit utilization - balance divided by credit limit',
  delinq_2yrs: 'Number of 30+ day past-due events in the last 2 years',
  pub_rec: 'Number of derogatory public records (bankruptcies, liens, judgments)',
  total_acc: 'Total number of credit accounts ever opened',
};

// Default feature values
export const DEFAULT_FEATURES: BorrowerFeatures = {
  loan_amnt: 15000,
  term: 36,
  purpose: 'debt_consolidation',
  annual_inc: 75000,
  verification_status: 'Source Verified',
  emp_length: 5,
  home_ownership: 'RENT',
  dti: 18,
  inq_last_6mths: 1,
  open_acc: 8,
  revol_bal: 12000,
  revol_util: 35,
  delinq_2yrs: 0,
  pub_rec: 0,
  total_acc: 15,
};

// Simulated SHAP-like feature importance calculation
function calculateFeatureImpact(features: BorrowerFeatures): ShapExplanation[] {
  const impacts: ShapExplanation[] = [];
  
  // DTI impact (higher = worse)
  if (features.dti > 35) {
    impacts.push({
      feature: 'dti',
      impact: Math.round((features.dti - 20) * 4),
      direction: 'negative',
      description: `High debt-to-income ratio (${features.dti.toFixed(1)}%) indicates potential payment stress`,
    });
  } else if (features.dti < 15) {
    impacts.push({
      feature: 'dti',
      impact: Math.round((20 - features.dti) * 3),
      direction: 'positive',
      description: `Low debt-to-income ratio (${features.dti.toFixed(1)}%) shows strong financial position`,
    });
  }
  
  // Revolving utilization impact
  if (features.revol_util > 70) {
    impacts.push({
      feature: 'revol_util',
      impact: Math.round((features.revol_util - 30) * 2),
      direction: 'negative',
      description: `High credit utilization (${features.revol_util.toFixed(1)}%) suggests credit stress`,
    });
  } else if (features.revol_util < 30) {
    impacts.push({
      feature: 'revol_util',
      impact: Math.round((30 - features.revol_util) * 2),
      direction: 'positive',
      description: `Low credit utilization (${features.revol_util.toFixed(1)}%) indicates responsible credit use`,
    });
  }
  
  // Income impact
  if (features.annual_inc > 100000) {
    impacts.push({
      feature: 'annual_inc',
      impact: Math.round((features.annual_inc - 60000) / 2000),
      direction: 'positive',
      description: `Strong income ($${features.annual_inc.toLocaleString()}) supports repayment ability`,
    });
  } else if (features.annual_inc < 40000) {
    impacts.push({
      feature: 'annual_inc',
      impact: Math.round((60000 - features.annual_inc) / 1500),
      direction: 'negative',
      description: `Lower income ($${features.annual_inc.toLocaleString()}) may limit repayment capacity`,
    });
  }
  
  // Delinquencies impact
  if (features.delinq_2yrs > 0) {
    impacts.push({
      feature: 'delinq_2yrs',
      impact: features.delinq_2yrs * 40,
      direction: 'negative',
      description: `${features.delinq_2yrs} past delinquencies indicate payment risk`,
    });
  }
  
  // Public records impact
  if (features.pub_rec > 0) {
    impacts.push({
      feature: 'pub_rec',
      impact: features.pub_rec * 60,
      direction: 'negative',
      description: `${features.pub_rec} public records (bankruptcies/liens) severely impact credit`,
    });
  }
  
  // Credit inquiries impact
  if (features.inq_last_6mths > 3) {
    impacts.push({
      feature: 'inq_last_6mths',
      impact: (features.inq_last_6mths - 2) * 15,
      direction: 'negative',
      description: `${features.inq_last_6mths} recent inquiries suggest credit-seeking behavior`,
    });
  }
  
  // Employment length impact
  if (features.emp_length >= 5) {
    impacts.push({
      feature: 'emp_length',
      impact: features.emp_length * 5,
      direction: 'positive',
      description: `${features.emp_length}+ years of employment shows job stability`,
    });
  }
  
  // Home ownership impact
  if (features.home_ownership === 'OWN' || features.home_ownership === 'MORTGAGE') {
    impacts.push({
      feature: 'home_ownership',
      impact: 25,
      direction: 'positive',
      description: 'Homeownership indicates financial stability and asset accumulation',
    });
  }
  
  // Verification status impact
  if (features.verification_status === 'Verified') {
    impacts.push({
      feature: 'verification_status',
      impact: 20,
      direction: 'positive',
      description: 'Verified income provides confidence in stated financial position',
    });
  }
  
  // Sort by absolute impact
  return impacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5);
}

// Calculate mock credit score based on features
function calculateScore(features: BorrowerFeatures): number {
  let baseScore = 680;
  
  // DTI adjustment (-50 to +30)
  if (features.dti < 10) baseScore += 30;
  else if (features.dti < 20) baseScore += 15;
  else if (features.dti > 40) baseScore -= 50;
  else if (features.dti > 30) baseScore -= 25;
  
  // Revolving utilization (-40 to +25)
  if (features.revol_util < 20) baseScore += 25;
  else if (features.revol_util < 35) baseScore += 10;
  else if (features.revol_util > 80) baseScore -= 40;
  else if (features.revol_util > 60) baseScore -= 20;
  
  // Income adjustment (-30 to +40)
  if (features.annual_inc > 120000) baseScore += 40;
  else if (features.annual_inc > 80000) baseScore += 20;
  else if (features.annual_inc < 30000) baseScore -= 30;
  else if (features.annual_inc < 50000) baseScore -= 10;
  
  // Delinquencies (-60 each)
  baseScore -= features.delinq_2yrs * 60;
  
  // Public records (-80 each)
  baseScore -= features.pub_rec * 80;
  
  // Inquiries (-10 each after 2)
  if (features.inq_last_6mths > 2) {
    baseScore -= (features.inq_last_6mths - 2) * 10;
  }
  
  // Employment length (+3 per year, max +30)
  baseScore += Math.min(features.emp_length * 3, 30);
  
  // Home ownership (+20 for own/mortgage)
  if (features.home_ownership === 'OWN' || features.home_ownership === 'MORTGAGE') {
    baseScore += 20;
  }
  
  // Verification status (+15 for verified)
  if (features.verification_status === 'Verified') {
    baseScore += 15;
  } else if (features.verification_status === 'Source Verified') {
    baseScore += 8;
  }
  
  // Open accounts (sweet spot is 5-10)
  if (features.open_acc >= 5 && features.open_acc <= 10) {
    baseScore += 10;
  } else if (features.open_acc > 15) {
    baseScore -= 10;
  }
  
  // Clamp to FICO range
  return Math.max(300, Math.min(850, Math.round(baseScore)));
}

// Use real API if available, otherwise fall back to mock
let useMockApi = false;
let apiAvailableChecked = false;

/**
 * Check API availability and set fallback mode
 */
async function checkApiAndSetMode(): Promise<void> {
  if (apiAvailableChecked) return;
  
  try {
    const available = await isApiAvailable();
    useMockApi = !available;
    apiAvailableChecked = true;
    
    if (useMockApi) {
      console.warn('[Credit Scoring] API not available, using mock inference');
    } else {
      console.info('[Credit Scoring] Using real API for inference');
    }
  } catch (error) {
    console.warn('[Credit Scoring] API check failed, using mock inference', error);
    useMockApi = true;
    apiAvailableChecked = true;
  }
}

/**
 * Convert API explanation to client format
 */
function convertApiExplanation(apiExp: { feature: string; impact: number; direction: 'increases' | 'decreases' }): ShapExplanation {
  return {
    feature: apiExp.feature,
    impact: Math.abs(apiExp.impact),
    direction: apiExp.direction === 'increases' ? 'positive' : 'negative',
    description: `${apiExp.feature} ${apiExp.direction} the score by ${Math.abs(apiExp.impact).toFixed(4)}`,
  };
}

/**
 * Run inference using real API or mock fallback
 */
export async function runInference(features: BorrowerFeatures): Promise<InferenceResult> {
  // Check API availability on first call
  await checkApiAndSetMode();
  
  // Try real API first
  if (!useMockApi) {
    try {
      const apiResponse = await proveCreditScore(features);
      
      // Convert API response to client format
      return {
        score: apiResponse.score,
        explanations: apiResponse.explanations.map(convertApiExplanation),
        confidence: 1.0 - apiResponse.default_probability, // Convert default prob to confidence
      };
    } catch (error: unknown) {
      // Log error but don't fail silently
      console.error('[Credit Scoring] API call failed, falling back to mock:', error);
      
      // For certain errors, we might want to retry or show specific messages
      if (error instanceof ValidationError) {
        // Re-throw validation errors - these are user input issues
        throw new Error(`Invalid input: ${error.message}`);
      } else if (error instanceof NetworkError || error instanceof TimeoutError) {
        // Network/timeout errors: fall back to mock but warn user
        console.warn('[Credit Scoring] Network issue, using mock inference');
        // Continue to mock fallback
      } else if (error instanceof ApiError && error.statusCode === 503) {
        // Service unavailable: fall back to mock
        console.warn('[Credit Scoring] Service unavailable, using mock inference');
        // Continue to mock fallback
      } else {
        // Other API errors: fall back to mock
        console.warn('[Credit Scoring] API error, using mock inference:', error.message);
        // Continue to mock fallback
      }
      
      // Fall through to mock implementation
    }
  }
  
  // Mock implementation (fallback)
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  const score = calculateScore(features);
  const explanations = calculateFeatureImpact(features);
  
  return {
    score,
    explanations,
    confidence: 0.92 + Math.random() * 0.06,
  };
}

/**
 * Generate ZK proof using real API or mock fallback
 */
export async function generateProof(
  features: BorrowerFeatures,
  inferenceResult: InferenceResult
): Promise<ProofResult> {
  // Check API availability
  await checkApiAndSetMode();
  
  // Try real API first
  if (!useMockApi) {
    try {
      const apiResponse = await proveCreditScore(features);
      
      if (apiResponse.proof_available && apiResponse.proof_hex) {
        // Use real proof from API
        const proofHex = apiResponse.proof_hex.startsWith('0x') 
          ? apiResponse.proof_hex 
          : `0x${apiResponse.proof_hex}`;
        
        // Generate explanation hashes from actual explanations
        const explanationHashes = apiResponse.explanations.slice(0, 3).map((exp) => {
          // Create a deterministic hash from the explanation
          const expStr = `${exp.feature}:${exp.impact}:${exp.direction}`;
          // Simple hash simulation (in production, use proper hashing)
          let hash = 0;
          for (let i = 0; i < expStr.length; i++) {
            const char = expStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
          }
          return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
        });
        
        return {
          proofHash: proofHex as `0x${string}`,
          publicInputs: {
            score: apiResponse.score,
            explanationHashes,
          },
          proofData: apiResponse.proof_hex,
          verificationKey: 'vk_api_provided',
        };
      } else {
        // API doesn't have proof available, fall back to mock
        console.warn('[Credit Scoring] Proof not available from API, using mock');
      }
    } catch (error: unknown) {
      // API call failed, fall back to mock
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[Credit Scoring] Proof generation failed, using mock:', errorMessage);
      // Fall through to mock implementation
    }
  }
  
  // Mock implementation (fallback)
  await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
  
  // Generate mock proof hash
  const proofHash = `0x${Array.from({ length: 64 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')}`;
  
  // Generate mock explanation hashes
  const explanationHashes = inferenceResult.explanations.slice(0, 3).map(() =>
    `0x${Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`
  );
  
  return {
    proofHash: proofHash as `0x${string}`,
    publicInputs: {
      score: inferenceResult.score,
      explanationHashes,
    },
    proofData: btoa(JSON.stringify({ type: 'mock_ezkl_proof', version: '1.0' })),
    verificationKey: `vk_${Date.now().toString(36)}`,
  };
}

// Get score category
export function getScoreCategory(score: number): {
  label: string;
  color: 'excellent' | 'good' | 'fair' | 'poor' | 'bad';
  description: string;
} {
  if (score >= 800) {
    return {
      label: 'Exceptional',
      color: 'excellent',
      description: 'Well above average. Demonstrates exceptional credit management.',
    };
  } else if (score >= 740) {
    return {
      label: 'Very Good',
      color: 'excellent',
      description: 'Above average. Likely to receive better than average rates.',
    };
  } else if (score >= 670) {
    return {
      label: 'Good',
      color: 'good',
      description: 'Near or slightly above average. Most lenders consider this acceptable.',
    };
  } else if (score >= 580) {
    return {
      label: 'Fair',
      color: 'fair',
      description: 'Below average. May have difficulty getting favorable rates.',
    };
  } else if (score >= 500) {
    return {
      label: 'Poor',
      color: 'poor',
      description: 'Well below average. May need to work on improving credit.',
    };
  } else {
    return {
      label: 'Very Poor',
      color: 'bad',
      description: 'Deep subprime. Significant credit issues to address.',
    };
  }
}
