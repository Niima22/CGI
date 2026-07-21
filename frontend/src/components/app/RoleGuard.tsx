import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
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
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const allowed = allowedRoles.some((role) => hasRole(role));

  useEffect(() => {
    if (!allowed) {
      void navigate({
        to: "/access-denied",
        replace: true,
      });
    }
  }, [allowed, navigate]);

  if (!allowed) {
    return <AccessDeniedContent message={message} />;
  }

  return <>{children}</>;
}
