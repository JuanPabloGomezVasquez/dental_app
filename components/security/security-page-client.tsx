"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TotpSetup } from "@/components/auth/totp-setup";

interface SecurityPageClientProps {
  totpEnabled: boolean;
}

export function SecurityPageClient({ totpEnabled: initialEnabled }: SecurityPageClientProps) {
  const [totpEnabled, setTotpEnabled] = useState(initialEnabled);
  const router = useRouter();

  function handleStatusChange() {
    setTotpEnabled((prev) => !prev);
    router.refresh();
  }

  return <TotpSetup totpEnabled={totpEnabled} onStatusChange={handleStatusChange} />;
}
