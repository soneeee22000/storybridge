import { useState, useEffect, useCallback, useRef } from "react";
import * as Tone from "tone";

const COLORS = {
  cream: "#FDF6EC",
  creamDark: "#F5EBD8",
  terracotta: "#C67A4A",
  forest: "#3D6B4F",
  forestLight: "#4A7D5E",
  brown: "#3E2723",
  gold: "#D4A843",
  white: "#FFFDF8",
  textPrimary: "#2C1810",
  textSecondary: "#6B5744",
};

/* ═══════════════════════════════════════════
   AUDIO ENGINE — Tone.js music box + FX
   ═══════════════════════════════════════════ */
function createAudioEngine() {
  let started = false;
  let melody, pad, chime, sparkle;
  let narrationNoise, narrationFilter, narrationGain;
  let melodyPart, padSeq;

  const notes = [
    { time: "0:0", note: "E4", dur: "8n" },
    { time: "0:1", note: "G4", dur: "8n" },
    { time: "0:2", note: "A4", dur: "4n" },
    { time: "0:3", note: "G4", dur: "8n" },
    { time: "1:0", note: "E4", dur: "4n" },
    { time: "1:1.5", note: "D4", dur: "8n" },
    { time: "1:2", note: "E4", dur: "4n" },
    { time: "2:0", note: "A4", dur: "8n" },
    { time: "2:1", note: "B4", dur: "8n" },
    { time: "2:2", note: "A4", dur: "4n" },
    { time: "2:3", note: "G4", dur: "8n" },
    { time: "3:0", note: "E4", dur: "2n" },
    { time: "4:0", note: "G4", dur: "8n" },
    { time: "4:1", note: "A4", dur: "8n" },
    { time: "4:2", note: "B4", dur: "4n" },
    { time: "4:3", note: "A4", dur: "8n" },
    { time: "5:0", note: "G4", dur: "4n" },
    { time: "5:2", note: "E4", dur: "8n" },
    { time: "5:3", note: "D4", dur: "8n" },
    { time: "6:0", note: "C4", dur: "4n" },
    { time: "6:2", note: "D4", dur: "4n" },
    { time: "7:0", note: "E4", dur: "2n" },
  ];

  async function start() {
    if (started) return;
    await Tone.start();
    started = true;

    const reverb = new Tone.Reverb({ decay: 3.5, wet: 0.35 }).toDestination();
    await reverb.ready;
    const delay = new Tone.FeedbackDelay("8n.", 0.18).connect(reverb);

    melody = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0.05, release: 1.2 },
      volume: -16,
    }).connect(delay);

    pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 1.5, decay: 2, sustain: 0.4, release: 3 },
      volume: -26,
    }).connect(reverb);

    chime = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.8, sustain: 0, release: 1.5 },
      volume: -12,
    }).connect(reverb);

    sparkle = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.8 },
      volume: -18,
    }).connect(delay);

    narrationFilter = new Tone.Filter({ frequency: 400, type: "bandpass", Q: 2 }).connect(reverb);
    narrationGain = new Tone.Gain(0).connect(narrationFilter);
    narrationNoise = new Tone.Noise({ type: "pink", volume: -22 }).connect(narrationGain);

    Tone.getTransport().bpm.value = 72;

    melodyPart = new Tone.Part((time, v) => {
      melody.triggerAttackRelease(v.note, v.dur, time);
    }, notes.map(n => ({ time: n.time, note: n.note, dur: n.dur })));
    melodyPart.loop = true;
    melodyPart.loopEnd = "8:0";

    padSeq = new Tone.Sequence((time, chord) => {
      pad.triggerAttackRelease(chord, "2n", time);
    }, [["C3","E3","G3"], ["A2","C3","E3"], ["F2","A2","C3"], ["G2","B2","D3"]], "2m");

    melodyPart.start(0);
    padSeq.start(0);
    Tone.getTransport().start();
  }

  function playTransition() {
    if (!started) return;
    const t = Tone.now();
    chime.triggerAttackRelease("E5", "8n", t);
    chime.triggerAttackRelease("A5", "16n", t + 0.12);
  }

  function playMagic() {
    if (!started) return;
    const t = Tone.now();
    sparkle.triggerAttackRelease(["E5","G5"], "16n", t);
    sparkle.triggerAttackRelease(["A5","C6"], "16n", t + 0.1);
    sparkle.triggerAttackRelease(["E6"], "8n", t + 0.2);
  }

  function playComplete() {
    if (!started) return;
    const t = Tone.now();
    ["C5","E5","G5","C6"].forEach((n, i) => sparkle.triggerAttackRelease([n], "4n", t + i * 0.15));
  }

  function startNarration() {
    if (!started) return;
    narrationNoise.start();
    narrationGain.gain.rampTo(0.55, 0.3);
    const loop = new Tone.Loop((time) => {
      narrationFilter.frequency.setValueAtTime(250 + Math.random() * 400, time);
    }, "8n");
    loop.start();
    return loop;
  }

  function stopNarration(loop) {
    if (!started) return;
    narrationGain.gain.rampTo(0, 0.5);
    setTimeout(() => { try { narrationNoise.stop(); } catch(e) {} if (loop) loop.stop(); }, 600);
  }

  function pause()  { if (started) Tone.getTransport().pause(); }
  function resume() { if (started) Tone.getTransport().start(); }
  function setMuted(m) { Tone.getDestination().mute = m; }

  return { start, playTransition, playMagic, playComplete, startNarration, stopNarration, pause, resume, setMuted, isStarted: () => started };
}

