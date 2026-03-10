import { useState, useRef, useCallback, useEffect } from "react";
import {
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, ReferenceLine, ResponsiveContainer, CartesianGrid, Line
} from "recharts";
import katex from "katex";
import "katex/dist/katex.min.css";

if (typeof document !== 'undefined') {
  document.body.style.background = '#060d18';
  document.documentElement.style.background = '#060d18';
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.body.style.margin = '0';
}

/* ── Math Helpers ─────────────────────────────────────────────── */
const normalPDF = (x, mu = 0, si = 1) =>
  Math.exp(-0.5 * ((x - mu) / si) ** 2) / (si * Math.sqrt(2 * Math.PI));
const normalCDF = (x) => {
  const z = Math.abs(x), s = x >= 0 ? 1 : -1;
  const t = 1 / (1 + 0.3275911 * z);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return 0.5 * (1 + s * (1 - poly * Math.exp(-z * z)));
};
const tPVal = (t, df) => 2 * (1 - normalCDF(Math.abs(t) * (1 - 1 / (4 * Math.max(df, 4)))));
const arrMean = a => a.reduce((s, x) => s + x, 0) / a.length;
const arrSD = a => { const m = arrMean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const pearsonR = (xs, ys) => {
  const mx = arrMean(xs), my = arrMean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return den === 0 ? 0 : num / den;
};
const linReg = (xs, ys) => {
  const mx = arrMean(xs), my = arrMean(ys);
  const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return { a: my - b * mx, b };
};
const ttest2 = (a, b) => {
  const ma = arrMean(a), mb = arrMean(b), sa = arrSD(a), sb = arrSD(b);
  const se = Math.sqrt(sa ** 2 / a.length + sb ** 2 / b.length);
  const t = (ma - mb) / se;
  const df = Math.floor((sa ** 2 / a.length + sb ** 2 / b.length) ** 2 / ((sa ** 2 / a.length) ** 2 / (a.length - 1) + (sb ** 2 / b.length) ** 2 / (b.length - 1)));
  return { t, df, p: tPVal(t, df), d: (ma - mb) / Math.sqrt((sa ** 2 + sb ** 2) / 2), ma, mb };
};

/* ── Theme ────────────────────────────────────────────────────── */
const C = { bg: '#060d18', surface: '#0c1929', border: '#1a3050', teal: '#0dcfb2', tealDim: '#08a08a', amber: '#f59e0b', text: '#c8d8eb', muted: '#4a6a88', green: '#22c55e', red: '#ef4444', heading: '#e8f0fa', purple: '#a78bfa' };
const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 24px', marginBottom: 16 };
const mono = { fontFamily: "'Courier New', monospace" };
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" };

/* ── KaTeX Renderer ───────────────────────────────────────────── */
const Eq = ({ tex, block = false }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) katex.render(tex, ref.current, { throwOnError: false, displayMode: block });
  }, [tex, block]);
  return <span ref={ref} style={{ display: block ? 'block' : 'inline-block', textAlign: block ? 'center' : 'inherit', padding: block ? '10px 0' : '0 2px', color: C.heading }} />;
};

