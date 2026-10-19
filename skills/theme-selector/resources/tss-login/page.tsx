"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { EyeToggleIcon } from "@/components/animated-icons";
import { ForgeMark } from "@/components/forge-mark";
import { readErrorDetail } from "@/lib/api/errors";

// Smokey WebGL-achtergrond, geport uit de PolpoHire-ATS-login: gelaagde cosinus-
// distortie maakt van een sinus drivende rook, de muis verschuift het ripple-
// centrum. Kleur en helderheid zijn 1:1 de ATS-navy. Bij reduced-motion rendert
// de shader een enkel stilstaand frame. Geen WebGL = de donkere fallback.
const VERT = `
  attribute vec4 a_position;
  void main() { gl_Position = a_position; }
`;
const FRAG = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime * 0.09;
  vec2 mouse = iMouse / iResolution;
  vec2 rippleCenter = 2.0 * mouse - 1.0;

  vec2 distortion = centeredUV;
  for (float i = 1.0; i < 8.0; i++) {
    distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 1.6);
    distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 1.6);
  }
  float wave = abs(sin(distortion.x + distortion.y + time));
  float glow = smoothstep(1.15, 0.05, wave) * 0.90;
  gl_FragColor = vec4(u_color * glow, 1.0);
}
`;
// Diep gedempt navy (#1a2b5e), exact de ATS-waarde: donker genoeg om achter de
// glaskaart te zitten, licht genoeg om nog te breken door het glas.
const SMOKE_COLOR: [number, number, number] = [0x1a / 255, 0x2b / 255, 0x5e / 255];

function useSmokeShader(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  stageRef: React.RefObject<HTMLDivElement | null>,
): void {
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    function compile(type: number, source: string): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uMouse = gl.getUniformLocation(program, "iMouse");
    const uColor = gl.getUniformLocation(program, "u_color");
    gl.uniform3f(uColor, ...SMOKE_COLOR);

    // Het ripple-centrum snapt nooit naar de muis: elk frame easet het met een
    // kritisch-gedempte falloff naar het doel, zodat de rook de hand volgt en
    // bij vertrek terugzakt naar het midden.
    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;
    let hovering = false;
    let raf = 0;
    const onMove = (e: MouseEvent): void => {
      const rect = stage.getBoundingClientRect();
      targetX = e.clientX - rect.left;
      targetY = e.clientY - rect.top;
    };
    const onEnter = (): void => { hovering = true; };
    const onLeave = (): void => { hovering = false; };
    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseenter", onEnter);
    stage.addEventListener("mouseleave", onLeave);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = Date.now();
    let last = start;
    let seeded = false;

    const draw = (): void => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (!seeded) {
        smoothX = width / 2;
        smoothY = height / 2;
        seeded = true;
      }
      const now = Date.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const ease = 1 - Math.exp(-dt / 0.35);
      const tx = hovering ? targetX : width / 2;
      const ty = hovering ? targetY : height / 2;
      smoothX += (tx - smoothX) * ease;
      smoothY += (ty - smoothY) * ease;

      gl.viewport(0, 0, width, height);
      gl.uniform2f(uRes, width, height);
      gl.uniform1f(uTime, reduceMotion ? 0 : (now - start) / 1000);
      gl.uniform2f(uMouse, smoothX, height - smoothY);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduceMotion) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("mousemove", onMove);
      stage.removeEventListener("mouseenter", onEnter);
      stage.removeEventListener("mouseleave", onLeave);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, [canvasRef, stageRef]);
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  useSmokeShader(canvasRef, stageRef);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(readErrorDetail(data.detail, "Inloggen mislukt"));
        return;
      }
      router.push(data.agreement_signed ? "/" : "/agreement");
      router.refresh();
    } catch {
      setError("Kon geen verbinding maken met TSS");
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={stageRef} className="tssauth">
      <canvas ref={canvasRef} className="tssauth__shader" aria-hidden />
      <div className="tssauth__haze" aria-hidden />

      <div className="tssauth__glass">
        <div className="tssauth__head">
          <div className="tssauth__brand">
            <ForgeMark className="tssauth__mark" />
            <span className="tssauth__word">The Staffing Society</span>
          </div>
          <h1 className="tssauth__title">Welkom terug</h1>
          <p className="tssauth__sub">Log in om verder te gaan</p>
        </div>

        <form className="tssauth__form" onSubmit={handleSubmit}>
          <div className="tssauth__field">
            <input
              id="tssauth-email"
              type="email"
              className="tssauth__input"
              placeholder=" "
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="tssauth__label" htmlFor="tssauth-email">
              E-mailadres
            </label>
          </div>

          <div className="tssauth__field">
            <input
              id="tssauth-password"
              type={showPw ? "text" : "password"}
              className="tssauth__input tssauth__input--pw"
              placeholder=" "
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label className="tssauth__label" htmlFor="tssauth-password">
              Wachtwoord
            </label>
            <button
              type="button"
              className="tssauth__toggle"
              aria-label={showPw ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
              onClick={() => setShowPw((v) => !v)}
            >
              <EyeToggleIcon open={!showPw} size={17} />
            </button>
          </div>

          {error ? (
            <p className="tssauth__err" role="alert">{error}</p>
          ) : null}

          <button type="submit" className="tssauth__submit" disabled={pending}>
            {pending ? <span className="tssauth__spinner" aria-hidden /> : null}
            {pending ? "Bezig met inloggen" : "Inloggen"}
            {!pending ? (
              <svg className="tssauth__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            ) : null}
          </button>
        </form>

        <p className="tssauth__foot">
          Nog geen account?{" "}
          <Link href="/register" className="tssauth__link">Registreren</Link>
        </p>
      </div>

      <style>{TSSAUTH_CSS}</style>
    </div>
  );
}

const TSSAUTH_CSS = `
.tssauth {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: hidden;
  background: #05070f;
  font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
}
.tssauth__shader { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.tssauth__haze {
  position: absolute; inset: 0;
  backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px);
  background: rgba(5, 7, 15, 0.34);
}
.tssauth__glass {
  position: relative; width: 100%; max-width: 384px; padding: 32px;
  display: flex; flex-direction: column; gap: 24px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}
