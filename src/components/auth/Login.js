import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import AuthLayout from "./AuthLayout";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const destination = location.state?.from;
      navigate(
        destination?.startsWith("/") && !destination.startsWith("//")
          ? destination
          : "/",
        { replace: true },
      );
    } catch (failure) {
      const messages = {
        "auth/invalid-credential":
          "El correo o la contraseña no son correctos.",
        "auth/invalid-email": "Revisa la dirección de correo.",
        "auth/too-many-requests":
          "Demasiados intentos. Espera unos minutos y vuelve a probar.",
        "auth/network-request-failed":
          "No se pudo conectar. Comprueba tu conexión.",
      };
      setError(
        messages[failure.code] ||
          "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      title="Vuelve a tu aprendizaje"
      description="Inicia sesión para continuar donde lo dejaste."
    >
      <Helmet>
        <title>Iniciar sesión · Magister</title>
      </Helmet>
      <form onSubmit={submit}>
        <fieldset className="plain-fieldset" disabled={busy}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>
        </fieldset>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button auth-submit" type="submit" disabled={busy}>
          {busy ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
      <p className="auth-switch">
        ¿Es tu primera vez?{" "}
        <Link to="/signup" state={location.state}>
          Crear una cuenta
        </Link>
      </p>
    </AuthLayout>
  );
}
