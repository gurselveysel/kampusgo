"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "../actions";
import styles from "./giris.module.css";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.submit} type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? <><span className={styles.spinner} aria-hidden="true" /> Doğrulanıyor…</> : "Giriş yap"}
    </button>
  );
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="username">Kullanıcı adı</label>
        <input
          id="username"
          name="username"
          type="text"
          inputMode="text"
          autoComplete="username"
          minLength={3}
          maxLength={64}
          required
          spellCheck={false}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="password">Parola</label>
        <div className={styles.passwordField}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            minLength={12}
            maxLength={256}
            required
          />
          <button
            type="button"
            className={styles.reveal}
            aria-pressed={showPassword}
            aria-controls="password"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? "Gizle" : "Göster"}
          </button>
        </div>
      </div>
      {state.error ? <p className={styles.error} role="alert" aria-live="assertive">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
