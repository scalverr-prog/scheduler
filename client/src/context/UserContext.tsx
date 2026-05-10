import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { UserProfile } from "../components/LoginModal";

type UserContextType = {
  currentUser: UserProfile | null;
  allUsers: UserProfile[];
  login: (user: UserProfile) => void;
  logout: () => void;
  updateUserPreferences: (procedures: string[], patientTypes: string[]) => void;
  trackProcedure: (procedure: string) => void;
  trackPatientType: (patientType: string) => void;
  getSuggestedProcedures: () => string[];
  getSuggestedPatientTypes: () => string[];
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem("allUsers");
    return saved ? JSON.parse(saved) : [];
  });

  // Persist to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem("allUsers", JSON.stringify(allUsers));
  }, [allUsers]);

  const login = (user: UserProfile) => {
    setCurrentUser(user);
    // Update or add user to allUsers
    setAllUsers(prev => {
      const existing = prev.findIndex(u => u.id === user.id);
      let updated;
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = user;
      } else {
        updated = [...prev, user];
      }
      // Save immediately to localStorage
      localStorage.setItem("allUsers", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    // Save allUsers before clearing (so returning user works)
    localStorage.setItem("allUsers", JSON.stringify(allUsers));
    // Clear current user
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    // Reload to show login
    window.location.href = "/";
  };

  const updateUserPreferences = (procedures: string[], patientTypes: string[]) => {
    if (!currentUser) return;

    const updated = {
      ...currentUser,
      commonProcedures: procedures,
      commonPatientTypes: patientTypes
    };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  // Track procedure usage - learns what procedures this user commonly schedules
  const trackProcedure = (procedure: string) => {
    if (!currentUser || !procedure) return;

    const procedures = [...currentUser.commonProcedures];
    const existingIndex = procedures.indexOf(procedure);

    if (existingIndex >= 0) {
      // Move to front (most recent)
      procedures.splice(existingIndex, 1);
    }
    procedures.unshift(procedure);

    // Keep only top 10
    const topProcedures = procedures.slice(0, 10);

    const updated = { ...currentUser, commonProcedures: topProcedures };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  // Track patient types (admission status)
  const trackPatientType = (patientType: string) => {
    if (!currentUser || !patientType) return;

    const types = [...currentUser.commonPatientTypes];
    const existingIndex = types.indexOf(patientType);

    if (existingIndex >= 0) {
      types.splice(existingIndex, 1);
    }
    types.unshift(patientType);

    const topTypes = types.slice(0, 5);

    const updated = { ...currentUser, commonPatientTypes: topTypes };
    setCurrentUser(updated);
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  // Get suggested procedures based on user's service line and history
  const getSuggestedProcedures = (): string[] => {
    if (!currentUser) return [];

    // Service-line specific defaults
    const serviceDefaults: Record<string, string[]> = {
      "Oncology": ["LP", "BMA", "BMBx", "IT Chemo", "Port Access"],
      "GI": ["EGD", "Colonoscopy", "Paracentesis"],
      "Pulmonary": ["Bronchoscopy", "Thoracentesis", "Chest Tube Placement"],
      "Cardiology": ["Sedated Echo", "Central Line"],
      "Radiology": ["Sedated MRI", "Sedated CT", "IR Procedure", "Biopsy"],
      "Vascular": ["PICC", "Central Line", "Port Placement"],
      "ICU/Critical Care": ["Central Line", "PICC", "Chest Tube Placement", "Bronchoscopy"],
    };

    // Combine user's history with service defaults
    const userHistory = currentUser.commonProcedures;
    const serviceProcs = serviceDefaults[currentUser.serviceLine] || [];

    // User history takes priority, then service defaults
    const combined = [...new Set([...userHistory, ...serviceProcs])];
    return combined.slice(0, 8);
  };

  const getSuggestedPatientTypes = (): string[] => {
    if (!currentUser) return ["Inpatient", "Direct Admit", "Subacute Facility"];
    return currentUser.commonPatientTypes.length > 0
      ? currentUser.commonPatientTypes
      : ["Inpatient", "Direct Admit", "Subacute Facility"];
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      allUsers,
      login,
      logout,
      updateUserPreferences,
      trackProcedure,
      trackPatientType,
      getSuggestedProcedures,
      getSuggestedPatientTypes
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
