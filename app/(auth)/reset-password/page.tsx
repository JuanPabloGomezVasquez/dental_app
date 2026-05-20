import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Nueva contraseña</h1>
            <p className="text-sm text-gray-500 mt-1">Crea una contraseña segura para tu cuenta.</p>
          </div>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
