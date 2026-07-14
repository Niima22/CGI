import { useCallback, useEffect, useState } from "react";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import { ApiError, fetchMyEmployee } from "@/lib/api/employees";
import { subscribeProfilePhotoUpdate } from "@/lib/availability-status-events";
import { useAuth } from "@/lib/auth-store";

export function CurrentUserAvatar({ compact = false }: { compact?: boolean }) {
  const { authenticatedFetch, email, fullName, isAuthenticated, user } = useAuth();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const loadPhoto = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setProfilePhotoUrl(null);
      return;
    }

    try {
      const employee = await fetchMyEmployee(authenticatedFetch);
      setProfilePhotoUrl(employee.profilePhotoUrl ?? null);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setProfilePhotoUrl(null);
        return;
      }
      setProfilePhotoUrl(null);
    }
  }, [authenticatedFetch, isAuthenticated, user]);

  useEffect(() => {
    void loadPhoto();
  }, [loadPhoto]);

  useEffect(() => subscribeProfilePhotoUpdate(setProfilePhotoUrl), []);

  return (
    <ProfileAvatar
      fullName={fullName}
      email={email}
      profilePhotoUrl={profilePhotoUrl}
      size={compact ? "sm" : "md"}
    />
  );
}
