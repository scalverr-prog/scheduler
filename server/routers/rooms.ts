import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getRooms, createRoom, updateRoom, deleteRoom } from "../db";
import { createAuditLog } from "../db";

const roomSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["OR", "Procedure Room", "Imaging", "Consultation", "Ward", "ICU", "Other"]),
  capacity: z.number().min(1).optional(),
  isActive: z.number().optional(),
});

export const roomsRouter = router({
  list: protectedProcedure.query(async () => {
    return getRooms();
  }),

  create: protectedProcedure
    .input(roomSchema)
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can create rooms");
      }

      const result = await createRoom(input);

      await createAuditLog({
        action: "CREATE",
        entityType: "Room",
        entityId: result.insertId || 0,
        userId: ctx.user.id,
        newValues: JSON.stringify(input),
        createdAt: new Date(),
      });

      return { success: true, id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), ...roomSchema.shape }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can update rooms");
      }

      const { id, ...updateData } = input;
      await updateRoom(id, updateData);

      await createAuditLog({
        action: "UPDATE",
        entityType: "Room",
        entityId: id,
        userId: ctx.user.id,
        newValues: JSON.stringify(updateData),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: Only admin can delete rooms");
      }

      await deleteRoom(input.id);

      await createAuditLog({
        action: "DELETE",
        entityType: "Room",
        entityId: input.id,
        userId: ctx.user.id,
        createdAt: new Date(),
      });

      return { success: true };
    }),
});
