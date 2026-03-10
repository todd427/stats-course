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

/* ── MODULE 8: Hierarchical Regression ──────────────────────── */
const Mod8 = ({ onPass }) => {
  // Simulated dissertation-style data: 3 blocks
  // Block 1: demographics (age, gender) → R²=.04
  // Block 2: + moral disengagement → R²=.38, ΔR²=.34
  // Block 3: + AI trust, AI use → R²=.39, ΔR²=.01
  const blocks = [
    { name: "Block 1: Demographics", vars: ["Age", "Gender"], r2: 0.04, f: 3.41, p: 0.036, df1: 2, df2: 164 },
    { name: "Block 2: + Moral Disengagement", vars: ["Age", "Gender", "Moral Disengagement"], r2: 0.38, f: 33.21, p: 0.000, df1: 1, df2: 163 },
    { name: "Block 3: + AI Factors", vars: ["Age", "Gender", "Moral Disengagement", "AI Trust", "AI Use"], r2: 0.39, f: 1.34, p: 0.430, df1: 2, df2: 161 },
  ];
  const [activeBlock, setActiveBlock] = useState(0);
  const deltaR2 = activeBlock === 0 ? blocks[0].r2 : blocks[activeBlock].r2 - blocks[activeBlock - 1].r2;
  const b = blocks[activeBlock];
  const isSignificant = b.p < 0.05;
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          Hierarchical regression adds predictors in theory-driven <strong style={{ color: C.teal }}>blocks</strong>. Each block's ΔR² tells you how much additional variance it explains beyond everything already in the model.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`\Delta R^2 = R^2_{\text{step}_k} - R^2_{\text{step}_{k-1}} \qquad F_{\text{change}} = \frac{\Delta R^2 / \Delta df_1}{(1 - R^2_k) / df_2}`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`\Delta R^2`, "Delta R-squared", "The increase in explained variance when a new block of predictors is added. This is your key question: does this block add anything?"],
            [String.raw`R^2_{\text{step}_k}`, "R² at step k", "The cumulative R² after adding the k-th block of predictors."],
            [String.raw`F_{\text{change}}`, "F-change statistic", "Tests whether ΔR² is significantly greater than zero. Has its own degrees of freedom."],
            [String.raw`\Delta df_1`, "Change in df", "The number of new predictors added in this block."],
            [String.raw`df_2`, "Residual df", "n minus total number of predictors minus 1. Leftover degrees of freedom."],
          ]}
          worked={[
            { text: "Block 1: Demographics only (age, gender). R²=.04 — 4% of variance explained. F(2,164)=3.41, p=.036. Significant but weak.", eq: String.raw`R^2_1 = .04` },
            { text: "Block 2: Add moral disengagement. R² jumps to .38.", eq: String.raw`\Delta R^2 = .38 - .04 = .34` },
            { text: "F-change for Block 2:", eq: String.raw`F_{\text{change}}(1, 163) = \frac{.34/1}{(1-.38)/163} = \frac{.34}{.0038} = 89.5,\quad p < .001` },
            { text: "Block 3: Add AI trust and AI use. R² barely moves.", eq: String.raw`\Delta R^2 = .39 - .38 = .01` },
            { text: "F-change for Block 3: F(2,161)=1.34, p=.43. Not significant. AI factors add nothing above moral disengagement. This is your null finding — and it's theoretically meaningful.", eq: null },
          ]}
        />
        {/* Block selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {blocks.map((bl, i) => (
            <button key={i} onClick={() => setActiveBlock(i)}
              style={{ textAlign: 'left', padding: '12px 16px', borderRadius: 8, border: `1px solid ${activeBlock === i ? C.teal : C.border}`, background: activeBlock === i ? C.teal + '18' : C.bg, cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: activeBlock === i ? C.teal : C.text, fontWeight: 600, fontSize: 14 }}>{bl.name}</div>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{bl.vars.join(', ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: C.amber, ...mono, fontWeight: 700, fontSize: 16 }}>R²={bl.r2.toFixed(2)}</div>
                  {i > 0 && <div style={{ color: bl.p < 0.05 ? C.green : C.red, fontSize: 12, ...mono }}>ΔR²={(bl.r2 - blocks[i-1].r2).toFixed(2)}</div>}
                </div>
              </div>
            </button>
          ))}
        </div>
        {/* R² bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 12 }}>Variance explained (R²)</span>
            <span style={{ color: C.amber, ...mono, fontWeight: 700 }}>{(b.r2 * 100).toFixed(0)}%</span>
          </div>
          <div style={{ height: 20, background: C.bg, borderRadius: 4, border: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${blocks[0].r2 * 100}%`, background: C.muted, transition: 'width 0.4s ease' }} title="Demographics" />
            {activeBlock >= 1 && <div style={{ width: `${(blocks[1].r2 - blocks[0].r2) * 100}%`, background: C.teal, transition: 'width 0.4s ease' }} title="Moral Disengagement" />}
            {activeBlock >= 2 && <div style={{ width: `${(blocks[2].r2 - blocks[1].r2) * 100}%`, background: C.amber, transition: 'width 0.4s ease' }} title="AI Factors" />}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: C.muted, borderRadius: 2 }} /><span style={{ color: C.muted, fontSize: 11 }}>Demographics</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: C.teal, borderRadius: 2 }} /><span style={{ color: C.muted, fontSize: 11 }}>Moral Disengagement</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, background: C.amber, borderRadius: 2 }} /><span style={{ color: C.muted, fontSize: 11 }}>AI Factors</span></div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <StatBox label="R²" value={b.r2} dec={3} color={C.amber} />
          <StatBox label="ΔR²" value={deltaR2} dec={3} color={isSignificant ? C.green : C.red} />
          <StatBox label="F-change" value={b.f} dec={2} color={C.teal} />
          <StatBox label="p (change)" value={b.p < 0.001 ? '< .001' : b.p} dec={3} color={isSignificant ? C.green : C.red} />
        </div>
        <div style={{ marginTop: 12, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.text, borderLeft: `3px solid ${isSignificant ? C.green : C.amber}` }}>
          {activeBlock === 0 && "Demographics explain 4% of variance — small but significant baseline."}
          {activeBlock === 1 && "Moral disengagement adds ΔR²=.34 — a massive, highly significant contribution. This is your headline finding."}
          {activeBlock === 2 && "AI factors add ΔR²=.01, p=.43 — not significant. The null finding: AI-related variables explain negligible variance above moral disengagement."}
        </div>
      </div>
      <Quiz question="In your dissertation, Block 3 (AI factors) gave ΔR²=.01, p=.43. What is the correct interpretation?"
        options={[
          "AI factors are important predictors of cyber-aggression",
          "The model is only 1% accurate",
          "AI factors explain negligible additional variance once moral disengagement is controlled — a meaningful null finding",
          "You need more participants to confirm this result"
        ]}
        correct={2}
        explanation="ΔR²=.01, p=.43: AI trust and AI use add almost nothing to the model once moral disengagement is included. This IS a finding — it tells you where cyber-aggression comes from (moral psychology) and where it doesn't (AI-related attitudes)."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 9: PLS-SEM ───────────────────────────────────────── */
const Mod9 = ({ onPass }) => {
  const [view, setView] = useState('measurement');
  // Dissertation measurement model values
  const constructs = [
    { name: "Moral Disengagement", items: 8, loadings: [.81,.84,.79,.86,.83,.77,.85,.82], ave: .67, cr: .93, abbr: "MD" },
    { name: "Cyber-Aggression", items: 6, loadings: [.78,.82,.80,.75,.83,.79], ave: .63, cr: .91, abbr: "CA" },
    { name: "AI Trust", items: 5, loadings: [.76,.80,.74,.78,.77], ave: .59, cr: .88, abbr: "AIT" },
    { name: "AI Use", items: 4, loadings: [.72,.75,.70,.73], ave: .53, cr: .82, abbr: "AIU" },
  ];
  // Structural model: path coefficients
  const paths = [
    { from: "MD", to: "CA", beta: .61, t: 8.94, p: "<.001", sig: true },
    { from: "AIT", to: "CA", beta: .08, t: 1.12, p: ".263", sig: false },
    { from: "AIU", to: "CA", beta: .05, t: 0.79, p: ".431", sig: false },
  ];
  // HTMT matrix (upper triangle)
  const htmt = [
    ["—", ".48", ".31", ".29"],
    ["", "—", ".35", ".33"],
    ["", "", "—", ".44"],
    ["", "", "", "—"],
  ];
  const labels = ["MD", "CA", "AIT", "AIU"];
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          PLS-SEM (Partial Least Squares Structural Equation Modelling) has two parts: the <strong style={{ color: C.teal }}>measurement model</strong> (are your scales valid?) and the <strong style={{ color: C.amber }}>structural model</strong> (do the constructs predict each other?).
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['measurement', 'structural'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${view === v ? C.teal : C.border}`, background: view === v ? C.teal + '22' : 'transparent', color: view === v ? C.teal : C.muted, cursor: 'pointer', fontWeight: view === v ? 700 : 400, fontSize: 14 }}>
              {v === 'measurement' ? '📐 Measurement Model' : '🔗 Structural Model'}
            </button>
          ))}
        </div>

        {view === 'measurement' && (
          <>
            <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
              <Eq block tex={String.raw`AVE = \frac{\sum \lambda_i^2}{k} \qquad CR = \frac{(\sum \lambda_i)^2}{(\sum \lambda_i)^2 + \sum(1-\lambda_i^2)} \qquad HTMT < .85`} />
            </div>
            <Explainer
              symbols={[
                [String.raw`\lambda_i`, "Factor loading", "How strongly each item correlates with its latent construct. Target: ≥ .70."],
                [String.raw`AVE`, "Average Variance Extracted", "Average proportion of item variance explained by the construct. AVE ≥ .50 = convergent validity."],
                [String.raw`CR`, "Composite Reliability", "Like Cronbach's α but accounts for unequal loadings. CR ≥ .70 required; ≥ .80 good."],
                [String.raw`HTMT`, "Heterotrait-Monotrait ratio", "Discriminant validity test. Compares correlations between constructs vs. within constructs. HTMT < .85 means constructs are distinct."],
              ]}
              worked={[
                { text: "Moral Disengagement: 8 items, loadings ranging .77–.86. Calculate AVE:", eq: String.raw`AVE_{MD} = \frac{.81^2+.84^2+.79^2+.86^2+.83^2+.77^2+.85^2+.82^2}{8} = \frac{5.35}{8} = .67` },
                { text: "AVE=.67 > .50 ✓ — convergent validity confirmed. The construct captures more than half the variance in its items.", eq: null },
                { text: "HTMT between MD and CA = .48 < .85 ✓ — discriminant validity confirmed. These are distinct constructs, not measuring the same thing.", eq: null },
                { text: "All four constructs meet AVE ≥ .50, CR ≥ .80, HTMT < .85. Measurement model is sound — you can trust your structural results.", eq: null },
              ]}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {constructs.map((c, i) => (
                <div key={i} style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.teal, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{c.abbr}: {c.name}</div>
                  <div style={{ marginBottom: 8 }}>
                    {c.loadings.map((l, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ color: C.muted, fontSize: 11, width: 20 }}>λ{j+1}</span>
                        <div style={{ flex: 1, height: 6, background: C.surface, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${l * 100}%`, height: '100%', background: l >= 0.7 ? C.teal : C.amber, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: l >= 0.7 ? C.teal : C.amber, ...mono, fontSize: 12, width: 28 }}>{l.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, textAlign: 'center', background: C.surface, borderRadius: 6, padding: '4px 0' }}>
                      <div style={{ color: C.muted, fontSize: 10 }}>AVE</div>
                      <div style={{ color: c.ave >= 0.5 ? C.green : C.red, ...mono, fontWeight: 700, fontSize: 14 }}>{c.ave.toFixed(2)}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', background: C.surface, borderRadius: 6, padding: '4px 0' }}>
                      <div style={{ color: C.muted, fontSize: 10 }}>CR</div>
                      <div style={{ color: c.cr >= 0.8 ? C.green : C.amber, ...mono, fontWeight: 700, fontSize: 14 }}>{c.cr.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: C.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${C.border}` }}>
              <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>HTMT Matrix (discriminant validity)</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['', ...labels].map((l, i) => <th key={i} style={{ color: C.muted, fontSize: 12, padding: '4px 8px', textAlign: 'center' }}>{l}</th>)}</tr>
                </thead>
                <tbody>
                  {htmt.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: C.teal, fontSize: 12, fontWeight: 700, padding: '4px 8px' }}>{labels[i]}</td>
                      {row.map((v, j) => (
                        <td key={j} style={{ textAlign: 'center', padding: '4px 8px', color: v === '—' || v === '' ? C.border : parseFloat(v) < 0.85 ? C.green : C.red, ...mono, fontSize: 13 }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>All off-diagonal values &lt; .85 ✓ — discriminant validity confirmed.</div>
            </div>
          </>
        )}

        {view === 'structural' && (
          <>
            <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
              <Eq block tex={String.raw`f^2 = \frac{R^2_{\text{included}} - R^2_{\text{excluded}}}{1 - R^2_{\text{included}}} \qquad Q^2 > 0 \Rightarrow \text{predictive relevance}`} />
            </div>
            <Explainer
              symbols={[
                [String.raw`\beta`, "Path coefficient", "Standardised regression coefficient for the relationship between two constructs. Like a correlation, ranges −1 to +1."],
                [String.raw`R^2`, "R-squared", "Variance in the endogenous (outcome) construct explained by all its predictors combined."],
                [String.raw`f^2`, "Effect size f²", "How much R² drops when a predictor is removed. Small=.02, Medium=.15, Large=.35."],
                [String.raw`Q^2`, "Predictive relevance", "Stone-Geisser Q². Positive value = the model has predictive relevance beyond chance. Q² > 0 is the threshold."],
                [String.raw`t`, "Bootstrap t-value", "PLS-SEM uses bootstrapping (resampling) rather than assumptions about normal distributions to test significance."],
              ]}
              worked={[
                { text: "Moral disengagement → cyber-aggression: β=.61, t=8.94, p<.001. Large, significant path.", eq: String.raw`f^2_{MD} = \frac{.39 - .05}{1 - .39} = \frac{.34}{.61} = .56 \text{ — large effect}` },
                { text: "AI trust → cyber-aggression: β=.08, t=1.12, p=.263. Not significant.", eq: String.raw`f^2_{AIT} = \frac{.39 - .38}{1 - .39} = \frac{.01}{.61} = .016 \text{ — negligible}` },
                { text: "AI use → cyber-aggression: β=.05, t=0.79, p=.431. Not significant.", eq: null },
                { text: "R²=.39 for cyber-aggression. Q²=.24 > 0 — model has predictive relevance.", eq: null },
              ]}
            />
            <div style={{ marginBottom: 16 }}>
              {paths.map((p, i) => (
                <div key={i} style={{ padding: '12px 16px', marginBottom: 8, background: C.bg, borderRadius: 8, border: `1px solid ${p.sig ? C.teal + '44' : C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: C.teal, fontWeight: 700, fontSize: 14 }}>{p.from}</span>
                    <span style={{ color: C.muted, fontSize: 18 }}>→</span>
                    <span style={{ color: C.amber, fontWeight: 700, fontSize: 14 }}>{p.to}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      <Badge color={p.sig ? C.green : C.red}>{p.sig ? 'SIGNIFICANT' : 'n.s.'}</Badge>
                    </span>
                  </div>
                  <div style={{ height: 8, background: C.surface, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: `${Math.abs(p.beta) * 100}%`, height: '100%', background: p.sig ? C.teal : C.muted, borderRadius: 4 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ color: C.muted, fontSize: 13 }}>β = <span style={{ color: p.sig ? C.teal : C.muted, ...mono, fontWeight: 700 }}>{p.beta.toFixed(2)}</span></span>
                    <span style={{ color: C.muted, fontSize: 13 }}>t = <span style={{ ...mono }}>{p.t.toFixed(2)}</span></span>
                    <span style={{ color: C.muted, fontSize: 13 }}>p = <span style={{ color: p.sig ? C.green : C.red, ...mono }}>{p.p}</span></span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <StatBox label="R² (CA)" value={0.39} dec={2} color={C.amber} />
              <StatBox label="Q²" value={0.24} dec={2} color={C.teal} />
              <StatBox label="Significant paths" value="1 / 3" dec={0} color={C.green} />
            </div>
          </>
        )}
      </div>
      <Quiz question="Your AVE for moral disengagement is .67. What does this tell you?"
        options={[
          "67% of participants scored high on moral disengagement",
          "The construct explains 67% of the variance in its items — convergent validity confirmed",
          "The scale has 67% reliability",
          "You need to remove items until AVE reaches .85"
        ]}
        correct={1}
        explanation="AVE=.67 means the moral disengagement construct accounts for 67% of the variance in its 8 items on average. Since .67 > .50, convergent validity is confirmed — the items are mostly measuring the construct rather than random error."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 10: Multiple Imputation ─────────────────────────── */