/* ═══════════════════════════════════════════
   SVG ILLUSTRATIONS
   ═══════════════════════════════════════════ */
const WatercolorScene1 = () => (
  <svg viewBox="0 0 400 210" style={{ width: "100%", borderRadius: 12, display: "block" }}>
    <defs>
      <filter id="wc1"><feTurbulence baseFrequency="0.04" numOctaves="4" seed="2" /><feDisplacementMap in="SourceGraphic" scale="6" /></filter>
      <radialGradient id="sky1" cx="50%" cy="30%"><stop offset="0%" stopColor="#FFD4A8" /><stop offset="100%" stopColor="#F5C882" /></radialGradient>
    </defs>
    <rect width="400" height="210" fill="url(#sky1)" rx="12" />
    <ellipse cx="100" cy="210" rx="160" ry="70" fill="#5B8C5A" opacity="0.5" filter="url(#wc1)" />
    <ellipse cx="320" cy="210" rx="140" ry="55" fill="#3D6B4F" opacity="0.6" filter="url(#wc1)" />
    <g transform="translate(180, 35)" filter="url(#wc1)">
      <polygon points="30,0 0,42 60,42" fill="#D4A843" opacity="0.85" />
      <polygon points="30,11 8,42 52,42" fill="#C67A4A" opacity="0.7" />
      <rect x="15" y="42" width="30" height="48" fill="#C67A4A" opacity="0.8" />
      <rect x="10" y="90" width="40" height="11" fill="#8B5E3C" opacity="0.7" />
      <circle cx="30" cy="4" r="3" fill="#D4A843" />
    </g>
    <g transform="translate(88, 60)">
      <ellipse rx="10" ry="6" fill="#D4A843" opacity="0.7" transform="rotate(-20)" />
      <ellipse cx="7" cy="-2" rx="8" ry="5" fill="#E0BD6A" opacity="0.6" transform="rotate(15)" />
    </g>
    <g transform="translate(138, 125)">
      <circle r="11" fill="#E8C9A0" opacity="0.9" />
      <circle cx="-4" cy="-2" r="1" fill="#3E2723" /><circle cx="4" cy="-2" r="1" fill="#3E2723" />
      <path d="M-3,3 Q0,6 3,3" fill="none" stroke="#C67A4A" strokeWidth="1" />
      <circle cx="-7" cy="1" r="2.5" fill="#F5DEB3" opacity="0.6" /><circle cx="7" cy="1" r="2.5" fill="#F5DEB3" opacity="0.6" />
    </g>
  </svg>
);

