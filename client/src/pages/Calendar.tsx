import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { ChevronLeft, ChevronRight, X, Plus, AlertCircle, Syringe, Stethoscope, UserPlus, Search } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useNotifications } from "@/context/NotificationContext";
import { VOICE_COMMAND_EVENT, VoiceCommandDetail, getPendingFormData } from "@/components/GlobalMic";

type ViewType = "day" | "week" | "month";

const SERVICES = [
  "All Services", "GI", "Pulmonary", "Cardiology", "Radiology", "Neurology",
  "Orthopedics", "General Surgery", "Vascular", "Urology", "ENT", "Oncology", "Pain Management", "Other"
];

const SERVICE_COLORS: Record<string, string> = {
  "GI": "bg-green-500",
  "Pulmonary": "bg-blue-500",
  "Cardiology": "bg-red-500",
  "Radiology": "bg-purple-500",
  "Neurology": "bg-yellow-500",
  "Orthopedics": "bg-orange-500",
  "General Surgery": "bg-pink-500",
  "Vascular": "bg-indigo-500",
  "Urology": "bg-teal-500",
  "ENT": "bg-cyan-500",
  "Oncology": "bg-rose-500",
  "Pain Management": "bg-amber-500",
  "Other": "bg-gray-500",
};

const CASE_TYPES = ["All Types", "Procedure", "Direct Admit", "Consultation", "Follow-up"];
const SEDATION_TYPES = ["All", "Anesthesia", "Intensivist"];
const PRIORITIES = ["All Priorities", "Planned", "Routine", "Urgent", "Emergent", "Add-On"];

// Procedure type categories for grouped display
const PROCEDURE_CATEGORIES: Record<string, string[]> = {
  "Oncology": ["LP", "BMA", "BMBx", "IT Chemo"],
  "Vascular Access": ["PICC", "Central Line", "Port Access", "Port Placement"],
  "Imaging/Sedation": ["Sedated MRI", "Sedated CT", "Sedated Echo", "Sedated Procedure"],
  "GI/Pulmonary": ["EGD", "Colonoscopy", "Bronchoscopy", "Paracentesis", "Thoracentesis"],
  "Interventional": ["IR Procedure", "Biopsy", "Drain Placement", "Drain Removal", "Chest Tube Placement"],
  "General": ["Bedside Procedure", "Wound Care", "Dressing Change", "Scheduled Activity"],
  "Administrative": ["Direct Admit", "Consultation", "Follow-up", "Other"],
};

// Get category for a procedure type
const getProcedureCategory = (name: string): string => {
  for (const [category, procedures] of Object.entries(PROCEDURE_CATEGORIES)) {
    if (procedures.includes(name)) return category;
  }
  return "Other";
};

// Map procedure types to Primary Service and Case Type
const PROCEDURE_DEFAULTS: Record<string, { primaryService: string; caseType: string }> = {
  // Oncology procedures
  "LP": { primaryService: "Oncology", caseType: "Procedure" },
  "BMA": { primaryService: "Oncology", caseType: "Procedure" },
  "BMBx": { primaryService: "Oncology", caseType: "Procedure" },
  "IT Chemo": { primaryService: "Oncology", caseType: "Procedure" },
  // Vascular access - often oncology but can vary
  "PICC": { primaryService: "Oncology", caseType: "Procedure" },
  "Central Line": { primaryService: "Oncology", caseType: "Procedure" },
  "Port Access": { primaryService: "Oncology", caseType: "Procedure" },
  "Port Placement": { primaryService: "Oncology", caseType: "Procedure" },
  // GI procedures
  "EGD": { primaryService: "GI", caseType: "Procedure" },
  "Colonoscopy": { primaryService: "GI", caseType: "Procedure" },
  "Paracentesis": { primaryService: "GI", caseType: "Procedure" },
  // Pulmonary
  "Bronchoscopy": { primaryService: "Pulmonology", caseType: "Procedure" },
  "Thoracentesis": { primaryService: "Pulmonology", caseType: "Procedure" },
  // Imaging/Sedation
  "Sedated MRI": { primaryService: "Radiology", caseType: "Procedure" },
  "Sedated CT": { primaryService: "Radiology", caseType: "Procedure" },
  "Sedated Echo": { primaryService: "Cardiology", caseType: "Procedure" },
  "Sedated Procedure": { primaryService: "Oncology", caseType: "Procedure" },
  // Interventional
  "IR Procedure": { primaryService: "Interventional Radiology", caseType: "Procedure" },
  "Biopsy": { primaryService: "Oncology", caseType: "Procedure" },
  "Drain Placement": { primaryService: "Interventional Radiology", caseType: "Procedure" },
  "Drain Removal": { primaryService: "Interventional Radiology", caseType: "Procedure" },
  "Chest Tube Placement": { primaryService: "Pulmonology", caseType: "Procedure" },
  // General
  "Bedside Procedure": { primaryService: "Hospitalist", caseType: "Procedure" },
  "Wound Care": { primaryService: "General Surgery", caseType: "Procedure" },
  "Dressing Change": { primaryService: "General Surgery", caseType: "Procedure" },
  "Scheduled Activity": { primaryService: "Hospitalist", caseType: "Procedure" },
  // Administrative
  "Direct Admit": { primaryService: "Hospitalist", caseType: "Direct Admit" },
  "Consultation": { primaryService: "Hospitalist", caseType: "Consultation" },
  "Follow-up": { primaryService: "Oncology", caseType: "Follow-up" },
  "Other": { primaryService: "Hospitalist", caseType: "Procedure" },
};

// Get primary service and case type based on procedure type(s)
const getDefaultsForProcedures = (procedureNames: string[]): { primaryService: string | null; caseType: string | null } => {
  if (procedureNames.length === 0) return { primaryService: null, caseType: null };

  // Check if any procedure contains "chemo" - always oncology + procedure
  const hasChemo = procedureNames.some(p => p.toLowerCase().includes("chemo"));
  if (hasChemo) return { primaryService: "Oncology", caseType: "Procedure" };

  // Check if any procedure is oncology-related (LP, BMA, BMBx, IT)
  const oncologyProcedures = ["LP", "BMA", "BMBx", "IT Chemo"];
  const hasOncology = procedureNames.some(p => oncologyProcedures.includes(p));
  if (hasOncology) return { primaryService: "Oncology", caseType: "Procedure" };

  // Use the mapping for the first procedure
  for (const proc of procedureNames) {
    if (PROCEDURE_DEFAULTS[proc]) {
      return PROCEDURE_DEFAULTS[proc];
    }
  }

  return { primaryService: null, caseType: null };
};

// Backward compatible helper
const getPrimaryServiceForProcedures = (procedureNames: string[]): string | null => {
  return getDefaultsForProcedures(procedureNames).primaryService;
};

const INTERVENTIONS = [
  "None",
  "Lumbar Puncture",
  "Bone Marrow Aspiration",
  "Bone Marrow Biopsy",
  "PICC Line Placement",
  "Central Line Placement",
  "Port Access",
  "Port Placement",
  "Intrathecal Chemotherapy",
  "Chest Tube Placement",
  "Paracentesis",
  "Thoracentesis",
  "Bronchoscopy",
  "EGD",
  "Colonoscopy",
  "Sedated MRI",
  "Sedated CT",
  "Sedated Echo",
  "Wound Care",
  "Dressing Change",
  "Biopsy",
  "Drain Placement",
  "Drain Removal",
  "Other",
];

const ACTIVITY_TITLES = [
  "None",
  "LP",
  "BMA",
  "BMBx",
  "PICC",
  "Central Line",
  "Port Access",
  "Port Placement",
  "IT Chemo",
  "Sedated Procedure",
  "IR Procedure",
  "Bedside Procedure",
  "Scheduled Activity",
  "Direct Admit",
  "Consultation",
  "Follow-up",
  "Other",
];

const PRIMARY_SERVICES = [
  "Oncology",
  "Hematology",
  "Heme/Onc",
  "General Pediatrics",
  "Peds Surgery",
  "Peds HBS",
  "General Surgery",
  "Ophthalmology",
  "Orthopedics",
  "Neurosurgery",
  "Neurology",
  "Cardiology",
  "Cardiac Surgery",
  "Pulmonology",
  "GI",
  "ENT",
  "Urology",
  "Nephrology",
  "Rheumatology",
  "Endocrinology",
  "Infectious Disease",
  "PICU",
  "NICU",
  "Hospitalist",
  "Pain Management",
  "Interventional Radiology",
  "Radiology",
  "Anesthesia",
  "Other",
];

// Auto-fill mapping: Primary Service -> Service
const PRIMARY_TO_SERVICE: Record<string, string> = {
  "Oncology": "Oncology",
  "Hematology": "Oncology",
  "Heme/Onc": "Oncology",
  "General Pediatrics": "Other",
  "Peds Surgery": "General Surgery",
  "Peds HBS": "General Surgery",
  "General Surgery": "General Surgery",
  "Ophthalmology": "Other",
  "Orthopedics": "Orthopedics",
  "Neurosurgery": "Neurology",
  "Neurology": "Neurology",
  "Cardiology": "Cardiology",
  "Cardiac Surgery": "Cardiology",
  "Pulmonology": "Pulmonary",
  "GI": "GI",
  "ENT": "ENT",
  "Urology": "Urology",
  "Nephrology": "Other",
  "Rheumatology": "Other",
  "Endocrinology": "Other",
  "Infectious Disease": "Other",
  "PICU": "Other",
  "NICU": "Other",
  "Hospitalist": "Other",
  "Pain Management": "Pain Management",
  "Interventional Radiology": "Radiology",
  "Radiology": "Radiology",
  "Anesthesia": "Other",
};

