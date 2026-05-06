import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle, AlertCircle, XCircle, CircleDashed } from "lucide-react";

export default function PatientTimeline() {
  const { data: patients } = trpc.patients.list.useQuery();
  const { data: activities } = trpc.activities.list.useQuery();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const selectedPatient = patients?.find((p) => p.id === selectedPatientId);
  const patientActivities = selectedPatient
    ? activities
        ?.filter((a) => a.patientId === selectedPatientId)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    : [];

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="text-green-600" size={20} />;
      case "Cancelled":
        return <XCircle className="text-red-600" size={20} />;
      case "In Progress":
        return <Clock className="text-yellow-600" size={20} />;
      case "Pending":
        return <CircleDashed className="text-orange-600" size={20} />;
      default:
        return <AlertCircle className="text-blue-600" size={20} />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Confirmed":
        return "bg-teal-100 text-teal-800";
      case "Scheduled":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isUpcoming = (date: Date) => date > new Date();
  const isPast = (date: Date) => date < new Date();

  const upcomingActivities = patientActivities?.filter((a) => isUpcoming(new Date(a.startTime))) || [];
  const pastActivities = patientActivities?.filter((a) => isPast(new Date(a.endTime))) || [];

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Patient Timeline</h1>
          <p className="text-muted-foreground mt-1">View chronological activities for a patient</p>
        </div>

        {/* Patient Selection */}
        <Card className="p-6">
          <label className="block text-sm font-medium text-foreground mb-3">Select Patient</label>
          <select
            value={selectedPatientId || ""}
            onChange={(e) => setSelectedPatientId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-2 border border-border rounded-md"
          >
            <option value="">-- Choose a patient --</option>
            {patients?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.mrn})
              </option>
            ))}
          </select>
        </Card>

        {selectedPatient && (
          <>
            {/* Patient Info */}
            <Card className="p-6 bg-accent/5 border-l-4 border-accent">
              <h2 className="text-xl font-bold text-foreground mb-3">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">MRN</p>
                  <p className="font-semibold text-foreground">{selectedPatient.mrn}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Disposition</p>
                  <p className="font-semibold text-foreground">{selectedPatient.admissionStatus || "N/A"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className={`font-semibold px-3 py-1 rounded-full text-sm w-fit ${
                    selectedPatient.status === "Active" ? "bg-green-100 text-green-800" :
                    selectedPatient.status === "Discharged" ? "bg-gray-100 text-gray-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {selectedPatient.status}
                  </p>
                </div>
              </div>
            </Card>

            {/* Upcoming Activities */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">Upcoming Activities ({upcomingActivities.length})</h3>
              {upcomingActivities.length > 0 ? (
                <div className="space-y-3">
                  {upcomingActivities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                          {getStatusIcon(activity.status)}
                        </div>
                        {index < upcomingActivities.length - 1 && (
                          <div className="w-1 h-16 bg-border mt-2"></div>
                        )}
                      </div>
                      <Card className="flex-1 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-foreground">{activity.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activity.status)}`}>
                            {activity.status}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <strong>Start:</strong> {new Date(activity.startTime).toLocaleString()}
                          </p>
                          <p>
                            <strong>End:</strong> {new Date(activity.endTime).toLocaleString()}
                          </p>
                          {activity.notes && (
                            <p>
                              <strong>Notes:</strong> {activity.notes}
                            </p>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No upcoming activities</p>
                </Card>
              )}
            </div>

            {/* Past Activities */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">Past Activities ({pastActivities.length})</h3>
              {pastActivities.length > 0 ? (
                <div className="space-y-3">
                  {pastActivities.map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center opacity-60">
                          {getStatusIcon(activity.status)}
                        </div>
                        {index < pastActivities.length - 1 && (
                          <div className="w-1 h-16 bg-border mt-2 opacity-30"></div>
                        )}
                      </div>
                      <Card className="flex-1 p-4 opacity-75">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-foreground">{activity.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activity.status)}`}>
                            {activity.status}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>
                            <strong>Start:</strong> {new Date(activity.startTime).toLocaleString()}
                          </p>
                          <p>
                            <strong>End:</strong> {new Date(activity.endTime).toLocaleString()}
                          </p>
                          {activity.notes && (
                            <p>
                              <strong>Notes:</strong> {activity.notes}
                            </p>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No past activities</p>
                </Card>
              )}
            </div>
          </>
        )}

        {!selectedPatient && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground text-lg">Select a patient to view their activity timeline</p>
          </Card>
        )}
      </div>
    </SchedulerLayout>
  );
}
