import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Edit2, Eye, Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import PatientModal from "@/components/PatientModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";

export default function Patients() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { data: patients, isLoading } = trpc.patients.list.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<typeof patients extends (infer T)[] | undefined ? T | null : null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPatientId, setDeletingPatientId] = useState<number | null>(null);

  const deleteMutation = trpc.patients.delete.useMutation({
    onSuccess: () => {
      toast.success("Patient deleted successfully");
      utils.patients.list.invalidate();
      setDeleteDialogOpen(false);
      setDeletingPatientId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete patient");
    },
  });

  const handleEdit = (patient: NonNullable<typeof patients>[number]) => {
    setEditingPatient(patient);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeletingPatientId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingPatientId) {
      deleteMutation.mutate({ id: deletingPatientId });
    }
  };

  const handleNewPatient = () => {
    setEditingPatient(null);
    setIsModalOpen(true);
  };

  const filteredPatients = patients?.filter(
    (p) =>
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Patients</h1>
            <p className="text-muted-foreground mt-1">View patient records</p>
          </div>
          <Button onClick={handleNewPatient} className="flex items-center gap-2">
            <Plus size={18} />
            Add Patient
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by name or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSearchTerm("")}>
            <p className="text-2xl font-bold text-blue-600">{patients?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Total Patients</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {patients?.filter(p => p.admissionStatus === "Inpatient").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Inpatient</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {patients?.filter(p => p.admissionStatus === "Direct Admit").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Direct Admit</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {patients?.filter(p => p.admissionStatus === "Subacute Facility").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Subacute</p>
          </Card>
        </div>

        {/* Patients Table */}
        <Card className="p-6 overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : filteredPatients.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">MRN</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Date of Birth</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Disposition</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 text-foreground font-mono text-sm font-bold">{patient.mrn}</td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {patient.lastName}, {patient.firstName}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-3 px-4">
                      {patient.admissionStatus ? (
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          patient.admissionStatus === "Inpatient" ? "bg-blue-100 text-blue-800" :
                          patient.admissionStatus === "Direct Admit" ? "bg-purple-100 text-purple-800" :
                          "bg-orange-100 text-orange-800"
                        }`}>
                          {patient.admissionStatus}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        patient.status === "Active" ? "bg-green-100 text-green-800" :
                        patient.status === "Discharged" ? "bg-gray-100 text-gray-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/timeline?patientId=${patient.id}`)}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title="View Timeline"
                        >
                          <Eye size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(patient)}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(patient.id)}
                          className="p-2 hover:bg-muted rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No patients found</p>
              <p className="text-sm text-muted-foreground">
                Add a new patient to get started
              </p>
              <Button onClick={handleNewPatient} className="mt-4">
                <Plus size={18} className="mr-2" />
                Add Patient
              </Button>
            </div>
          )}
        </Card>
      </div>

      <PatientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        patient={editingPatient}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Delete Patient"
        description="Are you sure you want to delete this patient? This will also affect related activities. This action cannot be undone."
        isLoading={deleteMutation.isPending}
      />
    </SchedulerLayout>
  );
}
