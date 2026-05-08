import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Patient = {
  id: number;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  gender?: string | null;
  admissionStatus?: string | null;
  medicalNotes?: string | null;
  allergies?: string | null;
  status?: string | null;
};

type PatientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSuccess?: () => void;
};

export default function PatientModal({ open, onOpenChange, patient, onSuccess }: PatientModalProps) {
  const utils = trpc.useUtils();

  const createMutation = trpc.patients.create.useMutation({
    onSuccess: () => {
      toast.success("Patient created successfully");
      utils.patients.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create patient");
    },
  });

  const updateMutation = trpc.patients.update.useMutation({
    onSuccess: () => {
      toast.success("Patient updated successfully");
      utils.patients.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update patient");
    },
  });

  const [formData, setFormData] = useState({
    mrn: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    admissionStatus: "",
    medicalNotes: "",
    allergies: "",
    status: "Active",
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        mrn: patient.mrn,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split("T")[0] : "",
        gender: patient.gender || "",
        admissionStatus: patient.admissionStatus || "",
        medicalNotes: patient.medicalNotes || "",
        allergies: patient.allergies || "",
        status: patient.status || "Active",
      });
    } else {
      setFormData({
        mrn: "",
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        admissionStatus: "",
        medicalNotes: "",
        allergies: "",
        status: "Active",
      });
    }
  }, [patient, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.mrn || !formData.firstName || !formData.lastName) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      mrn: formData.mrn,
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
      gender: formData.gender as any || undefined,
      admissionStatus: formData.admissionStatus as any || undefined,
      medicalNotes: formData.medicalNotes || undefined,
      allergies: formData.allergies || undefined,
      status: formData.status as any || undefined,
    };

    if (patient) {
      updateMutation.mutate({ id: patient.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient ? "Edit Patient" : "New Patient"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">MRN *</label>
              <Input
                value={formData.mrn}
                onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                placeholder="Medical Record Number"
                required
                disabled={!!patient}
              />
              {patient && <p className="text-xs text-muted-foreground mt-1">MRN cannot be changed</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Discharged">Discharged</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Admission Status</label>
              <select
                value={formData.admissionStatus}
                onChange={(e) => setFormData({ ...formData, admissionStatus: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="">Select Status</option>
                <option value="Inpatient">Inpatient</option>
                <option value="Direct Admit">Direct Admit</option>
                <option value="Subacute Facility">Subacute Facility</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Allergies</label>
              <Input
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder="List known allergies..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Medical Notes</label>
              <Textarea
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                placeholder="Additional medical notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : patient ? "Update Patient" : "Create Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