const WatercolorScene2 = () => (
  <svg viewBox="0 0 400 210" style={{ width: "100%", borderRadius: 12, display: "block" }}>
    <defs>
      <filter id="wc2"><feTurbulence baseFrequency="0.03" numOctaves="3" seed="8" /><feDisplacementMap in="SourceGraphic" scale="5" /></filter>
      <radialGradient id="cave" cx="50%" cy="40%"><stop offset="0%" stopColor="#8B7355" /><stop offset="80%" stopColor="#4A3728" /></radialGradient>
    </defs>
    <rect width="400" height="210" fill="url(#cave)" rx="12" />
    <ellipse cx="200" cy="70" rx="105" ry="60" fill="#2C1810" opacity="0.4" filter="url(#wc2)" />
    <polygon points="80,170 90,115 100,170" fill="#D4A843" opacity="0.6" filter="url(#wc2)" />
    <polygon points="310,160 318,110 326,160" fill="#E0BD6A" opacity="0.5" filter="url(#wc2)" />
    <polygon points="150,180 156,145 162,180" fill="#C67A4A" opacity="0.4" filter="url(#wc2)" />
    {[1,2,3,4,5].map(i => <circle key={i} cx={55+i*55} cy={60+(i%3)*30} r={1.5+(i%2)} fill="#FFE4B5" opacity={0.3+(i%3)*0.2} />)}
    <g transform="translate(200, 135)">
      <circle r="11" fill="#E8C9A0" opacity="0.9" />
      <circle cx="-4" cy="-2" r="1" fill="#3E2723" /><circle cx="4" cy="-2" r="1" fill="#3E2723" />
    </g>
  </svg>
);

/* ═══════════════════════════════════════════
   MICRO COMPONENTS
   ═══════════════════════════════════════════ */
const PulsingDots = () => {
  const [f, setF] = useState(0);
  useEffect(() => { const t = setInterval(() => setF(v => (v+1)%4), 400); return () => clearInterval(t); }, []);
  return <span style={{ letterSpacing: 2 }}>{"●".repeat(f||1).padEnd(3,"○")}</span>;
};

const Waveform = ({ playing }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => { if (!playing) return; const t = setInterval(() => setTick(k => k+1), 110); return () => clearInterval(t); }, [playing]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 26 }}>
      {Array.from({ length: 28 }, (_, i) => (
        <div key={i} style={{
          width: 2.5, borderRadius: 2,
          height: playing ? 4 + Math.abs(Math.sin((tick + i) * 0.5)) * 20 : 3,
          background: playing ? COLORS.terracotta : COLORS.textSecondary,
          transition: "height 0.1s ease", opacity: playing ? 0.85 : 0.3,
        }} />
      ))}
    </div>
  );
};

const ChoiceTyping = () => {
  const text = "Follow the golden butterfly!";
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const d = setTimeout(() => {
      const t = setInterval(() => setShown(s => { if (s >= text.length) { clearInterval(t); return s; } return s+1; }), 50);
      return () => clearInterval(t);
    }, 1000);
    return () => clearTimeout(d);
  }, []);
  return <span>{text.slice(0, shown)}<span style={{ opacity: shown < text.length ? 1 : 0, color: COLORS.terracotta }}>|</span></span>;
};

const Field = ({ label, value }) => (
  <div>
    <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    <div style={{ padding: "8px 12px", borderRadius: 7, border: `2px solid ${COLORS.forest}`, background: `${COLORS.forest}10`, fontFamily: "Inter,sans-serif", fontSize: 12.5, color: COLORS.textPrimary }}>{value}</div>
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN COMPONENTS
   ═══════════════════════════════════════════ */
const Landing = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.cream, padding: "28px 34px", textAlign: "center" }}>
    <div style={{ fontSize: 10, letterSpacing: 4, color: COLORS.terracotta, textTransform: "uppercase", marginBottom: 12, fontFamily: "Inter,sans-serif" }}>✦ Bilingual Family Storytelling ✦</div>
    <h1 style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 46, fontWeight: 700, color: COLORS.brown, margin: 0, lineHeight: 1.1 }}>StoryBridge</h1>
    <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 16, color: COLORS.textSecondary, maxWidth: 320, marginTop: 12, lineHeight: 1.6, fontStyle: "italic" }}>Where languages meet through the magic of storytelling</p>
    <div style={{ marginTop: 26, padding: "12px 32px", background: COLORS.terracotta, color: COLORS.white, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, letterSpacing: 0.5 }}>Begin a Story</div>
    <p style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 16, fontFamily: "Inter,sans-serif", opacity: 0.55 }}>Supporting 20+ languages · Powered by Gemini AI</p>
  </div>
);

