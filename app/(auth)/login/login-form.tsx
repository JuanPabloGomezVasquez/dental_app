"use client";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, verify2fa, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const [totpState, totpAction, totpPending] = useActionState(verify2fa, initialState);
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";

  if (state?.requires2fa) {
    return (
      <form action={totpAction} className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-sm text-gray-600">
            Ingresa el código de 6 dígitos de tu aplicación autenticadora.
          </p>
        </div>

        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1.5">
            Código de verificación
          </label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 text-center tracking-[0.5em] font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            placeholder="000000"
          />
        </div>

        {totpState?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700">{totpState.error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={totpPending}
          className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {totpPending ? "Verificando..." : "Verificar código"}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          placeholder="admin@clinica.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
        />
      </div>

      {justReset && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <p className="text-sm text-green-700">Contraseña actualizada. Ya puedes iniciar sesión.</p>
        </div>
      )}

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Iniciando sesión..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/forgot-password" className="text-blue-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