const Mod10 = ({ onPass }) => {
  const [revealed, setRevealed] = useState(false);
  const [mech, setMech] = useState('MAR');
  // Simulated dataset: 10 participants, 4 variables, some missing
  const rawData = [
    { id:1, age:22, md:3.2, ca:3.8, ai:4.1, mdMiss:false, caMiss:false, aiMiss:false },
    { id:2, age:19, md:null, ca:2.1, ai:3.3, mdMiss:true, caMiss:false, aiMiss:false },
    { id:3, age:34, md:4.5, ca:null, ai:null, mdMiss:false, caMiss:true, aiMiss:true },
    { id:4, age:28, md:2.1, ca:2.9, ai:3.8, mdMiss:false, caMiss:false, aiMiss:false },
    { id:5, age:23, md:3.8, ca:4.2, ai:null, mdMiss:false, caMiss:false, aiMiss:true },
    { id:6, age:41, md:null, ca:3.1, ai:2.9, mdMiss:true, caMiss:false, aiMiss:false },
    { id:7, age:25, md:2.9, ca:null, ai:3.5, mdMiss:false, caMiss:true, aiMiss:false },
    { id:8, age:31, md:4.1, ca:4.4, ai:4.2, mdMiss:false, caMiss:false, aiMiss:false },
    { id:9, age:20, md:null, ca:1.9, ai:null, mdMiss:true, caMiss:false, aiMiss:true },
    { id:10, age:27, md:3.5, ca:3.7, ai:3.9, mdMiss:false, caMiss:false, aiMiss:false },
  ];
  // Imputed values (plausible replacements)
  const imputed = { '2-md':3.1, '3-ca':4.3, '3-ai':3.7, '5-ai':3.6, '6-md':2.8, '7-ca':3.0, '9-md':2.5, '9-ai':2.8 };
  const mechDesc = {
    MCAR: { label: "MCAR — Missing Completely At Random", color: C.green, desc: "Missingness has no relationship to any variable in the dataset — it's pure random chance (e.g., a survey glitch). Safe to delete cases, but you lose power. Rare in practice." },
    MAR: { label: "MAR — Missing At Random", color: C.amber, desc: "Missingness depends on observed variables but not on the missing value itself (e.g., younger participants skip the AI questions). Multiple imputation works well here. This was your dissertation scenario." },
    MNAR: { label: "MNAR — Missing Not At Random", color: C.red, desc: "Missingness depends on the value that's missing (e.g., high cyber-aggressors refuse to answer cyber-aggression items). The hardest case — imputation may introduce bias. Requires sensitivity analysis." },
  };
  return (
    <div>
      <div style={card}>
        <p style={{ color: C.text, fontSize: 16, marginBottom: 12 }}>
          Real datasets have missing values. How you handle them matters. <strong style={{ color: C.teal }}>Multiple imputation</strong> creates several plausible complete datasets, analyses each, then combines results using Rubin's Rules.
        </p>
        <div style={{ background: C.bg, borderRadius: 8, padding: '8px 0', marginBottom: 8 }}>
          <Eq block tex={String.raw`\bar{Q} = \frac{1}{m}\sum_{i=1}^m \hat{Q}_i \qquad T = \bar{U} + \left(1+\frac{1}{m}\right)B`} />
        </div>
        <Explainer
          symbols={[
            [String.raw`m`, "Number of imputations", "How many complete datasets you create. Your dissertation used m=5. More is better but diminishing returns past m=20."],
            [String.raw`\bar{Q}`, "Pooled estimate", "The average of the statistic (e.g., regression coefficient) across all m imputed datasets."],
            [String.raw`\hat{Q}_i`, "Estimate from imputation i", "The statistic computed on the i-th imputed dataset."],
            [String.raw`T`, "Total variance", "Combined uncertainty from within-imputation variance (Ū) and between-imputation variance (B)."],
            [String.raw`\bar{U}`, "Within-imputation variance", "Average sampling error across the m datasets — what you'd have even with complete data."],
            [String.raw`B`, "Between-imputation variance", "Extra uncertainty due to not knowing the missing values. If B is large relative to Ū, you have a lot of missingness-related uncertainty."],
          ]}
          worked={[
            { text: "Your dissertation: n=167 responses with ~8% missing data across variables. Little's MCAR test: χ²=14.3, p=.21 — consistent with MAR.", eq: null },
            { text: "You created m=5 imputed datasets using predictive mean matching (PMM). Each dataset has a slightly different plausible value where data were missing.", eq: null },
            { text: "You ran your hierarchical regression on all 5 datasets, getting 5 slightly different β coefficients for moral disengagement, e.g.:", eq: String.raw`\hat{\beta}_1=.60,\; \hat{\beta}_2=.62,\; \hat{\beta}_3=.61,\; \hat{\beta}_4=.59,\; \hat{\beta}_5=.63` },
            { text: "Rubin's Rules pool these into one estimate:", eq: String.raw`\bar{\beta} = \frac{.60+.62+.61+.59+.63}{5} = .61` },
            { text: "The pooled SE accounts for both sampling error and imputation uncertainty. Your final result: β=.61, p<.001 — robust to the missing data.", eq: null },
          ]}
        />
        {/* Missing data mechanism selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Missing data mechanism</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.keys(mechDesc).map(k => (
              <button key={k} onClick={() => setMech(k)}
                style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${mech === k ? mechDesc[k].color : C.border}`, background: mech === k ? mechDesc[k].color + '22' : 'transparent', color: mech === k ? mechDesc[k].color : C.muted, cursor: 'pointer', fontWeight: mech === k ? 700 : 400, fontSize: 13 }}>
                {k}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 8, padding: '10px 14px', background: C.bg, borderRadius: 8, fontSize: 14, color: C.text, borderLeft: `3px solid ${mechDesc[mech].color}` }}>
            <strong style={{ color: mechDesc[mech].color }}>{mechDesc[mech].label}</strong><br />
            <span style={{ color: C.muted, fontSize: 13 }}>{mechDesc[mech].desc}</span>
          </div>
        </div>
        {/* Dataset visualisation */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Sample dataset (n=10)</div>
            <button onClick={() => setRevealed(r => !r)}
              style={{ background: revealed ? C.teal + '33' : C.bg, border: `1px solid ${revealed ? C.teal : C.border}`, color: revealed ? C.teal : C.muted, borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {revealed ? '▾ Hide imputed values' : '▸ Reveal imputed values'}
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['ID', 'Age', 'Moral Dis.', 'Cyber-Agg.', 'AI Trust'].map(h => (
                  <th key={h} style={{ color: C.muted, fontSize: 12, padding: '6px 8px', textAlign: 'center', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.map(row => (
                <tr key={row.id} style={{ background: (row.mdMiss || row.caMiss || row.aiMiss) ? C.amber + '0a' : 'transparent' }}>
                  <td style={{ color: C.muted, ...mono, fontSize: 13, padding: '5px 8px', textAlign: 'center' }}>{row.id}</td>
                  <td style={{ color: C.text, ...mono, fontSize: 13, padding: '5px 8px', textAlign: 'center' }}>{row.age}</td>
                  {[['md', 'mdMiss'], ['ca', 'caMiss'], ['ai', 'aiMiss']].map(([key, missKey]) => {
                    const isMissing = row[missKey];
                    const imputedVal = imputed[`${row.id}-${key}`];
                    return (
                      <td key={key} style={{ padding: '5px 8px', textAlign: 'center' }}>
                        {isMissing ? (
                          revealed ? (
                            <span style={{ color: C.teal, ...mono, fontSize: 13, fontWeight: 700, background: C.teal + '22', borderRadius: 4, padding: '1px 6px' }}>{imputedVal?.toFixed(1)}</span>
                          ) : (
                            <span style={{ color: C.amber, ...mono, fontSize: 13 }}>—</span>
                          )
                        ) : (
                          <span style={{ color: C.text, ...mono, fontSize: 13 }}>{row[key]?.toFixed(1)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: C.amber, fontSize: 16 }}>—</span><span style={{ color: C.muted, fontSize: 12 }}>Missing</span></div>
            {revealed && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: C.teal, fontSize: 13, background: C.teal+'22', borderRadius:4, padding:'0 4px' }}>x.x</span><span style={{ color: C.muted, fontSize: 12 }}>Imputed</span></div>}
          </div>
        </div>
      </div>
      <Quiz question="You have 8% missing data. Little's MCAR test gives p=.21. What does this mean and what should you do?"
        options={[
          "p=.21 proves data is MCAR — delete missing cases",
          "p=.21 is consistent with MCAR/MAR — use multiple imputation to preserve all 167 cases and account for uncertainty",
          "p=.21 means MNAR — the data is biased",
          "8% missing is too much — collect more data"
        ]}
        correct={1}
        explanation="p=.21 on Little's MCAR test: we fail to reject the null of MCAR, which is consistent with MAR. Multiple imputation (m=5) is the principled approach — it preserves all 167 cases, propagates uncertainty through Rubin's Rules, and is far better than listwise deletion which would bias your results."
        onPass={onPass} />
    </div>
  );
};

/* ── MODULE 11: Capstone ─────────────────────────────────────── */
const Mod11 = ({ onPass }) => {
  const questions = [
    {
      q: "Your moral disengagement scale: 8 items, α=.87, AVE=.67, CR=.93, all HTMT < .85. A reviewer asks for evidence of construct validity. What do you cite?",
      options: [
        "α=.87 alone — that's excellent reliability",
        "AVE=.67 ≥ .50 (convergent validity) + all HTMT < .85 (discriminant validity) + CR=.93 ≥ .80. α supports internal consistency but isn't validity evidence.",
        "The p-values from the structural model",
        "The sample size of 167"
      ],
      correct: 1,
      explanation: "Construct validity = convergent (AVE ≥ .50) + discriminant (HTMT < .85) + reliable measurement (CR ≥ .80). α is not validity evidence — it's consistency evidence. Different thing."
    },
    {
      q: "Block 1 R²=.04, Block 2 R²=.38, Block 3 R²=.39. ΔR² for Block 3 = .01, p=.43. Your supervisor says 'AI factors don't matter, drop them.' Is this the right conclusion?",
      options: [
        "Yes — non-significant means irrelevant, remove them",
        "No — retain them and report the null finding. ΔR²=.01 is a theoretically meaningful result: it tells you cyber-aggression is driven by moral psychology, not AI attitudes.",
        "Yes — but only if you run the analysis again with a larger sample",
        "No — increase α to .10 to make the result significant"
      ],
      correct: 1,
      explanation: "Null findings are findings. ΔR²=.01 answers a real question: do AI-related factors explain cyber-aggression above moral disengagement? Answer: no. That contributes to theory. Dropping them hides the answer."
    },
    {
      q: "You report: t(163) = 8.94, p < .001, β = .61, f² = .56 for the moral disengagement → cyber-aggression path. What does f² = .56 tell you?",
      options: [
        "56% of the sample are cyber-aggressors",
        "The effect size is large — removing moral disengagement from the model would reduce R² by a substantial amount",
        "The t-statistic is reliable",
        "The model explains 56% of variance"
      ],
      correct: 1,
      explanation: "f² = .56 is a large effect (threshold: small=.02, medium=.15, large=.35). It means moral disengagement is not just statistically significant — its contribution to the model is substantial. If you removed it, R² would drop considerably."
    },
    {
      q: "You used multiple imputation with m=5 on 8% missing data. A classmate says 'just delete the incomplete cases — it's only 8%.' What's wrong with this?",
      options: [
        "Nothing — 8% listwise deletion is always acceptable",
        "Listwise deletion assumes MCAR, reduces n, and loses statistical power. MI preserves all 167 cases, produces unbiased estimates under MAR, and correctly propagates uncertainty via Rubin's Rules.",
        "You should use mean substitution instead",
        "8% is below the 10% threshold so either method works"
      ],
      correct: 1,
      explanation: "Listwise deletion: (a) assumes MCAR — which you can't verify, (b) reduces your n below 167, costing power, (c) may introduce bias. MI with m=5 is the principled solution — it uses all available information and Rubin's Rules correctly account for imputation uncertainty in all your standard errors."
    },
    {
      q: "Moral disengagement: M=2.8, SD=0.6, n=167. A participant scores 4.6. What z-score is this, and what does it mean?",
      options: [
        "z=1.6 — above average",
        "z=3.0 — this participant is 3 SDs above the mean, placing them in the top ~0.1% of your sample. An extreme outlier worth examining.",
        "z=0.6 — slightly above average",
        "z=2.4 — moderately elevated"
      ],
      correct: 1,
      explanation: "z = (4.6−2.8)/0.6 = 1.8/0.6 = 3.0. Three SDs above the mean. Under normality, ~99.7% of scores fall within ±3 SDs. This participant is in the extreme tail — worth checking for data entry error or genuine extreme case, and noting in your outlier analysis."
    },
    {
      q: "Your PLS-SEM model: R²=.39 for cyber-aggression, Q²=.24. What do these together tell you?",
      options: [
        "The model explains 39% of variance and has predictive relevance beyond chance (Q²>0). Both are required for a credible structural model.",
        "39% is too low — the model needs more predictors",
        "Q²=.24 means 24% accuracy",
        "R² and Q² measure the same thing"
      ],
      correct: 0,
      explanation: "R²=.39: the model explains 39% of variance in cyber-aggression — good for social science. Q²=.24 > 0: the model has out-of-sample predictive relevance (estimated via blindfolding). You need both: R² shows in-sample fit, Q² shows the model isn't just overfitting."
    },
  ];
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const allAnswered = Object.keys(answers).length === questions.length;
  const score = Object.entries(answers).filter(([i, a]) => questions[i].correct === a).length;
  useEffect(() => { if (allAnswered && !showResults) { setShowResults(true); if (score >= 4 && onPass) onPass(); } }, [answers]);
  return (
    <div>
      <div style={{ ...card, borderColor: C.amber + '44' }}>
        <div style={{ color: C.amber, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>🎓 Capstone Assessment</div>
        <p style={{ color: C.text, fontSize: 16, margin: 0 }}>
          Six integrative questions using your actual dissertation data. These cross module boundaries — the goal is to connect the concepts, not just recall them. Pass mark: 4/6.
        </p>
      </div>
      {questions.map((q, qi) => {
        const answered = answers[qi] !== undefined;
        const isCorrect = answered && answers[qi] === q.correct;
        return (
          <div key={qi} style={{ ...card, borderColor: answered ? (isCorrect ? C.green + '44' : C.red + '44') : C.border }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: answered ? (isCorrect ? C.green + '33' : C.red + '33') : C.border + '55', border: `1px solid ${answered ? (isCorrect ? C.green : C.red) : C.border}`, color: answered ? (isCorrect ? C.green : C.red) : C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {answered ? (isCorrect ? '✓' : '✗') : qi + 1}
              </div>
              <div style={{ color: C.heading, fontSize: 15, fontWeight: 500 }}>{q.q}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.options.map((opt, oi) => {
                let bg = C.bg, border = C.border, color = C.text;
                if (answered) {
                  if (oi === q.correct) { bg = C.green + '22'; border = C.green; color = C.green; }
                  else if (oi === answers[qi]) { bg = C.red + '22'; border = C.red; color = C.red; }
                }
                return (
                  <button key={oi} onClick={() => { if (!answered) setAnswers(a => ({...a, [qi]: oi})); }}
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: '9px 14px', color, textAlign: 'left', cursor: answered ? 'default' : 'pointer', fontSize: 14, transition: 'all 0.2s' }}>
                    {opt}
                  </button>
                );
              })}
            </div>
            {answered && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: C.surface, borderRadius: 8, fontSize: 13, color: C.muted, borderLeft: `3px solid ${isCorrect ? C.green : C.amber}` }}>
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}
      {showResults && (
        <div style={{ ...card, borderColor: score >= 4 ? C.green + '66' : C.amber + '66', background: score >= 4 ? C.green + '0a' : C.amber + '0a' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{score >= 5 ? '🏆' : score >= 4 ? '✅' : '📖'}</div>
            <div style={{ color: score >= 4 ? C.green : C.amber, fontSize: 28, fontWeight: 800, ...mono, marginBottom: 4 }}>{score} / {questions.length}</div>
            <div style={{ color: C.text, fontSize: 16, marginBottom: 8 }}>
              {score === 6 && "Perfect. You understand your own dissertation better than most examiners will."}
              {score === 5 && "Excellent. One slip but you've got the full picture."}
              {score === 4 && "Pass. Solid understanding — review the ones you missed."}
              {score < 4 && "Not there yet. Go back through the modules, then try again."}
            </div>
            {score < 4 && (
              <div style={{ color: C.muted, fontSize: 13 }}>Module complete when you score 4/6 or above.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── MODULES CONFIG ──────────────────────────────────────────── */
const MODULES = [
  { id: 0,  title: "Descriptive Statistics",   icon: "📊", subtitle: "Mean, median, SD, variance",        Component: Mod1  },
  { id: 1,  title: "Normal Distribution",       icon: "🔔", subtitle: "Bell curves & z-scores",           Component: Mod2  },
  { id: 2,  title: "p-values & Inference",      icon: "⚖️", subtitle: "The signal/noise test",            Component: Mod3  },
  { id: 3,  title: "The t-test",                icon: "🔬", subtitle: "Comparing two groups",             Component: Mod4  },
  { id: 4,  title: "Correlation & Regression",  icon: "📈", subtitle: "Build your own model",             Component: Mod5  },
  { id: 5,  title: "Cronbach's Alpha",          icon: "🔗", subtitle: "Internal consistency",             Component: Mod6  },
  { id: 6,  title: "K-means Clustering",        icon: "🎯", subtitle: "Finding natural groups",           Component: Mod7  },
  { id: 7,  title: "Hierarchical Regression",   icon: "🧱", subtitle: "Blocks, ΔR², your dissertation",   Component: Mod8  },
  { id: 8,  title: "PLS-SEM",                   icon: "🕸️", subtitle: "Measurement & structural models", Component: Mod9  },
  { id: 9,  title: "Multiple Imputation",       icon: "🔧", subtitle: "Handling missing data",            Component: Mod10 },
  { id: 10, title: "Capstone",                  icon: "🎓", subtitle: "Integrative assessment",           Component: Mod11 },
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
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <a href="/book.html" target="_blank" rel="noopener"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: C.teal + '14', border: `1px solid ${C.teal}33`, textDecoration: 'none', marginBottom: 8 }}>
            <span style={{ fontSize: 15 }}>📖</span>
            <div>
              <div style={{ color: C.teal, fontSize: 12, fontWeight: 700 }}>Read the Textbook</div>
              <div style={{ color: C.muted, fontSize: 10 }}>Reference & deeper reading</div>
            </div>
            <span style={{ color: C.teal, fontSize: 12, marginLeft: 'auto' }}>↗</span>
          </a>
          <a href="/data/uca_synthetic.csv" download
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: C.amber + '14', border: `1px solid ${C.amber}33`, textDecoration: 'none', marginBottom: 10 }}>
            <span style={{ fontSize: 15 }}>⬇</span>
            <div>
              <div style={{ color: C.amber, fontSize: 12, fontWeight: 700 }}>Download Dataset</div>
              <div style={{ color: C.muted, fontSize: 10 }}>CSV · n=167 · R codebook included</div>
            </div>
          </a>
          <div style={{ color: C.muted, fontSize: 11, ...mono }}>stats.ucahub.ie</div>
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