const Setup = () => (
  <div style={{ height: "100%", background: COLORS.cream, padding: "18px 26px", overflowY: "auto" }}>
    <h2 style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 22, color: COLORS.brown, margin: "0 0 2px" }}>Create Your Story</h2>
    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: COLORS.textSecondary, margin: "0 0 14px" }}>Tell us about your family's story</p>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Field label="Home Language" value="မြန်မာ (Burmese)" />
      <Field label="Child's Age" value="5 years old" />
      <Field label="Story Theme" value="🏯 Magical Adventure" />
      <div>
        <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Cultural Elements</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["🎉 Thingyan", "🌿 Thanaka", "🏛️ Pagodas"].map(t => (
            <span key={t} style={{ padding: "4px 11px", borderRadius: 18, background: COLORS.forest, color: COLORS.white, fontSize: 11, fontFamily: "Inter,sans-serif" }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
    <div style={{ marginTop: 16, padding: "11px 0", background: COLORS.terracotta, color: COLORS.white, borderRadius: 8, textAlign: "center", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600 }}>✦ Begin the Story</div>
  </div>
);

const Loading = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.cream, padding: 32, textAlign: "center" }}>
    <div style={{ position: "relative", width: 68, height: 68, marginBottom: 18 }}>
      <div style={{ width: 68, height: 68, border: `3px solid ${COLORS.creamDark}`, borderTopColor: COLORS.terracotta, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📖</div>
    </div>
    <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 18, color: COLORS.brown, margin: 0 }}>Weaving your story<PulsingDots /></p>
    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: COLORS.textSecondary, marginTop: 5, opacity: 0.7 }}>Story Architect is creating a bilingual adventure</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProgressDots = ({ active }) => (
  <div style={{ display: "flex", gap: 3 }}>{[1,2,3,4,5].map(i => <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i <= active ? COLORS.terracotta : COLORS.creamDark }} />)}</div>
);

const Scene1 = () => (
  <div style={{ height: "100%", background: COLORS.cream, padding: "14px 22px", overflowY: "auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: COLORS.terracotta, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Scene 1 of 5</span>
      <ProgressDots active={1} />
    </div>
    <WatercolorScene1 />
    <div style={{ marginTop: 10 }}>
      <div style={{ padding: "9px 12px", background: `${COLORS.gold}18`, borderRadius: 8, borderLeft: `3px solid ${COLORS.gold}`, marginBottom: 7 }}>
        <div style={{ fontFamily: "'Noto Sans Myanmar','Padauk',sans-serif", fontSize: 12.5, color: COLORS.brown, lineHeight: 1.8 }}>
          တစ်ချိန်တုန်းက ရွှေရောင်ဘုရားတော်နှင့် နီးသော ရွာငယ်လေးတွင် သီရိ ဟုခေါ်သော မိန်းကလေးငယ်တစ်ဦး နေထိုင်ခဲ့သည်။
        </div>
      </div>
      <div style={{ padding: "9px 12px", background: `${COLORS.forest}10`, borderRadius: 8, borderLeft: `3px solid ${COLORS.forest}` }}>
        <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 1.7, margin: 0 }}>
          Once upon a time, in a small village near the golden pagoda, there lived a little girl named Thiri who loved chasing butterflies.
        </p>
      </div>
    </div>
  </div>
);

