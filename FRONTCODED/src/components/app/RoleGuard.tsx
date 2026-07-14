import type { ReactNode } from "react";
import { AccessDeniedContent } from "./AccessDeniedContent";
import { useAuth, type Role } from "@/lib/auth-store";

export function RoleGuard({
  allowedRoles,
  message,
  children,
}: {
  allowedRoles: Role[];
  message: string;
  children: ReactNode;
}) {
  const { hasRole } = useAuth();
  const allowed = allowedRoles.some((role) => hasRole(role));

  if (!allowed) {
    return <AccessDeniedContent message={message} />;
  }

  return <>{children}</>;
}
