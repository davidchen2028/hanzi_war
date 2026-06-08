let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** 穿云箭：呼啸 + 低沉冲击 */
export function playCloudArrowSfx(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.55;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(4200, now + 0.22);
  filter.frequency.exponentialRampToValueAtTime(900, now + duration);
  filter.Q.value = 1.4;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.42, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(220, now + 0.38);

  const toneGain = ctx.createGain();
  toneGain.gain.setValueAtTime(0.18, now + 0.04);
  toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);

  osc.connect(toneGain);
  toneGain.connect(ctx.destination);
  osc.start(now + 0.04);
  osc.stop(now + 0.42);

  const hit = ctx.createOscillator();
  hit.type = "sine";
  hit.frequency.setValueAtTime(140, now + 0.12);
  hit.frequency.exponentialRampToValueAtTime(55, now + 0.5);

  const hitGain = ctx.createGain();
  hitGain.gain.setValueAtTime(0.28, now + 0.12);
  hitGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

  hit.connect(hitGain);
  hitGain.connect(ctx.destination);
  hit.start(now + 0.12);
  hit.stop(now + 0.5);
}

/** 破釜沉舟：短促战鼓冲击 */
export function playBurnBoatsSfx(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const drum = ctx.createOscillator();
  drum.type = "sine";
  drum.frequency.setValueAtTime(120, now);
  drum.frequency.exponentialRampToValueAtTime(55, now + 0.35);

  const drumGain = ctx.createGain();
  drumGain.gain.setValueAtTime(0.45, now);
  drumGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

  drum.connect(drumGain);
  drumGain.connect(ctx.destination);
  drum.start(now);
  drum.stop(now + 0.38);

  const clash = ctx.createOscillator();
  clash.type = "square";
  clash.frequency.setValueAtTime(280, now + 0.05);
  clash.frequency.exponentialRampToValueAtTime(140, now + 0.25);

  const clashGain = ctx.createGain();
  clashGain.gain.setValueAtTime(0.12, now + 0.05);
  clashGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

  clash.connect(clashGain);
  clashGain.connect(ctx.destination);
  clash.start(now + 0.05);
  clash.stop(now + 0.28);
}
