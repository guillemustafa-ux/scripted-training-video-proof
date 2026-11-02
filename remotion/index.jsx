import React from "react";
import { registerRoot, Composition, AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";

const FPS = 30;
const msToFrame = (ms) => Math.round((ms / 1000) * FPS);

const Training = ({ title, timeline, viewport }) => {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const step = timeline.find((s) => ms >= s.startMs && ms < s.endMs) ?? null;
  const intro = msToFrame(timeline[0]?.startMs ?? 0);
  const local = step ? frame - msToFrame(step.startMs) : 0;
  const fade = interpolate(local, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const scale = { x: 1920 / viewport.width, y: 1080 / viewport.height };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f1420" }}>
      <OffthreadVideo src={staticFile("recording.webm")} />
      {step?.box && (
        <div
          style={{
            position: "absolute",
            left: (step.box.x - 6) * scale.x,
            top: (step.box.y - 6) * scale.y,
            width: (step.box.width + 12) * scale.x,
            height: (step.box.height + 12) * scale.y,
            border: "5px solid #ffcc33",
            borderRadius: 10,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            opacity: fade,
          }}
        />
      )}
      {step && (
        <div
          style={{
            position: "absolute",
            left: 120,
            right: 120,
            bottom: 70,
            padding: "22px 34px",
            background: "rgba(10,14,24,0.88)",
            color: "#fff",
            fontFamily: "system-ui, sans-serif",
            fontSize: 40,
            lineHeight: 1.3,
            borderRadius: 14,
            opacity: fade,
          }}
        >
          <span style={{ color: "#ffcc33", marginRight: 16 }}>{step.index + 1}/{timeline.length}</span>
          {step.text}
        </div>
      )}
      {frame < intro + 45 && (
        <div style={{ position: "absolute", top: 40, left: 60, color: "#fff", fontFamily: "system-ui, sans-serif", fontSize: 34, background: "rgba(10,14,24,0.85)", padding: "10px 22px", borderRadius: 10 }}>
          {title}
        </div>
      )}
      <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, background: "#7aa2f7", width: `${Math.min(100, (ms / timeline.at(-1).endMs) * 100)}%` }} />
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition
    id="Training"
    component={Training}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={60}
    defaultProps={{ title: "", timeline: [{ index: 0, text: "", startMs: 0, endMs: 1000, box: null }], viewport: { width: 1280, height: 720 }, totalMs: 2000 }}
    calculateMetadata={({ props }) => ({ durationInFrames: msToFrame(props.totalMs) })}
  />
);

registerRoot(Root);
