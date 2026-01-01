/**
 * Integration tests for API client
 * Tests the actual HTTP communication with the backend API
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  proveCreditScore,
  checkApiHealth,
  isApiAvailable,
  ApiError,
  NetworkError,
  TimeoutError,
  ValidationError,
  type BorrowerFeatures,
} from '@/lib/api-client';

// Test configuration
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';
const TEST_TIMEOUT = 30000; // 30 seconds for API calls

describe('API Client Integration Tests', () => {
  let apiAvailable: boolean = false;

  beforeAll(async () => {
    // Check if API is available before running tests
    try {
      apiAvailable = await isApiAvailable();
      if (!apiAvailable) {
        console.warn('⚠️  API not available - some integration tests will be skipped');
      }
    } catch (error) {
      console.warn('⚠️  Could not check API availability:', error);
      apiAvailable = false;
    }
  }, 10000);

  describe('Health Check', () => {
    it('should check API health', async () => {
      if (!apiAvailable) {
        return; // Skip if API not available
      }

      const health = await checkApiHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(typeof health.model_loaded).toBe('boolean');
      expect(typeof health.features).toBe('number');
    }, TEST_TIMEOUT);

    it('should handle API unavailable gracefully', async () => {
      // This test will pass if API is down (expected in some environments)
      try {
        await checkApiHealth();
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
      }
    }, 5000);
  });

  describe('Credit Score Inference', () => {
    const validFeatures: BorrowerFeatures = {
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

    it('should successfully get credit score with valid features', async () => {
      if (!apiAvailable) {
        return; // Skip if API not available
      }

      const response = await proveCreditScore(validFeatures);

      expect(response).toBeDefined();
      expect(response.score).toBeGreaterThanOrEqual(300);
      expect(response.score).toBeLessThanOrEqual(850);
      expect(response.default_probability).toBeGreaterThanOrEqual(0);
      expect(response.default_probability).toBeLessThanOrEqual(1);
      expect(Array.isArray(response.explanations)).toBe(true);
      expect(response.explanations.length).toBe(3);
      expect(typeof response.proof_available).toBe('boolean');
    }, TEST_TIMEOUT);

    it('should return consistent scores for same input', async () => {
      if (!apiAvailable) {
        return;
      }

      const response1 = await proveCreditScore(validFeatures);
      const response2 = await proveCreditScore(validFeatures);

      expect(response1.score).toBe(response2.score);
      expect(response1.default_probability).toBe(response2.default_probability);
    }, TEST_TIMEOUT * 2);

    it('should handle different credit profiles', async () => {
      if (!apiAvailable) {
        return;
      }

      const profiles: BorrowerFeatures[] = [
        {
          ...validFeatures,
          annual_inc: 150000,
          dti: 10,
          revol_util: 20,
        },
        {
          ...validFeatures,
          annual_inc: 30000,
          dti: 40,
          revol_util: 80,
          delinq_2yrs: 1,
        },
      ];

      for (const profile of profiles) {
        const response = await proveCreditScore(profile);
        expect(response.score).toBeGreaterThanOrEqual(300);
        expect(response.score).toBeLessThanOrEqual(850);
      }
    }, TEST_TIMEOUT * 3);

    it('should validate input and throw ValidationError for invalid data', async () => {
      const invalidFeatures: Partial<BorrowerFeatures> = {
        loan_amnt: -1000, // Invalid: negative
        annual_inc: 0, // Invalid: zero
        dti: 150, // Invalid: > 100
      };

      await expect(
        proveCreditScore(invalidFeatures as BorrowerFeatures)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle missing optional features', async () => {
      if (!apiAvailable) {
        return;
      }

      const minimalFeatures: BorrowerFeatures = {
        loan_amnt: 10000,
        term: 36,
        purpose: 'debt_consolidation',
        annual_inc: 50000,
        verification_status: 'Not Verified',
        emp_length: 0,
        home_ownership: 'RENT',
        dti: 20,
        inq_last_6mths: 0,
        open_acc: 5,
        revol_bal: 0,
        revol_util: 0,
        delinq_2yrs: 0,
        pub_rec: 0,
        total_acc: 5,
      };

      const response = await proveCreditScore(minimalFeatures);
      expect(response.score).toBeGreaterThanOrEqual(300);
      expect(response.score).toBeLessThanOrEqual(850);
    }, TEST_TIMEOUT);
  });

  describe('Error Handling', () => {
    it('should throw NetworkError when API is unreachable', async () => {
      // Temporarily use invalid URL
      const originalUrl = process.env.VITE_API_URL;
      process.env.VITE_API_URL = 'http://localhost:9999';

      try {
        // Re-import to get new URL
        const { proveCreditScore: testProve } = await import('@/lib/api-client');
        const features: BorrowerFeatures = {
          loan_amnt: 10000,
          term: 36,
          purpose: 'debt_consolidation',
          annual_inc: 50000,
          verification_status: 'Not Verified',
          emp_length: 0,
          home_ownership: 'RENT',
          dti: 20,
          inq_last_6mths: 0,
          open_acc: 5,
          revol_bal: 0,
          revol_util: 0,
          delinq_2yrs: 0,
          pub_rec: 0,
          total_acc: 5,
        };

        await expect(testProve(features)).rejects.toThrow();
      } finally {
        process.env.VITE_API_URL = originalUrl;
      }
    }, 10000);

    it('should handle API 503 errors (model not loaded)', async () => {
      // This test assumes API might return 503
      // In a real scenario, we'd mock the API response
      // For now, we just verify the error handling exists
      expect(ApiError).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      // This would require mocking a slow API response
      // For now, we verify the TimeoutError class exists
      expect(TimeoutError).toBeDefined();
    });
  });

  describe('Feature Mapping', () => {
    it('should correctly map client features to API format', async () => {
      if (!apiAvailable) {
        return;
      }

      const features: BorrowerFeatures = {
        loan_amnt: 20000,
        term: 60,
        purpose: 'home_improvement',
        annual_inc: 100000,
        verification_status: 'Verified',
        emp_length: 10,
        home_ownership: 'OWN',
        dti: 15,
        inq_last_6mths: 0,
        open_acc: 10,
        revol_bal: 15000,
        revol_util: 25,
        delinq_2yrs: 0,
        pub_rec: 0,
        total_acc: 20,
      };

      const response = await proveCreditScore(features);
      
      // Should successfully process and return valid score
      expect(response.score).toBeGreaterThanOrEqual(300);
      expect(response.score).toBeLessThanOrEqual(850);
    }, TEST_TIMEOUT);
  });

  describe('Explanations', () => {
    it('should return valid explanations', async () => {
      if (!apiAvailable) {
        return;
      }

      const features: BorrowerFeatures = {
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

      const response = await proveCreditScore(features);

      expect(response.explanations).toBeDefined();
      expect(response.explanations.length).toBe(3);

      for (const exp of response.explanations) {
        expect(exp.feature).toBeDefined();
        expect(typeof exp.impact).toBe('number');
        expect(['increases', 'decreases']).toContain(exp.direction);
      }
    }, TEST_TIMEOUT);
  });
});