const Narration = () => (
  <div style={{ height: "100%", background: COLORS.cream, padding: "14px 22px", overflowY: "auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: COLORS.terracotta, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Scene 1 of 5</span>
      <ProgressDots active={1} />
    </div>
    <WatercolorScene1 />
    <div style={{ marginTop: 10, padding: "13px 16px", background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.creamDark}`, boxShadow: "0 2px 10px rgba(62,39,35,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: COLORS.terracotta, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <div style={{ width: 0, height: 0, borderLeft: "10px solid white", borderTop: "6px solid transparent", borderBottom: "6px solid transparent", marginLeft: 2 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Inter,sans-serif", fontSize: 10.5, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>🔊 Now playing — Burmese narration</div>
          <Waveform playing={true} />
        </div>
      </div>
      <div style={{ marginTop: 8, height: 3, background: COLORS.creamDark, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: "45%", height: "100%", background: COLORS.terracotta, borderRadius: 2, animation: "prog 4.5s linear forwards" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 9.5, color: COLORS.textSecondary }}>0:08</span>
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 9.5, color: COLORS.textSecondary }}>0:18</span>
      </div>
    </div>
    <style>{`@keyframes prog { from { width: 25%; } to { width: 88%; } }`}</style>
  </div>
);

const Choice = () => (
  <div style={{ height: "100%", background: COLORS.cream, padding: "14px 22px", overflowY: "auto" }}>
    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: COLORS.terracotta, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Your Turn!</span>
    <div style={{ marginTop: 10, padding: "16px 18px", background: `${COLORS.gold}15`, borderRadius: 14, border: `2px solid ${COLORS.gold}40`, textAlign: "center" }}>
      <div style={{ fontSize: 26, marginBottom: 6 }}>✨</div>
      <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 16, color: COLORS.brown, lineHeight: 1.6, margin: 0 }}>Thiri stands at the crossroads. A golden butterfly beckons her toward the ancient forest, while a crystal cave glows in the distance.</p>
      <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 14, color: COLORS.terracotta, fontStyle: "italic", margin: "8px 0 0" }}>What should Thiri do?</p>
    </div>
    <div style={{ marginTop: 12, padding: "9px 12px", background: COLORS.white, borderRadius: 8, border: `2px solid ${COLORS.forest}`, fontFamily: "Inter,sans-serif", fontSize: 13.5, color: COLORS.textPrimary, minHeight: 16 }}>
      <ChoiceTyping />
    </div>
    <div style={{ marginTop: 10, padding: "10px 0", background: COLORS.forest, color: COLORS.white, borderRadius: 8, textAlign: "center", fontFamily: "Inter,sans-serif", fontSize: 12.5, fontWeight: 600 }}>Continue the Story →</div>
  </div>
);

const Scene2 = () => (
  <div style={{ height: "100%", background: COLORS.cream, padding: "14px 22px", overflowY: "auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10, color: COLORS.terracotta, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Scene 2 of 5</span>
      <ProgressDots active={2} />
    </div>
    <WatercolorScene2 />
    <div style={{ marginTop: 10 }}>
      <div style={{ padding: "9px 12px", background: `${COLORS.gold}18`, borderRadius: 8, borderLeft: `3px solid ${COLORS.gold}`, marginBottom: 7 }}>
        <div style={{ fontFamily: "'Noto Sans Myanmar','Padauk',sans-serif", fontSize: 12.5, color: COLORS.brown, lineHeight: 1.8 }}>
          ရွှေရောင်လိပ်ပြာသည် သီရိအား သစ်တောအတွင်းသို့ ဦးဆောင်သွားပါသည်။
        </div>
      </div>
      <div style={{ padding: "9px 12px", background: `${COLORS.forest}10`, borderRadius: 8, borderLeft: `3px solid ${COLORS.forest}` }}>
        <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 1.7, margin: 0 }}>
          The golden butterfly led Thiri deep into the ancient forest, where she discovered a mysterious crystal cave humming with warm, gentle light.
        </p>
      </div>
    </div>
  </div>
);

const Complete = () => (
  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.cream, padding: 32, textAlign: "center" }}>
    <div style={{ fontSize: 42, marginBottom: 12 }}>📖✨</div>
    <h2 style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 24, color: COLORS.brown, margin: "0 0 5px" }}>Story Complete</h2>
    <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 14, color: COLORS.textSecondary, maxWidth: 280, lineHeight: 1.6, fontStyle: "italic" }}>Thiri's adventure through the golden pagoda and crystal cave has come to a beautiful end.</p>
    <div style={{ display: "flex", gap: 9, marginTop: 22 }}>
      <div style={{ padding: "9px 20px", background: COLORS.terracotta, color: COLORS.white, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600 }}>New Story</div>
      <div style={{ padding: "9px 20px", background: "transparent", color: COLORS.forest, borderRadius: 8, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 600, border: `2px solid ${COLORS.forest}` }}>Read Again</div>
    </div>
    <div style={{ marginTop: 20, padding: "7px 12px", background: `${COLORS.gold}15`, borderRadius: 8 }}>
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 10.5, color: COLORS.textSecondary }}>5 scenes · 2 languages bridged · 1 magical bedtime 🌙</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN CONFIG
   ═══════════════════════════════════════════ */
const screens = [
  { id: "landing",   comp: Landing,   duration: 3500,  label: "Landing Page",             sound: "transition" },
  { id: "setup",     comp: Setup,     duration: 4500,  label: "Story Setup",              sound: "transition" },
  { id: "loading",   comp: Loading,   duration: 2800,  label: "Generating Story",         sound: "transition" },
  { id: "scene1",    comp: Scene1,    duration: 5000,  label: "Scene 1 — Bilingual Story", sound: "magic" },
  { id: "narration", comp: Narration, duration: 4500,  label: "Audio Narration",          sound: "narration" },
  { id: "choice",    comp: Choice,    duration: 4500,  label: "Interactive Choice",        sound: "magic" },
  { id: "scene2",    comp: Scene2,    duration: 5000,  label: "Scene 2 — Continues",      sound: "magic" },
  { id: "complete",  comp: Complete,  duration: 4000,  label: "Story Complete",            sound: "complete" },
];

/* ═══════════════════════════════════════════
   MAIN PLAYER
   ═══════════════════════════════════════════ */
export default function StoryBridgeDemo() {
  const [current, setCurrent] = useState(0);
  const [trans, setTrans] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audio = useRef(null);
  const narLoop = useRef(null);

  useEffect(() => { audio.current = createAudioEngine(); }, []);

  const startAudio = async () => {
    if (audio.current && !audio.current.isStarted()) {
      await audio.current.start();
      setAudioReady(true);
    }
  };

  const goTo = useCallback((idx) => {
    if (screens[current]?.sound === "narration" && narLoop.current) {
      audio.current?.stopNarration(narLoop.current);
      narLoop.current = null;
    }
    setTrans(true);
    setTimeout(() => {
      setCurrent(idx);
      setProgress(0);
      setTrans(false);
      const e = audio.current;
      if (!e || !e.isStarted()) return;
      const s = screens[idx]?.sound;
      if (s === "transition") e.playTransition();
      else if (s === "magic") e.playMagic();
      else if (s === "complete") e.playComplete();
      else if (s === "narration") { narLoop.current = e.startNarration(); }
    }, 350);
  }, [current]);

  useEffect(() => {
    if (paused) return;
    const dur = screens[current].duration;
    const step = (50 / dur) * 100;
    const t = setInterval(() => {
      setProgress(p => { if (p >= 100) { clearInterval(t); goTo((current+1) % screens.length); return 0; } return p + step; });
    }, 50);
    return () => clearInterval(t);
  }, [current, paused, goTo]);

  useEffect(() => {
    if (!audio.current?.isStarted()) return;
    paused ? audio.current.pause() : audio.current.resume();
  }, [paused]);

  useEffect(() => {
    if (audio.current?.isStarted()) audio.current.setMuted(muted);
  }, [muted]);

  const Screen = screens[current].comp;

  return (
    <div style={{ fontFamily: "Inter,sans-serif", maxWidth: 520, margin: "0 auto", padding: "8px 0" }}>
      {/* Audio prompt */}
      {!audioReady && (
        <div onClick={startAudio} style={{
          textAlign: "center", padding: "9px 0", marginBottom: 7,
          background: `${COLORS.terracotta}12`, borderRadius: 10, cursor: "pointer",
          border: `1px dashed ${COLORS.terracotta}60`, transition: "background 0.2s",
        }}>
          <span style={{ fontSize: 12.5, color: COLORS.terracotta, fontWeight: 600 }}>🔊 Tap to enable ambient audio</span>
          <span style={{ fontSize: 10, color: COLORS.textSecondary, display: "block", marginTop: 1 }}>Music-box melody · transition chimes · narration hum</span>
        </div>
      )}

      {/* Browser chrome */}
      <div style={{
        borderRadius: 14, overflow: "hidden",
        boxShadow: "0 8px 40px rgba(62,39,35,0.12), 0 2px 8px rgba(62,39,35,0.06)",
        border: "1px solid #E0D5C5", background: COLORS.white,
      }}>
        {/* Title bar */}
        <div style={{ padding: "8px 13px", background: "#F5F0EA", borderBottom: "1px solid #E0D5C5", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF6058" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28CA42" }} />
          </div>
          <div style={{ flex: 1, padding: "4px 11px", borderRadius: 6, background: COLORS.white, fontSize: 10.5, color: COLORS.textSecondary, display: "flex", alignItems: "center", gap: 5, border: "1px solid #E0D5C5" }}>
            <span style={{ opacity: 0.4 }}>🔒</span><span>storybridge-app.run.app</span>
          </div>
          {/* Audio badge */}
          {audioReady && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: muted ? "#ccc" : "#28CA42", animation: muted ? "none" : "pulse 2s infinite" }} />
              <span style={{ fontSize: 9, color: COLORS.textSecondary }}>{muted ? "Muted" : "♫"}</span>
            </div>
          )}
        </div>

        {/* Viewport */}
        <div style={{ height: 470, overflow: "hidden", position: "relative" }}>
          <div style={{
            opacity: trans ? 0 : 1,
            transform: trans ? "scale(0.97) translateY(5px)" : "scale(1) translateY(0)",
            transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
            height: "100%",
          }}>
            <Screen />
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: "8px 13px", background: "#F5F0EA", borderTop: "1px solid #E0D5C5", display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {screens.map((s, i) => (
              <button key={s.id} onClick={() => goTo(i)} title={s.label} style={{
                width: i === current ? 20 : 7, height: 7, borderRadius: 4, border: "none",
                background: i === current ? COLORS.terracotta : i < current ? COLORS.forestLight : "#D5CEC4",
                cursor: "pointer", transition: "all 0.3s ease", padding: 0,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 9.5, color: COLORS.textSecondary, fontWeight: 500, minWidth: 120, textAlign: "right" }}>{screens[current].label}</span>
          {audioReady && (
            <button onClick={() => setMuted(!muted)} title={muted ? "Unmute" : "Mute"} style={{
              width: 26, height: 26, borderRadius: 5, border: "1px solid #D5CEC4",
              background: COLORS.white, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 13, padding: 0,
            }}>{muted ? "🔇" : "🔊"}</button>
          )}
          <button onClick={() => setPaused(!paused)} style={{
            width: 26, height: 26, borderRadius: 5, border: "1px solid #D5CEC4",
            background: COLORS.white, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 11, padding: 0,
          }}>{paused ? "▶" : "⏸"}</button>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: "#E0D5C5" }}>
          <div style={{ height: "100%", background: COLORS.terracotta, width: `${Math.min(progress,100)}%`, transition: "width 0.05s linear" }} />
        </div>
      </div>

      {/* Caption */}
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <p style={{ fontFamily: "'Crimson Pro',Georgia,serif", fontSize: 13, color: COLORS.textSecondary, margin: 0, fontStyle: "italic" }}>StoryBridge — Bilingual Family Storytelling Companion</p>
        <p style={{ fontSize: 9.5, color: "#A09484", marginTop: 2 }}>Gemini Live Agent Challenge · Built by Pyae Sone Kyaw</p>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
