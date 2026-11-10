import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import AuthLayout from "./AuthLayout";

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      const destination = location.state?.from;
      navigate(
        destination?.startsWith("/") && !destination.startsWith("//")
          ? destination
          : "/",
        { replace: true },
      );
    } catch (failure) {
      const messages = {
        "auth/email-already-in-use":
          "Ya existe una cuenta con este correo. Puedes iniciar sesión.",
        "auth/weak-password":
          "Elige una contraseña más segura, con al menos 6 caracteres.",
        "auth/invalid-email": "Revisa la dirección de correo.",
        "auth/network-request-failed":
          "No se pudo conectar. Comprueba tu conexión.",
      };
      setError(
        messages[failure.code] ||
          "No se pudo crear la cuenta. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout
      title="Empieza tu propia ruta"
      description="Crea tu cuenta y guarda todo lo que vas aprendiendo."
    >
      <Helmet>
        <title>Crear cuenta · Magister</title>
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
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="field-help">
              Al menos 6 caracteres.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="confirmation">Repite la contraseña</label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
        </fieldset>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <button className="button auth-submit" type="submit" disabled={busy}>
          {busy ? "Creando tu cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" state={location.state}>
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
