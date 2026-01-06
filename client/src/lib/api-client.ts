/**
 * API Client for ZKML Credit Scoring Service
 * 
 * This module provides a robust client for communicating with the FastAPI backend.
 * It includes proper error handling, input validation, and type safety.
 */

// Import BorrowerFeatures type from mock-inference (type-only import avoids circular dependency)
import type { BorrowerFeatures } from './mock-inference';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT_MS = 30000; // 30 seconds for inference + proof generation

// API Types (matching FastAPI response)
export interface ApiFeatureInput {
  loan_amnt?: number;
  int_rate?: number;
  installment?: number;
  annual_inc?: number;
  dti?: number;
  delinq_2yrs?: number;
  inq_last_6mths?: number;
  open_acc?: number;
  pub_rec?: number;
  revol_bal?: number;
  revol_util?: number;
  total_acc?: number;
  // Additional fields that may be needed by the model
  [key: string]: number | undefined;
}

export interface ApiExplanation {
  feature: string;
  impact: number;
  direction: 'increases' | 'decreases';
}

export interface ApiProveResponse {
  score: number;
  default_probability: number;
  explanations: ApiExplanation[];
  proof_hex: string | null;
  proof_available: boolean;
}

export interface ApiHealthResponse {
  status: string;
  model_loaded: boolean;
  features: number;
}

// Custom Error Classes
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates and converts BorrowerFeatures to API format
 */
function mapFeaturesToApi(features: BorrowerFeatures): ApiFeatureInput {
  // Validate required fields
  if (!features.loan_amnt || features.loan_amnt <= 0) {
    throw new ValidationError('Loan amount must be greater than 0', 'loan_amnt');
  }
  if (!features.annual_inc || features.annual_inc <= 0) {
    throw new ValidationError('Annual income must be greater than 0', 'annual_inc');
  }
  if (features.dti < 0 || features.dti > 100) {
    throw new ValidationError('DTI ratio must be between 0 and 100', 'dti');
  }
  if (features.revol_util < 0 || features.revol_util > 200) {
    throw new ValidationError('Revolving utilization must be between 0 and 200', 'revol_util');
  }

  // Map to API format
  // Note: The API expects specific field names that match the trained model
  const apiInput: ApiFeatureInput = {
    loan_amnt: features.loan_amnt,
    annual_inc: features.annual_inc,
    dti: features.dti,
    delinq_2yrs: features.delinq_2yrs,
    inq_last_6mths: features.inq_last_6mths,
    open_acc: features.open_acc,
    pub_rec: features.pub_rec,
    revol_bal: features.revol_bal,
    revol_util: features.revol_util,
    total_acc: features.total_acc,
  };

  // Calculate installment if term is provided
  if (features.term) {
    // Simple installment calculation: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    // Using a simplified rate estimate (actual rate would come from int_rate)
    const monthlyRate = 0.01; // 1% monthly (12% annual) - approximate
    const numPayments = features.term;
    const principal = features.loan_amnt;
    
    if (monthlyRate > 0 && numPayments > 0) {
      const installment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                         (Math.pow(1 + monthlyRate, numPayments) - 1);
      apiInput.installment = Math.round(installment * 100) / 100;
    }
  }

  // Calculate interest rate estimate if not provided
  // This is a simplified estimate - in production, this would come from market data
  if (!apiInput.int_rate) {
    // Estimate based on credit profile
    let baseRate = 5.0; // Base rate
    if (features.dti > 30) baseRate += 2;
    if (features.revol_util > 70) baseRate += 1.5;
    if (features.delinq_2yrs > 0) baseRate += 3;
    if (features.pub_rec > 0) baseRate += 5;
    apiInput.int_rate = Math.min(baseRate, 28.99); // Cap at ~29%
  }

  return apiInput;
}

/**
 * Creates a fetch request with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Request exceeded ${timeoutMs}ms timeout`);
    }
    throw error;
  }
}

/**
 * Health check endpoint
 */
export async function checkApiHealth(): Promise<ApiHealthResponse> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      { method: 'GET' },
      5000 // Shorter timeout for health check
    );

    if (!response.ok) {
      throw new ApiError(
        `Health check failed: ${response.statusText}`,
        response.status
      );
    }

    return await response.json();
  } catch (error: unknown) {
    if (error instanceof TimeoutError || error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError('Failed to connect to API', error instanceof Error ? error : undefined);
  }
}

/**
 * Generate credit score with ZK proof
 */
export async function proveCreditScore(
  features: BorrowerFeatures
): Promise<ApiProveResponse> {
  // Validate and map features
  const apiInput = mapFeaturesToApi(features);

  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/prove`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiInput),
      },
      API_TIMEOUT_MS
    );

    // Handle different error status codes
    if (!response.ok) {
      let errorMessage = `API request failed: ${response.statusText}`;
      let errorData: unknown = null;

      try {
        errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        // If response is not JSON, use status text
        const text = await response.text().catch(() => '');
        if (text) errorMessage = text;
      }

      // Specific handling for common errors
      if (response.status === 503) {
        throw new ApiError(
          'Model not loaded. Please ensure the backend service is properly configured.',
          response.status,
          errorData
        );
      } else if (response.status === 422) {
        throw new ValidationError(
          errorMessage || 'Invalid input data',
          undefined
        );
      } else if (response.status >= 500) {
        throw new ApiError(
          'Server error. Please try again later.',
          response.status,
          errorData
        );
      } else {
        throw new ApiError(errorMessage, response.status, errorData);
      }
    }

    const data: ApiProveResponse = await response.json();

    // Validate response structure
    if (typeof data.score !== 'number' || data.score < 300 || data.score > 850) {
      throw new ApiError('Invalid score returned from API');
    }

    if (!Array.isArray(data.explanations)) {
      throw new ApiError('Invalid explanations format');
    }

    return data;
  } catch (error: unknown) {
    // Re-throw known errors
    if (
      error instanceof ApiError ||
      error instanceof ValidationError ||
      error instanceof TimeoutError
    ) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(
        'Failed to connect to API. Please check if the backend service is running.',
        error
      );
    }

    // Unknown error
    throw new NetworkError(
      `Unexpected error: ${error.message || 'Unknown error'}`,
      error
    );
  }
}

/**
 * Check if API is available and healthy
 */
export async function isApiAvailable(): Promise<boolean> {
  try {
    await checkApiHealth();
    return true;
  } catch {
    return false;
  }
}

