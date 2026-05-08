import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { ChevronLeft, ChevronRight, X, Plus, AlertCircle, Syringe, Stethoscope, UserPlus, Search } from "lucide-react";

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

const INTERVENTIONS = [
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
  const { data: activities, refetch: refetchActivities } = trpc.activities.list.useQuery();
  const { data: patients, refetch: refetchPatients } = trpc.patients.list.useQuery();
  const { data: rooms } = trpc.activities.getRooms.useQuery();
  const { data: staff } = trpc.activities.getStaff.useQuery();
  const { data: activityTypes } = trpc.activities.getActivityTypes.useQuery();

  // State for editing an activity
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [showNewProcedure, setShowNewProcedure] = useState(false);

  const createPatient = trpc.patients.create.useMutation();
  const createStaff = trpc.activities.createStaff.useMutation();
  const createActivity = trpc.activities.create.useMutation({
    onSuccess: () => {
      refetchActivities();
      refetchPatients();
      setShowNewProcedure(false);
      setEditingActivityId(null);
      resetForm();
    },
  });

  const updateActivity = trpc.activities.update.useMutation({
    onSuccess: () => {
      refetchActivities();
      setSelectedActivity(null);
      setShowNewProcedure(false);
      setEditingActivityId(null);
      resetForm();
    },
  });

  const refetchStaff = trpc.useUtils().activities.getStaff.invalidate;

  // Patient mode: "existing" or "new"
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");

  // Form state for new case - defaults match Oncology service
  const [formPatientId, setFormPatientId] = useState<number | "">("");
  const [formTitle, setFormTitle] = useState("LP");
  const [formService, setFormService] = useState("Oncology");
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
  const [formPmdService, setFormPmdService] = useState("Oncology");

  // New patient form fields
  const [newPatientMrn, setNewPatientMrn] = useState("");
  const [newPatientFirstName, setNewPatientFirstName] = useState("");
  const [newPatientLastName, setNewPatientLastName] = useState("");
  const [newPatientDob, setNewPatientDob] = useState("");
  const [newPatientGender, setNewPatientGender] = useState("");
  const [newPatientDisposition, setNewPatientDisposition] = useState("");

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

  const [viewType, setViewType] = useState<ViewType>("day");
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

  // Auto-open form if ?new=1 or ?edit=ID in URL
  useEffect(() => {
    const params = new URLSearchParams(searchString);

    if (params.get("new") === "1") {
      setEditingActivityId(null);
      setShowNewProcedure(true);
      navigate("/calendar", { replace: true });
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
      <div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 mb-px">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="bg-gray-100 text-center py-2 font-semibold text-gray-600 text-sm">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">{days}</div>
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
      <div className="grid grid-cols-7 gap-2">
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
    );
  };

  return (
    <SchedulerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Procedure & Admit Schedule</h1>
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
          <div className="flex items-center gap-2">
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
            >
              {multiSelectMode ? "Cancel Select" : "Select Multiple"}
            </Button>
            <Button onClick={() => setShowNewProcedure(true)} className="flex items-center gap-2">
              <Plus size={18} />
              New Activity
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
            <div className="border-l border-gray-300 mx-2"></div>
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

                <div className="grid grid-cols-2 gap-6">
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

        {/* New Procedure Modal */}
        {showNewProcedure && (
          <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-2 sm:p-4 py-8">
              <Card className="w-full max-w-3xl">
                <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingActivityId ? "Edit Activity" : "Schedule New Activity"}
                  </h2>
                  <button
                    onClick={() => { setShowNewProcedure(false); resetForm(); setEditingActivityId(null); }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X size={24} className="text-gray-500" />
                  </button>
                </div>

                <form onSubmit={async (e) => {
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

                  const activityData = {
                    patientId,
                    activityTypeId: formActivityTypeIds[0] || (activityTypes?.[0]?.id || 1),
                    title: procedureTitle,
                    startTime: startDateTime,
                    endTime: endDateTime,
                    service: formService as any,
                    caseType: formCaseType as any,
                    priority: formPriority as any,
                    roomId: formRoomId ? Number(formRoomId) : undefined,
                    sedationRequired: formSedationRequired ? 1 : 0,
                    sedationType: formSedationType as any,
                    sedationProvider: formSedationProvider as any,
                    sedationistId,
                    pmdId,
                    intervention: finalIntervention || undefined,
                    notes: formPmdService ? `Primary: ${formPmdService}${formNotes ? ` | ${formNotes}` : ""}` : formNotes || undefined,
                    description: formPmdService || undefined,
                    status: formStatus as any,
                  };

                  if (editingActivityId) {
                    updateActivity.mutate({ id: editingActivityId, ...activityData });
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
                        onChange={(e) => setFormPatientId(e.target.value ? Number(e.target.value) : "")}
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
                    </div>
                  )}

                  {/* New Patient Form */}
                  {patientMode === "new" && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
                      <h4 className="font-medium text-green-800">New Patient Information</h4>
                      <div className="grid grid-cols-3 gap-3">
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
                      <div className="grid grid-cols-3 gap-3">
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
                  <div className="grid grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-3 gap-4">
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

                                        // Auto-fill based on newly checked type
                                        if (e.target.checked) {
                                          const typeName = t.name;

                                          if (typeName === "LP") {
                                            setFormIntervention("Lumbar Puncture");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormPmdService("Oncology");
                                            setFormService("Oncology");
                                          } else if (typeName === "BMA" || typeName === "BMBx") {
                                            setFormIntervention(typeName === "BMA" ? "Bone Marrow Aspiration" : "Bone Marrow Biopsy");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormPmdService("Oncology");
                                            setFormService("Oncology");
                                          } else if (typeName === "IT Chemo") {
                                            setFormIntervention("Intrathecal Chemotherapy");
                                            setFormCaseType("Procedure");
                                            setFormSedationRequired(true);
                                            setFormPmdService("Oncology");
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
                  <div className="grid grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-3 gap-4">
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
                      <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-blue-200">
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
                      onClick={() => { setShowNewProcedure(false); resetForm(); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={createActivity.isPending}
                    >
                      {createActivity.isPending ? "Scheduling..." : "Schedule Activity"}
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
