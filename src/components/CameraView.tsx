import { useEffect, useRef, useState } from "react";
import { PoseLandmarker, FilesetResolver, DrawingUtils, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { extractAnglesFromLandmarks } from "@/utils/angles";

interface CameraViewProps {
  isActive: boolean;
  onPoseDetected?: (angles: Record<string, number>, landmarks: NormalizedLandmark[]) => void;
}

export function CameraView({ isActive, onPoseDetected }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    let isMounted = true;

    const initializePoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (isMounted) {
          setPoseLandmarker(landmarker);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing pose landmarker:", error);
        setIsLoading(false);
      }
    };

    initializePoseLandmarker();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isActive || !poseLandmarker) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            detectPose();
          };
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    const detectPose = () => {
      if (!videoRef.current || !canvasRef.current || !poseLandmarker) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(detectPose);
        return;
      }

      const startTimeMs = performance.now();
      const results = poseLandmarker.detectForVideo(video, startTimeMs);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw landmarks
        if (results.landmarks && results.landmarks.length > 0) {
          const drawingUtils = new DrawingUtils(ctx);
          // Work with a shallow copy so we don't mutate Mediapipe internals
          const rawLandmarks = results.landmarks[0];
          const landmarks: NormalizedLandmark[] = rawLandmarks.map(l => ({ ...l }));

          // Draw pose connections using the detected landmarks
          drawingUtils.drawLandmarks(landmarks, {
            radius: 4,
            color: "rgba(95, 191, 132, 0.8)",
            fillColor: "rgba(95, 191, 132, 1)"
          });
          drawingUtils.drawConnectors(
            landmarks,
            PoseLandmarker.POSE_CONNECTIONS,
            { color: "rgba(47, 122, 94, 0.8)", lineWidth: 3 }
          );

          // Extract angles and notify parent using detected landmarks
          const angles = extractAnglesFromLandmarks(landmarks);
          onPoseDetected?.(angles, landmarks);
        }

      animationFrameRef.current = requestAnimationFrame(detectPose);
    };

    startCamera();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive, poseLandmarker, onPoseDetected]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-muted-foreground">Loading pose detection...</p>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
