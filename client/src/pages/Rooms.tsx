import SchedulerLayout from "@/components/SchedulerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MapPin, Building, Users, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Rooms() {
  const utils = trpc.useUtils();
  const { data: rooms, isLoading } = trpc.activities.getRooms.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    type: "Procedure Room",
    capacity: "1",
  });

  const createMutation = trpc.rooms.create.useMutation({
    onSuccess: () => {
      toast.success("Room added successfully");
      utils.activities.getRooms.invalidate();
      setIsModalOpen(false);
      setNewRoom({ name: "", type: "Procedure Room", capacity: "1" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add room");
    },
  });

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    createMutation.mutate({
      name: newRoom.name,
      type: newRoom.type as any,
      capacity: parseInt(newRoom.capacity) || 1,
    });
  };

  const filteredRooms = rooms?.filter(
    (r) => r.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeRooms = rooms?.filter(r => r.isActive === 1).length || 0;
  const totalCapacity = rooms?.reduce((acc, r) => acc + (r.capacity || 0), 0) || 0;

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case "OR": return "🏥";
      case "Procedure Room": return "🩺";
      case "Imaging": return "📷";
      case "Interventional Radiology": return "🎯";
      case "ICU": return "🚨";
      case "Ward": return "🛏️";
      default: return "🏢";
    }
  };

  const getRoomTypeColor = (type: string) => {
    switch (type) {
      case "OR": return "bg-red-100 text-red-800";
      case "Procedure Room": return "bg-blue-100 text-blue-800";
      case "Imaging": return "bg-purple-100 text-purple-800";
      case "Interventional Radiology": return "bg-indigo-100 text-indigo-800";
      case "ICU": return "bg-orange-100 text-orange-800";
      case "Ward": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <SchedulerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rooms & Locations</h1>
            <p className="text-muted-foreground mt-1">Manage procedure rooms and facilities</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Add Room
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Building className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rooms?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total Rooms</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeRooms}</p>
              <p className="text-sm text-muted-foreground">Active Rooms</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCapacity}</p>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
          <Input
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </>
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((room) => (
              <Card key={room.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getRoomTypeIcon(room.type)}</span>
                    <div>
                      <h3 className="font-semibold text-foreground">{room.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${getRoomTypeColor(room.type)}`}>
                        {room.type}
                      </span>
                    </div>
                  </div>
                  {room.isActive === 1 ? (
                    <CheckCircle className="text-green-500" size={20} />
                  ) : (
                    <XCircle className="text-red-500" size={20} />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>Capacity: {room.capacity || 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span>ID: {room.id}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-full p-8 text-center">
              <p className="text-muted-foreground mb-4">No rooms found</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus size={18} className="mr-2" />
                Add First Room
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Room</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room Name *</label>
              <Input
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                placeholder="e.g., Procedure Room 1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Type</label>
              <select
                value={newRoom.type}
                onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="OR">Operating Room (OR)</option>
                <option value="Procedure Room">Procedure Room</option>
                <option value="Imaging">Imaging</option>
                <option value="Interventional Radiology">Interventional Radiology (IR)</option>
                <option value="Consultation">Consultation</option>
                <option value="Ward">Ward</option>
                <option value="ICU">ICU</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <Input
                type="number"
                min="1"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                placeholder="1"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SchedulerLayout>
  );
}
