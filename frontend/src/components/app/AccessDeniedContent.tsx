import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";

export function AccessDeniedContent({
  message,
  showLogout = true,
}: {
  message: string;
  showLogout?: boolean;
}) {
  const { user, logout } = useAuth();
  const currentRole = user?.primaryRole ? getBusinessRoleLabel(user.primaryRole) : null;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl items-center justify-center px-3 py-6 sm:px-4">
      <div className="w-full rounded-lg border border-border bg-card p-5 text-center shadow-card sm:p-8">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Acces refuse</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {currentRole && (
          <p className="mt-2 text-xs text-muted-foreground">Role actuel : {currentRole}</p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/dashboard">Retour au dashboard</Link>
          </Button>
          {showLogout && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                void logout();
              }}
            >
              Se deconnecter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
