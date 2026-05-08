import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, UserPlus, Stethoscope, Droplet, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Staff() {
  const utils = trpc.useUtils();
  const { data: staff, isLoading } = trpc.activities.getStaff.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffSpecialization, setNewStaffSpecialization] = useState<string>("PMD");

  const createMutation = trpc.activities.createStaff.useMutation({
    onSuccess: () => {
      toast.success("Staff member added successfully");
      utils.activities.getStaff.invalidate();
      setIsModalOpen(false);
      setNewStaffName("");
      setNewStaffSpecialization("PMD");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add staff member");
    },
  });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      toast.error("Please enter a name");
      return;
    }
    createMutation.mutate({
      name: newStaffName,
      specialization: newStaffSpecialization as any,
    });
  };

  const filteredStaff = staff?.filter(
    (s) => s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => (a.name || "").localeCompare(b.name || "")) || [];

  const pmdCount = staff?.filter(s =>
    s.specializations?.includes("PMD") ||
    s.specializations?.includes("Oncology") ||
    s.specializations?.includes("Peds-Surgery")
  ).length || 0;
  const sedationistCount = staff?.filter(s =>
    s.specializations?.includes("Sedationist") ||
    s.specializations?.includes("Anesthesiologist") ||
    s.specializations?.includes("Intensivist")
  ).length || 0;

  const getSpecializationBadge = (specializations: string[] | undefined) => {
    if (!specializations || specializations.length === 0) {
      return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">General</span>;
    }
    return specializations.map((spec, i) => (
      <span
        key={i}
        className={`px-2 py-1 rounded text-xs mr-1 ${
          spec === "PMD" ? "bg-blue-100 text-blue-800" :
          spec === "Sedationist" || spec === "Anesthesiologist" ? "bg-purple-100 text-purple-800" :
          spec === "Nurse" ? "bg-green-100 text-green-800" :
          "bg-gray-100 text-gray-600"
        }`}
      >
        {spec}
      </span>
    ));
  };

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Directory</h1>
            <p className="text-muted-foreground mt-1">Manage medical staff and providers</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <UserPlus size={18} />
            Add Staff
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{staff?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Stethoscope className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pmdCount}</p>
              <p className="text-sm text-muted-foreground">Primary Providers</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Droplet className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{sedationistCount}</p>
              <p className="text-sm text-muted-foreground">Sedation Providers</p>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input
            placeholder="Search staff by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : filteredStaff.length > 0 ? (
            filteredStaff.map((member) => (
              <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {member.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{member.name || "Unknown"}</h3>
                    <p className="text-sm text-muted-foreground mb-2">ID: {member.id}</p>
                    <div className="flex flex-wrap gap-1">
                      {getSpecializationBadge(member.specializations)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full p-8 text-center">
              <p className="text-muted-foreground mb-4">No staff members found</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <UserPlus size={18} className="mr-2" />
                Add First Staff Member
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <Input
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                placeholder="Dr. John Smith"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Specialization</label>
              <select
                value={newStaffSpecialization}
                onChange={(e) => setNewStaffSpecialization(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <optgroup label="Procedure Providers">
                  <option value="PMD">Primary (PMD)</option>
                  <option value="Oncology">Oncology</option>
                  <option value="Peds-Surgery">Peds-Surgery</option>
                </optgroup>
                <optgroup label="Sedation Providers">
                  <option value="Sedationist">Sedationist</option>
                  <option value="Anesthesiologist">Anesthesiologist</option>
                  <option value="Intensivist">Intensivist</option>
                </optgroup>
                <optgroup label="Support Staff">
                  <option value="Nurse">Nurse</option>
                  <option value="Technician">Technician</option>
                  <option value="Other">Other</option>
                </optgroup>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SchedulerLayout>
  );
}
