import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Clock, User, MapPin, Edit2, Trash2, Stethoscope, Droplet } from "lucide-react";
import { useLocation } from "wouter";

export default function Schedule() {
  const [, navigate] = useLocation();
  const { data: activities, isLoading } = trpc.activities.list.useQuery();
  const { data: patients } = trpc.patients.list.useQuery();
  const { data: activityTypes } = trpc.activities.getActivityTypes.useQuery();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPatient, setFilterPatient] = useState<string>("");
  const [filterActivityType, setFilterActivityType] = useState<string>("");
  const [filterPMD, setFilterPMD] = useState<string>("");
  const [filterSedationist, setFilterSedationist] = useState<string>("");

  const filteredActivities = activities?.filter((a) => {
    if (searchTerm && !a.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterPatient && a.patientId !== parseInt(filterPatient)) return false;
    if (filterActivityType && a.activityTypeId !== parseInt(filterActivityType)) return false;
    if (filterPMD && a.pmdId?.toString() !== filterPMD) return false;
    if (filterSedationist && a.sedationistId?.toString() !== filterSedationist) return false;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Schedule</h1>
            <p className="text-muted-foreground mt-1">Manage patient activities and appointments</p>
          </div>
          <Button onClick={() => navigate("/calendar?new=1")} className="flex items-center gap-2">
            <Plus size={20} />
            Schedule New Activity
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Search size={20} className="text-accent" />
            <h3 className="font-semibold text-foreground">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Search</label>
              <Input
                placeholder="Search..."
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
                className="w-full px-2 py-1 border border-border rounded-md text-sm"
              >
                <option value="">All</option>
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
                className="w-full px-2 py-1 border border-border rounded-md text-sm"
              >
                <option value="">All</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Activity Type</label>
              <select
                value={filterActivityType}
                onChange={(e) => setFilterActivityType(e.target.value)}
                className="w-full px-2 py-1 border border-border rounded-md text-sm"
              >
                <option value="">All</option>
                {activityTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">PMD ID</label>
              <Input
                placeholder="PMD ID"
                value={filterPMD}
                onChange={(e) => setFilterPMD(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Sedationist ID</label>
              <Input
                placeholder="Sedationist ID"
                value={filterSedationist}
                onChange={(e) => setFilterSedationist(e.target.value)}
                className="text-sm"
              />
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
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
                      {activity.pmdId && (
                        <div className="flex items-center gap-2 bg-blue-50 p-2 rounded">
                          <Stethoscope size={16} className="text-blue-600" />
                          <div>
                            <p className="text-blue-600 text-xs font-medium">PMD</p>
                            <p className="font-semibold text-blue-900">Staff ID: {activity.pmdId}</p>
                          </div>
                        </div>
                      )}
                      {activity.sedationistId && (
                        <div className="flex items-center gap-2 bg-purple-50 p-2 rounded">
                          <Droplet size={16} className="text-purple-600" />
                          <div>
                            <p className="text-purple-600 text-xs font-medium">Sedationist</p>
                            <p className="font-semibold text-purple-900">Staff ID: {activity.sedationistId}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {activity.notes && (
                      <p className="text-sm text-muted-foreground italic bg-muted/30 p-2 rounded">
                        <strong>Notes:</strong> {activity.notes}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    <button className="p-2 hover:bg-muted rounded transition-colors" title="Edit">
                      <Edit2 size={16} className="text-accent" />
                    </button>
                    <button className="p-2 hover:bg-muted rounded transition-colors" title="Delete">
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
    </SchedulerLayout>
  );
}
