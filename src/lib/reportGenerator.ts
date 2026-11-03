export interface ReportPoseItem {
  slug: string;
  name?: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export async function generateReportCanvas(
  levelScores: number[],
  feedbacks: string[][] | undefined,
  levelDetails: Array<{ level: number; slug: string; name: string; difficulty: string }> | undefined,
  poseLibrary: Array<ReportPoseItem> | undefined,
  totalScore: number
): Promise<HTMLCanvasElement | null> {
  const width = 1400;
  const padding = 48;
  const thumbSize = 120;
  const gap = 20;
  const perLevelHeight = Math.max(thumbSize + 20, 120);

  // compute height based on number of levels (header + per-level blocks + footer)
  const height = padding * 2 + 160 + levelScores.length * perLevelHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px Inter, system-ui, Arial";
  ctx.fillText("Pose Perfect — Challenge Report", padding, padding + 12);

  // Subheader
  ctx.fillStyle = "#374151";
  ctx.font = "16px Inter, system-ui, Arial";
  ctx.fillText(`Generated: ${new Date().toLocaleString()}`, padding, padding + 44);

  // Total score badge
  ctx.fillStyle = "#064e3b"; // deep teal
  const badgeX = width - padding - 260;
  const badgeY = padding;
  ctx.fillRect(badgeX, badgeY, 260, 120);
  ctx.fillStyle = "#fff";
  ctx.font = "700 56px Inter, system-ui, Arial";
  ctx.fillText(`${totalScore}%`, badgeX + 26, badgeY + 72);
  ctx.font = "500 16px Inter, system-ui, Arial";
  ctx.fillText("Total Score", badgeX + 26, badgeY + 98);

  // Prepare to fetch thumbnails for each level (if available).
  // Use fetch + createImageBitmap so we can detect CORS failures early and avoid tainting the canvas.
  const images: Array<ImageBitmap | null> = await Promise.all(
    levelScores.map(async (_s, i) => {
      const details = levelDetails?.[i];
      let thumbUrl: string | undefined;
      if (details && poseLibrary) {
        const pose = poseLibrary.find((p) => p.slug === details.slug);
        if (pose && pose.thumbnail) thumbUrl = pose.thumbnail;
      }

      if (!thumbUrl) return null;

      try {
        const resp = await fetch(thumbUrl, { mode: "cors" });
        if (!resp.ok) throw new Error(`Image fetch failed ${resp.status}`);
        const blob = await resp.blob();
        const bitmap = await createImageBitmap(blob);
        return bitmap;
      } catch {
        // Fall back to null so placeholder is drawn safely without canvas tainting
        return null;
      }
    })
  );

  // Draw per-level rows
  let y = padding + 160;
  ctx.font = "700 18px Inter, system-ui, Arial";
  for (let i = 0; i < levelScores.length; i++) {
    const score = levelScores[i];
    const details = levelDetails?.[i];
    const name = details?.name || `Level ${i + 1}`;
    const difficulty = details?.difficulty || "";

    // Thumbnail
    const imgBitmap = images[i];
    if (imgBitmap) {
      ctx.drawImage(imgBitmap, padding, y - 16, thumbSize, thumbSize);
      try { imgBitmap.close?.(); } catch { /* ignore */ }
    } else {
      // Placeholder box with pose initials
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(padding, y - 16, thumbSize, thumbSize);
      ctx.fillStyle = "#64748b";
      ctx.font = "700 24px Inter, system-ui, Arial";
      ctx.fillText(name.slice(0, 2).toUpperCase(), padding + 40, y + 54);
    }

    // Level text
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Inter, system-ui, Arial";
    ctx.fillText(`${i + 1}. ${name}`, padding + thumbSize + gap, y + 10);

    ctx.font = "500 14px Inter, system-ui, Arial";
    ctx.fillStyle = "#475569";
    ctx.fillText(`Difficulty: ${difficulty}`, padding + thumbSize + gap, y + 36);

    ctx.fillStyle = "#064e3b";
    ctx.font = "700 16px Inter, system-ui, Arial";
    ctx.fillText(`Score: ${score}%`, padding + thumbSize + gap, y + 62);

    // Feedbacks
    const fbs = feedbacks?.[i] || [];
    ctx.font = "14px Inter, system-ui, Arial";
    ctx.fillStyle = "#111827";
    if (fbs.length === 0) {
      ctx.fillText("• Great hold! No major adjustments needed.", padding + thumbSize + gap, y + 88);
    } else {
      for (let fi = 0; fi < Math.min(fbs.length, 2); fi++) {
        ctx.fillText(`• ${fbs[fi]}`, padding + thumbSize + gap, y + 88 + fi * 20);
      }
    }

    // Divider
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y + perLevelHeight - 20);
    ctx.lineTo(width - padding, y + perLevelHeight - 20);
    ctx.stroke();

    y += perLevelHeight;
  }

  return canvas;
}
