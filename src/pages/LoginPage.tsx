import { Bike, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { HOME_PATHS, useAuth } from "../auth/AuthContext";
import { Field } from "../components/Field";
import { Notice } from "../components/Notice";
import { errorMessage } from "../components/toast/ToastContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { session, notice, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to={HOME_PATHS[session.user.role]} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Escribe tu usuario y tu contraseña.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const user = await signIn(username.trim(), password);
      const home = HOME_PATHS[user.role];
      const roleSection = `/${home.split("/")[1]}`;
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith(roleSection) ? from : home, { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
      setSubmitting(false);
    }
  };

  return (
    <main className="login">
      <div className="login__panel">
        <div className="login__brand">
          <span className="login__mark" aria-hidden="true">
            <Bike size={36} strokeWidth={2.25} />
          </span>
          <div>
            <h1>Al Colegio en Bici</h1>
            <p className="muted">Ingreso para el equipo de operación</p>
          </div>
        </div>

        {notice && !error && <Notice tone="warning">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <form className="form" onSubmit={handleSubmit} noValidate>
          <Field label="Usuario">
            {(control) => (
              <input
                {...control}
                className="input"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            )}
          </Field>
          <Field label="Contraseña">
            {(control) => (
              <div className="password-input">
                <input
                  {...control}
                  className="input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="button button--quiet button--icon"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={22} aria-hidden="true" />
                  ) : (
                    <Eye size={22} aria-hidden="true" />
                  )}
                </button>
              </div>
            )}
          </Field>
          <button
            type="submit"
            className="button button--primary button--large button--block"
            disabled={submitting}
          >
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
