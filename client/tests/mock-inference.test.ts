import {
  runInference,
  generateProof,
  getScoreCategory,
  DEFAULT_FEATURES,
} from '@/lib/mock-inference';

describe('Mock Inference', () => {
  describe('runInference', () => {
    it('returns a score between 300 and 850', async () => {
      const result = await runInference(DEFAULT_FEATURES);
      
      expect(result.score).toBeGreaterThanOrEqual(300);
      expect(result.score).toBeLessThanOrEqual(850);
    });

    it('returns explanations array', async () => {
      const result = await runInference(DEFAULT_FEATURES);
      
      expect(Array.isArray(result.explanations)).toBe(true);
      expect(result.explanations.length).toBeGreaterThan(0);
    });

    it('explanation has required fields', async () => {
      const result = await runInference(DEFAULT_FEATURES);
      const explanation = result.explanations[0];
      
      expect(explanation).toHaveProperty('feature');
      expect(explanation).toHaveProperty('impact');
      expect(explanation).toHaveProperty('description');
    });
  });

  describe('generateProof', () => {
    it('returns proof with required fields', async () => {
      const inferenceResult = await runInference(DEFAULT_FEATURES);
      const proof = await generateProof(DEFAULT_FEATURES, inferenceResult);
      
      expect(proof).toHaveProperty('proofHash');
      expect(proof).toHaveProperty('publicInputs');
      expect(proof).toHaveProperty('verificationKey');
    });

    it('includes score in public inputs', async () => {
      const inferenceResult = await runInference(DEFAULT_FEATURES);
      const proof = await generateProof(DEFAULT_FEATURES, inferenceResult);
      
      expect(proof.publicInputs).toContain(inferenceResult.score);
    });
  });

  describe('getScoreCategory', () => {
    it('returns Poor for scores below 580', () => {
      expect(getScoreCategory(500).label).toBe('Poor');
      expect(getScoreCategory(579).label).toBe('Poor');
    });

    it('returns Fair for scores 580-669', () => {
      expect(getScoreCategory(580).label).toBe('Fair');
      expect(getScoreCategory(669).label).toBe('Fair');
    });

    it('returns Good for scores 670-739', () => {
      expect(getScoreCategory(670).label).toBe('Good');
      expect(getScoreCategory(739).label).toBe('Good');
    });

    it('returns Very Good for scores 740-799', () => {
      expect(getScoreCategory(740).label).toBe('Very Good');
      expect(getScoreCategory(799).label).toBe('Very Good');
    });

    it('returns Excellent for scores 800+', () => {
      expect(getScoreCategory(800).label).toBe('Excellent');
      expect(getScoreCategory(850).label).toBe('Excellent');
    });
  });
});
