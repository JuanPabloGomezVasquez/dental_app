import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">DentApp</h1>
            <p className="text-sm text-gray-500 mt-1">Accede a tu consultorio</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