.tssauth__head { text-align: center; }
.tssauth__brand { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 14px; }
.tssauth__mark { width: 26px; height: 26px; color: #fff; flex: none; }
.tssauth__word { font-size: 16px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; color: #fff; }
.tssauth__title { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #fff; }
.tssauth__sub { margin: 8px 0 0; font-size: 14px; color: rgba(209, 213, 219, 0.95); }
.tssauth__form { display: flex; flex-direction: column; gap: 32px; }
.tssauth__field { position: relative; }
.tssauth__input {
  display: block; width: 100%; padding: 10px 0;
  font-family: inherit; font-size: 14px; color: #fff;
  background: transparent; border: 0;
  border-bottom: 2px solid rgba(209, 213, 219, 0.75);
  border-radius: 0; outline: none; transition: border-color 200ms ease;
}
.tssauth__input--pw { padding-right: 34px; }
.tssauth__input:focus { border-color: #3b82f6; }
.tssauth__label {
  position: absolute; top: 12px; left: 0;
  font-size: 14px; color: rgba(209, 213, 219, 0.95);
  pointer-events: none; transform-origin: left top;
  transition: transform 300ms ease, color 300ms ease;
}
.tssauth__input:focus ~ .tssauth__label,
.tssauth__input:not(:placeholder-shown) ~ .tssauth__label,
.tssauth__input:-webkit-autofill ~ .tssauth__label {
  transform: translateY(-24px) scale(0.75);
}
.tssauth__input:focus ~ .tssauth__label { color: #60a5fa; }
.tssauth__input:-webkit-autofill,
.tssauth__input:-webkit-autofill:hover,
.tssauth__input:-webkit-autofill:focus,
.tssauth__input:autofill {
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: #fff; caret-color: #fff;
  transition: background-color 9999999s step-end;
}
.tssauth__toggle {
  position: absolute; right: 0; top: 8px;
  display: grid; place-items: center; width: 28px; height: 28px;
  border: none; border-radius: 6px; background: transparent;
  color: rgba(209, 213, 219, 0.85); cursor: pointer;
  transition: color 150ms ease, transform 150ms ease;
}
.tssauth__toggle:hover { color: #fff; }
.tssauth__toggle:active { transform: scale(0.92); }
.tssauth__toggle:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
.tssauth__submit {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px 16px;
  font-family: inherit; font-size: 15px; font-weight: 600; color: #fff;
  background: #2563eb; border: none; border-radius: 8px; cursor: pointer;
  transition: background 300ms ease, transform 150ms ease;
}
.tssauth__submit:hover:not(:disabled) { background: #1d4ed8; }
.tssauth__submit:active:not(:disabled) { transform: scale(0.985); }
.tssauth__submit:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
.tssauth__submit:disabled { opacity: 0.6; cursor: default; }
.tssauth__arrow { transition: transform 300ms ease; }
.tssauth__submit:hover:not(:disabled) .tssauth__arrow { transform: translateX(4px); }
.tssauth__err {
  margin: -8px 0 0; font-size: 13px; color: #fecdd3;
  background: rgba(136, 19, 55, 0.35); border: 1px solid rgba(244, 114, 182, 0.4);
  border-radius: 8px; padding: 10px 12px;
}
.tssauth__foot { margin: 0; text-align: center; font-size: 13px; color: rgba(209, 213, 219, 0.95); }
.tssauth__link { color: #8ea2ff; font-weight: 600; text-decoration: none; }
.tssauth__link:hover { text-decoration: underline; }
.tssauth__spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff; border-radius: 50%; animation: tssauth-spin 0.7s linear infinite;
}
@keyframes tssauth-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .tssauth__input, .tssauth__label, .tssauth__arrow, .tssauth__submit, .tssauth__toggle { transition: none; }
  .tssauth__spinner { animation-duration: 2s; }
}
`;
