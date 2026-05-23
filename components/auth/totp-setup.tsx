"use client";
import { useState } from "react";
import Image from "next/image";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

interface TotpSetupProps {
  totpEnabled: boolean;
  onStatusChange: () => void;
}

export function TotpSetup({ totpEnabled, onStatusChange }: TotpSetupProps) {
  const [step, setStep] = useState<"idle" | "qr" | "verify" | "disable">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/setup");
      const data = await res.json() as { qrDataUrl?: string; secret?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar configuración");
      setQrDataUrl(data.qrDataUrl!);
      setSecret(data.secret!);
      setStep("qr");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function enableTotp() {
    if (!/^\d{6}$/.test(token)) {
      setError("El código debe tener 6 dígitos");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al habilitar 2FA");
      setStep("idle");
      setToken("");
      setSecret(null);
      setQrDataUrl(null);
      onStatusChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function disableTotp() {
    if (!/^\d{6}$/.test(token)) {
      setError("El código debe tener 6 dígitos");
      return;
    }
    if (!password) {
      setError("La contraseña es requerida");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/totp/disable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al deshabilitar 2FA");
      setStep("idle");
      setToken("");
      setPassword("");
      onStatusChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {step === "idle" && (
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${totpEnabled ? "bg-green-100" : "bg-gray-100"}`}>
            {totpEnabled ? (
              <ShieldCheck className="w-6 h-6 text-green-600" />
            ) : (
              <ShieldOff className="w-6 h-6 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {totpEnabled ? "2FA habilitado" : "2FA deshabilitado"}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              {totpEnabled
                ? "Tu cuenta está protegida con autenticación de dos factores."
                : "Agrega una capa extra de seguridad con una aplicación autenticadora (Google Authenticator, Authy, etc.)."}
            </p>
            {totpEnabled ? (
              <button
                onClick={() => { setStep("disable"); setError(null); }}
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                Deshabilitar 2FA
              </button>
            ) : (
              <button
                onClick={startSetup}
                disabled={loading}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Configurar 2FA
              </button>
            )}
          </div>
        </div>
      )}

      {step === "qr" && qrDataUrl && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Escanea este código QR con tu aplicación autenticadora y luego ingresa el código de 6 dígitos para confirmar.
          </p>
          <div className="flex justify-center">
            <Image src={qrDataUrl} alt="QR Code 2FA" width={200} height={200} />
          </div>
          {secret && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">O ingresa esta clave manualmente:</p>
              <code className="text-sm font-mono tracking-wider text-gray-800">{secret}</code>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Código de verificación</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={enableTotp}
              disabled={loading || token.length !== 6}
              className="flex-1 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Activar 2FA
            </button>
            <button
              onClick={() => { setStep("idle"); setError(null); setToken(""); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step === "disable" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Para deshabilitar 2FA confirma tu contraseña y el código actual de tu aplicación autenticadora.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Código TOTP</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={disableTotp}
              disabled={loading || token.length !== 6 || !password}
              className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Deshabilitar 2FA
            </button>
            <button
              onClick={() => { setStep("idle"); setError(null); setToken(""); setPassword(""); }}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {step !== "qr" && step !== "disable" && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
