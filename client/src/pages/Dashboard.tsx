import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Clock, Calendar, Users, CheckCircle, AlertCircle, Activity } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.activities.list.useQuery();
  const { data: staff } = trpc.activities.getStaff.useQuery();
  const { data: rooms } = trpc.activities.getRooms.useQuery();

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
  const thisWeekActivities = activities?.filter((a) => new Date(a.startTime) >= weekStart).length || 0;

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

  const StatCard = ({ title, value, icon: Icon, color, bgColor, onClick }: { title: string; value: number | string; icon: any; color: string; bgColor: string; onClick?: () => void }) => (
    <Card
      className={`p-4 ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all' : ''}`}
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
              <StatCard title="Today" value={todayActivities.length} icon={Calendar} color="text-green-600" bgColor="bg-green-100" onClick={() => navigate('/schedule')} />
              <StatCard title="This Week" value={thisWeekActivities} icon={Clock} color="text-purple-600" bgColor="bg-purple-100" onClick={() => navigate('/schedule')} />
              <StatCard title="In Progress" value={inProgressActivities.length} icon={Activity} color="text-orange-600" bgColor="bg-orange-100" onClick={() => navigate('/schedule')} />
              <StatCard title="Pending" value={pendingActivities} icon={AlertCircle} color="text-yellow-600" bgColor="bg-yellow-100" onClick={() => navigate('/schedule')} />
              <StatCard title="Confirmed" value={confirmedActivities} icon={CheckCircle} color="text-teal-600" bgColor="bg-teal-100" onClick={() => navigate('/schedule')} />
            </>
          )}
        </div>

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
              <p className="font-semibold text-foreground text-sm">New Activity</p>
            </button>
          </div>
        </Card>
      </div>
    </SchedulerLayout>
  );
}
