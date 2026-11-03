# 🧘 Pose Perfect (Posture Muse Guide)

<div align="center">

![Pose Perfect Banner](./public/1000130175-Picsart-AiImageEnhancer.png)

### **Master the Pose. Pose Yourself.**
*Next-generation, real-time AI yoga posture coach powered by on-device computer vision and natural voice guidance.*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![MediaPipe](https://img.shields.io/badge/Google_MediaPipe-Tasks_Vision-FF6F00?logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🌟 Overview

**Pose Perfect** is an intelligent, privacy-first computer vision web application that transforms any webcam into a personal yoga instructor. Built with Google's **MediaPipe Pose Landmarker**, Pose Perfect tracks 33 3D skeletal landmarks in real time, computes anatomical joint angles, and delivers instant, spoken feedback alongside precision visual guidance.

All computer vision inference runs **100% locally in your browser** — no camera streams, images, or personal video data are ever uploaded to an external server.

---

## ✨ Key Features

### 👁️ Real-Time On-Device Computer Vision
- **33 3D Landmark Tracking**: Continuous full-body skeletal detection using MediaPipe BlazePose.
- **Biomechanical Joint Analysis**: Live angular calculation across critical joints (knees, hips, elbows, shoulders, ankles, spine).
- **Hardware-Adaptive Inference**: Automatic GPU acceleration (WebGL/WebGPU) with seamless CPU fallback for low-power devices.
- **Zero Privacy Risk**: Complete client-side processing keeps your camera feed confidential.

### 🎙️ Spoken Voice Coach & Motivation
- **Natural Voice Corrections**: Real-time voice cues via the browser-native Web Speech API instructing you on adjustments (e.g. *"Straighten your left knee"*, *"Raise your arms higher"*).
- **Mid-Hold Motivational Boosts**: Dynamic encouragement during holds (*"Keep going, you can do it!"*, *"Stay hard!"*, *"Breathe deeply and hold strong"*).
- **Smart Speech Throttling**: Intelligent cooldown intervals prevent audio overlap and maintain a calm, focused practice.
- **Ambient Soundscapes**: Built-in soothing meditation background music during posture holds.

### 📊 Precision Multi-Metric Scoring Engine
Every session computes a multi-dimensional assessment:
- **Accuracy (0–100%)**: Weighted angular similarity against master yoga pose geometry.
- **Stability (0–100%)**: Time-series variance tracking how steadily you maintain the hold.
- **Symmetry (0–100%)**: Left-vs-right bilateral alignment to detect posture imbalances.
- **Overall Grade**: Dynamically scaled performance ratings (*Pose Master*, *Flowing Smoothly*, *Steady & Centered*, *Getting Stronger*).

### 🏆 Gamified Challenge & Practice Modes
- **5-Level Progressive Challenge**: Progress from beginner to advanced postures with live countdowns, timed holds, and animated completion celebrations.
- **Explore Poses Library**: Free-practice mode with 10+ curated yoga postures (Warrior I & II, Tree Pose, Triangle Pose, Downward Dog, Cobra, Plank, Bridge, Child's Pose, etc.).
- **Health Benefits & Alignment Tips**: Detailed breakdown of physical and mental benefits associated with each posture.

### 📄 One-Click Results & Report Export
- **Downloadable Performance Summary**: Export detailed session analytics and level breakdown reports in JPG/PDF format.
- **CORS-Safe Offline Architecture**: Resilient rendering engine that guarantees exports even without external asset connectivity.

### 🎨 Top-Tier Visual Aesthetics
- **Luminous Cosmic Aurora Theme**: High-contrast dark glassmorphic UI with vibrant emerald, jade, and golden accents.
- **Fluid Micro-Interactions**: Smooth 60 FPS transitions powered by **Framer Motion**.
- **Responsive Layout**: Designed for seamless practice across laptops, desktops, and tablets.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite](https://vitejs.dev/) |
| **Vision & ML** | [Google MediaPipe Tasks Vision](https://developers.google.com/mediapipe) (`@mediapipe/tasks-vision`) |
| **Styling & Design System** | [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Radix Primitives](https://www.radix-ui.com/) |
| **Motion & Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Audio & Speech** | Browser Web Speech API (`SpeechSynthesis`), HTML5 Audio |
| **Document Generation** | [jsPDF](https://github.com/parallax/jsPDF), HTML5 Canvas API |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## 📂 Project Architecture

```
posture-muse-guide/
├── public/
│   ├── 1000130175-Picsart-AiImageEnhancer.png  # Application Banner & Logo
│   ├── meditation-relax-yoga-music.mp3         # Background Meditation Track
│   ├── placeholder.svg                         # Offline Image Fallback
│   ├── poses.json                              # Pose Library & Biomechanical Targets
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── ui/                                 # Radix UI + Tailwind Primitives
│   │   ├── BenefitsCard.tsx                    # Anatomical & Wellness Benefits
│   │   ├── CameraView.tsx                      # Webcam Stream & MediaPipe Overlay
│   │   ├── ChallengeFlow.tsx                   # Challenge State Machine & Voice Coach
│   │   ├── FinalSummary.tsx                    # Multi-Level Report & Analytics
│   │   ├── LevelCompleteOverlay.tsx            # Celebration & Progress Modal
│   │   ├── PoseCard.tsx                        # Pose Library Card Component
│   │   └── SessionSummary.tsx                  # Post-Level Score Breakdown
│   ├── lib/
│   │   ├── reportGenerator.ts                  # Canvas & PDF Report Builder
│   │   └── utils.ts                            # Class Merging Utilities
│   ├── pages/
│   │   ├── Index.tsx                           # Landing & Main App Router
│   │   └── NotFound.tsx                        # 404 Route Handler
│   ├── utils/
│   │   ├── angles.ts                           # Biomechanical 3D Angle Calculations
│   │   └── scoring.ts                          # Angular Distance & Stability Scoring
│   ├── App.tsx                                 # App Root & Providers
│   ├── index.css                               # Cosmic Aurora Design System
│   └── main.tsx                                # Entrypoint
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)
- A webcam-enabled device (laptop, desktop with USB camera, or tablet)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Dharaneeshsl/posture-muse-guide.git
   cd posture-muse-guide
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:8080` (or the port specified in terminal).

4. **Build for Production**:
   ```bash
   npm run build
   ```

5. **Run Linter & Type Check**:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```

---

## 💡 How to Use

1. **Launch the App**: Open the web application and click **"Start Challenge"** or **"Explore Poses"**.
2. **Grant Camera Access**: When prompted by your browser, grant camera permissions.
3. **Position Your Body**: Stand approximately **6–8 feet** away from your webcam so your full body (head to feet) is visible in the frame.
4. **Follow the Cues**:
   - The system displays a 3-second countdown before the hold begins.
   - Match the green skeleton overlay to the target pose.
   - Listen to spoken feedback to fine-tune your angles.
   - Hold steadily until the progress ring completes 100%.
5. **Review Your Report**: After finishing, inspect your performance breakdown and download your personalized report card.

---

## 🔒 Privacy & Security

- **Zero Cloud Transmission**: All MediaPipe landmark detection is computed locally via WebAssembly on your device.
- **No Video Recording**: Your webcam stream is never recorded, saved, or uploaded.
- **Open Standards**: Built entirely on standard browser APIs (WebRTC, Canvas, Web Speech API).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
