import { NormalizedLandmark } from "@mediapipe/tasks-vision";

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Compute the angle in degrees between three 3D points (A-B-C)
 * B is the vertex of the angle
 */
export function computeAngle(
  jointA: Point3D,
  jointB: Point3D,
  jointC: Point3D
): number {
  const vectorBA = {
    x: jointA.x - jointB.x,
    y: jointA.y - jointB.y,
    z: jointA.z - jointB.z,
  };
  
  const vectorBC = {
    x: jointC.x - jointB.x,
    y: jointC.y - jointB.y,
    z: jointC.z - jointB.z,
  };
  
  const dotProduct =
    vectorBA.x * vectorBC.x +
    vectorBA.y * vectorBC.y +
    vectorBA.z * vectorBC.z;
  
  const magnitudeBA = Math.sqrt(
    vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2
  );
  
  const magnitudeBC = Math.sqrt(
    vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2
  );
  
  if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
  
  const cosine = dotProduct / (magnitudeBA * magnitudeBC);
  const clampedCosine = Math.max(-1, Math.min(1, cosine));
  const angleRadians = Math.acos(clampedCosine);
  
  return (angleRadians * 180) / Math.PI;
}

/**
 * MediaPipe Pose Landmarker indices
 */
export const PoseLandmarkIndices = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/**
 * Extract all critical angles from pose landmarks
 */
export function extractAnglesFromLandmarks(
  landmarks: NormalizedLandmark[]
): Record<string, number> {
  const angles: Record<string, number> = {};
  
  // Left shoulder angle: wrist-shoulder-hip
  angles.left_shoulder_angle = computeAngle(
    landmarks[PoseLandmarkIndices.LEFT_WRIST],
    landmarks[PoseLandmarkIndices.LEFT_SHOULDER],
    landmarks[PoseLandmarkIndices.LEFT_HIP]
  );
  
  // Right shoulder angle: wrist-shoulder-hip
  angles.right_shoulder_angle = computeAngle(
    landmarks[PoseLandmarkIndices.RIGHT_WRIST],
    landmarks[PoseLandmarkIndices.RIGHT_SHOULDER],
    landmarks[PoseLandmarkIndices.RIGHT_HIP]
  );
  
  // Left elbow angle: shoulder-elbow-wrist
  angles.left_elbow_angle = computeAngle(
    landmarks[PoseLandmarkIndices.LEFT_SHOULDER],
    landmarks[PoseLandmarkIndices.LEFT_ELBOW],
    landmarks[PoseLandmarkIndices.LEFT_WRIST]
  );
  
  // Right elbow angle: shoulder-elbow-wrist
  angles.right_elbow_angle = computeAngle(
    landmarks[PoseLandmarkIndices.RIGHT_SHOULDER],
    landmarks[PoseLandmarkIndices.RIGHT_ELBOW],
    landmarks[PoseLandmarkIndices.RIGHT_WRIST]
  );
  
  // Left hip angle: shoulder-hip-knee
  angles.left_hip_angle = computeAngle(
    landmarks[PoseLandmarkIndices.LEFT_SHOULDER],
    landmarks[PoseLandmarkIndices.LEFT_HIP],
    landmarks[PoseLandmarkIndices.LEFT_KNEE]
  );
  
  // Right hip angle: shoulder-hip-knee
  angles.right_hip_angle = computeAngle(
    landmarks[PoseLandmarkIndices.RIGHT_SHOULDER],
    landmarks[PoseLandmarkIndices.RIGHT_HIP],
    landmarks[PoseLandmarkIndices.RIGHT_KNEE]
  );
  
  // Left knee angle: hip-knee-ankle
  angles.left_knee_angle = computeAngle(
    landmarks[PoseLandmarkIndices.LEFT_HIP],
    landmarks[PoseLandmarkIndices.LEFT_KNEE],
    landmarks[PoseLandmarkIndices.LEFT_ANKLE]
  );
  
  // Right knee angle: hip-knee-ankle
  angles.right_knee_angle = computeAngle(
    landmarks[PoseLandmarkIndices.RIGHT_HIP],
    landmarks[PoseLandmarkIndices.RIGHT_KNEE],
    landmarks[PoseLandmarkIndices.RIGHT_ANKLE]
  );
  
  return angles;
}

/**
 * Compute symmetry score between left and right angles (0-1)
 */
export function symmetryScore(leftAngle: number, rightAngle: number): number {
  const diff = Math.abs(leftAngle - rightAngle);
  const maxDiff = 180;
  return Math.max(0, 1 - diff / maxDiff);
}

/**
 * Compute stability score from angle time series (0-1)
 * Lower variance = higher stability
 */
export function stabilityScore(angleTimeSeries: number[]): number {
  if (angleTimeSeries.length < 2) return 1;
  
  const mean = angleTimeSeries.reduce((a, b) => a + b, 0) / angleTimeSeries.length;
  const variance = angleTimeSeries.reduce((sum, val) => sum + (val - mean) ** 2, 0) / angleTimeSeries.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize: assume std dev > 15 degrees is unstable
  const maxStdDev = 15;
  return Math.max(0, 1 - stdDev / maxStdDev);
}
