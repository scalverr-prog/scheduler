import { useEffect, useState } from "react";
import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Clock, Calendar, Users, CheckCircle, AlertCircle, Activity, FileEdit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";

type FilterType = "today" | "week" | "inProgress" | "requested" | "confirmed" | null;

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>(null);
  const { user } = useAuth();
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();
  const { data: activities, isLoading: activitiesLoading, error: activitiesError } = trpc.activities.list.useQuery();
  const { data: staff } = trpc.activities.getStaff.useQuery();
  const { data: rooms } = trpc.activities.getRooms.useQuery();

  // Debug logging
  useEffect(() => {
    console.log("=== DASHBOARD DEBUG ===");
    console.log("Activities loading:", activitiesLoading);
    console.log("Activities error:", activitiesError);
    console.log("Activities count:", activities?.length);
    if (activities && activities.length > 0) {
      console.log("First activity:", activities[0]);
    }
  }, [activities, activitiesLoading, activitiesError]);

  // Count my cases (where I'm the PMD or sedationist)
  const myCases = activities?.filter(a => a.pmdId === user?.id || a.sedationistId === user?.id) || [];

  const now = new Date();
  const today = now.toDateString();

  // Calculate statistics
  const totalPatients = patients?.length || 0;
  const todayActivities = activities?.filter((a) => {
    const actDate = new Date(a.startTime).toDateString();
    return actDate === today;
  }) || [];

  const upcomingToday = todayActivities
    .filter((a) => new Date(a.startTime) > now && a.status !== "Completed" && a.status !== "Cancelled")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const inProgressActivities = activities?.filter((a) => a.status === "In Progress") || [];
  const pendingActivities = activities?.filter((a) => a.status === "Requested").length || 0;
  const confirmedActivities = activities?.filter((a) => a.status === "Confirmed").length || 0;

  // Weekly stats
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const thisWeekActivitiesList = activities?.filter((a) => new Date(a.startTime) >= weekStart) || [];
  const thisWeekActivities = thisWeekActivitiesList.length;

  // Requested and confirmed lists
  const requestedActivitiesList = activities?.filter((a) => a.status === "Requested") || [];
  const confirmedActivitiesList = activities?.filter((a) => a.status === "Confirmed") || [];

  // Get filtered activities based on selected filter
  const getFilteredActivities = () => {
    switch (selectedFilter) {
      case "today": return todayActivities;
      case "week": return thisWeekActivitiesList;
      case "inProgress": return inProgressActivities;
      case "requested": return requestedActivitiesList;
      case "confirmed": return confirmedActivitiesList;
      default: return [];
    }
  };

  const getFilterLabel = () => {
    switch (selectedFilter) {
      case "today": return "Today's Activities";
      case "week": return "This Week's Activities";
      case "inProgress": return "In Progress";
      case "requested": return "Requested";
      case "confirmed": return "Confirmed";
      default: return "";
    }
  };

  const filteredActivities = getFilteredActivities();

  const getPatientName = (patientId: number) => {
    const patient = patients?.find((p) => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : "Unknown";
  };

  const getRoomName = (roomId: number | null) => {
    if (!roomId) return null;
    const room = rooms?.find((r) => r.id === roomId);
    return room ? room.name : null;
  };

  const getStaffName = (staffId: number | null | undefined) => {
    if (!staffId) return null;
    const staffMember = staff?.find((s) => s.id === staffId);
    return staffMember?.name || null;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Check for pending draft forms
  const getDraftSummaries = () => {
    try {
      const saved = localStorage.getItem("encounterFormDrafts");
      if (!saved) return [];
      const drafts = JSON.parse(saved);
      return drafts.map((draft: any, index: number) => {
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

  const pendingDrafts = getDraftSummaries();

  const StatCard = ({ title, value, icon: Icon, color, bgColor, onClick, selected }: { title: string; value: number | string; icon: any; color: string; bgColor: string; onClick?: () => void; selected?: boolean }) => (
    <Card
      className={`p-4 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all' : ''} ${selected ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={color} size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
      </div>
    </Card>
  );

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header with Date */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Card
              className="px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => navigate('/staff')}
            >
              <Users size={18} className="text-blue-500" />
              <span className="font-medium">{staff?.length || 0} Staff</span>
            </Card>
            <Card
              className="px-4 py-2 flex items-center gap-2 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => navigate('/rooms')}
            >
              <Activity size={18} className="text-green-500" />
              <span className="font-medium">{rooms?.length || 0} Rooms</span>
            </Card>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {patientsLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <StatCard title="Total Patients" value={totalPatients} icon={Users} color="text-blue-600" bgColor="bg-blue-100" onClick={() => navigate('/patients')} />
              <StatCard title="Today" value={todayActivities.length} icon={Calendar} color="text-green-600" bgColor="bg-green-100" selected={selectedFilter === "today"} onClick={() => setSelectedFilter(selectedFilter === "today" ? null : "today")} />
              <StatCard title="This Week" value={thisWeekActivities} icon={Clock} color="text-purple-600" bgColor="bg-purple-100" selected={selectedFilter === "week"} onClick={() => setSelectedFilter(selectedFilter === "week" ? null : "week")} />
              <StatCard title="In Progress" value={inProgressActivities.length} icon={Activity} color="text-orange-600" bgColor="bg-orange-100" selected={selectedFilter === "inProgress"} onClick={() => setSelectedFilter(selectedFilter === "inProgress" ? null : "inProgress")} />
              <StatCard title="Requested" value={pendingActivities} icon={AlertCircle} color="text-yellow-600" bgColor="bg-yellow-100" selected={selectedFilter === "requested"} onClick={() => setSelectedFilter(selectedFilter === "requested" ? null : "requested")} />
              <StatCard title="Confirmed" value={confirmedActivities} icon={CheckCircle} color="text-teal-600" bgColor="bg-teal-100" selected={selectedFilter === "confirmed"} onClick={() => setSelectedFilter(selectedFilter === "confirmed" ? null : "confirmed")} />
            </>
          )}
        </div>

        {/* Filtered Activities Panel */}
        {selectedFilter && filteredActivities.length > 0 && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                📋 {getFilterLabel()} ({filteredActivities.length})
              </h3>
              <button
                onClick={() => setSelectedFilter(null)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <X size={14} /> Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => navigate(`/calendar?edit=${activity.id}`)}
                  className="flex items-center gap-3 p-2 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-all"
                >
                  <div className="text-sm font-bold text-blue-600 w-16">{formatTime(activity.startTime)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{activity.title}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {getPatientName(activity.patientId)}
                      {getRoomName(activity.roomId) && <span className="ml-1 text-blue-500">• {getRoomName(activity.roomId)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                    activity.status === "Confirmed" ? "bg-green-100 text-green-700" :
                    activity.status === "In Progress" ? "bg-orange-100 text-orange-700" :
                    activity.status === "Completed" ? "bg-gray-100 text-gray-600" :
                    activity.status === "Requested" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {selectedFilter && filteredActivities.length === 0 && (
          <Card className="p-4 bg-gray-50 border-gray-200 text-center">
            <p className="text-gray-500">No {getFilterLabel().toLowerCase()} found</p>
            <button
              onClick={() => setSelectedFilter(null)}
              className="text-xs text-blue-600 hover:text-blue-800 mt-2"
            >
              Close
            </button>
          </Card>
        )}

        {/* Pending Draft Forms Alert */}
        {pendingDrafts.length > 0 && (
          <Card className="p-4 border-orange-300 bg-orange-50">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100">
                  <FileEdit className="text-orange-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800">
                    {pendingDrafts.length} Pending Encounter{pendingDrafts.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-orange-600">
                    {pendingDrafts.map(d => `${d.patientName} - ${d.title}`).join(' | ')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate('/calendar?showDrafts=true')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Resume
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Agenda */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Today's Agenda
              </h2>
              <span className="text-sm text-muted-foreground">{upcomingToday.length} upcoming</span>
            </div>
            {activitiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : upcomingToday.length > 0 ? (
              <div className="space-y-3">
                {upcomingToday.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => navigate(`/calendar?edit=${activity.id}`)}
                    className="flex items-center gap-4 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-all"
                  >
                    <div className="text-center min-w-[60px]">
                      <p className="text-lg font-bold text-primary">{formatTime(activity.startTime)}</p>
                    </div>
                    <div className="flex-1 border-l-2 border-primary pl-4">
                      <p className="font-semibold text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {getPatientName(activity.patientId)}
                        {getRoomName(activity.roomId) && (
                          <span className="ml-2 text-blue-600">• {getRoomName(activity.roomId)}</span>
                        )}
                      </p>
                      {(getStaffName(activity.pmdId) || getStaffName(activity.sedationistId)) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getStaffName(activity.pmdId) && (
                            <span className="text-green-600">PMD: {getStaffName(activity.pmdId)}</span>
                          )}
                          {getStaffName(activity.pmdId) && getStaffName(activity.sedationistId) && " • "}
                          {getStaffName(activity.sedationistId) && (
                            <span className="text-purple-600">Sed: {getStaffName(activity.sedationistId)}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.status === "Confirmed" ? "bg-green-100 text-green-800" :
                      activity.status === "Scheduled" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar size={48} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No more activities today</p>
              </div>
            )}
          </Card>

          {/* In Progress */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity size={20} className="text-orange-500" />
                In Progress
              </h2>
              <span className="text-sm text-muted-foreground">{inProgressActivities.length} active</span>
            </div>
            {activitiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : inProgressActivities.length > 0 ? (
              <div className="space-y-3">
                {inProgressActivities.slice(0, 4).map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => navigate(`/calendar?edit=${activity.id}`)}
                    className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-all"
                  >
                    <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {getPatientName(activity.patientId)} • Started {formatTime(activity.startTime)}
                        {getRoomName(activity.roomId) && (
                          <span className="ml-1 text-blue-600">• {getRoomName(activity.roomId)}</span>
                        )}
                      </p>
                      {(getStaffName(activity.pmdId) || getStaffName(activity.sedationistId)) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getStaffName(activity.pmdId) && (
                            <span className="text-green-600">PMD: {getStaffName(activity.pmdId)}</span>
                          )}
                          {getStaffName(activity.pmdId) && getStaffName(activity.sedationistId) && " • "}
                          {getStaffName(activity.sedationistId) && (
                            <span className="text-purple-600">Sed: {getStaffName(activity.sedationistId)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity size={48} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No activities in progress</p>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate(`/calendar?doctor=${user?.id}`)}
              className="p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted hover:border-blue-400 transition-all text-center relative"
            >
              <p className="text-2xl mb-2">📋</p>
              <p className="font-semibold text-foreground text-sm">My Cases</p>
              {myCases.length > 0 && (
                <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {myCases.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/calendar?new=1')}
              className="p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted hover:border-green-400 transition-all text-center"
            >
              <p className="text-2xl mb-2">➕</p>
              <p className="font-semibold text-foreground text-sm">New Encounter</p>
            </button>
          </div>
        </Card>
      </div>
    </SchedulerLayout>
  );
}
