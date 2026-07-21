import type { Employee } from "@/lib/api/employees";
import type { CurrentUser } from "@/lib/auth-store";

export const agentProfileMock = {
  id: 17,
  keycloakId: "9d70e58f-814b-4b78-a3f2-63b5d0f24591",
  fullName: "Meryem Zerktouni",
  email: "meryem.zerktouni@cgi.local",
  primaryRole: "Agent",
  effectiveRoles: ["EMPLOYEE"],
  accountStatus: "Actif",
  localProfileStatus: "Synchronisé",
  localRole: "Agent",
  localStatus: "Actif",
  department: "Opérations",
  basket: "BO",
  availabilityStatus: "Disponible",
  createdAt: "2026-06-23T09:20:00",
  updatedAt: "2026-07-19T16:45:00",
};

export function isAgentUser(user: CurrentUser | null | undefined) {
  return user?.primaryRole === "EMPLOYEE";
}

export const agentEmployeeMock: Employee = {
  id: agentProfileMock.id,
  userKeycloakId: agentProfileMock.keycloakId,
  fullName: agentProfileMock.fullName,
  email: agentProfileMock.email,
  jobTitle: "Agent",
  department: agentProfileMock.department,
  bannette: agentProfileMock.basket,
  operationalStatus: "Actif",
  activityStatus: "Disponible",
  managerKeycloakId: null,
  phone: null,
  address: null,
  bio: null,
  profilePhotoUrl: null,
  latitude: null,
  longitude: null,
  status: "ACTIVE",
  availabilityStatus: "AVAILABLE",
  createdAt: agentProfileMock.createdAt,
  updatedAt: agentProfileMock.updatedAt,
};
