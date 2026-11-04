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
    
    // Always include weight in totalWeight so missing joints penalize the score
    totalWeight += weight;

    if (userAngle === undefined || targetAngle === undefined || isNaN(userAngle)) {
      deviations[angleName] = 180;
      continue;
    }
    
    const diff = Math.abs(userAngle - targetAngle);
    deviations[angleName] = diff;
    
    // Score per angle: max(0, 1 - diff/tolerance)
    const angleScore = Math.max(0, 1 - diff / tolerance);
    weightedSum += angleScore * weight;
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
 * Generate human-friendly, biomechanically intuitive yoga coaching suggestions.
 * Uses pure natural English language cues with NO degrees, angle values, or mathematical symbols.
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
    if (deviation < 10) continue; // Skip minor/negligible deviations
    
    const target = targetAngles[angleName];
    const current = userAngles[angleName];
    
    const jointLabel = angleName
      .replace(/_/g, " ")
      .replace(/angle/g, "")
      .trim();

    if (current === undefined || isNaN(current)) {
      hints.push(`Step back so your ${jointLabel} is clearly visible in the camera`);
      continue;
    }

    const diff = target - current;
    const absDiff = Math.abs(diff);
    const isSignificant = absDiff >= 25;

    // Biomechanical natural English coaching cues
    switch (angleName) {
      case "left_knee_angle":
      case "right_knee_angle": {
        const side = angleName.includes("left") ? "left" : "right";
        if (diff > 0) {
          // target angle is larger (straighter) than current angle -> user is bending too much
          hints.push(
            isSignificant
              ? `Straighten your ${side} leg and engage your thigh`
              : `Straighten your ${side} leg slightly`
          );
        } else {
          // target angle is smaller (more bent) than current angle -> user needs to deepen bend
          hints.push(
            isSignificant
              ? `Deepen the bend in your ${side} knee`
              : `Bend your ${side} knee a little more`
          );
        }
        break;
      }

      case "left_elbow_angle":
      case "right_elbow_angle": {
        const side = angleName.includes("left") ? "left" : "right";
        if (diff > 0) {
          // target angle is larger (straighter) -> user elbow is bent
          hints.push(
            isSignificant
              ? `Straighten and extend your ${side} arm fully`
              : `Lengthen and reach further through your ${side} arm`
          );
        } else {
          // target angle is smaller (more bent) -> user arm is too straight
          hints.push(
            isSignificant
              ? `Bend your ${side} elbow into position`
              : `Relax and soften your ${side} elbow slightly`
          );
        }
        break;
      }

      case "left_shoulder_angle":
      case "right_shoulder_angle": {
        const side = angleName.includes("left") ? "left" : "right";
        if (diff > 0) {
          // target angle is larger -> user arm is held too low
          hints.push(
            isSignificant
              ? `Raise your ${side} arm higher and reach through your fingertips`
              : `Lift your ${side} arm upward`
          );
        } else {
          // target angle is smaller -> user arm is held too high
          hints.push(
            isSignificant
              ? `Lower your ${side} arm and relax your shoulder`
              : `Lower your ${side} arm slightly`
          );
        }
        break;
      }

      case "left_hip_angle":
      case "right_hip_angle": {
        const side = angleName.includes("left") ? "left" : "right";
        if (diff > 0) {
          // target is straighter/upright -> user is folding or leaning too far
          hints.push(
            isSignificant
              ? `Lift your torso upright and open your chest`
              : `Stand taller and lengthen your spine`
          );
        } else {
          // target is more folded -> user needs to hinge deeper
          hints.push(
            isSignificant
              ? `Hinge deeper at your hips and fold forward`
              : `Sink your hips lower into the stretch`
          );
        }
        break;
      }

      default: {
        if (diff > 0) {
          hints.push(`Extend and lengthen your ${jointLabel}`);
        } else {
          hints.push(`Draw in and gently bend your ${jointLabel}`);
        }
        break;
      }
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
export function computeSymmetry(userAngles: PoseAngles, targetAngles?: PoseAngles): number {
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
      const userDiff = Math.abs(userAngles[left] - userAngles[right]);
      let symmetryError = userDiff;
      if (targetAngles && targetAngles[left] !== undefined && targetAngles[right] !== undefined) {
        const targetDiff = Math.abs(targetAngles[left] - targetAngles[right]);
        symmetryError = Math.abs(userDiff - targetDiff);
      }
      const symmetry = Math.max(0, 1 - symmetryError / 180);
      totalSymmetry += symmetry;
      count++;
    }
  }
  
  return count > 0 ? Math.round((totalSymmetry / count) * 100) : 0;
}
