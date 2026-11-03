/**
 * Scoring algorithm for pose evaluation
 */

export interface PoseAngles {
  [key: string]: number;
}

export interface PoseTolerances {
  [key: string]: number;
}

export interface PoseWeights {
  [key: string]: number;
}

export interface FrameScore {
  score: number;
  timestamp: number;
  angles: PoseAngles;
}

/**
 * Compute similarity score between user angles and target angles (0-1)
 * Uses weighted angle differences with tolerances
 */
export function similarityScore(
  userAngles: PoseAngles,
  targetAngles: PoseAngles,
  tolerances: PoseTolerances,
  weights: PoseWeights
): { score: number; deviations: Record<string, number> } {
  const angleNames = Object.keys(targetAngles);
  let totalWeight = 0;
  let weightedSum = 0;
  const deviations: Record<string, number> = {};
  
  for (const angleName of angleNames) {
    const userAngle = userAngles[angleName];
    const targetAngle = targetAngles[angleName];
    const tolerance = tolerances[angleName] || 30;
    const weight = weights[angleName] || 1;
    
    if (userAngle === undefined || targetAngle === undefined) continue;
    
    const diff = Math.abs(userAngle - targetAngle);
    deviations[angleName] = diff;
    
    // Score per angle: max(0, 1 - diff/tolerance)
    const angleScore = Math.max(0, 1 - diff / tolerance);
    
    weightedSum += angleScore * weight;
    totalWeight += weight;
  }
  
  const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  return { score: finalScore, deviations };
}

/**
 * Compute session score from frame scores with stability penalty
 */
export function computeSessionScore(
  frameScores: FrameScore[],
  stabilityPenalty: number = 0.9
): number {
  if (frameScores.length === 0) return 0;
  
  const scores = frameScores.map(f => f.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  // Apply stability penalty
  return avgScore * stabilityPenalty * 100;
}

/**
 * Convert 0-100 score to grade
 */
export function scoreToGrade(score: number): "Beginner" | "Intermediate" | "Advanced" {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Intermediate";
  return "Beginner";
}

/**
 * Generate feedback hints based on largest deviations
 */
export function generateFeedback(
  deviations: Record<string, number>,
  targetAngles: PoseAngles,
  userAngles: PoseAngles,
  maxHints: number = 3
): string[] {
  const sortedDeviations = Object.entries(deviations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxHints);
  
  const hints: string[] = [];
  
  for (const [angleName, deviation] of sortedDeviations) {
    if (deviation < 10) continue; // Skip small deviations
    
    const target = targetAngles[angleName];
    const current = userAngles[angleName];
    const diff = Math.round(target - current);
    
    const jointLabel = angleName
      .replace(/_/g, " ")
      .replace(/angle/g, "")
      .trim();
    
    if (diff > 0) {
      hints.push(`Open ${jointLabel} by ≈${Math.abs(diff)}°`);
    } else {
      hints.push(`Close ${jointLabel} by ≈${Math.abs(diff)}°`);
    }
  }
  
  return hints;
}

/**
 * Compute accuracy percentage (0-100)
 */
export function computeAccuracy(similarityScoreValue: number): number {
  return Math.round(similarityScoreValue * 100);
}

/**
 * Compute symmetry percentage based on left/right angle pairs
 */
export function computeSymmetry(userAngles: PoseAngles): number {
  const pairs = [
    ["left_shoulder_angle", "right_shoulder_angle"],
    ["left_elbow_angle", "right_elbow_angle"],
    ["left_hip_angle", "right_hip_angle"],
    ["left_knee_angle", "right_knee_angle"],
  ];
  
  let totalSymmetry = 0;
  let count = 0;
  
  for (const [left, right] of pairs) {
    if (userAngles[left] !== undefined && userAngles[right] !== undefined) {
      const diff = Math.abs(userAngles[left] - userAngles[right]);
      const symmetry = Math.max(0, 1 - diff / 180);
      totalSymmetry += symmetry;
      count++;
    }
  }
  
  return count > 0 ? Math.round((totalSymmetry / count) * 100) : 0;
}