/* ── Explainer Panel ──────────────────────────────────────────── */
const Explainer = ({ symbols, worked }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: `1px solid ${C.teal}44`, borderRadius: 8, padding: '8px 16px', color: C.teal, cursor: 'pointer', fontSize: 14, fontWeight: 600, width: '100%' }}>
        <span>{open ? '▾' : '▸'}</span>
        {open ? 'Hide explanation' : '📖  Unpack this equation'}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: '#071220', border: `1px solid ${C.teal}33`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ color: C.teal, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>What each symbol means</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {symbols.map(([sym, plain, note], i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: '7px 12px 7px 0', width: 80, verticalAlign: 'top' }}><Eq tex={sym} /></td>
                    <td style={{ padding: '7px 12px', color: C.text, fontSize: 14, fontWeight: 600, verticalAlign: 'top', width: 160 }}>{plain}</td>
                    <td style={{ padding: '7px 0', color: C.muted, fontSize: 13, verticalAlign: 'top' }}>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '14px 18px' }}>
            <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Worked example — dissertation data</div>
            {worked.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.amber + '33', border: `1px solid ${C.amber}66`, color: C.amber, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontSize: 14, marginBottom: step.eq ? 4 : 0 }}>{step.text}</div>
                  {step.eq && <div style={{ background: C.bg, borderRadius: 6, padding: '6px 12px', marginTop: 4 }}><Eq block tex={step.eq} /></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Reusable UI ──────────────────────────────────────────────── */
const Badge = ({ children, color = C.teal }) => (
  <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, ...mono }}>{children}</span>
);
const Num = ({ v, dec = 3, color }) => (
  <span style={{ color: color || C.teal, fontWeight: 700, fontSize: 20, ...mono }}>{typeof v === 'number' ? v.toFixed(dec) : v}</span>
);
const StatBox = ({ label, value, dec = 3, color }) => (
  <div style={{ textAlign: 'center', padding: '10px 16px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
    <div style={{ color: C.muted, fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    <Num v={value} dec={dec} color={color} />
  </div>
);
const Slider = ({ label, value, min, max, step = 0.1, onChange, color = C.teal }) => (
  <label style={{ display: 'block', marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ color: C.text, fontSize: 14 }}>{label}</span>
      <span style={{ color, ...mono, fontWeight: 700 }}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} style={{ width: '100%', accentColor: color }} />
  </label>
);
const Quiz = ({ question, options, correct, explanation, onPass }) => {
  const [sel, setSel] = useState(null);
  const answered = sel !== null;
  return (
    <div style={{ ...card, borderColor: C.tealDim + '88', background: '#0a1f2e' }}>
      <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Check Your Understanding</div>
      <div style={{ color: C.heading, marginBottom: 16, fontSize: 16 }}>{question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {options.map((opt, i) => {
          let bg = C.surface, border = C.border, color = C.text;
          if (answered) {
            if (i === correct) { bg = C.green + '22'; border = C.green; color = C.green; }
            else if (i === sel) { bg = C.red + '22'; border = C.red; color = C.red; }
          }
          return (
            <button key={i} onClick={() => { if (!answered) { setSel(i); if (i === correct && onPass) onPass(); } }}
              style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '10px 14px', color, textAlign: 'left', cursor: answered ? 'default' : 'pointer', fontSize: 15, transition: 'all 0.2s' }}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && <div style={{ marginTop: 12, color: C.text, fontSize: 14, padding: '10px 14px', background: C.bg, borderRadius: 8, borderLeft: `3px solid ${sel === correct ? C.green : C.amber}` }}>{explanation}</div>}
    </div>
  );
};

/* ── MODULE 1: Descriptive Stats ─────────────────────────────── */
const Mod1 = ({ onPass }) => {
  const [vals, setVals] = useState([2, 3, 4, 4, 47]);
  const sorted = [...vals].sort((a, b) => a - b);
  const m = arrMean(vals), s = arrSD(vals);
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          Adjust the five scores. Watch how the <strong style={{ color: C.amber }}>outlier</strong> drags the mean while the median stays put.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`\bar{x} = \frac{\sum x_i}{n} \qquad s = \sqrt{\frac{\sum(x_i - \bar{x})^2}{n-1}}`} />
          <Eq block tex={String.raw`\tilde{x} = \begin{cases} x_{(n+1)/2} & \text{if } n \text{ is odd} \\[6pt] \dfrac{x_{(n/2)} + x_{(n/2)+1}}{2} & \text{if } n \text{ is even} \end{cases}`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`\bar{x}`, "Sample mean", "Pronounced 'x-bar'. The arithmetic average of your scores."],
            [String.raw`\tilde{x}`, "Median", "Pronounced 'x-tilde'. The middle value of the sorted dataset. Defined by position, not arithmetic."],
            [String.raw`x_{(k)}`, "Order statistic", "The value at position k in the sorted list. x₍₁₎ is the minimum, x₍ₙ₎ is the maximum."],
            [String.raw`\sum`, "Sum of", "Greek capital sigma — add up everything that follows."],
            [String.raw`x_i`, "Each score", "Subscript i means each individual value in your dataset."],
            [String.raw`n`, "Sample size", "How many scores you have. Here n=5; your dissertation had n=167."],
            [String.raw`s`, "Standard deviation", "Average distance of scores from the mean, in the original units."],
            [String.raw`s^2`, "Variance", "SD squared. Penalises large deviations more. Used in many formulas."],
          ]}
          worked={[
            { text: "Scores: 2, 3, 4, 4, 47. Add them.", eq: String.raw`\sum x_i = 2+3+4+4+47 = 60` },
            { text: "Divide by n=5.", eq: String.raw`\bar{x} = \frac{60}{5} = 12.0` },
            { text: "Subtract mean from each score, square, sum.", eq: String.raw`(2{-}12)^2+(3{-}12)^2+(4{-}12)^2+(4{-}12)^2+(47{-}12)^2 = 100+81+64+64+1225 = 1534` },
            { text: "Divide by n−1=4, take square root.", eq: String.raw`s = \sqrt{\frac{1534}{4}} = \sqrt{383.5} \approx 19.58` },
            { text: "Median: n=5 is odd, so take position (5+1)/2 = 3. Sorted list: [2, 3, 4, 4, 47]. The value at position 3 is:", eq: String.raw`\tilde{x} = x_{(3)} = 4` },
            { text: "Mean (12) ≫ Median (4). The outlier 47 inflates the mean but cannot move the median — it only affects rank, not arithmetic.", eq: null },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {vals.map((v, i) => (
            <Slider key={i} label={`Score ${i + 1}${i === 4 ? ' (outlier)' : ''}`} value={v} min={1} max={50} step={1}
              color={i === 4 ? C.amber : C.teal} onChange={nv => setVals(vs => vs.map((x, j) => j === i ? nv : x))} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatBox label="Mean" value={m} dec={2} />
          <StatBox label="Median" value={median} dec={2} color={C.green} />
          <StatBox label="SD" value={s} dec={2} color={C.amber} />
          <StatBox label="Variance" value={s ** 2} dec={2} color={C.purple} />
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.muted }}>
          <span style={{ color: C.text }}>Mean − Median gap: </span>
          <span style={{ color: Math.abs(m - median) > 3 ? C.amber : C.green, ...mono, fontWeight: 700 }}>{(m - median).toFixed(2)}</span>
          <span style={{ marginLeft: 8 }}>{Math.abs(m - median) > 3 ? '⚠ Skewed — median tells a more honest story' : '✓ Roughly symmetric'}</span>
        </div>
      </div>
      <Quiz question="Cyber-aggression scores: [1,1,2,2,3,89]. Which measure best represents the sample?"
        options={["Mean — uses all the data", "Median — robust to that outlier", "Mode — most common value", "Variance — captures the spread"]}
        correct={1} explanation="Median=2. Mean≈16.3, dragged up by 89. For skewed data, report both and justify your choice."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 2: Normal Distribution ───────────────────────────── */
const Mod2 = ({ onPass }) => {
  const [mu, setMu] = useState(0), [sigma, setSigma] = useState(1), [score, setScore] = useState(1.5);
  const z = (score - mu) / sigma;
  const pct = normalCDF(z) * 100;
  const pts = Array.from({ length: 80 }, (_, i) => { const x = mu - 4 * sigma + i * sigma * 8 / 79; return { x: +x.toFixed(3), y: normalPDF(x, mu, sigma) }; });
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          Adjust μ and σ to reshape the curve. Move the score line to read off z-score and percentile.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`z = \frac{x - \mu}{\sigma} \qquad f(x) = \frac{1}{\sigma\sqrt{2\pi}}\,e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`z`, "Z-score", "How many SDs above or below the mean a score sits. Unitless — works on any scale."],
            [String.raw`x`, "Observed score", "The raw value you want to locate on the distribution."],
            [String.raw`\mu`, "Population mean", "Pronounced 'mew'. Centre of the distribution. (Samples use x̄.)"],
            [String.raw`\sigma`, "Population SD", "Pronounced 'sigma'. Spread. (Samples use s.)"],
            [String.raw`f(x)`, "Probability density", "Height of the curve at x. Higher = more people score there."],
            [String.raw`e`, "Euler's number", "≈ 2.718. A mathematical constant. Software handles this — you never compute it by hand."],
          ]}
          worked={[
            { text: "Moral disengagement: μ=2.8, σ=0.6. Participant scores 4.0.", eq: null },
            { text: "Subtract mean.", eq: String.raw`x - \mu = 4.0 - 2.8 = 1.2` },
            { text: "Divide by SD.", eq: String.raw`z = \frac{1.2}{0.6} = 2.0` },
            { text: "Z=2.0: 2 SDs above average. The 68-95-99.7 rule: 95% fall within ±2 SDs, so only ~2.5% scored this high. Genuine outlier.", eq: null },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Slider label="Mean (μ)" value={mu} min={-3} max={3} step={0.1} onChange={setMu} />
          <Slider label="SD (σ)" value={sigma} min={0.3} max={3} step={0.1} onChange={setSigma} color={C.amber} />
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={pts} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="bellGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.teal} stopOpacity={0.5} />
                <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" tick={{ fill: C.muted, fontSize: 10 }} />
            <YAxis hide />
            <Area type="monotone" dataKey="y" stroke={C.teal} fill="url(#bellGrad)" dot={false} strokeWidth={2} />
            <ReferenceLine x={score} stroke={C.amber} strokeWidth={2} strokeDasharray="4 4" />
            <ReferenceLine x={mu} stroke={C.teal} strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ marginTop: 12 }}>
          <Slider label={`Score: ${score.toFixed(1)}`} value={score} min={mu - 4 * sigma} max={mu + 4 * sigma} step={0.1} onChange={setScore} color={C.amber} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 8 }}>
          <StatBox label="Z-score" value={z} dec={2} />
          <StatBox label="Percentile" value={pct} dec={1} color={C.amber} />
          <StatBox label="Direction" value={z > 0 ? 'Above mean' : 'Below mean'} dec={0} color={z > 0 ? C.green : C.red} />
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.text }}>
          Score {score.toFixed(1)} is <strong style={{ color: C.teal }}>{Math.abs(z).toFixed(2)} SDs {z >= 0 ? 'above' : 'below'} the mean</strong>. {pct.toFixed(1)}% of scores fall below it.
        </div>
      </div>
      <Quiz question="Moral disengagement: μ=2.8, σ=0.6. Participant scores 4.0. Z-score?"
        options={["z = 0.5", "z = 1.4", "z = 2.0", "z = −0.5"]}
        correct={2} explanation="z = (4.0−2.8)/0.6 = 1.2/0.6 = 2.0. Top ~2.3% of your sample."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 3: p-values ───────────────────────────────────────── */
const Mod3 = ({ onPass }) => {
  const [tVal, setTVal] = useState(2.1);
  const pts = Array.from({ length: 100 }, (_, i) => { const x = -5 + i * 0.1; return { x: +x.toFixed(2), y: normalPDF(x) }; });
  const p = tPVal(tVal, 100);
  const reject = p < 0.05;
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          Drag the t-value. The tails show P(result this extreme | H₀ true) — that probability <em>is</em> the p-value.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`p = P\!\left(|T| \geq |t_{\text{obs}}| \mid H_0\right) \qquad \text{reject } H_0 \text{ if } p < \alpha`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`p`, "p-value", "Probability of results this extreme if H₀ were true. NOT the probability H₀ is true."],
            [String.raw`T`, "Test statistic", "Your t-value. Signal-to-noise ratio."],
            [String.raw`t_{\text{obs}}`, "Observed t", "The t-value your actual sample produced."],
            [String.raw`H_0`, "Null hypothesis", "The 'no effect' assumption. 'AI factors do not predict cyber-aggression.'"],
            [String.raw`\alpha`, "Alpha", "Your threshold — usually .05. A convention, not a law. Some fields use .01 or .10."],
            [String.raw`|x|`, "Absolute value", "The two-tailed test checks both extremes (very high OR very low), hence the | |."],
          ]}
          worked={[
            { text: "Your dissertation: AI-related factors block gave ΔR²=.01, F-test p=.43.", eq: null },
            { text: "The question p=.43 answers: if AI factors truly had zero effect on cyber-aggression, how often would we see ΔR²≥.01 by chance?", eq: String.raw`p = P(\Delta R^2 \geq 0.01 \mid H_0) = .43` },
            { text: "43% of the time — far above α=.05. Not rare. Retain H₀.", eq: null },
            { text: "This does NOT mean AI factors have zero effect. It means any effect is too small to distinguish from noise at n=167. That IS your finding.", eq: null },
          ]}
        />
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={pts} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="tGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.teal} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.teal} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="x" tick={{ fill: C.muted, fontSize: 10 }} />
            <YAxis hide />
            <Area type="monotone" dataKey="y" stroke={C.teal} fill="url(#tGrad)" dot={false} strokeWidth={2} />
            <ReferenceLine x={tVal} stroke={C.amber} strokeWidth={2} label={{ value: `t=${tVal.toFixed(1)}`, fill: C.amber, fontSize: 11 }} />
            <ReferenceLine x={-tVal} stroke={C.amber} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <Slider label={`t-value: ${tVal.toFixed(2)}`} value={tVal} min={0} max={5} step={0.05} onChange={setTVal} color={C.amber} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 8 }}>
          <StatBox label="p-value" value={p} dec={4} color={reject ? C.green : C.red} />
          <StatBox label="p < .05?" value={reject ? 'Yes' : 'No'} dec={0} color={reject ? C.green : C.red} />
          <StatBox label="Decision" value={reject ? 'Reject H₀' : 'Retain H₀'} dec={0} color={reject ? C.green : C.amber} />
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.text, borderLeft: `3px solid ${reject ? C.green : C.amber}` }}>
          {reject ? `p=${p.toFixed(4)} — unlikely under H₀. Reject it.` : `p=${p.toFixed(4)} — not rare enough. Retain H₀. This does NOT prove H₀ is true.`}
        </div>
      </div>
      <Quiz question="ΔR²=.01, p=.43 for your AI-trust block. What does p=.43 mean?"
        options={["43% chance AI trust doesn't matter", "Results this large occur 43% of the time by chance if H₀ is true", "AI trust explains 43% of nothing", "The model is 43% wrong"]}
        correct={1} explanation="p=.43: assuming no real effect, ΔR²≥.01 happens 43% of the time just from sampling noise. Your null finding is legitimate."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 4: t-test ─────────────────────────────────────────── */
const Mod4 = ({ onPass }) => {
  const [gA, setGa] = useState("2.1,2.4,1.8,2.9,2.2,3.1,1.9,2.6");
  const [gB, setGb] = useState("3.8,4.1,3.5,4.4,3.9,4.8,3.6,4.2");
  const parse = s => s.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
  const a = parse(gA), b = parse(gB);
  const valid = a.length >= 3 && b.length >= 3;
  const res = valid ? ttest2(a, b) : null;
  const dLabel = res ? (Math.abs(res.d) < 0.2 ? 'negligible' : Math.abs(res.d) < 0.5 ? 'small' : Math.abs(res.d) < 0.8 ? 'medium' : 'large') : '';
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          Low vs. high moral disengagement groups. Edit comma-separated scores to explore.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`t = \frac{\bar{x}_1 - \bar{x}_2}{\sqrt{\dfrac{s_1^2}{n_1} + \dfrac{s_2^2}{n_2}}} \qquad d = \frac{\bar{x}_1 - \bar{x}_2}{s_{\text{pooled}}}`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`\bar{x}_1, \bar{x}_2`, "Group means", "The average score in each group. Numerator = difference between them."],
            [String.raw`s_1^2, s_2^2`, "Group variances", "Spread within each group. Larger variance = noisier data = harder to detect real differences."],
            [String.raw`n_1, n_2`, "Group sizes", "More participants = smaller denominator = larger t = easier to detect effects. This is power."],
            [String.raw`df`, "Degrees of freedom", "How much independent information your data contains. Determines the shape of the t-distribution. Lower df = fatter tails = need a larger t to reach p<.05."],
            [String.raw`s_{\text{pooled}}`, "Pooled SD", "Weighted average of both groups' SDs. Used for Cohen's d only."],
            [String.raw`d`, "Cohen's d", "Effect size. SDs between the two means. Small=0.2, Medium=0.5, Large=0.8."],
          ]}
          worked={[
            { text: "Group A (low disengagement, n=8): M=2.38, SD=0.44. Group B (high, n=8): M=4.04, SD=0.38.", eq: null },
            { text: "Standard error of the difference:", eq: String.raw`SE = \sqrt{\frac{0.44^2}{8} + \frac{0.38^2}{8}} = \sqrt{0.0242+0.018} \approx 0.205` },
            { text: "t-statistic:", eq: String.raw`t = \frac{2.38-4.04}{0.205} = \frac{-1.66}{0.205} \approx -8.10` },
            { text: "df via the Welch-Satterthwaite equation — it adjusts for unequal variances between groups. Maximum possible would be (n₁−1)+(n₂−1) = 14. Welch may reduce this if variances differ:", eq: String.raw`df = \frac{\left(\dfrac{s_1^2}{n_1}+\dfrac{s_2^2}{n_2}\right)^2}{\dfrac{(s_1^2/n_1)^2}{n_1-1}+\dfrac{(s_2^2/n_2)^2}{n_2-1}} = \frac{(0.0242+0.018)^2}{\dfrac{0.0242^2}{7}+\dfrac{0.018^2}{7}} \approx 14` },
            { text: "t=−8.10, df≈14, p<.001. Groups are clearly different.", eq: null },
            { text: "Cohen's d (pooled SD≈0.41):", eq: String.raw`d = \frac{|2.38-4.04|}{0.41} = \frac{1.66}{0.41} \approx 4.05 \text{ — very large effect}` },
          ]}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ color: C.teal, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Group A — Low Disengagement</div>
            <textarea value={gA} onChange={e => setGa(e.target.value)} rows={3}
              style={{ width: '100%', background: C.bg, color: C.text, border: `1px solid ${C.teal}44`, borderRadius: 6, padding: 8, fontSize: 13, resize: 'none', ...mono, boxSizing: 'border-box' }} />
            {a.length >= 3 && <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>n={a.length}, M={arrMean(a).toFixed(2)}, SD={arrSD(a).toFixed(2)}</div>}
          </div>
          <div>
            <div style={{ color: C.amber, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Group B — High Disengagement</div>
            <textarea value={gB} onChange={e => setGb(e.target.value)} rows={3}
              style={{ width: '100%', background: C.bg, color: C.text, border: `1px solid ${C.amber}44`, borderRadius: 6, padding: 8, fontSize: 13, resize: 'none', ...mono, boxSizing: 'border-box' }} />
            {b.length >= 3 && <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>n={b.length}, M={arrMean(b).toFixed(2)}, SD={arrSD(b).toFixed(2)}</div>}
          </div>
        </div>
        {res && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatBox label="t-statistic" value={res.t} dec={3} />
              <StatBox label="df" value={res.df} dec={0} color={C.muted} />
              <StatBox label="p-value" value={res.p < 0.0001 ? '< .0001' : res.p} dec={4} color={res.p < 0.05 ? C.green : C.red} />
              <StatBox label="Cohen's d" value={res.d} dec={3} color={C.amber} />
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.text, borderLeft: `3px solid ${res.p < 0.05 ? C.green : C.amber}` }}>
              t({res.df})={res.t.toFixed(3)}, p={res.p < 0.0001 ? '< .0001' : res.p.toFixed(4)}, d={res.d.toFixed(3)} ({dLabel}).{' '}
              {res.p < 0.05 ? `Significant. High-disengagement group scores ${(res.mb - res.ma).toFixed(2)} pts higher.` : "Not significant — insufficient evidence to reject H₀."}
            </div>
          </>
        )}
      </div>
      <Quiz question="t(14)=2.31, p=.036, d=0.62. What do you report?"
        options={["Only p<.05", "Only the means", "t, df, p AND Cohen's d — significance plus effect size", "Wait for a larger sample"]}
        correct={2} explanation="Always the full picture: t(14)=2.31, p=.036, d=0.62. p confirms it's unlikely to be chance. d=0.62 is a medium effect — real and meaningful."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 5: Regression ─────────────────────────────────────── */
const Mod5 = ({ onPass }) => {
  const [points, setPoints] = useState([
    { x: 1.2, y: 1.8 }, { x: 1.8, y: 2.2 }, { x: 2.5, y: 2.9 }, { x: 3.1, y: 3.4 },
    { x: 3.8, y: 4.1 }, { x: 2.0, y: 2.5 }, { x: 4.2, y: 4.5 }, { x: 1.5, y: 1.4 },
  ]);
  const svgRef = useRef(null);
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const r = points.length >= 2 ? pearsonR(xs, ys) : 0;
  const R2 = r ** 2;
  const reg = points.length >= 2 ? linReg(xs, ys) : null;
  const regLine = reg ? [{ x: 0.5, y: reg.a + reg.b * 0.5 }, { x: 5, y: reg.a + reg.b * 5 }] : [];
  const handleClick = useCallback(e => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const x = +(0.5 + px * 4.5).toFixed(2), y = +(5 - py * 4.5).toFixed(2);
    if (x >= 0.5 && x <= 5 && y >= 0.5 && y <= 5) setPoints(ps => [...ps, { x, y }]);
  }, []);
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          <strong style={{ color: C.teal }}>Click to add data points.</strong> X=moral disengagement, Y=cyber-aggression. r, R², and the regression line update live.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`\hat{Y} = a + bX \qquad r = \frac{\sum(x_i-\bar{x})(y_i-\bar{y})}{\sqrt{\sum(x_i-\bar{x})^2 \cdot \sum(y_i-\bar{y})^2}} \qquad R^2 = r^2`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`\hat{Y}`, "Predicted Y", "'Y-hat'. The model's predicted cyber-aggression for a given disengagement score."],
            [String.raw`a`, "Intercept", "Predicted Y when X=0. Often not interpretable if X=0 is outside your data range."],
            [String.raw`b`, "Slope", "How much Y increases per 1-unit increase in X. Your key coefficient."],
            [String.raw`r`, "Pearson's r", "−1 to +1. Strength and direction of the linear relationship."],
            [String.raw`R^2`, "R-squared", "r². Proportion of Y variance explained by X. R²=.38 → 38% of cyber-aggression variance explained."],
            [String.raw`(x_i-\bar{x})(y_i-\bar{y})`, "Cross-deviation", "For each person: how far they are from the X mean times how far from the Y mean. This captures co-movement."],
          ]}
          worked={[
            { text: "Your dissertation: moral disengagement (X) predicting cyber-aggression (Y), n=167.", eq: null },
            { text: "Regression equation from your results:", eq: String.raw`\hat{Y}_{\text{aggression}} = 0.41 + 0.79 \times X_{\text{disengagement}}` },
            { text: "Each 1-point increase in moral disengagement predicts 0.79-point increase in cyber-aggression.", eq: null },
            { text: "R²=.38 for the full model:", eq: String.raw`R^2 = .38 \;\Rightarrow\; \text{38\% of variance in cyber-aggression explained}` },
            { text: "The remaining 62% comes from other variables, personality, measurement error, and random variance.", eq: null },
          ]}
        />
        <div ref={svgRef} onClick={handleClick} style={{ cursor: 'crosshair', userSelect: 'none' }}>
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" domain={[0.5, 5]} tick={{ fill: C.muted, fontSize: 10 }} label={{ value: 'Moral Disengagement', fill: C.muted, fontSize: 11, position: 'insideBottom', dy: 14 }} />
              <YAxis type="number" dataKey="y" domain={[0.5, 5]} tick={{ fill: C.muted, fontSize: 10 }} label={{ value: 'Cyber-Aggression', fill: C.muted, fontSize: 11, angle: -90, position: 'insideLeft', dx: 10 }} />
              <Scatter data={points} fill={C.teal} opacity={0.8} />
              {reg && <Line data={regLine} type="linear" dataKey="y" stroke={C.amber} strokeWidth={2} dot={false} />}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 12 }}>
          <StatBox label="Points (n)" value={points.length} dec={0} color={C.muted} />
          <StatBox label="r (Pearson)" value={r} dec={3} />
          <StatBox label="R²" value={R2} dec={3} color={C.amber} />
          {reg && <StatBox label="Slope (b)" value={reg.b} dec={3} color={C.purple} />}
        </div>
        {reg && <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.text }}>
          R²={R2.toFixed(3)} → <strong style={{ color: C.amber }}>{(R2 * 100).toFixed(1)}%</strong> of Y variance explained. Each 1-unit X increase predicts <strong style={{ color: C.teal }}>{reg.b.toFixed(2)} units</strong> increase in Y.
        </div>}
        <button onClick={() => setPoints([])} style={{ marginTop: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>Clear</button>
      </div>
      <Quiz question="r=.71, R²=.50, p<.001. What does R²=.50 mean?"
        options={["50% of participants aggress online", "The model is 50% accurate", "Moral disengagement explains 50% of variance in cyber-aggression", "The slope is 0.50"]}
        correct={2} explanation="R²=.50: half the variation in cyber-aggression is explained by moral disengagement. Strong R² in social science."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 6: Cronbach's Alpha ───────────────────────────────── */
const Mod6 = ({ onPass }) => {
  const [items, setItems] = useState([[4, 3, 5, 4, 3], [3, 3, 4, 4, 2], [4, 2, 5, 3, 3], [4, 3, 4, 4, 2]]);
  const setItem = (i, j, v) => setItems(im => im.map((row, ri) => ri === i ? row.map((c, ci) => ci === j ? v : c) : row));
  const k = items.length, n = items[0].length;
  const totals = Array.from({ length: n }, (_, j) => items.reduce((s, row) => s + row[j], 0));
  const varItems = items.map(row => { const m = arrMean(row); return row.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1); });
  const varTotal = arrSD(totals) ** 2;
  const alpha = (k / (k - 1)) * (1 - varItems.reduce((s, v) => s + v, 0) / varTotal);
  const alphaColor = alpha < 0.6 ? C.red : alpha < 0.7 ? C.amber : alpha < 0.9 ? C.green : C.teal;
  const alphaLabel = alpha < 0.6 ? 'Poor — revise scale' : alpha < 0.7 ? 'Acceptable' : alpha < 0.9 ? 'Good ✓' : 'Excellent';
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          4 items, 5 participants. Edit cells. Make rows consistent — same person scores high or low on all — and watch α climb.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`\alpha = \frac{k}{k-1}\!\left(1 - \frac{\sum \sigma_i^2}{\sigma_t^2}\right)`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`\alpha`, "Cronbach's alpha", "Reliability coefficient. Ranges 0–1. Target: ≥.70 for research."],
            [String.raw`k`, "Number of items", "How many questions in your scale. More items → higher α, all else equal."],
            [String.raw`\sigma_i^2`, "Item variance", "How spread out responses are for each individual question."],
            [String.raw`\sum \sigma_i^2`, "Sum of item variances", "Add up variance of each item separately."],
            [String.raw`\sigma_t^2`, "Total score variance", "Variance of each person's total score. Larger than sum of item variances when items correlate."],
            [String.raw`1 - \frac{\sum\sigma_i^2}{\sigma_t^2}`, "Shared variance ratio", "If items measure the same thing, total variance >> individual variances. This ratio approaches 1."],
          ]}
          worked={[
            { text: "Your moral disengagement scale: 8 items, n=167, α=.87 from R output.", eq: null },
            { text: "Mechanically: the 8 items share a lot of variance. High on one → high on all.", eq: null },
            { text: "Simplified calculation for 3 items (σ₁²=0.62, σ₂²=0.58, σ₃²=0.71, σₜ²=3.94):", eq: String.raw`\alpha = \frac{3}{2}\!\left(1 - \frac{0.62+0.58+0.71}{3.94}\right) = 1.5 \times 0.515 = .87` },
            { text: "α=.87 is Good. Above .90 would be Excellent, but can indicate redundancy — items too similar to add distinct information.", eq: null },
            { text: "α=.87 proves internal consistency, NOT construct validity. To establish validity you need Confirmatory Factor Analysis (CFA) — which tests whether items load onto the factor structure your theory predicts — plus convergent validity (AVE ≥ .50) and discriminant validity (HTMT < .85). In your dissertation you did exactly this via the PLS-SEM measurement model — that's the structural equation equivalent of running CFA.", eq: null },
          ]}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ color: C.muted, fontSize: 12, padding: '4px 8px', textAlign: 'left' }}>Item</th>
                {['P1','P2','P3','P4','P5'].map(p => <th key={p} style={{ color: C.muted, fontSize: 12, padding: '4px 8px' }}>{p}</th>)}
                <th style={{ color: C.muted, fontSize: 12, padding: '4px 8px' }}>σ²</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? C.bg : 'transparent' }}>
                  <td style={{ color: C.text, fontSize: 13, padding: '4px 8px', fontWeight: 600 }}>Q{i+1}</td>
                  {row.map((v, j) => (
                    <td key={j} style={{ padding: 4, textAlign: 'center' }}>
                      <input type="number" min={1} max={5} value={v} onChange={e => setItem(i, j, Math.min(5, Math.max(1, +e.target.value)))}
                        style={{ width: 36, background: C.surface, color: C.teal, border: `1px solid ${C.border}`, borderRadius: 4, textAlign: 'center', ...mono, fontSize: 13, padding: '2px 0' }} />
                    </td>
                  ))}
                  <td style={{ color: C.amber, ...mono, fontSize: 13, textAlign: 'center' }}>{varItems[i].toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ color: C.muted, fontSize: 12, padding: '4px 8px' }}>Total</td>
                {totals.map((t, j) => <td key={j} style={{ color: C.muted, ...mono, fontSize: 13, textAlign: 'center' }}>{t}</td>)}
                <td style={{ color: C.muted, ...mono, fontSize: 13, textAlign: 'center' }}>{varTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: C.bg, borderRadius: 10, border: `2px solid ${alphaColor}44` }}>
          <div>
            <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Cronbach's α</div>
            <div style={{ color: alphaColor, fontSize: 36, fontWeight: 800, ...mono }}>{isNaN(alpha) ? '—' : alpha.toFixed(3)}</div>
          </div>
          <div style={{ color: alphaColor, fontSize: 16, fontWeight: 700 }}>{isNaN(alpha) ? '' : alphaLabel}</div>
          <div style={{ color: C.muted, fontSize: 13, marginLeft: 'auto', maxWidth: 220 }}>
            {alpha < 0.7 ? "Items don't hang together. Same construct?" : "Items are internally consistent."}
          </div>
        </div>
      </div>
      <Quiz question="α=.87. A reviewer says 'high α proves the scale is valid.' Your response?"
        options={["Agree — .87 is excellent", "α only measures internal consistency, not construct validity", "Add more items to improve validity", "Report composite reliability instead"]}
        correct={1} explanation="α=.87: items hang together. But validity requires more — specifically Confirmatory Factor Analysis (CFA), which tests whether items load onto the factor structure your theory predicts, plus convergent validity (AVE ≥ .50) and discriminant validity (HTMT < .85). You actually did all of this in your dissertation via the PLS-SEM measurement model — AVE, composite reliability, and HTMT ratios are the PLS equivalent of CFA. α is necessary but not sufficient."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 7: K-means ────────────────────────────────────────── */
const Mod7 = ({ onPass }) => {
  const initPts = [
    {x:1.2,y:1.5},{x:1.5,y:2.1},{x:1.8,y:1.3},{x:2.1,y:1.9},{x:1.4,y:1.7},
    {x:3.8,y:4.2},{x:4.1,y:3.8},{x:3.9,y:4.5},{x:4.4,y:4.1},{x:3.7,y:3.9},
    {x:2.2,y:4.1},{x:2.5,y:3.8},{x:2.1,y:4.4},{x:2.8,y:3.9},{x:2.3,y:4.2},
    {x:3.5,y:2.2},{x:3.9,y:1.9},{x:3.2,y:2.5},{x:4.0,y:2.1},{x:3.7,y:2.3},
  ];
  const COLORS = [C.teal, C.amber, C.purple, C.green];
  const [K, setK] = useState(3);
  const [centroids, setCentroids] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [step, setStep] = useState(0);
  const [converged, setConverged] = useState(false);
  const assign = useCallback((pts, cents) => pts.map(p => {
    let minD = Infinity, best = 0;
    cents.forEach((c, i) => { const d = (p.x-c.x)**2+(p.y-c.y)**2; if (d < minD) { minD=d; best=i; } });
    return best;
  }), []);
  const init = useCallback(() => {
    const shuffled = [...initPts].sort(() => Math.random()-0.5);
    const cents = shuffled.slice(0, K).map(p => ({...p}));
    setCentroids(cents); setAssignments(assign(initPts, cents)); setStep(1); setConverged(false);
  }, [K, assign]);
  const stepForward = useCallback(() => {
    if (!centroids || converged) return;
    const newCents = centroids.map((c, ki) => {
      const grp = initPts.filter((_, i) => assignments[i]===ki);
      if (grp.length===0) return c;
      return { x: arrMean(grp.map(p=>p.x)), y: arrMean(grp.map(p=>p.y)) };
    });
    const newAss = assign(initPts, newCents);
    const same = newAss.every((a,i) => a===assignments[i]);
    setCentroids(newCents); setAssignments(newAss); setStep(s=>s+1);
    if (same) setConverged(true);
  }, [centroids, assignments, converged, assign]);
  const plotData = assignments ? initPts.map((p,i) => ({...p, cluster:assignments[i]})) : initPts.map(p => ({...p, cluster:-1}));
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          20 participants: moral disengagement (X), cyber-aggression (Y). Choose K, initialise, step through the algorithm.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`\underset{S}{\arg\min} \sum_{i=1}^{k} \sum_{x \in S_i} \|x - \mu_i\|^2`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`k`, "Number of clusters", "You choose this. K-means doesn't know how many groups exist."],
            [String.raw`S_i`, "Cluster i", "The set of all points assigned to cluster i."],
            [String.raw`\mu_i`, "Centroid i", "Mean position of all points in cluster i. Recalculated every iteration."],
            [String.raw`\|x-\mu_i\|^2`, "Squared distance", "How far point x is from its centroid, squared. Algorithm minimises the total."],
            [String.raw`\arg\min`, "Minimise", "Find the assignment that makes total within-cluster distance as small as possible."],
          ]}
          worked={[
            { text: "K=2. Step 1: place 2 random centroids. Step 2: assign each point to nearest centroid.", eq: null },
            { text: "Participant at (1.2,1.5). Distance to centroid A at (1.5,1.6):", eq: String.raw`d_A = \sqrt{(1.2-1.5)^2+(1.5-1.6)^2} = \sqrt{0.09+0.01} = 0.32` },
            { text: "Distance to centroid B at (3.8,4.0):", eq: String.raw`d_B = \sqrt{(1.2-3.8)^2+(1.5-4.0)^2} = \sqrt{6.76+6.25} = 3.61` },
            { text: "d_A < d_B → assign to cluster A.", eq: null },
            { text: "Step 3: recalculate centroid as mean of assigned points. Repeat until stable. You must then interpret: what do these clusters mean theoretically?", eq: null },
          ]}
        />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2,3,4].map(k => (
              <button key={k} onClick={() => { setK(k); setCentroids(null); setAssignments(null); setStep(0); setConverged(false); }}
                style={{ background: K===k ? C.teal+'33' : C.bg, border: `1px solid ${K===k ? C.teal : C.border}`, color: K===k ? C.teal : C.muted, borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontWeight: 700 }}>K={k}</button>
            ))}
          </div>
          <button onClick={init} style={{ background: C.tealDim, border: 'none', color: '#fff', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Initialise</button>
          <button onClick={stepForward} disabled={!centroids||converged}
            style={{ background: centroids&&!converged ? C.amber+'dd' : C.border, border: 'none', color: centroids&&!converged ? '#000' : C.muted, borderRadius: 6, padding: '6px 16px', cursor: centroids&&!converged ? 'pointer' : 'default', fontWeight: 600, fontSize: 13 }}>
            {converged ? '✓ Converged' : '→ Step'}
          </button>
          <span style={{ color: C.muted, fontSize: 13 }}>Step {step}</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" domain={[0.5,5]} tick={{ fill: C.muted, fontSize: 10 }} label={{ value: 'Moral Disengagement', fill: C.muted, fontSize: 11, position: 'insideBottom', dy: 14 }} />
            <YAxis type="number" dataKey="y" domain={[0.5,5]} tick={{ fill: C.muted, fontSize: 10 }} label={{ value: 'Cyber-Aggression', fill: C.muted, fontSize: 11, angle: -90, position: 'insideLeft', dx: 10 }} />
            {[...Array(K)].map((_,ki) => (
              <Scatter key={ki} data={plotData.filter(p => p.cluster===ki)} fill={COLORS[ki%COLORS.length]} opacity={0.85} />
            ))}
            {assignments===null && <Scatter data={plotData} fill={C.muted} opacity={0.6} />}
            {centroids && centroids.map((c,ki) => (
              <Scatter key={`c${ki}`} data={[c]} fill={COLORS[ki%COLORS.length]} r={8} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        {converged && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.green, borderLeft: `3px solid ${C.green}` }}>
            ✓ Converged in {step} steps. Now interpret: examine each cluster's average X and Y and give them a theoretical label.
          </div>
        )}
      </div>
      <Quiz question="K-means gives 3 clusters. A colleague says 'Cluster 2 is high-risk.' What's wrong?"
        options={["Nothing — the algorithm labels them", "K-means assigns numbers, not psychological labels — you interpret the cluster characteristics yourself", "Should use 4 clusters", "Cluster 0 is higher risk"]}
        correct={1} explanation="K-means outputs 0, 1, 2. The label 'high-risk' comes from you examining centroid values and theory. Algorithm does the maths; you do the thinking."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULES CONFIG ──────────────────────────────────────────── */
const MODULES = [
  { id: 0, title: "Descriptive Statistics", icon: "📊", subtitle: "Mean, median, SD, variance", Component: Mod1 },
  { id: 1, title: "Normal Distribution", icon: "🔔", subtitle: "Bell curves & z-scores", Component: Mod2 },
  { id: 2, title: "p-values & Inference", icon: "⚖️", subtitle: "The signal/noise test", Component: Mod3 },
  { id: 3, title: "The t-test", icon: "🔬", subtitle: "Comparing two groups", Component: Mod4 },
  { id: 4, title: "Correlation & Regression", icon: "📈", subtitle: "Build your own model", Component: Mod5 },
  { id: 5, title: "Cronbach's Alpha", icon: "🔗", subtitle: "Internal consistency", Component: Mod6 },
  { id: 6, title: "K-means Clustering", icon: "🎯", subtitle: "Finding natural groups", Component: Mod7 },
];

/* ── MAIN APP ────────────────────────────────────────────────── */
export default function App() {
  const [active, setActive] = useState(0);
  const [passed, setPassed] = useState(new Set());
  const Mod = MODULES[active];
  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, sans-serif", overflow: 'hidden' }}>
      <div style={{ width: 260, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', height: '100vh' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ color: C.teal, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Statistics 101</div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>for Cyberpsychologists</div>
          <div style={{ color: C.muted, fontSize: 12 }}>{passed.size}/{MODULES.length} complete</div>
          <div style={{ marginTop: 8, height: 3, background: C.border, borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${(passed.size/MODULES.length)*100}%`, background: C.teal, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        </div>
        <nav style={{ padding: '8px 0', flex: 1 }}>
          {MODULES.map(m => (
            <button key={m.id} onClick={() => setActive(m.id)}
              style={{ width: '100%', textAlign: 'left', background: active===m.id ? C.teal+'18' : 'transparent', border: 'none', borderLeft: `3px solid ${active===m.id ? C.teal : 'transparent'}`, padding: '10px 16px', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: active===m.id ? C.teal : C.text, fontSize: 13, fontWeight: active===m.id ? 600 : 400 }}>{m.title}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{m.subtitle}</div>
                </div>
                {passed.has(m.id) && <span style={{ color: C.green, fontSize: 14 }}>✓</span>}
              </div>
            </button>
          ))}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 11 }}>
          stats.ucahub.ie
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{Mod.icon}</span>
              <h1 style={{ ...serif, color: C.heading, fontSize: 26, fontWeight: 700, margin: 0 }}>{Mod.title}</h1>
              {passed.has(active) && <Badge color={C.green}>COMPLETE</Badge>}
            </div>
            <div style={{ color: C.muted, fontSize: 13 }}>Module {active+1} of {MODULES.length} — {Mod.subtitle}</div>
          </div>
          <div style={{ flex: 1 }}>
            <Mod.Component onPass={() => setPassed(p => new Set([...p, active]))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => setActive(a => Math.max(0, a-1))} disabled={active===0}
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: active===0 ? C.muted : C.text, borderRadius: 8, padding: '8px 20px', cursor: active===0 ? 'default' : 'pointer' }}>← Previous</button>
            <button onClick={() => setActive(a => Math.min(MODULES.length-1, a+1))} disabled={active===MODULES.length-1}
              style={{ background: C.tealDim, border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', cursor: active===MODULES.length-1 ? 'default' : 'pointer', fontWeight: 600 }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