export default function Calendar() {
  const { data: activities, refetch: refetchActivities, isLoading: activitiesLoading, error: activitiesError } = trpc.activities.list.useQuery();
  const { data: patients, refetch: refetchPatients } = trpc.patients.list.useQuery();
  const { data: rooms } = trpc.activities.getRooms.useQuery();
  const { data: staff } = trpc.activities.getStaff.useQuery();
  const { data: activityTypes } = trpc.activities.getActivityTypes.useQuery();

  // Debug logging for activities
  useEffect(() => {
    console.log("=== ACTIVITIES DEBUG ===");
    console.log("Loading:", activitiesLoading);
    console.log("Error:", activitiesError);
    console.log("Activities count:", activities?.length);
    if (activities && activities.length > 0) {
      console.log("Sample activity:", activities[0]);
      console.log("Activity dates:", activities.map(a => ({
        id: a.id,
        title: a.title,
        startTime: a.startTime,
        startTimeType: typeof a.startTime,
        startTimeDate: new Date(a.startTime).toDateString()
      })));
    }
  }, [activities, activitiesLoading, activitiesError]);

  // User context for smart defaults and learning
  const { currentUser, trackProcedure, getSuggestedProcedures } = useUser();

  // Notifications
  const { addNotification } = useNotifications();

  // State for editing an activity
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [showNewProcedure, setShowNewProcedure] = useState(false);

  const createPatient = trpc.patients.create.useMutation();
  const createStaff = trpc.activities.createStaff.useMutation();
  const createActivity = trpc.activities.create.useMutation({
    onSuccess: (_, variables) => {
      // Track the procedure for learning
      if (variables.title) {
        trackProcedure(variables.title);
      }

      // Send notification
      const patient = patients?.find(p => p.id === variables.patientId);
      const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Patient";
      addNotification({
        type: "success",
        title: "Activity Scheduled",
        message: `${variables.title} for ${patientName} on ${new Date(variables.startTime).toLocaleDateString()} at ${new Date(variables.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        actionUrl: "/calendar",
        actionLabel: "View Calendar",
      });

      refetchActivities();
      refetchPatients();
      setShowNewProcedure(false);
      setEditingActivityId(null);
      localStorage.removeItem("encounterFormDrafts");
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to create activity:", error);
      alert(`Failed to create activity: ${error.message}`);
    },
  });

  const updateActivity = trpc.activities.update.useMutation({
    onSuccess: () => {
      refetchActivities();
      setSelectedActivity(null);
      setShowNewProcedure(false);
      setEditingActivityId(null);
      localStorage.removeItem("encounterFormDrafts");
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to update activity:", error);
      alert(`Failed to update activity: ${error.message}`);
    },
  });

  const refetchStaff = trpc.useUtils().activities.getStaff.invalidate;

  // Patient mode: "existing" or "new"
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");

  // Form state for new case - defaults based on user's service line
  const userServiceLine = currentUser?.serviceLine || "Oncology";
  const suggestedProcs = getSuggestedProcedures();
  const defaultProcedure = suggestedProcs[0] || "LP";

  const [formPatientId, setFormPatientId] = useState<number | "">("");
  const [formTitle, setFormTitle] = useState(defaultProcedure);
  const [formService, setFormService] = useState(userServiceLine);
  const [formCaseType, setFormCaseType] = useState("Procedure");
  const [formPriority, setFormPriority] = useState("Planned");
  const [formRoomId, setFormRoomId] = useState<number | "">("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formSedationRequired, setFormSedationRequired] = useState(true);
  const [formSedationType, setFormSedationType] = useState("Conscious Sedation");
  const [formSedationProvider, setFormSedationProvider] = useState("Intensivist");
  const [formSedationistId, setFormSedationistId] = useState<number | "">("");
  const [formPmdId, setFormPmdId] = useState<number | "">("");
  const [formIntervention, setFormIntervention] = useState("Lumbar Puncture");
  const [formNotes, setFormNotes] = useState("");
  const [formActivityTypeIds, setFormActivityTypeIds] = useState<number[]>([]); // LP, BMA, PICC, IR - multiple allowed
  const [formStatus, setFormStatus] = useState("Pending");
  const [formOtherIntervention, setFormOtherIntervention] = useState("");
  const [formPmdService, setFormPmdService] = useState(userServiceLine);

  // New patient form fields
  const [newPatientMrn, setNewPatientMrn] = useState("");
  const [newPatientFirstName, setNewPatientFirstName] = useState("");
  const [newPatientLastName, setNewPatientLastName] = useState("");
  const [newPatientDob, setNewPatientDob] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("");
  const [newPatientDisposition, setNewPatientDisposition] = useState("");

  // Smart suggestions - patient's previous visits
  const [patientLastVisit, setPatientLastVisit] = useState<any>(null);
  const [showRepeatSuggestion, setShowRepeatSuggestion] = useState(false);

  // Get patient's recent activities when patient is selected
  const getPatientHistory = (patientId: number) => {
    const patientActivities = activities?.filter(a => a.patientId === patientId) || [];
    if (patientActivities.length === 0) return null;

    // Sort by date descending to get most recent
    const sorted = [...patientActivities].sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    return sorted[0]; // Return most recent visit
  };

  // Auto-fill form from previous visit
  const repeatLastVisit = () => {
    if (!patientLastVisit) return;

    // Find the activity type ID
    const matchingType = activityTypes?.find(t => t.name === patientLastVisit.title);
    if (matchingType) {
      setFormActivityTypeIds([matchingType.id]);
    }

    setFormTitle(patientLastVisit.title || "");
    setFormService(patientLastVisit.service || "Oncology");
    setFormCaseType(patientLastVisit.caseType || "Procedure");
    setFormPriority(patientLastVisit.priority || "Planned");
    setFormSedationRequired(patientLastVisit.sedationRequired === 1);
    setFormSedationType(patientLastVisit.sedationType || "Conscious Sedation");
    setFormSedationProvider(patientLastVisit.sedationProvider || "Intensivist");
    if (patientLastVisit.pmdId) setFormPmdId(patientLastVisit.pmdId);
    if (patientLastVisit.sedationistId) setFormSedationistId(patientLastVisit.sedationistId);
    if (patientLastVisit.roomId) setFormRoomId(patientLastVisit.roomId);

    setShowRepeatSuggestion(false);
  };

  // New doctor fields
  const [showNewProcedureMD, setShowNewProcedureMD] = useState(false);
  const [newProcedureMDName, setNewProcedureMDName] = useState("");
  const [showNewSedationMD, setShowNewSedationMD] = useState(false);
  const [newSedationMDName, setNewSedationMDName] = useState("");
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);

  // Custom dropdown options (user-added values) - persisted to localStorage
  const [customTitles, setCustomTitles] = useState<string[]>(() => {
    const saved = localStorage.getItem('customTitles');
    return saved ? JSON.parse(saved) : [];
  });
  const [customServices, setCustomServices] = useState<string[]>(() => {
    const saved = localStorage.getItem('customServices');
    return saved ? JSON.parse(saved) : [];
  });
  const [customInterventions, setCustomInterventions] = useState<string[]>(() => {
    const saved = localStorage.getItem('customInterventions');
    return saved ? JSON.parse(saved) : [];
  });

  // Check for newActivity param on MOUNT - just open form, don't clear URL yet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("newActivity") === "true" || params.get("new") === "1") {
      console.log("Mount: Opening new activity form from URL");
      setShowNewProcedure(true);
      // Don't clear URL here - let the pending data effect handle it after applying data
    }
    // Check if we should show drafts prompt (from dashboard link)
    if (params.get("showDrafts") === "true") {
      console.log("Mount: Showing drafts prompt from URL");
      if (hasDraft()) {
        setShowDraftPrompt(true);
      }
      // Clear the URL param
      window.history.replaceState({}, "", "/calendar");
    }
  }, []);

  // Apply pending voice data when form opens AND patients are loaded
  const [pendingDataApplied, setPendingDataApplied] = useState(false);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Handle opening the form - check for saved draft
  const handleOpenNewForm = () => {
    if (hasDraft()) {
      setShowDraftPrompt(true);
    } else {
      setShowNewProcedure(true);
    }
  };

  const handleRestoreDraft = (index: number = 0) => {
    setShowDraftPrompt(false);
    setShowNewProcedure(true);
    restoreDraft(index);
  };

  const handleStartFresh = () => {
    setShowDraftPrompt(false);
    resetForm();
    setShowNewProcedure(true);
  };

  const handleDeleteDraft = (index: number) => {
    clearDraft(index);
    // If no more drafts, close the prompt
    if (!hasDraft()) {
      setShowDraftPrompt(false);
      resetForm();
      setShowNewProcedure(true);
    }
  };

  useEffect(() => {
    console.log("Pending data effect - showNewProcedure:", showNewProcedure, "patients:", patients?.length, "applied:", pendingDataApplied);

    // Only run once when form opens and patients query has completed
    if (!showNewProcedure) {
      console.log("Form not open yet");
      return;
    }
    if (patients === undefined) {
      console.log("Patients not loaded yet");
      return;
    }
    if (pendingDataApplied) {
      console.log("Already applied");
      return;
    }

    const pendingData = getPendingFormData();
    console.log("Retrieved pending data:", pendingData);
    if (!pendingData) {
      console.log("No pending data in localStorage");
      return;
    }

    console.log("=== APPLYING PENDING VOICE DATA ===");
    console.log("Data:", pendingData);
    setPendingDataApplied(true);

    // Search for existing patient by name or MRN
    const searchFirst = (pendingData.firstName || "").toLowerCase();
    const searchLast = (pendingData.lastName || "").toLowerCase();
    const searchMrn = pendingData.mrn || "";

    let foundPatient = null;

    if (searchFirst || searchLast || searchMrn) {
      console.log("Searching for:", { searchFirst, searchLast, searchMrn });

      // Search by MRN first (exact match)
      if (searchMrn) {
        foundPatient = patients.find(p => p.mrn === searchMrn);
      }

      // If not found by MRN, search by name
      if (!foundPatient && (searchFirst || searchLast)) {
        foundPatient = patients.find(p => {
          const pFirst = p.firstName.toLowerCase();
          const pLast = p.lastName.toLowerCase();
          if (searchFirst && searchLast) {
            return pFirst.includes(searchFirst) && pLast.includes(searchLast);
          } else if (searchFirst) {
            return pFirst.includes(searchFirst);
          } else if (searchLast) {
            return pLast.includes(searchLast);
          }
          return false;
        });
      }
    }

    if (foundPatient) {
      console.log("Found existing patient:", foundPatient);
      setPatientMode("existing");
      setFormPatientId(foundPatient.id);
    } else if (pendingData.firstName || pendingData.lastName || pendingData.mrn) {
      console.log("No matching patient, switching to new patient mode");
      setPatientMode("new");
      if (pendingData.firstName) setNewPatientFirstName(pendingData.firstName);
      if (pendingData.lastName) setNewPatientLastName(pendingData.lastName);
      if (pendingData.mrn) setNewPatientMrn(pendingData.mrn);
    }

    // Fill procedure info - handle procedures array for checkboxes
    if (pendingData.procedures && Array.isArray(pendingData.procedures) && activityTypes) {
      console.log("Looking for procedures:", pendingData.procedures);
      const matchedIds: number[] = [];
      const matchedNames: string[] = [];

      // Aliases for common procedure names
      const procedureAliases: Record<string, string[]> = {
        "IT Chemo": ["intrathecal", "intrathecal chemo", "intrathecal chemotherapy", "it chemo", "it"],
        "LP": ["lumbar puncture", "lp", "spinal tap"],
        "BMA": ["bone marrow aspiration", "bma", "marrow aspiration"],
        "BMBx": ["bone marrow biopsy", "bmbx", "marrow biopsy"],
        "PICC": ["picc", "picc line", "peripherally inserted"],
        "Central Line": ["central line", "central venous", "cvl"],
        "Port Access": ["port access", "port", "mediport"],
      };

      for (const proc of pendingData.procedures) {
        const procLower = proc.toLowerCase().trim();
        let match = null;

        // First try direct match
        match = activityTypes.find(t => {
          const nameLower = t.name.toLowerCase();
          return nameLower === procLower || nameLower.replace(/\s+/g, '') === procLower.replace(/\s+/g, '');
        });

        // If no direct match, try aliases
        if (!match) {
          for (const [typeName, aliases] of Object.entries(procedureAliases)) {
            if (aliases.some(alias => procLower.includes(alias) || alias.includes(procLower))) {
              match = activityTypes.find(t => t.name === typeName);
              if (match) break;
            }
          }
        }

        // Fallback to partial match
        if (!match) {
          match = activityTypes.find(t => {
            const nameLower = t.name.toLowerCase();
            return nameLower.includes(procLower) || procLower.includes(nameLower);
          });
        }

        if (match && !matchedIds.includes(match.id)) {
          matchedIds.push(match.id);
          matchedNames.push(match.name);
          console.log(`Matched "${proc}" to activity type: ${match.name} (id: ${match.id})`);
        }
      }

      if (matchedIds.length > 0) {
        setFormActivityTypeIds(matchedIds);
        // Set title based on first procedure or combined
        setFormTitle(matchedNames.join(" + "));
        console.log("Set activity type IDs:", matchedIds);

        // Auto-set Primary Service and Case Type based on procedures
        const defaults = getDefaultsForProcedures(matchedNames);
        if (defaults.primaryService) {
          setFormPmdService(defaults.primaryService);
          console.log("Auto-set Primary Service:", defaults.primaryService);
        }
        if (defaults.caseType) {
          setFormCaseType(defaults.caseType);
          console.log("Auto-set Case Type:", defaults.caseType);
        }
      }
    } else if (pendingData.title) {
      // Fallback to old title field
      setFormTitle(pendingData.title);
    }

    if (pendingData.date) {
      setFormStartDate(pendingData.date);
      // Future date means it's planned
      setFormPriority("Planned");
    }
    if (pendingData.startTime) {
      setFormStartTime(pendingData.startTime);
      // Auto-set end time 30 minutes after start
      const [hours, mins] = pendingData.startTime.split(':').map(Number);
      const endDate = new Date(2000, 0, 1, hours, mins + 30);
      const endHours = endDate.getHours().toString().padStart(2, '0');
      const endMins = endDate.getMinutes().toString().padStart(2, '0');
      setFormEndTime(`${endHours}:${endMins}`);
      console.log(`Set end time: ${endHours}:${endMins} (30 min after ${pendingData.startTime})`);
    }
    if (pendingData.service) {
      const matchedService = SERVICES.find(s =>
        s.toLowerCase().includes(pendingData.service?.toLowerCase() || "")
      );
      if (matchedService) setFormService(matchedService);
    }

    // Handle sedationist - search staff list and set sedation required
    if (pendingData.sedationist && staff) {
      console.log("Looking for sedationist:", pendingData.sedationist);
      const sedName = pendingData.sedationist.toLowerCase();
      const sedationistMatch = staff.find(s => {
        const first = s.firstName || '';
        const last = s.lastName || '';
        const fullName = `${first} ${last}`.toLowerCase();
        const lastFirst = `${last} ${first}`.toLowerCase();
        return fullName.includes(sedName) ||
               lastFirst.includes(sedName) ||
               first.toLowerCase().includes(sedName) ||
               last.toLowerCase().includes(sedName);
      });
      if (sedationistMatch) {
        console.log("Found sedationist:", sedationistMatch);
        setFormSedationRequired(true);
        setFormSedationistId(sedationistMatch.id);
      } else {
        // Still mark sedation required even if we can't match the name
        setFormSedationRequired(true);
        console.log("Sedationist mentioned but not found in staff list");
      }
    }

    // Handle PMD - search staff list
    if (pendingData.pmd && staff) {
      console.log("Looking for PMD:", pendingData.pmd);
      const pmdName = pendingData.pmd.toLowerCase();
      const pmdMatch = staff.find(s => {
        const first = s.firstName || '';
        const last = s.lastName || '';
        const fullName = `${first} ${last}`.toLowerCase();
        const lastFirst = `${last} ${first}`.toLowerCase();
        return fullName.includes(pmdName) ||
               lastFirst.includes(pmdName) ||
               first.toLowerCase().includes(pmdName) ||
               last.toLowerCase().includes(pmdName);
      });
      if (pmdMatch) {
        console.log("Found PMD:", pmdMatch);
        setFormPmdId(pmdMatch.id);
      }
    }

    // Apply notes from voice scribe
    if (pendingData.notes) {
      console.log("Applying notes from voice:", pendingData.notes);
      setFormNotes(pendingData.notes);
    }

    // Clear URL params after applying data
    window.history.replaceState({}, "", "/calendar");
    console.log("Pending voice data applied successfully!");
  }, [showNewProcedure, patients, pendingDataApplied, activityTypes, staff]);

  // Reset pendingDataApplied when form closes
  useEffect(() => {
    if (!showNewProcedure) {
      setPendingDataApplied(false);
    }
  }, [showNewProcedure]);

  // Voice command listener for form filling
  useEffect(() => {
    const handleVoiceCommand = (event: Event) => {
      const detail = (event as CustomEvent<VoiceCommandDetail>).detail;
      console.log("Voice command received:", detail);

      if (detail.type === "fillField") {
        // Auto-switch to new patient mode for patient fields
        if (detail.field === "firstName" || detail.field === "lastName" || detail.field === "mrn") {
          setPatientMode("new");
        }

        switch (detail.field) {
          case "firstName":
            setNewPatientFirstName(detail.value || "");
            break;
          case "lastName":
            setNewPatientLastName(detail.value || "");
            break;
          case "mrn":
            setNewPatientMrn(detail.value || "");
            break;
          case "title":
            setFormTitle(detail.value || "");
            break;
          case "date":
            setFormStartDate(detail.value || "");
            break;
          case "startTime":
            setFormStartTime(detail.value || "");
            break;
          case "service":
            // Find matching service
            const matchedService = SERVICES.find(s =>
              s.toLowerCase().includes(detail.value?.toLowerCase() || "")
            );
            if (matchedService) setFormService(matchedService);
            break;
          case "patientSearch":
            // Search for patient by name
            const searchVal = detail.value?.toLowerCase() || "";
            const matchedPatient = patients?.find(p =>
              p.firstName.toLowerCase().includes(searchVal) ||
              p.lastName.toLowerCase().includes(searchVal) ||
              `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchVal)
            );
            if (matchedPatient) {
              setFormPatientId(matchedPatient.id);
              setPatientMode("existing");
            }
            break;
        }
      } else if (detail.type === "realtime") {
        // Real-time field updates as user speaks
        switch (detail.field) {
          case "firstName":
            setNewPatientFirstName(detail.value || "");
            break;
          case "lastName":
            setNewPatientLastName(detail.value || "");
            break;
          case "mrn":
            setNewPatientMrn(detail.value || "");
            break;
          case "title":
            setFormTitle(detail.value || "");
            break;
          case "notes":
            setFormNotes(detail.value || "");
            break;
          case "date":
            // Parse spoken date
            let dateVal = detail.value || "";
            if (dateVal.includes("today")) {
              dateVal = new Date().toISOString().split("T")[0];
            } else if (dateVal.includes("tomorrow")) {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              dateVal = tomorrow.toISOString().split("T")[0];
            }
            setFormStartDate(dateVal);
            break;
          case "startTime":
            // Parse spoken time
            const timeMatch = (detail.value || "").match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
            if (timeMatch) {
              let hours = parseInt(timeMatch[1]);
              const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
              const period = timeMatch[3]?.toLowerCase().replace(".", "");
              if (period === "pm" && hours < 12) hours += 12;
              if (period === "am" && hours === 12) hours = 0;
              setFormStartTime(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
            }
            break;
        }
      } else if (detail.type === "action") {
        switch (detail.action) {
          case "newPatient":
            setPatientMode("new");
            break;
          case "existingPatient":
            setPatientMode("existing");
            break;
          case "save":
            // Find and click submit button
            const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitBtn) submitBtn.click();
            break;
          case "cancel":
            setShowNewProcedure(false);
            resetForm();
            break;
        }
      } else if (detail.type === "bulkFill" && detail.data) {
        // Handle bulk fill with patient search first
        const data = detail.data;
        console.log("Bulk fill received:", data);

        // Search for existing patient first
        const searchFirst = (data.firstName || "").toLowerCase();
        const searchLast = (data.lastName || "").toLowerCase();
        const searchMrn = data.mrn || "";

        let foundPatient = null;

        if (patients && (searchFirst || searchLast || searchMrn)) {
          // Search by MRN first (exact match)
          if (searchMrn) {
            foundPatient = patients.find(p => p.mrn === searchMrn);
          }

          // If not found by MRN, search by name
          if (!foundPatient && (searchFirst || searchLast)) {
            foundPatient = patients.find(p => {
              const pFirst = p.firstName.toLowerCase();
              const pLast = p.lastName.toLowerCase();
              if (searchFirst && searchLast) {
                return pFirst.includes(searchFirst) && pLast.includes(searchLast);
              } else if (searchFirst) {
                return pFirst.includes(searchFirst);
              } else if (searchLast) {
                return pLast.includes(searchLast);
              }
              return false;
            });
          }
        }

        if (foundPatient) {
          console.log("Found existing patient:", foundPatient);
          setPatientMode("existing");
          setFormPatientId(foundPatient.id);
        } else if (data.firstName || data.lastName || data.mrn) {
          console.log("No match, switching to new patient");
          setPatientMode("new");
          if (data.firstName) setNewPatientFirstName(data.firstName);
          if (data.lastName) setNewPatientLastName(data.lastName);
          if (data.mrn) setNewPatientMrn(data.mrn);
        }

        // Fill procedure fields - handle procedures array for checkboxes
        if (data.procedures && Array.isArray(data.procedures) && activityTypes) {
          console.log("BulkFill - Looking for procedures:", data.procedures);
          const matchedIds: number[] = [];
          const matchedNames: string[] = [];

          // Aliases for common procedure names
          const procedureAliases: Record<string, string[]> = {
            "IT Chemo": ["intrathecal", "intrathecal chemo", "intrathecal chemotherapy", "it chemo", "it"],
            "LP": ["lumbar puncture", "lp", "spinal tap"],
            "BMA": ["bone marrow aspiration", "bma", "marrow aspiration"],
            "BMBx": ["bone marrow biopsy", "bmbx", "marrow biopsy"],
            "PICC": ["picc", "picc line", "peripherally inserted"],
            "Central Line": ["central line", "central venous", "cvl"],
            "Port Access": ["port access", "port", "mediport"],
          };

          for (const proc of data.procedures) {
            const procLower = proc.toLowerCase().trim();
            let match = null;

            // First try direct match
            match = activityTypes.find((t: { id: number; name: string }) => {
              const nameLower = t.name.toLowerCase();
              return nameLower === procLower || nameLower.replace(/\s+/g, '') === procLower.replace(/\s+/g, '');
            });

            // If no direct match, try aliases
            if (!match) {
              for (const [typeName, aliases] of Object.entries(procedureAliases)) {
                if (aliases.some(alias => procLower.includes(alias) || alias.includes(procLower))) {
                  match = activityTypes.find((t: { id: number; name: string }) => t.name === typeName);
                  if (match) break;
                }
              }
            }

            // Fallback to partial match
            if (!match) {
              match = activityTypes.find((t: { id: number; name: string }) => {
                const nameLower = t.name.toLowerCase();
                return nameLower.includes(procLower) || procLower.includes(nameLower);
              });
            }

            if (match && !matchedIds.includes(match.id)) {
              matchedIds.push(match.id);
              matchedNames.push(match.name);
              console.log(`Matched "${proc}" to activity type: ${match.name} (id: ${match.id})`);
            }
          }

          if (matchedIds.length > 0) {
            setFormActivityTypeIds(matchedIds);
            setFormTitle(matchedNames.join(" + "));
            console.log("Set activity type IDs:", matchedIds);

            // Auto-set Primary Service and Case Type based on procedures
            const defaults = getDefaultsForProcedures(matchedNames);
            if (defaults.primaryService) {
              setFormPmdService(defaults.primaryService);
              console.log("Auto-set Primary Service:", defaults.primaryService);
            }
            if (defaults.caseType) {
              setFormCaseType(defaults.caseType);
              console.log("Auto-set Case Type:", defaults.caseType);
            }
          }
        } else if (data.title) {
          setFormTitle(data.title);
        }

        if (data.date) {
          setFormStartDate(data.date);
          // Future date means it's planned
          setFormPriority("Planned");
        }
        if (data.startTime) {
          setFormStartTime(data.startTime);
          // Auto-set end time 30 minutes after start
          const [hours, mins] = data.startTime.split(':').map(Number);
          const endDate = new Date(2000, 0, 1, hours, mins + 30);
          const endHours = endDate.getHours().toString().padStart(2, '0');
          const endMins = endDate.getMinutes().toString().padStart(2, '0');
          setFormEndTime(`${endHours}:${endMins}`);
          console.log(`Set end time: ${endHours}:${endMins} (30 min after ${data.startTime})`);
        }
        if (data.service) {
          const matchedService = SERVICES.find(s =>
            s.toLowerCase().includes(data.service?.toLowerCase() || "")
          );
          if (matchedService) setFormService(matchedService);
        }
        // Handle sedationist - search staff list and set sedation required
        if (data.sedationist && staff) {
          console.log("BulkFill - Looking for sedationist:", data.sedationist);
          const sedName = data.sedationist.toLowerCase();
          const sedationistMatch = staff.find(s => {
            const first = s.firstName || '';
            const last = s.lastName || '';
            const fullName = `${first} ${last}`.toLowerCase();
            const lastFirst = `${last} ${first}`.toLowerCase();
            return fullName.includes(sedName) ||
                   lastFirst.includes(sedName) ||
                   first.toLowerCase().includes(sedName) ||
                   last.toLowerCase().includes(sedName);
          });
          if (sedationistMatch) {
            console.log("Found sedationist:", sedationistMatch);
            setFormSedationRequired(true);
            setFormSedationistId(sedationistMatch.id);
          } else {
            setFormSedationRequired(true);
          }
        }

        // Handle PMD - search staff list
        if (data.pmd && staff) {
          console.log("BulkFill - Looking for PMD:", data.pmd);
          const pmdName = data.pmd.toLowerCase();
          const pmdMatch = staff.find(s => {
            const first = s.firstName || '';
            const last = s.lastName || '';
            const fullName = `${first} ${last}`.toLowerCase();
            const lastFirst = `${last} ${first}`.toLowerCase();
            return fullName.includes(pmdName) ||
                   lastFirst.includes(pmdName) ||
                   first.toLowerCase().includes(pmdName) ||
                   last.toLowerCase().includes(pmdName);
          });
          if (pmdMatch) {
            console.log("Found PMD:", pmdMatch);
            setFormPmdId(pmdMatch.id);
          }
        }

        // Apply notes from voice scribe
        if (data.notes) {
          console.log("Applying notes from bulkFill:", data.notes);
          setFormNotes(data.notes);
        }
      }
    };

    window.addEventListener(VOICE_COMMAND_EVENT, handleVoiceCommand);
    return () => window.removeEventListener(VOICE_COMMAND_EVENT, handleVoiceCommand);
  }, [patients, activityTypes, staff]);

  // Save custom options to localStorage when they change
  useEffect(() => {
    localStorage.setItem('customTitles', JSON.stringify(customTitles));
  }, [customTitles]);
  useEffect(() => {
    localStorage.setItem('customServices', JSON.stringify(customServices));
  }, [customServices]);
  useEffect(() => {
    localStorage.setItem('customInterventions', JSON.stringify(customInterventions));
  }, [customInterventions]);

  const resetForm = () => {
    setPatientMode("existing");
    setFormPatientId("");
    setFormTitle("LP");
    setFormService("Oncology");
    setFormCaseType("Procedure");
    setFormPriority("Planned");
    setFormRoomId("");
    setFormStartDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormSedationRequired(true);
    setFormSedationType("Conscious Sedation");
    setFormSedationProvider("Intensivist");
    setFormSedationistId("");
    setFormPmdId("");
    setFormIntervention("Lumbar Puncture");
    setFormNotes("");
    setFormActivityTypeIds([]);
    setFormStatus("Pending");
    setFormOtherIntervention("");
    setFormPmdService("Oncology");
    // Reset new patient fields
    setNewPatientMrn("");
    setNewPatientFirstName("");
    setNewPatientLastName("");
    setNewPatientDob("");
    setNewPatientGender("");
    setNewPatientDisposition("");
    // Reset new doctor fields
    setShowNewProcedureMD(false);
    setNewProcedureMDName("");
    setShowNewSedationMD(false);
    setNewSedationMDName("");
  };

  // Draft queue functionality (up to 3 drafts)
  const DRAFTS_KEY = "encounterFormDrafts";
  const MAX_DRAFTS = 3;

  const getDrafts = (): any[] => {
    try {
      const saved = localStorage.getItem(DRAFTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const saveDraft = () => {
    // Only save if there's meaningful data
    const hasData = formPatientId || newPatientFirstName || newPatientLastName ||
                    formStartDate || formStartTime || formNotes || formActivityTypeIds.length > 0;
    if (!hasData) return;

    const draft = {
      id: Date.now(),
      patientMode,
      formPatientId,
      formTitle,
      formService,
      formCaseType,
      formPriority,
      formRoomId,
      formStartDate,
      formStartTime,
      formEndTime,
      formSedationRequired,
      formSedationType,
      formSedationProvider,
      formSedationistId,
      formPmdId,
      formIntervention,
      formNotes,
      formActivityTypeIds,
      formStatus,
      formOtherIntervention,
      formPmdService,
      newPatientMrn,
      newPatientFirstName,
      newPatientLastName,
      newPatientDob,
      newPatientGender,
      newPatientDisposition,
      savedAt: new Date().toISOString(),
    };

    const drafts = getDrafts();
    // Add new draft at the beginning
    drafts.unshift(draft);
    // Keep only the most recent MAX_DRAFTS
    const trimmed = drafts.slice(0, MAX_DRAFTS);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
    console.log("Draft saved, queue size:", trimmed.length);
  };

  const restoreDraft = (index: number = 0) => {
    try {
      const drafts = getDrafts();
      if (index >= drafts.length) return false;

      const draft = drafts[index];
      console.log("Restoring draft:", draft);

      setPatientMode(draft.patientMode || "existing");
      setFormPatientId(draft.formPatientId || "");
      setFormTitle(draft.formTitle || "LP");
      setFormService(draft.formService || "Oncology");
      setFormCaseType(draft.formCaseType || "Procedure");
      setFormPriority(draft.formPriority || "Planned");
      setFormRoomId(draft.formRoomId || "");
      setFormStartDate(draft.formStartDate || "");
      setFormStartTime(draft.formStartTime || "");
      setFormEndTime(draft.formEndTime || "");
      setFormSedationRequired(draft.formSedationRequired ?? true);
      setFormSedationType(draft.formSedationType || "Conscious Sedation");
      setFormSedationProvider(draft.formSedationProvider || "Intensivist");
      setFormSedationistId(draft.formSedationistId || "");
      setFormPmdId(draft.formPmdId || "");
      setFormIntervention(draft.formIntervention || "Lumbar Puncture");
      setFormNotes(draft.formNotes || "");
      setFormActivityTypeIds(draft.formActivityTypeIds || []);
      setFormStatus(draft.formStatus || "Pending");
      setFormOtherIntervention(draft.formOtherIntervention || "");
      setFormPmdService(draft.formPmdService || "Oncology");
      setNewPatientMrn(draft.newPatientMrn || "");
      setNewPatientFirstName(draft.newPatientFirstName || "");
      setNewPatientLastName(draft.newPatientLastName || "");
      setNewPatientDob(draft.newPatientDob || "");
      setNewPatientGender(draft.newPatientGender || "");
      setNewPatientDisposition(draft.newPatientDisposition || "");

      // Remove this draft from the queue
      drafts.splice(index, 1);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));

      return true;
    } catch (e) {
      console.error("Error restoring draft:", e);
      return false;
    }
  };

  const clearDraft = (index?: number) => {
    if (index === undefined) {
      // Clear all drafts
      localStorage.removeItem(DRAFTS_KEY);
    } else {
      // Clear specific draft
      const drafts = getDrafts();
      drafts.splice(index, 1);
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    }
  };

  const hasDraft = () => {
    return getDrafts().length > 0;
  };

  const getDraftSummaries = () => {
    try {
      const drafts = getDrafts();
      return drafts.map((draft, index) => {
        const patientName = draft.newPatientFirstName && draft.newPatientLastName
          ? `${draft.newPatientFirstName} ${draft.newPatientLastName}`
          : draft.formPatientId ? "Existing patient" : "No patient";
        const savedAt = new Date(draft.savedAt).toLocaleString();
        return { index, patientName, title: draft.formTitle, date: draft.formStartDate, savedAt };
      });
    } catch {
      return [];
    }
  };

  // Track previous state of showNewProcedure for auto-save
  const prevShowNewProcedure = useRef(showNewProcedure);

  // Auto-save draft when form closes (modal dismissed)
  useEffect(() => {
    // If form was open and is now closing
    if (prevShowNewProcedure.current && !showNewProcedure) {
      const hasData = formPatientId || newPatientFirstName || newPatientLastName ||
                      formStartDate || formStartTime || formNotes || formActivityTypeIds.length > 0;
      if (hasData && !editingActivityId) {
        // Only auto-save if not editing an existing activity
        saveDraft();
        console.log("Auto-saved draft on modal close");
      }
    }
    prevShowNewProcedure.current = showNewProcedure;
  }, [showNewProcedure]);

  // Auto-save draft when user navigates away from page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showNewProcedure) {
        const hasData = formPatientId || newPatientFirstName || newPatientLastName ||
                        formStartDate || formStartTime || formNotes || formActivityTypeIds.length > 0;
        if (hasData) {
          saveDraft();
          e.preventDefault();
          e.returnValue = '';
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showNewProcedure, formPatientId, newPatientFirstName, newPatientLastName, formStartDate, formStartTime, formNotes, formActivityTypeIds]);

  // Filter staff by specialization
  const sedationists = staff?.filter(s =>
    s.specializations?.includes("Sedationist") ||
    s.specializations?.includes("Anesthesiologist") ||
    s.specializations?.includes("Intensivist")
  ) || [];

  const physicians = staff?.filter(s =>
    s.specializations?.includes("PMD") ||
    s.specializations?.includes("Oncology") ||
    s.specializations?.includes("Peds-Surgery")
  ) || [];

  const [viewType, setViewType] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<number>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  const toggleActivitySelection = (activityId: number) => {
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedActivities(new Set());
    setMultiSelectMode(false);
  };

  const bulkUpdateStatus = (status: string) => {
    selectedActivities.forEach(id => {
      const activity = activities?.find(a => a.id === id);
      if (activity) {
        updateActivity.mutate({
          id: activity.id,
          patientId: activity.patientId,
          activityTypeId: activity.activityTypeId,
          title: activity.title,
          startTime: new Date(activity.startTime),
          endTime: new Date(activity.endTime),
          status: status as any,
        });
      }
    });
    clearSelection();
  };
  const [, navigate] = useLocation();
  const searchString = useSearch();

  // Auto-open form if ?new=1 or ?newActivity=true in URL (handles wouter navigation)
  useEffect(() => {
    // Check both wouter searchString and window.location.search
    const params = new URLSearchParams(searchString || window.location.search);

    if (params.get("new") === "1" || params.get("newActivity") === "true") {
      // Only process if form isn't already open (avoid re-triggering)
      if (!showNewProcedure) {
        console.log("Opening new activity form from wouter searchString");
        setEditingActivityId(null);
        // Don't resetForm here - pending data effect will fill fields
        setShowNewProcedure(true);
      }
      // Note: URL will be cleared after pending data is applied
    }

    const editId = params.get("edit");
    if (editId) {
      const activity = activities?.find(a => a.id === Number(editId));
      if (activity) {
        // Populate form with activity data
        setFormPatientId(activity.patientId);
        setFormTitle(activity.title || "");
        setFormService(activity.service || "Other");
        setFormCaseType(activity.caseType || "Procedure");
        setFormPriority(activity.priority || "Routine");
        setFormRoomId(activity.roomId || "");
        setFormStartDate(new Date(activity.startTime).toISOString().split("T")[0]);
        setFormStartTime(new Date(activity.startTime).toTimeString().slice(0, 5));
        setFormEndTime(new Date(activity.endTime).toTimeString().slice(0, 5));
        setFormSedationRequired(activity.sedationType !== "None" && activity.sedationType !== null);
        setFormSedationType(activity.sedationType || "None");
        setFormSedationProvider(activity.sedationProvider || "None");
        setFormSedationistId(activity.sedationistId || "");
        setFormPmdId(activity.pmdId || "");
        setFormIntervention(activity.intervention || "");
        setFormNotes(activity.notes || "");
        setFormActivityTypeIds([activity.activityTypeId]);
        setFormStatus(activity.status || "Pending");
        setPatientMode("existing");
        setEditingActivityId(activity.id);
        setShowNewProcedure(true);
        navigate("/calendar", { replace: true });
      }
    }
  }, [searchString, navigate, activities]);

  // Filters
  const [filterService, setFilterService] = useState("All Services");
  const [filterCaseType, setFilterCaseType] = useState("All Types");
  const [filterSedation, setFilterSedation] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All Priorities");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filterDoctor, setFilterDoctor] = useState<number | "all">("all");
  const [filterDateRange, setFilterDateRange] = useState<"day" | "week" | "month" | "all">("all");

  // Auto-filter by doctor if ?doctor=ID in URL (for "My Cases")
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const doctorId = params.get("doctor");
    if (doctorId && doctorId !== "all") {
      setFilterDoctor(Number(doctorId));
    }
  }, [searchString]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewType === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewType === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewType === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewType === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get week start/end for filtering
  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const getActivitiesForDate = (date: Date) => {
    return activities?.filter((a) => {
      const actDate = new Date(a.startTime).toDateString();
      const matchesDate = actDate === date.toDateString();
      const matchesService = filterService === "All Services" || a.service === filterService;
      const matchesCaseType = filterCaseType === "All Types" || a.caseType === filterCaseType;
      const matchesSedation = filterSedation === "All" || a.sedationProvider === filterSedation;
      const matchesPriority = filterPriority === "All Priorities" || a.priority === filterPriority;
      const matchesDoctor = filterDoctor === "all" || a.pmdId === filterDoctor || a.sedationistId === filterDoctor;

      // Search filter - checks patient name, title, notes, and intervention
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const patient = patients?.find((p) => p.id === a.patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : "";
        const mrn = patient?.mrn?.toLowerCase() || "";
        const title = a.title?.toLowerCase() || "";
        const notes = a.notes?.toLowerCase() || "";
        const intervention = a.intervention?.toLowerCase() || "";
        const doctorName = staff?.find(s => s.id === a.pmdId)?.name?.toLowerCase() || "";
        matchesSearch = patientName.includes(query) || mrn.includes(query) || title.includes(query) || notes.includes(query) || intervention.includes(query) || doctorName.includes(query);
      }

      return matchesDate && matchesService && matchesCaseType && matchesSedation && matchesPriority && matchesDoctor && matchesSearch;
    }) || [];
  };

  // Get all activities matching filters for a date range
  const getFilteredActivities = () => {
    let dateStart: Date | null = null;
    let dateEnd: Date | null = null;

    if (filterDateRange === "week") {
      const range = getWeekRange(currentDate);
      dateStart = range.start;
      dateEnd = range.end;
    } else if (filterDateRange === "month") {
      const range = getMonthRange(currentDate);
      dateStart = range.start;
      dateEnd = range.end;
    } else if (filterDateRange === "day") {
      dateStart = new Date(currentDate);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd = new Date(currentDate);
      dateEnd.setHours(23, 59, 59, 999);
    }

    return activities?.filter((a) => {
      const actDate = new Date(a.startTime);

      // Date range filter
      let matchesDateRange = true;
      if (dateStart && dateEnd) {
        matchesDateRange = actDate >= dateStart && actDate <= dateEnd;
      }

      const matchesService = filterService === "All Services" || a.service === filterService;
      const matchesCaseType = filterCaseType === "All Types" || a.caseType === filterCaseType;
      const matchesSedation = filterSedation === "All" || a.sedationProvider === filterSedation;
      const matchesPriority = filterPriority === "All Priorities" || a.priority === filterPriority;
      const matchesDoctor = filterDoctor === "all" || a.pmdId === filterDoctor || a.sedationistId === filterDoctor;

      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const patient = patients?.find((p) => p.id === a.patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : "";
        const mrn = patient?.mrn?.toLowerCase() || "";
        const title = a.title?.toLowerCase() || "";
        const notes = a.notes?.toLowerCase() || "";
        const intervention = a.intervention?.toLowerCase() || "";
        const doctorName = staff?.find(s => s.id === a.pmdId)?.name?.toLowerCase() || "";
        matchesSearch = patientName.includes(query) || mrn.includes(query) || title.includes(query) || notes.includes(query) || intervention.includes(query) || doctorName.includes(query);
      }

      return matchesDateRange && matchesService && matchesCaseType && matchesSedation && matchesPriority && matchesDoctor && matchesSearch;
    }) || [];
  };

  const getPatientInfo = (patientId: number) => {
    const patient = patients?.find((p) => p.id === patientId);
    return patient
      ? {
          name: `${patient.lastName}, ${patient.firstName}`,
          mrn: patient.mrn,
          dob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A",
          disposition: patient.admissionStatus || "N/A",
        }
      : { name: "Unknown", mrn: "N/A", dob: "N/A", disposition: "N/A" };
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const getStaffName = (staffId: number | null | undefined) => {
    if (!staffId) return null;
    const staffMember = staff?.find((s) => s.id === staffId);
    return staffMember?.name || null;
  };

  const getSedationIcon = (activity: any) => {
    if (!activity.sedationRequired) return null;
    if (activity.sedationProvider === "Anesthesia") {
      return <span title="Anesthesia Required"><Syringe size={14} className="text-red-500" /></span>;
    }
    if (activity.sedationProvider === "Intensivist") {
      return <span title="Intensivist Sedation"><Stethoscope size={14} className="text-blue-500" /></span>;
    }
    return <span title="Sedation Required"><AlertCircle size={14} className="text-yellow-500" /></span>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      "Planned": "bg-blue-100 text-blue-700",
      "Routine": "bg-gray-100 text-gray-700",
      "Urgent": "bg-yellow-100 text-yellow-800",
      "Emergent": "bg-red-100 text-red-800",
      "Add-On": "bg-purple-100 text-purple-800",
    };
    return colors[priority] || colors["Routine"];
  };

  const renderActivityCard = (activity: any, compact = false) => {
    const patient = getPatientInfo(activity.patientId);
    const serviceColor = SERVICE_COLORS[activity.service || "Other"] || "bg-gray-500";
    const isSelected = selectedActivities.has(activity.id);

    const handleClick = () => {
      if (multiSelectMode) {
        toggleActivitySelection(activity.id);
      } else {
        setSelectedActivity(activity);
      }
    };

    const handleLongPress = () => {
      setMultiSelectMode(true);
      toggleActivitySelection(activity.id);
    };

    if (compact) {
      return (
        <button
          key={activity.id}
          onClick={handleClick}
          onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
          className={`w-full text-left text-xs px-2 py-1 rounded truncate transition-all hover:opacity-80 border-l-4 shadow-sm ${activity.caseType === "Direct Admit" ? "border-l-orange-500" : "border-l-blue-500"} ${isSelected ? "bg-blue-100 ring-2 ring-blue-500" : "bg-white"}`}
          title={`${patient.name} - ${activity.title}`}
        >
          <div className="flex items-center gap-1">
            {multiSelectMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleActivitySelection(activity.id)}
                className="w-3 h-3 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className={`w-2 h-2 rounded-full ${serviceColor}`}></span>
            <span className="font-semibold truncate">{patient.mrn}</span>
            {getSedationIcon(activity)}
            {activity.caseType === "Direct Admit" && <UserPlus size={12} className="text-orange-500" />}
          </div>
          <div className="truncate text-gray-600">
            {formatTime(activity.startTime)} - {activity.title}
            {getStaffName(activity.pmdId) && (
              <span className="ml-1 text-green-600 text-[10px]">({getStaffName(activity.pmdId)?.split(',')[0]})</span>
            )}
          </div>
        </button>
      );
    }

    return (
      <button
        key={activity.id}
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
        className={`w-full text-left hover:bg-gray-50 px-3 py-2 rounded-lg shadow-sm transition-all border-l-4 ${activity.caseType === "Direct Admit" ? "border-l-orange-500" : "border-l-blue-500"} ${isSelected ? "bg-blue-100 ring-2 ring-blue-500" : "bg-white"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {multiSelectMode && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleActivitySelection(activity.id)}
                className="w-4 h-4 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <span className={`w-3 h-3 rounded-full ${serviceColor}`} title={activity.service}></span>
            <span className="font-bold text-gray-900">{patient.name}</span>
            <span className="text-xs text-gray-500">({patient.mrn})</span>
          </div>
          <div className="flex items-center gap-2">
            {getSedationIcon(activity)}
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(activity.priority)}`}>
              {activity.priority}
            </span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm">
          <span className="text-gray-700 font-medium">{activity.title}</span>
          <span className="text-gray-500">{formatTime(activity.startTime)} - {formatTime(activity.endTime)}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span className="bg-gray-100 px-2 py-0.5 rounded">{activity.service}</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded">{activity.caseType}</span>
          {activity.sedationType !== "None" && (
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{activity.sedationType}</span>
          )}
          {activity.sedationProvider !== "None" && (
            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{activity.sedationProvider}</span>
          )}
        </div>
        {(getStaffName(activity.pmdId) || getStaffName(activity.sedationistId)) && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            {getStaffName(activity.pmdId) && (
              <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded">PMD: {getStaffName(activity.pmdId)}</span>
            )}
            {getStaffName(activity.sedationistId) && (
              <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Sed: {getStaffName(activity.sedationistId)}</span>
            )}
          </div>
        )}
      </button>
    );
  };

  const renderDayView = () => {
    const dayActivities = getActivitiesForDate(currentDate);
    const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

    // Group by service for side-by-side view
    const serviceGroups = SERVICES.filter(s => s !== "All Services");
    const activeServices = serviceGroups.filter(service =>
      dayActivities.some(a => a.service === service)
    );

    return (
      <div className="space-y-4">
        {/* Day Summary Stats - Clickable to filter */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card
            className="p-3 text-center cursor-pointer hover:shadow-lg transition-all bg-blue-50 border-blue-200"
            onClick={() => {
              setFilterService("All Services");
              setFilterCaseType("All Types");
              setFilterSedation("All");
              setFilterPriority("All Priorities");
              setSearchQuery("");
              setFilterDoctor("all");
              setFilterDateRange("all");
            }}
          >
            <div className="text-2xl font-bold text-blue-600">{dayActivities.length}</div>
            <div className="text-xs text-gray-600 font-medium">Total Activities</div>
          </Card>
          <Card
            className={`p-3 text-center cursor-pointer hover:shadow-lg transition-all bg-green-50 border-green-200 ${filterCaseType === "Procedure" ? "ring-2 ring-green-500" : ""}`}
            onClick={() => setFilterCaseType(filterCaseType === "Procedure" ? "All Types" : "Procedure")}
          >
            <div className="text-2xl font-bold text-green-600">
              {dayActivities.filter(a => a.caseType === "Procedure").length}
            </div>
            <div className="text-xs text-gray-600 font-medium">Procedures</div>
          </Card>
          <Card
            className={`p-3 text-center cursor-pointer hover:shadow-lg transition-all bg-orange-50 border-orange-200 ${filterCaseType === "Direct Admit" ? "ring-2 ring-orange-500" : ""}`}
            onClick={() => setFilterCaseType(filterCaseType === "Direct Admit" ? "All Types" : "Direct Admit")}
          >
            <div className="text-2xl font-bold text-orange-600">
              {dayActivities.filter(a => a.caseType === "Direct Admit").length}
            </div>
            <div className="text-xs text-gray-600 font-medium">Direct Admits</div>
          </Card>
          <Card
            className={`p-3 text-center cursor-pointer hover:shadow-lg transition-all bg-red-50 border-red-200 ${filterSedation === "Anesthesia" ? "ring-2 ring-red-500" : ""}`}
            onClick={() => setFilterSedation(filterSedation === "Anesthesia" ? "All" : "Anesthesia")}
          >
            <div className="text-2xl font-bold text-red-600">
              {dayActivities.filter(a => a.sedationProvider === "Anesthesia").length}
            </div>
            <div className="text-xs text-gray-600 font-medium">Anesthesia Cases</div>
          </Card>
          <Card
            className={`p-3 text-center cursor-pointer hover:shadow-lg transition-all bg-purple-50 border-purple-200 ${filterSedation === "Intensivist" ? "ring-2 ring-purple-500" : ""}`}
            onClick={() => setFilterSedation(filterSedation === "Intensivist" ? "All" : "Intensivist")}
          >
            <div className="text-2xl font-bold text-purple-600">
              {dayActivities.filter(a => a.sedationProvider === "Intensivist").length}
            </div>
            <div className="text-xs text-gray-600 font-medium">Intensivist Cases</div>
          </Card>
        </div>

        {/* Filtered Activities Panel - Shows when filter is active */}
        {(filterCaseType !== "All Types" || filterSedation !== "All" || filterService !== "All Services" || filterPriority !== "All Priorities" || searchQuery) && dayActivities.length > 0 && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                📋 Filtered Results ({dayActivities.length})
                {filterCaseType !== "All Types" && <span className="text-xs bg-blue-200 px-2 py-0.5 rounded">{filterCaseType}</span>}
                {filterSedation !== "All" && <span className="text-xs bg-purple-200 px-2 py-0.5 rounded">{filterSedation}</span>}
                {filterService !== "All Services" && <span className="text-xs bg-green-200 px-2 py-0.5 rounded">{filterService}</span>}
              </h3>
              <button
                onClick={() => {
                  setFilterCaseType("All Types");
                  setFilterSedation("All");
                  setFilterService("All Services");
                  setFilterPriority("All Priorities");
                  setSearchQuery("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X size={14} /> Clear filters
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {dayActivities.map((activity) => {
                const patient = patients?.find(p => p.id === activity.patientId);
                const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "Unknown";
                const room = rooms?.find(r => r.id === activity.roomId);
                const startTime = new Date(activity.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={activity.id}
                    onClick={() => handleActivityClick(activity)}
                    className="flex items-center gap-3 p-2 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="text-sm font-bold text-blue-600 w-16">{startTime}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{activity.title}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {patientName}
                        {room && <span className="ml-1 text-blue-500">• {room.name}</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      activity.status === "Confirmed" ? "bg-green-100 text-green-700" :
                      activity.status === "In Progress" ? "bg-orange-100 text-orange-700" :
                      activity.status === "Completed" ? "bg-gray-100 text-gray-600" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Timeline View */}
        <Card className="p-4">
          <div className="space-y-1">
            {hours.map((hour) => {
              const hourActivities = dayActivities.filter((a) => {
                const startHour = new Date(a.startTime).getHours();
                return startHour === hour;
              });

              return (
                <div key={`hour-${hour}`} className="flex gap-4 min-h-16 border-b border-gray-100 py-2">
                  <div className="w-16 font-semibold text-gray-400 text-sm flex-shrink-0">
                    {`${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`}
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {hourActivities.map((activity) => renderActivityCard(activity))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50 p-2 min-h-28"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayActivities = getActivitiesForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`border border-gray-200 p-2 min-h-28 overflow-y-auto ${isToday ? "bg-blue-50 border-blue-300" : "bg-white"}`}
        >
          <div className={`font-bold mb-1 text-sm ${isToday ? "text-blue-600" : "text-gray-700"}`}>{day}</div>
          <div className="space-y-1">
            {dayActivities.slice(0, 4).map((activity) => renderActivityCard(activity, true))}
            {dayActivities.length > 4 && (
              <div className="text-xs text-gray-500 text-center py-1">+{dayActivities.length - 4} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="bg-gray-100 text-center py-2 font-semibold text-gray-600 text-sm">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">{days}</div>
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });

    return (
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
        {days.map((day) => {
          const dayActivities = getActivitiesForDate(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <Card key={day.toDateString()} className={`p-3 min-h-96 ${isToday ? "ring-2 ring-blue-500" : ""}`}>
              <div className={`font-bold text-center mb-2 pb-2 border-b ${isToday ? "text-blue-600" : "text-gray-700"}`}>
                <div className="text-xs text-gray-500">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div className="text-lg">{day.getDate()}</div>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-80">
                {dayActivities.map((activity) => renderActivityCard(activity, true))}
              </div>
            </Card>
          );
        })}
        </div>
      </div>
    );
  };

  return (
    <SchedulerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Procedure Schedule</h1>
              {activities && (
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                  {activities.length} total
                </span>
              )}
              {filterDoctor !== "all" && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                  📋 My Cases
                  <button
                    onClick={() => {
                      setFilterDoctor("all");
                      navigate("/calendar", { replace: true });
                    }}
                    className="ml-1 hover:text-blue-600"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">Multi-service procedure scheduling with sedation management</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={multiSelectMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (multiSelectMode) {
                  clearSelection();
                } else {
                  setMultiSelectMode(true);
                }
              }}
              className="text-xs sm:text-sm"
            >
              {multiSelectMode ? "Cancel" : "Multi-Select"}
            </Button>
            {hasDraft() && (
              <Button
                variant="outline"
                onClick={() => setShowDraftPrompt(true)}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                <span className="hidden sm:inline">Pending ({getDraftSummaries().length})</span>
                <span className="sm:hidden">{getDraftSummaries().length}</span>
              </Button>
            )}
            <Button onClick={handleOpenNewForm} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Plus size={16} />
              <span className="hidden sm:inline">New Encounter</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Multi-select Action Bar */}
        {selectedActivities.size > 0 && (
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium text-blue-800">
                {selectedActivities.size} activit{selectedActivities.size === 1 ? "y" : "ies"} selected
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("Confirmed")}>
                  Confirm All
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkUpdateStatus("In Progress")}>
                  Start All
                </Button>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => bulkUpdateStatus("Completed")}>
                  Complete All
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => {
                  if (confirm(`Cancel ${selectedActivities.size} activities?`)) {
                    bulkUpdateStatus("Cancelled");
                  }
                }}>
                  Cancel All
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4">
          {/* Quick Search Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => {
                setFilterDateRange("week");
                setViewType("week");
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterDateRange === "week"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => {
                setFilterDateRange("day");
                setViewType("day");
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterDateRange === "day"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setFilterDateRange("month");
                setViewType("month");
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterDateRange === "month"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setFilterDateRange("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterDateRange === "all"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Dates
            </button>
            <div className="hidden sm:block border-l border-gray-300 mx-2"></div>
            <select
              value={filterDoctor === "all" ? "all" : filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Doctors</option>
              {staff?.map(s => (
                <option key={s.id} value={s.id}>{s.name || `Doctor #${s.id}`}</option>
              ))}
            </select>
            {(filterDoctor !== "all" || filterDateRange !== "all") && (
              <span className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                {getFilteredActivities().length} cases found
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by patient, MRN, doctor, procedure..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(e.target.value.trim().length > 0);
                }}
                onFocus={() => setShowSearchResults(searchQuery.trim().length > 0)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results - Separate from input */}
            {showSearchResults && searchQuery.trim() && (() => {
              const query = searchQuery.toLowerCase();
              const matchingActivities = activities?.filter(a => {
                const patient = patients?.find(p => p.id === a.patientId);
                const patientName = patient ? `${patient.firstName} ${patient.lastName}`.toLowerCase() : "";
                const mrn = patient?.mrn?.toLowerCase() || "";
                const doctorName = getStaffName(a.pmdId)?.toLowerCase() || "";
                const sedName = getStaffName(a.sedationistId)?.toLowerCase() || "";
                return (
                  a.title.toLowerCase().includes(query) ||
                  patientName.includes(query) ||
                  mrn.includes(query) ||
                  doctorName.includes(query) ||
                  sedName.includes(query) ||
                  a.service?.toLowerCase().includes(query) ||
                  a.intervention?.toLowerCase().includes(query)
                );
              }) || [];

              if (matchingActivities.length === 0) return null;

              return (
                <div className="mt-2 bg-white border-2 border-blue-300 rounded-lg shadow-lg">
                  <div className="px-4 py-2 bg-blue-500 text-white font-medium rounded-t-lg flex justify-between items-center">
                    <span>{matchingActivities.length} case{matchingActivities.length !== 1 ? 's' : ''} found</span>
                    <button onClick={() => setShowSearchResults(false)} className="hover:bg-blue-600 rounded p-1">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {matchingActivities.slice(0, 10).map(activity => {
                      const patient = getPatientInfo(activity.patientId);
                      return (
                        <div
                          key={activity.id}
                          className="px-4 py-3 hover:bg-blue-50 border-b border-gray-100 cursor-pointer"
                          onClick={() => {
                            setSelectedActivity(activity);
                            setSearchQuery("");
                            setShowSearchResults(false);
                            setCurrentDate(new Date(activity.startTime));
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{activity.title}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  activity.status === "Confirmed" ? "bg-green-100 text-green-800" :
                                  activity.status === "In Progress" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-blue-100 text-blue-800"
                                }`}>{activity.status}</span>
                              </div>
                              <div className="text-sm text-gray-600">{patient.name} ({patient.mrn})</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(activity.startTime).toLocaleDateString()} {formatTime(activity.startTime)}
                                {getStaffName(activity.pmdId) && (
                                  <span className="ml-2 text-green-600">PMD: {getStaffName(activity.pmdId)}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-blue-500 font-medium text-sm">View →</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Navigation & View Controls */}
        <Card className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousPeriod}>
                <ChevronLeft size={18} />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextPeriod}>
                <ChevronRight size={18} />
              </Button>
              <input
                type="date"
                value={currentDate.toISOString().split('T')[0]}
                onChange={(e) => setCurrentDate(new Date(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>

            {/* Current Date Display */}
            <h2 className="text-xl font-bold text-gray-800">
              {viewType === "day"
                ? currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                : currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>

            {/* View Type Buttons */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType("day")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewType === "day" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewType("week")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewType === "week" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType("month")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewType === "month" ? "bg-white shadow text-blue-600" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs">
            <span className="font-medium text-gray-500">Quick filter:</span>
            <button
              onClick={() => setFilterCaseType(filterCaseType === "Procedure" ? "All Types" : "Procedure")}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors ${filterCaseType === "Procedure" ? "bg-green-100 ring-1 ring-green-300" : ""}`}
            >
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Procedures</span>
            </button>
            <button
              onClick={() => setFilterCaseType(filterCaseType === "Direct Admit" ? "All Types" : "Direct Admit")}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 transition-colors ${filterCaseType === "Direct Admit" ? "bg-orange-100 ring-1 ring-orange-300" : ""}`}
            >
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span>Direct Admits</span>
            </button>
            <button
              onClick={() => setFilterSedation(filterSedation === "Anesthesia" ? "All" : "Anesthesia")}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors ${filterSedation === "Anesthesia" ? "bg-red-100 ring-1 ring-red-300" : ""}`}
            >
              <Syringe size={12} className="text-red-500" />
              <span>Anesthesia</span>
            </button>
            <button
              onClick={() => setFilterSedation(filterSedation === "Intensivist" ? "All" : "Intensivist")}
              className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-50 transition-colors ${filterSedation === "Intensivist" ? "bg-purple-100 ring-1 ring-purple-300" : ""}`}
            >
              <Stethoscope size={12} className="text-purple-500" />
              <span>Intensivist</span>
            </button>
            {(filterCaseType !== "All Types" || filterSedation !== "All" || searchQuery) && (
              <button
                onClick={() => {
                  setFilterCaseType("All Types");
                  setFilterSedation("All");
                  setSearchQuery("");
                }}
                className="px-2 py-1 text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
          </div>
        </Card>

        {/* Debug Banner */}
        {activitiesError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded mb-4">
            Error loading activities: {activitiesError.message}
          </div>
        )}
        {activitiesLoading && (
          <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-2 rounded mb-4">
            Loading activities...
          </div>
        )}
        {!activitiesLoading && !activitiesError && activities?.length === 0 && (
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-2 rounded mb-4">
            No activities found in database. Create your first encounter using the "New Encounter" button above.
          </div>
        )}

        {/* Calendar View */}
        {viewType === "day" && renderDayView()}
        {viewType === "week" && renderWeekView()}
        {viewType === "month" && renderMonthView()}

        {/* Activity Detail Modal */}
        {selectedActivity && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${SERVICE_COLORS[selectedActivity.service || "Other"]}`}></span>
                      <h2 className="text-xl font-bold text-gray-900">{selectedActivity.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(selectedActivity.priority)}`}>
                        {selectedActivity.priority}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{selectedActivity.service}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{selectedActivity.caseType}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Patient Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Patient Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Name</span>
                          <span className="font-medium">{getPatientInfo(selectedActivity.patientId).name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">MRN</span>
                          <span className="font-medium">{getPatientInfo(selectedActivity.patientId).mrn}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">DOB</span>
                          <span className="font-medium">{getPatientInfo(selectedActivity.patientId).dob}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Disposition</span>
                          <span className="font-medium">{getPatientInfo(selectedActivity.patientId).disposition}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Schedule</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date</span>
                          <span className="font-medium">{new Date(selectedActivity.startTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Time</span>
                          <span className="font-medium">
                            {formatTime(selectedActivity.startTime)} - {formatTime(selectedActivity.endTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Location</span>
                          <span className="font-medium">{selectedActivity.roomId ? `Room ${selectedActivity.roomId}` : "TBD"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status</span>
                          <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                            selectedActivity.status === "Completed" ? "bg-green-100 text-green-800" :
                            selectedActivity.status === "Cancelled" ? "bg-red-100 text-red-800" :
                            selectedActivity.status === "In Progress" ? "bg-yellow-100 text-yellow-800" :
                            selectedActivity.status === "Confirmed" ? "bg-teal-100 text-teal-800" :
                            selectedActivity.status === "Pending" ? "bg-orange-100 text-orange-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {selectedActivity.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Procedure Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Sedation</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Required</span>
                          <span className={`font-medium ${selectedActivity.sedationRequired ? "text-red-600" : "text-gray-600"}`}>
                            {selectedActivity.sedationRequired ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type</span>
                          <span className="font-medium">{selectedActivity.sedationType || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Provider</span>
                          <span className={`font-medium ${
                            selectedActivity.sedationProvider === "Anesthesia" ? "text-red-600" :
                            selectedActivity.sedationProvider === "Intensivist" ? "text-blue-600" : ""
                          }`}>
                            {selectedActivity.sedationProvider || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">NPO Status</span>
                          <span className="font-medium">{selectedActivity.npoStatus || "Not documented"}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Pre-Procedure Checklist</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Pre-Op Complete</span>
                          <span className={`font-medium ${selectedActivity.preOpComplete ? "text-green-600" : "text-red-600"}`}>
                            {selectedActivity.preOpComplete ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Consent Signed</span>
                          <span className={`font-medium ${selectedActivity.consentSigned ? "text-green-600" : "text-red-600"}`}>
                            {selectedActivity.consentSigned ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Staff</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Attending/PMD</span>
                          <span className="font-medium text-green-700">{getStaffName(selectedActivity.pmdId) || "Not assigned"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sedation MD</span>
                          <span className="font-medium text-purple-700">{getStaffName(selectedActivity.sedationistId) || "Not assigned"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedActivity.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-700 mb-1">Notes</h3>
                    <p className="text-sm text-gray-600">{selectedActivity.notes}</p>
                  </div>
                )}

                {/* Created/Updated By */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-blue-600">Created by: </span>
                      <span className="font-medium text-blue-800">
                        {selectedActivity.createdByName || `User #${selectedActivity.createdBy}` || "Unknown"}
                      </span>
                      <span className="text-blue-400 ml-2">
                        {new Date(selectedActivity.createdAt).toLocaleDateString()} at {new Date(selectedActivity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {selectedActivity.updatedByName && selectedActivity.updatedBy !== selectedActivity.createdBy && (
                      <div>
                        <span className="text-blue-600">Updated by: </span>
                        <span className="font-medium text-blue-800">{selectedActivity.updatedByName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Status Actions */}
                <div className="mt-6 space-y-3">
                  <h3 className="font-semibold text-gray-700 text-sm">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedActivity.status !== "Confirmed" && (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => updateActivity.mutate({
                          id: selectedActivity.id,
                          patientId: selectedActivity.patientId,
                          activityTypeId: selectedActivity.activityTypeId,
                          title: selectedActivity.title,
                          startTime: new Date(selectedActivity.startTime),
                          endTime: new Date(selectedActivity.endTime),
                          status: "Confirmed",
                        })}
                        disabled={updateActivity.isPending}
                      >
                        Confirm Activity
                      </Button>
                    )}
                    {selectedActivity.status !== "In Progress" && selectedActivity.status !== "Completed" && (
                      <Button
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => updateActivity.mutate({
                          id: selectedActivity.id,
                          patientId: selectedActivity.patientId,
                          activityTypeId: selectedActivity.activityTypeId,
                          title: selectedActivity.title,
                          startTime: new Date(selectedActivity.startTime),
                          endTime: new Date(selectedActivity.endTime),
                          status: "In Progress",
                        })}
                        disabled={updateActivity.isPending}
                      >
                        Start Activity
                      </Button>
                    )}
                    {selectedActivity.status !== "Completed" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => updateActivity.mutate({
                          id: selectedActivity.id,
                          patientId: selectedActivity.patientId,
                          activityTypeId: selectedActivity.activityTypeId,
                          title: selectedActivity.title,
                          startTime: new Date(selectedActivity.startTime),
                          endTime: new Date(selectedActivity.endTime),
                          status: "Completed",
                        })}
                        disabled={updateActivity.isPending}
                      >
                        Complete Activity
                      </Button>
                    )}
                    {selectedActivity.status !== "Cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Are you sure you want to cancel this activity?")) {
                            updateActivity.mutate({
                              id: selectedActivity.id,
                              patientId: selectedActivity.patientId,
                              activityTypeId: selectedActivity.activityTypeId,
                              title: selectedActivity.title,
                              startTime: new Date(selectedActivity.startTime),
                              endTime: new Date(selectedActivity.endTime),
                              status: "Cancelled",
                            });
                          }
                        }}
                        disabled={updateActivity.isPending}
                      >
                        Cancel Activity
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" className="flex-1" onClick={() => setSelectedActivity(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Draft Restore Prompt */}
        {showDraftPrompt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-6">
              <h3 className="text-lg font-bold mb-2">Pending Encounters ({getDraftSummaries().length})</h3>
              <p className="text-gray-600 mb-4">
                You have unsaved encounter forms. Select one to resume or start fresh.
              </p>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {getDraftSummaries().map((summary) => (
                  <div key={summary.index} className="bg-gray-50 p-3 rounded-lg text-sm flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{summary.patientName} - {summary.title}</div>
                      <div className="text-gray-500 text-xs">
                        {summary.date && <span>{summary.date} · </span>}
                        {summary.savedAt}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="text-red-600 px-2" onClick={() => handleDeleteDraft(summary.index)}>
                        ✕
                      </Button>
                      <Button size="sm" onClick={() => handleRestoreDraft(summary.index)}>
                        Resume
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 border-t pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowDraftPrompt(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleStartFresh}>
                  Start Fresh
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* New Procedure Modal */}
        {showNewProcedure && (
          <div className="fixed inset-0 bg-black/50 z-40 overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-2 sm:p-4 pt-20 pb-8">
              <Card className="w-full max-w-3xl">
                <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingActivityId ? "Edit Encounter" : "Schedule New Encounter"}
                  </h2>
                  <button
                    onClick={() => { saveDraft(); setShowNewProcedure(false); resetForm(); setEditingActivityId(null); }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Save draft and close"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                </div>

                <form data-voice-form="encounter" onSubmit={async (e) => {
                  e.preventDefault();

                  // Validate required fields
                  if (patientMode === "existing" && !formPatientId) {
                    alert("Please select a patient");
                    return;
                  }
                  if (patientMode === "new" && (!newPatientMrn || !newPatientFirstName || !newPatientLastName)) {
                    alert("Please fill in patient MRN, First Name, and Last Name");
                    return;
                  }
                  if (!formStartDate || !formStartTime || !formEndTime) {
                    alert("Please fill in date and time");
                    return;
                  }
                  if (formActivityTypeIds.length === 0) {
                    alert("Please select a procedure type (LP, BMA, PICC, IR)");
                    return;
                  }
                  if (!formTitle) {
                    alert("Please select a case title");
                    return;
                  }
                  if (!formPmdService) {
                    alert("Please select a Primary service");
                    return;
                  }

                  let patientId = formPatientId ? Number(formPatientId) : 0;
                  let pmdId = formPmdId ? Number(formPmdId) : undefined;
                  let sedationistId = formSedationistId ? Number(formSedationistId) : undefined;

                  // If new patient, create them first
                  if (patientMode === "new") {
                    // Check for patients with the same name
                    const matchingPatients = patients?.filter(p =>
                      p.firstName.toLowerCase() === newPatientFirstName.toLowerCase() &&
                      p.lastName.toLowerCase() === newPatientLastName.toLowerCase()
                    ) || [];

                    if (matchingPatients.length > 0) {
                      const patientList = matchingPatients.map(p =>
                        `- ${p.firstName} ${p.lastName} (MRN: ${p.mrn}, DOB: ${p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : "N/A"})`
                      ).join("\n");

                      const confirmed = window.confirm(
                        `⚠️ Possible Duplicate Patient!\n\nPatients with the same name already exist:\n\n${patientList}\n\nDo you want to create a new patient anyway?`
                      );

                      if (!confirmed) {
                        return;
                      }
                    }

                    try {
                      const result = await createPatient.mutateAsync({
                        mrn: newPatientMrn,
                        firstName: newPatientFirstName,
                        lastName: newPatientLastName,
                        dateOfBirth: newPatientDob ? new Date(newPatientDob) : undefined,
                        gender: newPatientGender as any || undefined,
                        admissionStatus: newPatientDisposition as any || undefined,
                      });
                      patientId = result.id || 0;
                    } catch (error: any) {
                      alert(error.message || "Failed to create patient");
                      return;
                    }
                  }

                  // If new Procedure MD, create them first
                  if (showNewProcedureMD && newProcedureMDName) {
                    try {
                      const result = await createStaff.mutateAsync({
                        name: newProcedureMDName,
                        specialization: "PMD",
                      });
                      pmdId = result.id;
                      refetchStaff();
                    } catch (error: any) {
                      alert(error.message || "Failed to create doctor");
                      return;
                    }
                  }

                  // If new Sedation MD, create them first
                  if (showNewSedationMD && newSedationMDName) {
                    try {
                      const result = await createStaff.mutateAsync({
                        name: newSedationMDName,
                        specialization: "Sedationist",
                      });
                      sedationistId = result.id;
                      refetchStaff();
                    } catch (error: any) {
                      alert(error.message || "Failed to create doctor");
                      return;
                    }
                  }

                  const startDateTime = new Date(`${formStartDate}T${formStartTime}`);
                  const endDateTime = new Date(`${formStartDate}T${formEndTime}`);

                  // Check for overlapping activities at the same time
                  const overlappingActivities = activities?.filter(a => {
                    // Skip the activity being edited
                    if (editingActivityId && a.id === editingActivityId) return false;

                    const actStart = new Date(a.startTime);
                    const actEnd = new Date(a.endTime);

                    // Check if times overlap
                    return (startDateTime < actEnd && endDateTime > actStart);
                  }) || [];

                  if (overlappingActivities.length > 0) {
                    const patientNames = overlappingActivities.map(a => {
                      const p = patients?.find(p => p.id === a.patientId);
                      return p ? `${p.firstName} ${p.lastName}` : "Unknown";
                    });
                    const conflictList = overlappingActivities.map((a, i) =>
                      `- ${a.title} (${patientNames[i]}) at ${new Date(a.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
                    ).join("\n");

                    const confirmed = window.confirm(
                      `⚠️ Time Conflict Detected!\n\nThe following activities are already scheduled during this time:\n\n${conflictList}\n\nDo you want to schedule anyway?`
                    );

                    if (!confirmed) {
                      return;
                    }

                    // Add warning notification for schedule conflict
                    addNotification({
                      type: "warning",
                      title: "Schedule Conflict",
                      message: `Activity scheduled with ${overlappingActivities.length} overlapping procedure(s). Review the schedule.`,
                      actionUrl: "/calendar",
                      actionLabel: "View Calendar",
                    });
                  }

                  // Check for DUPLICATE patient encounter (same patient, same time, same title)
                  const selectedProcedureTypesForCheck = activityTypes?.filter(t => formActivityTypeIds.includes(t.id)) || [];
                  const procedureTitleForCheck = formTitle || selectedProcedureTypesForCheck.map(t => t.name).join(" + ") || "Scheduled Activity";

                  const duplicateEncounter = activities?.find(a => {
                    if (editingActivityId && a.id === editingActivityId) return false;
                    const actStart = new Date(a.startTime);
                    return (
                      a.patientId === patientId &&
                      actStart.getTime() === startDateTime.getTime() &&
                      a.title === procedureTitleForCheck
                    );
                  });

                  if (duplicateEncounter) {
                    const patient = patients?.find(p => p.id === patientId);
                    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : "this patient";
                    alert(
                      `🚫 DUPLICATE ENCOUNTER!\n\n${patientName} already has "${procedureTitleForCheck}" scheduled at this exact time.\n\nPlease choose a different time or procedure.`
                    );
                    return;
                  }

                  // Get procedure type names for the title
                  const selectedProcedureTypes = activityTypes?.filter(t => formActivityTypeIds.includes(t.id)) || [];
                  const procedureTypeNames = selectedProcedureTypes.map(t => t.name).join(" + ");
                  const procedureTitle = formTitle || procedureTypeNames || "Scheduled Activity";

                  // Combine intervention with other details
                  let finalIntervention = formIntervention;
                  if (formIntervention === "Other" && formOtherIntervention) {
                    finalIntervention = formOtherIntervention;
                  } else if (formIntervention && formOtherIntervention) {
                    finalIntervention = `${formIntervention} - ${formOtherIntervention}`;
                  }

                  // Build notes - append to existing notes when editing
                  let finalNotes = "";
                  const existingNotes = editingActivityId ? activities?.find(a => a.id === editingActivityId)?.notes : null;
                  const newNoteContent = formPmdService ? `Primary: ${formPmdService}${formNotes ? ` | ${formNotes}` : ""}` : formNotes || "";

                  if (editingActivityId && existingNotes && newNoteContent && !existingNotes.includes(newNoteContent)) {
                    // Append new notes to existing (avoid duplicates)
                    finalNotes = `${existingNotes}\n---\n${new Date().toLocaleString()}: ${newNoteContent}`;
                  } else if (newNoteContent) {
                    finalNotes = newNoteContent;
                  } else if (existingNotes) {
                    finalNotes = existingNotes;
                  }

                  const activityData = {
                    patientId,
                    activityTypeId: formActivityTypeIds[0] || (activityTypes?.[0]?.id || 1),
                    title: procedureTitle,
                    startTime: startDateTime,
                    endTime: endDateTime,
                    service: formService as any,
                    caseType: formCaseType as any,
                    priority: formPriority as any,
                    roomId: formRoomId ? Number(formRoomId) : null,
                    sedationRequired: formSedationRequired ? 1 : 0,
                    sedationType: formSedationType as any,
                    sedationProvider: formSedationProvider as any,
                    sedationistId: sedationistId || null,
                    pmdId: pmdId || null,
                    intervention: finalIntervention || null,
                    notes: finalNotes || null,
                    description: formPmdService || null,
                    status: formStatus as any,
                    createdBy: currentUser?.id && !isNaN(Number(currentUser.id)) ? Number(currentUser.id) : 1,
                    createdByName: currentUser?.name || "System",
                  };

                  if (editingActivityId) {
                    updateActivity.mutate({
                      id: editingActivityId,
                      ...activityData,
                      updatedBy: currentUser?.id && !isNaN(Number(currentUser.id)) ? Number(currentUser.id) : 1,
                      updatedByName: currentUser?.name || "System",
                    });
                  } else {
                    createActivity.mutate(activityData);
                  }
                }} className="space-y-4">

                  {/* Patient Selection Mode */}
                  <div className="p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Patient *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPatientMode("existing")}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium ${patientMode === "existing" ? "bg-blue-100 border-blue-500 text-blue-800" : "bg-white border-gray-300 hover:border-gray-400"}`}
                      >
                        Existing Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setPatientMode("new")}
                        className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 transition-all text-sm font-medium ${patientMode === "new" ? "bg-green-100 border-green-500 text-green-800" : "bg-white border-gray-300 hover:border-gray-400"}`}
                      >
                        + New Patient
                      </button>
                    </div>
                  </div>

                  {/* Existing Patient Selection */}
                  {patientMode === "existing" && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                      <select
                        value={formPatientId}
                        onChange={(e) => {
                          const patientId = e.target.value ? Number(e.target.value) : "";
                          setFormPatientId(patientId);

                          // Smart suggestion: check for previous visits
                          if (patientId) {
                            const lastVisit = getPatientHistory(patientId);
                            if (lastVisit) {
                              setPatientLastVisit(lastVisit);
                              setShowRepeatSuggestion(true);
                            } else {
                              setPatientLastVisit(null);
                              setShowRepeatSuggestion(false);
                            }
                          } else {
                            setPatientLastVisit(null);
                            setShowRepeatSuggestion(false);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                        required={patientMode === "existing"}
                      >
                        <option value="">-- Select Patient --</option>
                        {patients?.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.lastName}, {p.firstName} (MRN: {p.mrn})
                          </option>
                        ))}
                      </select>

                      {/* Smart Suggestion: Repeat Last Visit */}
                      {showRepeatSuggestion && patientLastVisit && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-yellow-800">
                                🔄 Returning Patient
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Last visit: <strong>{patientLastVisit.title}</strong> on {new Date(patientLastVisit.startTime).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={repeatLastVisit}
                              className="px-3 py-1.5 bg-yellow-500 text-white text-sm font-medium rounded-md hover:bg-yellow-600 transition-colors"
                            >
                              Repeat Visit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New Patient Form */}
                  {patientMode === "new" && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
                      <h4 className="font-medium text-green-800">New Patient Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">MRN *</label>
                          <input
                            type="text"
                            value={newPatientMrn}
                            onChange={(e) => setNewPatientMrn(e.target.value)}
                            placeholder="Medical Record #"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required={patientMode === "new"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                          <input
                            type="text"
                            value={newPatientFirstName}
                            onChange={(e) => setNewPatientFirstName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required={patientMode === "new"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={newPatientLastName}
                            onChange={(e) => setNewPatientLastName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required={patientMode === "new"}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                          <input
                            type="date"
                            value={newPatientDob}
                            onChange={(e) => setNewPatientDob(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                          <select
                            value={newPatientGender}
                            onChange={(e) => setNewPatientGender(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          >
                            <option value="">Select</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Disposition</label>
                          <select
                            value={newPatientDisposition}
                            onChange={(e) => setNewPatientDisposition(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                          >
                            <option value="">Select</option>
                            <option value="Inpatient">Inpatient</option>
                            <option value="Direct Admit">Direct Admit</option>
                            <option value="Subacute Facility">Subacute Facility</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Activity Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Activity Title *</label>
                    <CreatableSelect
                      value={formTitle}
                      onChange={(val) => {
                        setFormTitle(val);

                        // Auto-fill based on Activity Title
                        if (val === "LP") {
                          setFormIntervention("Lumbar Puncture");
                          setFormCaseType("Procedure");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                        } else if (val === "BMA" || val === "BMBx") {
                          setFormIntervention(val === "BMA" ? "Bone Marrow Aspiration" : "Bone Marrow Biopsy");
                          setFormCaseType("Procedure");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                        } else if (val === "PICC") {
                          setFormIntervention("PICC Line Placement");
                          setFormCaseType("Procedure");
                          setFormSedationRequired(true);
                        } else if (val === "Central Line") {
                          setFormIntervention("Central Line Placement");
                          setFormCaseType("Procedure");
                          setFormSedationRequired(true);
                        } else if (val === "Port Access" || val === "Port Placement") {
                          setFormIntervention(val);
                          setFormCaseType("Procedure");
                          setFormSedationRequired(val === "Port Placement");
                        } else if (val === "IT Chemo") {
                          setFormIntervention("Intrathecal Chemotherapy");
                          setFormCaseType("Procedure");
                          setFormSedationRequired(true);
                          setFormPmdService("Oncology");
                          setFormService("Oncology");
                        } else if (val === "Sedated Procedure" || val === "IR Procedure") {
                          setFormCaseType("Procedure");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                        } else if (val === "Direct Admit") {
                          setFormCaseType("Direct Admit");
                          setFormSedationRequired(false);
                          setFormPriority("Urgent");
                        } else if (val === "Consultation") {
                          setFormCaseType("Consultation");
                          setFormSedationRequired(false);
                        } else if (val === "Follow-up") {
                          setFormCaseType("Follow-up");
                          setFormSedationRequired(false);
                        }
                      }}
                      options={[...ACTIVITY_TITLES, ...customTitles].filter(t => t !== "Other").map(t => ({ value: t, label: t }))}
                      placeholder="-- Select or type title --"
                      className="w-full"
                      onCreateOption={(val) => setCustomTitles(prev => [...prev, val])}
                    />
                  </div>

                  {/* Primary Service */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Service *</label>
                    <select
                      value={formPmdService}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormPmdService(val);

                        // Auto-fill Service field based on Primary Service
                        const mappedService = PRIMARY_TO_SERVICE[val];
                        if (mappedService) {
                          setFormService(mappedService);
                        }

                        // Auto-fill other fields based on Primary Service
                        if (val === "Oncology" || val === "Hematology" || val === "Heme/Onc") {
                          setFormTitle("LP");
                          setFormIntervention("Lumbar Puncture");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                          setFormCaseType("Procedure");
                        } else if (val === "GI") {
                          setFormTitle("Sedated Procedure");
                          setFormIntervention("EGD");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                          setFormCaseType("Procedure");
                        } else if (val === "Radiology" || val === "Interventional Radiology") {
                          setFormTitle("Sedated Procedure");
                          setFormIntervention("Sedated MRI");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                          setFormCaseType("Procedure");
                        } else if (val === "Peds Surgery" || val === "Peds HBS" || val === "General Surgery") {
                          setFormTitle("Sedated Procedure");
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                          setFormCaseType("Procedure");
                        } else if (val === "Cardiology" || val === "Cardiac Surgery") {
                          setFormTitle("Sedated Procedure");
                          setFormIntervention("Sedated Echo");
                          setFormSedationRequired(true);
                          setFormCaseType("Procedure");
                        } else if (val === "General Pediatrics" || val === "Hospitalist") {
                          setFormCaseType("Consultation");
                          setFormTitle("Consultation");
                          setFormSedationRequired(false);
                          setFormSedationType("None");
                        } else if (val === "Pain Management") {
                          setFormSedationRequired(true);
                          setFormSedationType("Conscious Sedation");
                          setFormCaseType("Procedure");
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Select Primary Service --</option>
                      {[...PRIMARY_SERVICES, ...customServices].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Procedure MD (Doctor) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Procedure MD (Doctor)
                      <button
                        type="button"
                        onClick={() => window.open('/staff', '_blank')}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Manage Staff →
                      </button>
                    </label>
                    {!showNewProcedureMD ? (
                      <div className="flex gap-1">
                        <select
                          value={formPmdId}
                          onChange={(e) => {
                            if (e.target.value === "new") {
                              setShowNewProcedureMD(true);
                              setFormPmdId("");
                            } else {
                              setFormPmdId(e.target.value ? Number(e.target.value) : "");
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select Procedure MD --</option>
                          {physicians.length > 0 ? (
                            physicians.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name || `Staff #${s.id}`} (PMD)
                              </option>
                            ))
                          ) : (
                            <option disabled>No certified procedure MDs available</option>
                          )}
                          <option value="new">+ Add New Doctor</option>
                        </select>
                        {formPmdId && (
                          <button
                            type="button"
                            onClick={() => setFormPmdId("")}
                            className="px-2 py-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Clear selection"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProcedureMDName}
                          onChange={(e) => setNewProcedureMDName(e.target.value)}
                          placeholder="Enter doctor name (e.g., Dr. Smith)"
                          className="flex-1 px-3 py-2 border border-green-300 rounded-md bg-green-50 focus:ring-2 focus:ring-green-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => { setShowNewProcedureMD(false); setNewProcedureMDName(""); }}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Row 2: Service, Case Type, Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                      <CreatableSelect
                        value={formService}
                        onChange={setFormService}
                        options={[...SERVICES.filter(s => s !== "All Services" && s !== "Other"), ...customServices].map(s => ({ value: s, label: s }))}
                        placeholder="-- Select or type service --"
                        className="w-full"
                        onCreateOption={(val) => setCustomServices(prev => [...prev, val])}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                      <select
                        value={formCaseType}
                        onChange={(e) => {
                          const caseType = e.target.value;
                          setFormCaseType(caseType);

                          // Auto-fill based on case type
                          if (caseType === "Procedure") {
                            setFormSedationRequired(true);
                            setFormSedationType("Conscious Sedation");
                          } else if (caseType === "Direct Admit") {
                            setFormTitle("Direct Admit");
                            setFormSedationRequired(false);
                            setFormSedationType("None");
                            setFormPriority("Urgent");
                          } else if (caseType === "Consultation") {
                            setFormTitle("Consultation");
                            setFormSedationRequired(false);
                            setFormSedationType("None");
                            setFormPriority("Planned");
                          } else if (caseType === "Follow-up") {
                            setFormTitle("Follow-up");
                            setFormSedationRequired(false);
                            setFormSedationType("None");
                            setFormPriority("Planned");
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {CASE_TYPES.filter(t => t !== "All Types").map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        {PRIORITIES.filter(p => p !== "All Priorities").map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Procedure Type, Room, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Procedure Type *</label>
                      <button
                        type="button"
                        onClick={() => setShowProcedureDropdown(!showProcedureDropdown)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500"
                      >
                        <span className={formActivityTypeIds.length === 0 ? "text-gray-400" : ""}>
                          {formActivityTypeIds.length === 0
                            ? "-- Select Procedure Type(s) --"
                            : activityTypes?.filter(t => formActivityTypeIds.includes(t.id)).map(t => t.name).join(", ")
                          }
                        </span>
                        <span className="text-gray-400">{showProcedureDropdown ? "▲" : "▼"}</span>
                      </button>
                      {showProcedureDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                          <div className="border-b p-2">
                            <button
                              type="button"
                              onClick={() => setShowProcedureDropdown(false)}
                              className="w-full py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Done
                            </button>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                          {Object.entries(PROCEDURE_CATEGORIES).map(([category, procedureNames]) => {
                            // Filter activity types that belong to this category
                            const categoryTypes = activityTypes?.filter(t => procedureNames.includes(t.name)) || [];
                            if (categoryTypes.length === 0) return null;

                            return (
                              <div key={category}>
                                <div className="px-3 py-1 bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-wide border-b sticky top-0">
                                  {category}
                                </div>
                                {categoryTypes.map(t => (
                                  <label
                                    key={t.id}
                                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer pl-5"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formActivityTypeIds.includes(t.id)}
                                      onChange={(e) => {
                                        const typeId = t.id;
                                        let newIds: number[];

                                        if (e.target.checked) {
                                          newIds = [...formActivityTypeIds, typeId];
                                        } else {
                                          newIds = formActivityTypeIds.filter(id => id !== typeId);
                                        }
                                        setFormActivityTypeIds(newIds);

                                        // Update title to show all selected
                                        const allSelected = activityTypes?.filter(at => newIds.includes(at.id)).map(at => at.name) || [];
                                        setFormTitle(allSelected.join(" + ") || "LP");

                                        // Auto-set Primary Service and Case Type based on all selected procedures
                                        const defaults = getDefaultsForProcedures(allSelected);
                                        if (defaults.primaryService) {
                                          setFormPmdService(defaults.primaryService);
                                        }
                                        if (defaults.caseType) {
                                          setFormCaseType(defaults.caseType);
                                        }

                                        // Auto-fill based on newly checked type
                                        if (e.target.checked) {
                                          const typeName = t.name;

                                          if (typeName === "LP") {
                                            setFormIntervention("Lumbar Puncture");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormService("Oncology");
                                          } else if (typeName === "BMA" || typeName === "BMBx") {
                                            setFormIntervention(typeName === "BMA" ? "Bone Marrow Aspiration" : "Bone Marrow Biopsy");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormService("Oncology");
                                          } else if (typeName === "IT Chemo") {
                                            setFormIntervention("Intrathecal Chemotherapy");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormService("Oncology");
                                          } else if (typeName === "PICC" || typeName === "Central Line") {
                                            setFormIntervention(typeName === "PICC" ? "PICC Line Placement" : "Central Line Placement");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                          } else if (typeName === "Sedated MRI" || typeName === "Sedated CT" || typeName === "IR Procedure") {
                                            setFormIntervention(typeName);
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormService("Radiology");
                                          } else if (typeName === "EGD" || typeName === "Colonoscopy") {
                                            setFormIntervention(typeName);
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormService("GI");
                                          } else if (typeName === "Bronchoscopy") {
                                            setFormIntervention(typeName);
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormService("Pulmonary");
                                          } else if (typeName === "Consultation" || typeName === "Follow-up") {
                                            setFormCaseType(typeName);
                                            setFormSedationRequired(false);
                                          } else if (typeName === "Direct Admit") {
                                            setFormCaseType("Direct Admit");
                                            setFormSedationRequired(false);
                                            setFormPriority("Urgent");
                                          }
                                        }
                                      }}
                                      className="mr-2 h-4 w-4 text-blue-600 rounded"
                                    />
                                    {t.name}
                                  </label>
                                ))}
                              </div>
                            );
                          })}
                          {/* Show uncategorized types */}
                          {activityTypes?.filter(t => !Object.values(PROCEDURE_CATEGORIES).flat().includes(t.name)).map(t => (
                            <label
                              key={t.id}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formActivityTypeIds.includes(t.id)}
                                onChange={(e) => {
                                  const typeId = t.id;
                                  let newIds: number[];

                                  if (e.target.checked) {
                                    newIds = [...formActivityTypeIds, typeId];
                                  } else {
                                    newIds = formActivityTypeIds.filter(id => id !== typeId);
                                  }
                                  setFormActivityTypeIds(newIds);
                                  const allSelected = activityTypes?.filter(at => newIds.includes(at.id)).map(at => at.name) || [];
                                  setFormTitle(allSelected.join(" + ") || "LP");
                                }}
                                className="mr-2 h-4 w-4 text-blue-600 rounded"
                              />
                              {t.name}
                            </label>
                          ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                      <div className="flex gap-1">
                        <select
                          value={formRoomId}
                          onChange={(e) => setFormRoomId(e.target.value ? Number(e.target.value) : "")}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">No room assigned</option>
                          {rooms?.filter(r => r.isActive === 1).map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.type})
                            </option>
                          ))}
                        </select>
                        {formRoomId && (
                          <button
                            type="button"
                            onClick={() => setFormRoomId("")}
                            className="px-2 py-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Clear room"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="Pending">Pending (Tentative)</option>
                        <option value="Requested">Requested</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Intervention Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Intervention Type</label>
                      <CreatableSelect
                        value={formIntervention}
                        onChange={(val) => {
                          setFormIntervention(val);
                          setFormOtherIntervention("");

                          // Auto-fill based on Intervention
                          if (val === "Lumbar Puncture") {
                            setFormTitle("LP");
                            setFormSedationRequired(true);
                          } else if (val === "Bone Marrow Aspiration") {
                            setFormTitle("BMA");
                            setFormSedationRequired(true);
                          } else if (val === "Bone Marrow Biopsy") {
                            setFormTitle("BMBx");
                            setFormSedationRequired(true);
                          } else if (val === "PICC Line Placement") {
                            setFormTitle("PICC");
                            setFormSedationRequired(true);
                          } else if (val === "Central Line Placement") {
                            setFormTitle("Central Line");
                            setFormSedationRequired(true);
                          } else if (val === "Intrathecal Chemotherapy") {
                            setFormTitle("IT Chemo");
                            setFormSedationRequired(true);
                            setFormPmdService("Oncology");
                            setFormService("Oncology");
                          } else if (val.includes("Sedated MRI") || val.includes("Sedated CT")) {
                            setFormService("Radiology");
                            setFormSedationRequired(true);
                          } else if (val === "EGD" || val === "Colonoscopy") {
                            setFormService("GI");
                            setFormSedationRequired(true);
                          } else if (val === "Bronchoscopy") {
                            setFormService("Pulmonary");
                            setFormSedationRequired(true);
                          }
                        }}
                        options={[...INTERVENTIONS, ...customInterventions].filter(i => i !== "Other").map(i => ({ value: i, label: i }))}
                        placeholder="-- Select or type intervention --"
                        className="w-full"
                        onCreateOption={(val) => setCustomInterventions(prev => [...prev, val])}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                      <input
                        type="text"
                        value={formOtherIntervention}
                        onChange={(e) => setFormOtherIntervention(e.target.value)}
                        placeholder="Optional details..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {/* Row 4: Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => {
                          const startTime = e.target.value;
                          setFormStartTime(startTime);
                          // Auto-set end time to 30 minutes later
                          if (startTime) {
                            const [hours, minutes] = startTime.split(':').map(Number);
                            const endDate = new Date();
                            endDate.setHours(hours, minutes + 30, 0, 0);
                            const endHours = endDate.getHours().toString().padStart(2, '0');
                            const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
                            setFormEndTime(`${endHours}:${endMinutes}`);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      />
                    </div>
                  </div>

                  {/* Schedule Preview - Shows existing activities for selected date */}
                  {formStartDate && (
                    <div className="border border-yellow-300 rounded-lg p-3 bg-yellow-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-yellow-800">
                          Schedule for {new Date(formStartDate + "T00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        </span>
                        <span className="text-xs text-yellow-700">
                          {activities?.filter(a => new Date(a.startTime).toDateString() === new Date(formStartDate + "T00:00").toDateString()).length || 0} activities
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {activities?.filter(a => new Date(a.startTime).toDateString() === new Date(formStartDate + "T00:00").toDateString())
                          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                          .map(a => {
                            const pt = patients?.find(p => p.id === a.patientId);
                            const startT = new Date(a.startTime);
                            const endT = new Date(a.endTime);
                            // Check for time conflict
                            const hasConflict = formStartTime && formEndTime && (
                              (formStartTime >= startT.toTimeString().slice(0,5) && formStartTime < endT.toTimeString().slice(0,5)) ||
                              (formEndTime > startT.toTimeString().slice(0,5) && formEndTime <= endT.toTimeString().slice(0,5)) ||
                              (formStartTime <= startT.toTimeString().slice(0,5) && formEndTime >= endT.toTimeString().slice(0,5))
                            );
                            return (
                              <div key={a.id} className={`text-xs p-2 rounded flex justify-between items-center ${hasConflict ? "bg-red-100 border border-red-300" : "bg-white"}`}>
                                <span className={hasConflict ? "text-red-700 font-medium" : "text-gray-700"}>
                                  {startT.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} - {endT.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </span>
                                <span className="text-gray-600 truncate ml-2">{a.title}</span>
                                <span className="text-gray-500 truncate ml-2">{pt ? `${pt.lastName}` : ""}</span>
                                {hasConflict && <span className="text-red-600 font-bold ml-2">CONFLICT</span>}
                              </div>
                            );
                          })}
                        {activities?.filter(a => new Date(a.startTime).toDateString() === new Date(formStartDate + "T00:00").toDateString()).length === 0 && (
                          <div className="text-xs text-gray-500 text-center py-2">No activities scheduled</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sedation Section */}
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <label className="block text-sm font-medium text-gray-700 mr-2">Sedation</label>
                      <select
                        value={formSedationRequired ? "Yes" : "No"}
                        onChange={(e) => {
                          const isYes = e.target.value === "Yes";
                          setFormSedationRequired(isYes);
                          if (!isYes) {
                            setFormSedationType("None");
                            setFormSedationProvider("None");
                            setFormSedationistId("");
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md bg-white font-bold text-blue-800"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {formSedationRequired && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 sm:pl-6 border-l-2 border-blue-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Provider Type</label>
                          <select
                            value={formSedationProvider}
                            onChange={(e) => setFormSedationProvider(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          >
                            <option value="None">None</option>
                            <option value="Intensivist">Intensivist</option>
                            <option value="Anesthesia">Anesthesia</option>
                            <option value="Proceduralist">Proceduralist</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sedation MD
                            <button
                              type="button"
                              onClick={() => window.open('/staff', '_blank')}
                              className="ml-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Manage →
                            </button>
                          </label>
                          {!showNewSedationMD ? (
                            <div className="flex gap-1">
                              <select
                                value={formSedationistId}
                                onChange={(e) => {
                                  if (e.target.value === "new") {
                                    setShowNewSedationMD(true);
                                    setFormSedationistId("");
                                  } else {
                                    setFormSedationistId(e.target.value ? Number(e.target.value) : "");
                                  }
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                              >
                                <option value="">-- Select Sedation MD --</option>
                                {sedationists.length > 0 ? (
                                  sedationists.map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name || `Staff #${s.id}`} ({s.specializations?.join(", ")})
                                    </option>
                                  ))
                                ) : (
                                  <option disabled>No certified sedationists available</option>
                                )}
                                <option value="new">+ Add New Sedationist</option>
                              </select>
                              {formSedationistId && (
                                <button
                                  type="button"
                                  onClick={() => setFormSedationistId("")}
                                  className="px-2 py-1 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded"
                                  title="Clear selection"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newSedationMDName}
                                onChange={(e) => setNewSedationMDName(e.target.value)}
                                placeholder="Doctor name"
                                className="flex-1 px-3 py-2 border border-green-300 rounded-md bg-green-50 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => { setShowNewSedationMD(false); setNewSedationMDName(""); }}
                                className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded text-sm"
                              >
                                X
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {/* Error display */}
                  {createActivity.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                      {createActivity.error.message}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { saveDraft(); setShowNewProcedure(false); resetForm(); }}
                    >
                      Save Draft & Close
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 text-red-600 hover:text-red-700"
                      onClick={() => { clearDraft(); setShowNewProcedure(false); resetForm(); }}
                    >
                      Discard
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createActivity.isPending}
                    >
                      {createActivity.isPending ? "Scheduling..." : "Schedule"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
            </div>
          </div>
        )}
      </div>

    </SchedulerLayout>
  );
}
