import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, MapPin, Edit2, Trash2, Stethoscope, Droplet, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";

export default function Schedule() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: activities, isLoading } = trpc.activities.list.useQuery();
  const { data: patients } = trpc.patients.list.useQuery();
  const { data: activityTypes } = trpc.activities.getActivityTypes.useQuery();
  const { data: staff } = trpc.activities.getStaff.useQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPatient, setFilterPatient] = useState<string>("");
  const [filterSedation, setFilterSedation] = useState<string>("");

  // Modal states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);

  const deleteMutation = trpc.activities.delete.useMutation({
    onSuccess: () => {
      toast.success("Activity deleted successfully");
      utils.activities.list.invalidate();
      setDeleteDialogOpen(false);
      setDeletingActivityId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete activity");
    },
  });

  const updateStatusMutation = trpc.activities.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.activities.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const handleStatusChange = (activity: NonNullable<typeof activities>[number], newStatus: string) => {
    updateStatusMutation.mutate({
      id: activity.id,
      patientId: activity.patientId,
      activityTypeId: activity.activityTypeId,
      title: activity.title,
      startTime: new Date(activity.startTime),
      endTime: new Date(activity.endTime),
      status: newStatus as any,
    });
  };

  const exportToCSV = () => {
    if (!filteredActivities.length) {
      toast.error("No activities to export");
      return;
    }

    const headers = ["Title", "Patient", "MRN", "Status", "Start Time", "End Time", "Type", "Notes"];
    const rows = filteredActivities.map((a) => [
      a.title,
      getPatientName(a.patientId),
      getPatientMRN(a.patientId),
      a.status || "",
      new Date(a.startTime).toLocaleString(),
      new Date(a.endTime).toLocaleString(),
      getActivityTypeName(a.activityTypeId),
      a.notes || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `schedule_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Schedule exported to CSV");
  };

  const handleEdit = (activity: NonNullable<typeof activities>[number]) => {
    // Navigate to Calendar with activity ID for editing
    navigate(`/calendar?edit=${activity.id}`);
  };

  const handleDelete = (id: number) => {
    setDeletingActivityId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingActivityId) {
      deleteMutation.mutate({ id: deletingActivityId });
    }
  };

  const handleNewActivity = () => {
    navigate('/calendar?new=1');
  };

  const filteredActivities = activities?.filter((a) => {
    if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterPatient && a.patientId !== parseInt(filterPatient)) return false;
    if (filterSedation === "yes" && (!a.sedationType || a.sedationType === "None")) return false;
    if (filterSedation === "no" && a.sedationType && a.sedationType !== "None") return false;
    return true;
  }) || [];

  const getPatientName = (patientId: number) => {
    const patient = patients?.find((p) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Unknown Patient";
  };

  const getPatientMRN = (patientId: number) => {
    const patient = patients?.find((p) => p.id === patientId);
    return patient ? patient.mrn : "N/A";
  };

  const getPatientDOB = (patientId: number) => {
    const patient = patients?.find((p) => p.id === patientId);
    return patient && patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A";
  };

  const getActivityTypeName = (typeId: number) => {
    const type = activityTypes?.find((t) => t.id === typeId);
    return type?.name || "Unknown Type";
  };

  const getStaffName = (staffId: number | null | undefined) => {
    if (!staffId) return null;
    const staffMember = staff?.find((s) => s.id === staffId);
    return staffMember?.name || null;
  };

  const statusColors: Record<string, string> = {
    Requested: "bg-purple-100 text-purple-800",
    Scheduled: "bg-blue-100 text-blue-800",
    Confirmed: "bg-green-100 text-green-800",
    "In Progress": "bg-yellow-100 text-yellow-800",
    Completed: "bg-gray-100 text-gray-800",
    Cancelled: "bg-red-100 text-red-800",
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Schedule</h1>
            <p className="text-muted-foreground mt-1">Manage patient activities and appointments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} className="flex items-center gap-2">
              <Download size={18} />
              Export CSV
            </Button>
            <Button onClick={handleNewActivity} className="flex items-center gap-2">
              <Plus size={20} />
              New Activity
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Search</label>
              <Input
                placeholder="Search by title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2 py-2 border border-border rounded-md text-sm"
              >
                <option value="">All Statuses</option>
                <option value="Requested">Requested</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Patient</label>
              <select
                value={filterPatient}
                onChange={(e) => setFilterPatient(e.target.value)}
                className="w-full px-2 py-2 border border-border rounded-md text-sm"
              >
                <option value="">All Patients</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Sedation</label>
              <select
                value={filterSedation}
                onChange={(e) => setFilterSedation(e.target.value)}
                className="w-full px-2 py-2 border border-border rounded-md text-sm"
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Activities List */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => (
              <Card key={activity.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-foreground">{activity.title}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStatusColor(activity.status)} hover:opacity-80 transition-opacity`}>
                            {activity.status}
                            <ChevronDown size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {["Requested", "Scheduled", "Confirmed", "In Progress", "Completed", "Cancelled"].map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleStatusChange(activity, status)}
                              className={activity.status === status ? "bg-muted" : ""}
                            >
                              <span className={`w-2 h-2 rounded-full mr-2 ${statusColors[status]?.split(" ")[0] || "bg-gray-100"}`} />
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {activity.intervention && (
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-teal-100 text-teal-800">
                          {activity.intervention}
                        </span>
                      )}
                    </div>

                    {/* Patient Information */}
                    <div className="bg-muted/50 rounded p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Patient Name</p>
                          <p className="font-semibold text-foreground">{getPatientName(activity.patientId)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">MRN</p>
                          <p className="font-semibold text-foreground">{getPatientMRN(activity.patientId)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Date of Birth</p>
                          <p className="font-semibold text-foreground">{getPatientDOB(activity.patientId)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-accent" />
                        <div>
                          <p className="text-muted-foreground text-xs">Start Time</p>
                          <p className="font-semibold text-foreground">{new Date(activity.startTime).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-accent" />
                        <div>
                          <p className="text-muted-foreground text-xs">End Time</p>
                          <p className="font-semibold text-foreground">{new Date(activity.endTime).toLocaleString()}</p>
                        </div>
                      </div>
                      {activity.roomId && (
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-accent" />
                          <div>
                            <p className="text-muted-foreground text-xs">Location</p>
                            <p className="font-semibold text-foreground">Room {activity.roomId}</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Activity Type</p>
                        <p className="font-semibold text-foreground">{getActivityTypeName(activity.activityTypeId)}</p>
                      </div>
                    </div>

                    {/* Clinical Staff */}
                    {(getStaffName(activity.pmdId) || getStaffName(activity.sedationistId)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
                        {getStaffName(activity.pmdId) && (
                          <div className="flex items-center gap-2 bg-green-50 p-2 rounded">
                            <Stethoscope size={16} className="text-green-600" />
                            <div>
                              <p className="text-green-600 text-xs font-medium">PMD/Attending</p>
                              <p className="font-semibold text-green-900">{getStaffName(activity.pmdId)}</p>
                            </div>
                          </div>
                        )}
                        {getStaffName(activity.sedationistId) && (
                          <div className="flex items-center gap-2 bg-purple-50 p-2 rounded">
                            <Droplet size={16} className="text-purple-600" />
                            <div>
                              <p className="text-purple-600 text-xs font-medium">Sedation MD</p>
                              <p className="font-semibold text-purple-900">{getStaffName(activity.sedationistId)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {activity.notes && (
                      <p className="text-sm text-muted-foreground italic bg-muted/30 p-2 rounded">
                        <strong>Notes:</strong> {activity.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(activity)}
                      className="p-2 hover:bg-muted rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} className="text-accent" />
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="p-2 hover:bg-muted rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No activities match your filters</p>
            </Card>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Activity"
        description="Are you sure you want to delete this activity? This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </SchedulerLayout>
  );
}
