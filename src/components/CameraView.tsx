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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const onPoseDetectedRef = useRef(onPoseDetected);
  onPoseDetectedRef.current = onPoseDetected;

  useEffect(() => {
    let isMounted = true;

    const initializePoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
        );

        let landmarker: PoseLandmarker;
        try {
          landmarker = await PoseLandmarker.createFromOptions(vision, {
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
        } catch (gpuError) {
          console.warn("GPU delegate unavailable, falling back to CPU:", gpuError);
          landmarker = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
              delegate: "CPU"
            },
            runningMode: "VIDEO",
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          });
        }

        if (isMounted) {
          setPoseLandmarker(landmarker);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing pose landmarker:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializePoseLandmarker();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isActive || !poseLandmarker) return;

    let isCancelled = false;
    let activeStream: MediaStream | null = null;
    const currentVideo = videoRef.current;

    const startCamera = async () => {
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        activeStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          const onLoaded = () => {
            if (isCancelled) return;
            videoRef.current?.play().catch(e => console.warn("Video play error:", e));
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
            }
            detectPose();
          };

          if (videoRef.current.readyState >= 1) {
            onLoaded();
          } else {
            videoRef.current.onloadedmetadata = onLoaded;
          }
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setCameraError("Camera unavailable. Please check that camera permissions are enabled in your browser.");
      }
    };

    const detectPose = () => {
      if (isCancelled || !videoRef.current || !canvasRef.current || !poseLandmarker) return;

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
        const rawLandmarks = results.landmarks[0];
        const landmarks: NormalizedLandmark[] = rawLandmarks.map(l => ({ ...l }));

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

        const angles = extractAnglesFromLandmarks(landmarks);
        onPoseDetectedRef.current?.(angles, landmarks);
      }

      animationFrameRef.current = requestAnimationFrame(detectPose);
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (currentVideo) {
        currentVideo.srcObject = null;
      }
    };
  }, [isActive, poseLandmarker]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-muted-foreground">Loading pose detection...</p>
        </div>
      )}
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center z-20">
          <p className="text-destructive font-medium">{cameraError}</p>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
    </div>
  );
}
