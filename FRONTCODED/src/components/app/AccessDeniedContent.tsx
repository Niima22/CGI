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
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
      <div className="w-full rounded-lg border border-border bg-card p-8 text-center shadow-card">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">Acces refuse</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {currentRole && (
          <p className="mt-2 text-xs text-muted-foreground">Role actuel : {currentRole}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/dashboard">Retour au dashboard</Link>
          </Button>
          {showLogout && (
            <Button
              type="button"
              variant="outline"
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
