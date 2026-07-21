import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  FileText,
  LoaderCircle,
  PencilLine,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProfileAvatar } from "@/components/app/ProfileAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  StatusBadge,
  formatAvailabilityStatus,
  formatDate,
  formatValue,
} from "@/components/employees/employee-ui";
import {
  ApiError,
  fetchMyEmployee,
  updateMyProfile,
  updateMyAvailabilityStatus,
  uploadProfilePhoto,
  type AvailabilityStatus,
  type Employee,
} from "@/lib/api/employees";
import {
  publishAvailabilityStatusUpdate,
  publishProfilePhotoUpdate,
} from "@/lib/availability-status-events";
import { getBusinessRoleLabel, useAuth } from "@/lib/auth-store";
import { agentEmployeeMock, agentProfileMock, isAgentUser } from "@/mocks/agentProfileMock";

export const Route = createFileRoute("/my-profile")({
  head: () => ({
    meta: [
      { title: "Mon profil - CGI-FLOW" },
      {
        name: "description",
        content: "Profil personnel et donnees de compte CGI-FLOW.",
      },
    ],
  }),
  component: MyProfilePage,
});

function MyProfilePage() {
  const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
  const ACCEPTED_PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const { authenticatedFetch, user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeMissing, setEmployeeMissing] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("OFFLINE");
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [profileForm, setProfileForm] = useState({
    phone: "",
    address: "",
    bio: "",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const isAgent = isAgentUser(user);
  const effectiveRolesLabel = isAgent
    ? agentProfileMock.effectiveRoles.join(", ")
    : user?.roles.length
      ? user.roles.map(getBusinessRoleLabel).join(", ")
      : "Aucun role metier";
  const localStatusLabel = isAgent
    ? agentProfileMock.localStatus
    : user?.localProfile?.accountStatus
      ? user.localProfile.accountStatus === "ACTIVE"
        ? "Actif"
        : "Inactif"
      : "Aucun";

  const accountWarnings = useMemo(() => {
    if (!user) {
      return [];
    }
    if (isAgentUser(user)) {
      return [];
    }

    const warnings: string[] = [];
    if (user.warnings.includes("LOCAL_PROFILE_MISSING")) {
      warnings.push(
        "Votre compte est authentifie, mais aucun profil local n'est encore synchronise.",
      );
    }
    if (user.localProfileLinked && employeeMissing) {
      warnings.push("Aucun profil employe n'est actuellement lie a votre compte.");
    }
    return warnings;
  }, [employeeMissing, user]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setEmployeeError(null);
    setEmployeeMissing(false);
    setNotice(null);
    if (isAgentUser(user)) {
      setEmployee(agentEmployeeMock);
      setProfileForm({
        phone: "",
        address: "",
        bio: "",
      });
      publishProfilePhotoUpdate(null);
      setAvailabilityStatus("AVAILABLE");
      publishAvailabilityStatusUpdate("AVAILABLE");
      setLoading(false);
      return;
    }
    try {
      const currentEmployee = await fetchMyEmployee(authenticatedFetch);
      setEmployee(currentEmployee);
      setProfileForm({
        phone: currentEmployee.phone ?? "",
        address: currentEmployee.address ?? "",
        bio: currentEmployee.bio ?? "",
      });
      publishProfilePhotoUpdate(currentEmployee.profilePhotoUrl ?? null);
      const nextStatus = currentEmployee.availabilityStatus ?? "OFFLINE";
      setAvailabilityStatus(nextStatus);
      publishAvailabilityStatusUpdate(nextStatus);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setEmployeeMissing(true);
      } else {
        setEmployeeError(readEmployeeError(caught));
      }
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function saveAvailabilityStatus() {
    setUpdatingAvailability(true);
    setEmployeeError(null);
    setNotice(null);
    try {
      const updated = await updateMyAvailabilityStatus(authenticatedFetch, availabilityStatus);
      setEmployee(updated);
      const nextStatus = updated.availabilityStatus ?? "OFFLINE";
      setAvailabilityStatus(nextStatus);
      publishAvailabilityStatusUpdate(nextStatus);
      setNotice("Votre statut de disponibilite a ete mis a jour.");
    } catch (caught) {
      setEmployeeError(readEmployeeError(caught, "Impossible de mettre a jour votre disponibilite."));
    } finally {
      setUpdatingAvailability(false);
    }
  }

  function cancelProfileEdit() {
    setEditMode(false);
    setEmployeeError(null);
    setNotice(null);
    setProfileForm({
      phone: employee?.phone ?? "",
      address: employee?.address ?? "",
      bio: employee?.bio ?? "",
    });
    setSelectedPhotoFile(null);
  }

  async function saveProfile() {
    setSavingProfile(true);
    setEmployeeError(null);
    setNotice(null);
    try {
      const updated = await updateMyProfile(authenticatedFetch, {
        phone: cleanOptionalText(profileForm.phone),
        address: cleanOptionalText(profileForm.address),
        bio: cleanOptionalText(profileForm.bio),
      });
      setEmployee(updated);
      setProfileForm({
        phone: updated.phone ?? "",
        address: updated.address ?? "",
        bio: updated.bio ?? "",
      });
      setEditMode(false);
      setNotice("Vos informations personnelles ont ete mises a jour.");
    } catch (caught) {
      setEmployeeError(readEmployeeError(caught, "Impossible de mettre a jour vos informations."));
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveProfilePhoto() {
    if (!selectedPhotoFile) {
      return;
    }

    if (!ACCEPTED_PROFILE_PHOTO_TYPES.includes(selectedPhotoFile.type)) {
      setEmployeeError("Le fichier doit être au format JPG, PNG ou WEBP.");
      return;
    }
    if (selectedPhotoFile.size > MAX_PROFILE_PHOTO_BYTES) {
      setEmployeeError("La photo ne doit pas dépasser 2 Mo.");
      return;
    }

    setUploadingPhoto(true);
    setEmployeeError(null);
    setNotice(null);
    try {
      const updated = await uploadProfilePhoto(authenticatedFetch, selectedPhotoFile);
      setEmployee(updated);
      publishProfilePhotoUpdate(updated.profilePhotoUrl ?? null);
      setSelectedPhotoFile(null);
      setNotice("Votre photo de profil a été mise à jour.");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        setEmployeeError("Le fichier doit être au format JPG, PNG ou WEBP.");
      } else if (caught instanceof ApiError && caught.status === 413) {
        setEmployeeError("La photo ne doit pas dépasser 2 Mo.");
      } else {
        setEmployeeError(readEmployeeError(caught, "Impossible de téléverser la photo de profil."));
      }
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Consultation des donnees de compte et du profil employe.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadProfile()} disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" /> : <BriefcaseBusiness />}
            Actualiser
          </Button>
        </div>

        {accountWarnings.map((warning) => (
          <WarningBanner key={warning} message={warning} />
        ))}

        {employeeError && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {employeeError}
          </div>
        )}
        {notice && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            {notice}
          </div>
        )}

        <section className="rounded-md border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Compte</h2>
          </div>

          {user ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Info label="Nom complet" value={isAgent ? agentProfileMock.fullName : user.fullName} />
              <Info label="Email" value={isAgent ? agentProfileMock.email : user.email} />
              <Info
                label="Role principal"
                value={
                  isAgent
                    ? agentProfileMock.primaryRole
                    : user.primaryRole
                      ? getBusinessRoleLabel(user.primaryRole)
                      : "Non defini"
                }
              />
              <Info
                label="Roles effectifs"
                value={effectiveRolesLabel}
              />
              <Info
                label="Statut du compte"
                value={isAgent ? agentProfileMock.accountStatus : user.accountStatus === "ACTIVE" ? "Actif" : "Inactif"}
              />
              <Info
                label="Profil local"
                value={isAgent ? agentProfileMock.localProfileStatus : user.localProfileLinked ? "Synchronise" : "Non synchronise"}
              />
              <Info label="ID Keycloak" value={isAgent ? agentProfileMock.keycloakId : user.keycloakId} />
              <Info label="Profil local ID" value={isAgent ? agentProfileMock.id : user.localProfile?.id ?? "Aucun"} />
              <Info
                label="Role local"
                value={
                  isAgent
                    ? agentProfileMock.localRole
                    : user.localProfile?.role
                      ? getBusinessRoleLabel(user.localProfile.role)
                      : "Aucun"
                }
              />
              <Info
                label="Statut local"
                value={localStatusLabel}
              />
              <Info
                label="Cree le"
                value={
                  isAgent
                    ? formatDate(agentProfileMock.createdAt)
                    : user.localProfile?.createdAt
                      ? formatDate(user.localProfile.createdAt)
                      : "Aucun"
                }
              />
              <Info
                label="Mis a jour"
                value={
                  isAgent
                    ? formatDate(agentProfileMock.updatedAt)
                    : user.localProfile?.updatedAt
                      ? formatDate(user.localProfile.updatedAt)
                      : "Aucun"
                }
              />
            </div>
          ) : (
            <div className="mt-5 text-sm text-muted-foreground">
              Chargement des informations de compte.
            </div>
          )}
        </section>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center rounded-md border border-border bg-card shadow-card">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : employee ? (
          <section className="rounded-md border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-semibold">Profil employe</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Informations metier actuellement associees a votre compte.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge employee={employee} />
                {!editMode ? (
                  <Button type="button" variant="outline" onClick={() => setEditMode(true)}>
                    <PencilLine />
                    Modifier mes informations
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={cancelProfileEdit} disabled={savingProfile}>
                      <X />
                      Annuler
                    </Button>
                    <Button type="button" onClick={() => void saveProfile()} disabled={savingProfile}>
                      {savingProfile ? <LoaderCircle className="animate-spin" /> : <Save />}
                      Enregistrer
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="rounded-md border border-border/70 bg-background px-4 py-5">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <ProfileAvatar
                      fullName={employee.fullName}
                      email={employee.email}
                      profilePhotoUrl={employee.profilePhotoUrl}
                      size="lg"
                    />
                    <div>
                      <div className="font-medium text-foreground">{employee.fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatValue(employee.jobTitle)}
                      </div>
                    </div>
                  </div>
                </div>
                {editMode && (
                  <div className="rounded-md border border-border/70 bg-background px-4 py-4">
                    <div className="mb-2 text-sm font-medium text-foreground">Choisir une photo</div>
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setSelectedPhotoFile(file);
                          setEmployeeError(null);
                        }}
                      />
                      <div className="text-xs text-muted-foreground">
                        {selectedPhotoFile
                          ? `${selectedPhotoFile.name} (${Math.ceil(selectedPhotoFile.size / 1024)} Ko)`
                          : "JPG, PNG ou WEBP, 2 Mo maximum."}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!selectedPhotoFile || uploadingPhoto}
                        onClick={() => void saveProfilePhoto()}
                      >
                        {uploadingPhoto ? <LoaderCircle className="animate-spin" /> : <Save />}
                        Téléverser la photo
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
              <Info label="Employe ID" value={employee.id} />
              <Info label="Nom complet" value={employee.fullName} />
              <Info label="Email lie" value={employee.email} />
              {editMode ? (
                <EditableField label="Telephone">
                  <Input
                    value={profileForm.phone}
                    maxLength={40}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    placeholder="Numero de telephone"
                  />
                </EditableField>
              ) : (
                <Info label="Telephone" value={employee.phone} />
              )}
              <Info label="Poste" value={employee.jobTitle} />
              <Info label="Departement" value={employee.department} />
              <Info label="Bannette" value={employee.bannette} />
              <Info label="Competences" value={null} />
              <Info label="Photo de profil" value={null} />
              <Info label="Statut employe" value={employee.status} />
              <div className="rounded-md border border-border/70 bg-background px-3 py-2 md:col-span-2">
                <div className="text-xs text-muted-foreground">Disponibilite</div>
                <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={availabilityStatus}
                      onValueChange={(value) => setAvailabilityStatus(value as AvailabilityStatus)}
                      disabled={updatingAvailability}
                    >
                      <SelectTrigger aria-label="Statut de disponibilite">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">{formatAvailabilityStatus("AVAILABLE")}</SelectItem>
                        <SelectItem value="BREAK">{formatAvailabilityStatus("BREAK")}</SelectItem>
                        <SelectItem value="IN_COMMUNICATION">
                          {formatAvailabilityStatus("IN_COMMUNICATION")}
                        </SelectItem>
                        <SelectItem value="LEAVE">{formatAvailabilityStatus("LEAVE")}</SelectItem>
                        <SelectItem value="OFFLINE">{formatAvailabilityStatus("OFFLINE")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={updatingAvailability || availabilityStatus === (employee.availabilityStatus ?? "OFFLINE")}
                    onClick={() => void saveAvailabilityStatus()}
                  >
                    {updatingAvailability ? <LoaderCircle className="animate-spin" /> : <Save />}
                    Mettre a jour
                  </Button>
                </div>
              </div>
              <Info label="Statut operationnel" value={employee.operationalStatus} />
              <Info label="Statut activite" value={employee.activityStatus} />
              {editMode ? (
                <EditableField label="Adresse">
                  <Input
                    value={profileForm.address}
                    maxLength={255}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, address: event.target.value }))
                    }
                    placeholder="Adresse"
                  />
                </EditableField>
              ) : (
                <Info label="Adresse" value={employee.address} />
              )}
              {editMode ? (
                <EditableField label="Bio" className="md:col-span-2">
                  <Textarea
                    value={profileForm.bio}
                    maxLength={1000}
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, bio: event.target.value }))
                    }
                    placeholder="Courte description personnelle"
                    rows={4}
                  />
                </EditableField>
              ) : (
                <Info label="Bio" value={employee.bio} />
              )}
              <Info label="Photo de profil" value={employee.profilePhotoUrl ? "Photo enregistrée" : "Aucune photo"} />
              <Info label="Manager Keycloak ID" value={employee.managerKeycloakId} />
              <Info label="Cree le" value={formatDate(employee.createdAt)} />
              <Info label="Mis a jour" value={formatDate(employee.updatedAt)} />
              </div>
            </div>
          </section>
        ) : (
          <div className="rounded-md border border-border bg-card p-8 text-center shadow-card">
            <Badge variant="outline">Aucun profil employe</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Aucun profil employe n&apos;est actuellement lie a votre compte.
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link to="/dashboard">Retour au dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EditableField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-border/70 bg-background px-3 py-2 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-md border border-border/70 bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-medium">{formatValue(value)}</div>
    </div>
  );
}

function WarningBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <TriangleAlert className="h-4 w-4" />
      {message}
    </div>
  );
}

function readEmployeeError(caught: unknown, fallback = "Impossible de charger votre profil employe.") {
  if (caught instanceof ApiError && caught.status === 404) {
    return "Aucun profil employe n'est lie a votre compte.";
  }
  if (caught instanceof ApiError && caught.status === 403) {
    return "Acces refuse par le backend pour ce profil employe.";
  }
  if (caught instanceof ApiError && caught.status === 400) {
    return "Les informations saisies sont invalides.";
  }
  return fallback;
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
