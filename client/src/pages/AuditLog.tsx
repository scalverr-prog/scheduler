import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter } from "lucide-react";

export default function AuditLog() {
  const { data: logs, isLoading } = trpc.audit.list.useQuery({});
  const [filterAction, setFilterAction] = useState<string>("");
  const [filterEntity, setFilterEntity] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredLogs = logs?.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterEntity && log.entityType !== filterEntity) return false;
    if (searchTerm && !log.entityId.toString().includes(searchTerm) && !log.userId.toString().includes(searchTerm)) return false;
    return true;
  }) || [];

  const actionColors: Record<string, string> = {
    CREATE: "bg-green-100 text-green-800",
    UPDATE: "bg-blue-100 text-blue-800",
    DELETE: "bg-red-100 text-red-800",
    CANCEL: "bg-yellow-100 text-yellow-800",
    CONFIRM: "bg-teal-100 text-teal-800",
  };

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Track all scheduling changes and system activities</p>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Action</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="CANCEL">Cancel</option>
                <option value="CONFIRM">Confirm</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Entity Type</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="">All Entities</option>
                <option value="Activity">Activity</option>
                <option value="Patient">Patient</option>
                <option value="Room">Room</option>
                <option value="User">User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search</label>
              <Input
                placeholder="Search entity or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterAction("");
                  setFilterEntity("");
                  setSearchTerm("");
                }}
                className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors text-foreground"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="p-6 overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : filteredLogs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Entity</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Entity ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">User ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground">{log.entityType}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-sm">{log.entityId}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-sm">{log.userId}</td>
                    <td className="py-3 px-4 text-muted-foreground text-sm">{log.reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          )}
        </Card>

        {/* Summary Stats */}
        {logs && logs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{logs.length}</div>
              <div className="text-sm text-muted-foreground">Total Entries</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{logs.filter((l) => l.action === "CREATE").length}</div>
              <div className="text-sm text-muted-foreground">Creates</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{logs.filter((l) => l.action === "UPDATE").length}</div>
              <div className="text-sm text-muted-foreground">Updates</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{logs.filter((l) => l.action === "DELETE").length}</div>
              <div className="text-sm text-muted-foreground">Deletes</div>
            </Card>
          </div>
        )}
      </div>
    </SchedulerLayout>
  );
}
