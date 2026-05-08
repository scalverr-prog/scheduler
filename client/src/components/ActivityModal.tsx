import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Activity = {
  id: number;
  patientId: number;
  activityTypeId: number;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  roomId?: number | null;
  status?: string | null;
  notes?: string | null;
  service?: string | null;
  priority?: string | null;
  sedationType?: string | null;
  sedationProvider?: string | null;
};

type ActivityModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity | null;
  onSuccess?: () => void;
};

export default function ActivityModal({ open, onOpenChange, activity, onSuccess }: ActivityModalProps) {
  const utils = trpc.useUtils();
  const { data: patients } = trpc.patients.list.useQuery();
  const { data: activityTypes } = trpc.activities.getActivityTypes.useQuery();
  const { data: rooms } = trpc.activities.getRooms.useQuery();

  const createMutation = trpc.activities.create.useMutation({
    onSuccess: () => {
      toast.success("Activity created successfully");
      utils.activities.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create activity");
    },
  });

  const updateMutation = trpc.activities.update.useMutation({
    onSuccess: () => {
      toast.success("Activity updated successfully");
      utils.activities.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update activity");
    },
  });

  const [formData, setFormData] = useState({
    title: "",
    patientId: "",
    activityTypeId: "",
    startTime: "",
    endTime: "",
    roomId: "",
    status: "Scheduled",
    notes: "",
    service: "",
    priority: "Routine",
    sedationType: "Conscious Sedation",
    sedationProvider: "Intensivist",
  });

  useEffect(() => {
    if (activity) {
      setFormData({
        title: activity.title,
        patientId: activity.patientId.toString(),
        activityTypeId: activity.activityTypeId.toString(),
        startTime: new Date(activity.startTime).toISOString().slice(0, 16),
        endTime: new Date(activity.endTime).toISOString().slice(0, 16),
        roomId: activity.roomId?.toString() || "",
        status: activity.status || "Scheduled",
        notes: activity.notes || "",
        service: activity.service || "",
        priority: activity.priority || "Routine",
        sedationType: activity.sedationType || "Conscious Sedation",
        sedationProvider: activity.sedationProvider || "Intensivist",
      });
    } else {
      setFormData({
        title: "",
        patientId: "",
        activityTypeId: "",
        startTime: "",
        endTime: "",
        roomId: "",
        status: "Scheduled",
        notes: "",
        service: "",
        priority: "Routine",
        sedationType: "Conscious Sedation",
        sedationProvider: "Intensivist",
      });
    }
  }, [activity, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.patientId || !formData.activityTypeId || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      title: formData.title,
      patientId: parseInt(formData.patientId),
      activityTypeId: parseInt(formData.activityTypeId),
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      roomId: formData.roomId ? parseInt(formData.roomId) : undefined,
      status: formData.status as any,
      notes: formData.notes || undefined,
      service: formData.service as any || undefined,
      priority: formData.priority as any || undefined,
      sedationType: formData.sedationType as any || undefined,
      sedationProvider: formData.sedationProvider as any || undefined,
    };

    if (activity) {
      updateMutation.mutate({ id: activity.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit Activity" : "New Activity"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Activity title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Patient *</label>
              <select
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
                required
              >
                <option value="">Select Patient</option>
                {patients?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} (MRN: {p.mrn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Activity Type *</label>
              <select
                value={formData.activityTypeId}
                onChange={(e) => setFormData({ ...formData, activityTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
                required
              >
                <option value="">Select Type</option>
                {activityTypes?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Time *</label>
              <Input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time *</label>
              <Input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Room</label>
              <select
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="">Select Room</option>
                {rooms?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="Requested">Requested</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Service</label>
              <select
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="">Select Service</option>
                <option value="GI">GI</option>
                <option value="Pulmonary">Pulmonary</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Radiology">Radiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="General Surgery">General Surgery</option>
                <option value="Vascular">Vascular</option>
                <option value="Urology">Urology</option>
                <option value="ENT">ENT</option>
                <option value="Oncology">Oncology</option>
                <option value="Pain Management">Pain Management</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="Planned">Planned</option>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergent">Emergent</option>
                <option value="Add-On">Add-On</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Requires Sedation</label>
              <select
                value={formData.sedationType === "Conscious Sedation" ? "yes" : "no"}
                onChange={(e) => setFormData({ ...formData, sedationType: e.target.value === "yes" ? "Conscious Sedation" : "None" })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="yes">Yes (Conscious Sedation)</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sedation Provider</label>
              <select
                value={formData.sedationProvider}
                onChange={(e) => setFormData({ ...formData, sedationProvider: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="None">None</option>
                <option value="Intensivist">Intensivist</option>
                <option value="Anesthesia">Anesthesia</option>
                <option value="Proceduralist">Proceduralist</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : activity ? "Update Activity" : "Create Activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
