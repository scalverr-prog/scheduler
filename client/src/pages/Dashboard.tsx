import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();
  const { data: activities, isLoading: activitiesLoading } = trpc.activities.list.useQuery();

  // Calculate statistics
  const totalPatients = patients?.length || 0;
  const todayActivities = activities?.filter((a) => {
    const actDate = new Date(a.startTime).toDateString();
    return actDate === new Date().toDateString();
  }).length || 0;

  const pendingActivities = activities?.filter((a) => a.status === "Requested").length || 0;
  const confirmedActivities = activities?.filter((a) => a.status === "Confirmed").length || 0;

  const StatCard = ({ title, value, icon, color, onClick }: { title: string; value: number | string; icon: string; color: string; onClick?: () => void }) => (
    <Card
      className={`p-6 border-l-4 ${color} ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </Card>
  );

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to the Patient Activity Scheduler</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {patientsLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatCard title="Total Patients" value={totalPatients} icon="👥" color="border-blue-500" onClick={() => navigate('/patients')} />
              <StatCard title="Today's Activities" value={todayActivities} icon="📅" color="border-green-500" onClick={() => navigate('/calendar')} />
              <StatCard title="Pending Tasks" value={pendingActivities} icon="⏳" color="border-yellow-500" onClick={() => navigate('/calendar')} />
              <StatCard title="Confirmed" value={confirmedActivities} icon="✓" color="border-teal-500" onClick={() => navigate('/calendar')} />
            </>
          )}
        </div>

        {/* Recent Activities */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Recent Activities</h2>
          {activitiesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => navigate('/calendar')}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 hover:shadow transition-all"
                >
                  <div>
                    <p className="font-semibold text-foreground">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.startTime).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    activity.status === "Confirmed" ? "bg-green-100 text-green-800" :
                    activity.status === "Scheduled" ? "bg-blue-100 text-blue-800" :
                    activity.status === "In Progress" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No activities scheduled</p>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/patients')}
              className="p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted hover:border-blue-400 transition-all text-center"
            >
              <p className="text-2xl mb-2">➕</p>
              <p className="font-semibold text-foreground">Add Patient</p>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted hover:border-green-400 transition-all text-center"
            >
              <p className="text-2xl mb-2">📅</p>
              <p className="font-semibold text-foreground">Schedule Activity</p>
            </button>
            <button
              onClick={() => navigate('/calendar')}
              className="p-4 border-2 border-dashed border-border rounded-lg hover:bg-muted hover:border-teal-400 transition-all text-center"
            >
              <p className="text-2xl mb-2">👁️</p>
              <p className="font-semibold text-foreground">View Schedule</p>
            </button>
          </div>
        </Card>
      </div>
    </SchedulerLayout>
  );
}
