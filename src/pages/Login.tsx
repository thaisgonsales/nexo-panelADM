import { useState, useEffect, useRef } from "react";

import { login } from "../services/api";
import loginVideo from "../assets/login-bg.mp4";

type Props = {
  onLogin: (token: string) => void;
};

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const data = await login(email, password);

      if (data.user.rol !== "admin") {
        setError("Acceso solo para administradores");
        return;
      }

      // ✅ SALVA TOKEN
      localStorage.setItem("token", data.token);

      onLogin(data.token);
    } catch {
      setError("Correo o contraseña incorrectos");
    }
  }
  const videoRef = useRef<HTMLVideoElement>(null);

  // useEffect(() => {
  //   if (videoRef.current) {
  //     videoRef.current.playbackRate = 0.5; // 👈 deixa o vídeo mais lento
  //   }
  // }, []);

  function handleVideoLoop() {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // quando chega perto do final, volta suavemente
    if (video.currentTime >= video.duration - 0.3) {
      video.currentTime = 0.05;
    }
  }

  return (
    <div className="auth-container">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="login-video"
        onTimeUpdate={handleVideoLoop}
      >
        <source src={loginVideo} type="video/mp4" />
      </video>

      <form className="auth-card" onSubmit={handleSubmit}>
        <h2 className="auth-title">Panel de Administración</h2>

        <label className="auth-label">Correo electrónico</label>
        <input
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="auth-label">Contraseña</label>
        <input
          type="password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="auth-button">Ingresar</button>

        {error && <p className="auth-error">{error}</p>}
      </form>
    </div>
  );
}
