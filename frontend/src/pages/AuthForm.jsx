import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { Alert, Icon } from "../components/ui.jsx";

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { login, register, notice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await (isRegister ? register(form) : login({ email: form.email, password: form.password }));
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message); setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <div className="brand big"><span className="brand-mark"><Icon name="check" size={22} /></span>StudyFlow</div>
        <h2>Tu semestre, en orden.</h2>
        <p>Organiza entregas, prioriza lo urgente y calcula cuánto te costará estudiar, con el tipo de cambio del día.</p>
        <ul>
          <li>Prioridades y fechas límite</li>
          <li>Filtros y búsqueda al instante</li>
          <li>Presupuesto de estudio en pesos</li>
        </ul>
      </section>
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{isRegister ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>
        <Alert kind="info">{notice}</Alert>
        <Alert>{error}</Alert>
        {isRegister && (
          <label>Nombre<input value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} required /></label>
        )}
        <label>Correo<input type="email" value={form.email} onChange={set("email")} autoComplete="email" required /></label>
        <label>Contraseña
          <input type="password" value={form.password} onChange={set("password")} autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
          {isRegister && <small>Mínimo 8 caracteres.</small>}
        </label>
        <button className="btn primary" disabled={busy}>{busy ? "Un momento…" : isRegister ? "Registrarme" : "Entrar"}</button>
        <p className="switch">
          {isRegister ? <>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></> : <>¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link></>}
        </p>
      </form>
    </div>
  );
}
