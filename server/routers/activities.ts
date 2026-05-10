import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getActivities, getActivityById, createActivity, updateActivity, deleteActivity, getActivitiesByPatient, getActivityTypes, getRooms, getStaffWithSpecializations, createStaffMember } from "../db";
import { createAuditLog } from "../db";

const activitySchema = z.object({
  patientId: z.number(),
  activityTypeId: z.number(),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullish(),
  startTime: z.date(),
  endTime: z.date(),
  roomId: z.number().nullish(),
  assignedStaffIds: z.string().nullish(),
  pmdId: z.number().nullish(),
  sedationistId: z.number().nullish(),
  intervention: z.string().nullish(),
  // New fields for procedure/admit scheduling
  service: z.enum([
    "GI", "Pulmonary", "Cardiology", "Radiology", "Neurology",
    "Orthopedics", "General Surgery", "Vascular", "Urology",
    "ENT", "Oncology", "Pain Management", "Other"
  ]).nullish(),
  caseType: z.enum(["Procedure", "Direct Admit", "Consultation", "Follow-up"]).nullish(),
  priority: z.enum(["Planned", "Routine", "Urgent", "Emergent", "Add-On"]).nullish(),
  sedationRequired: z.number().nullish(),
  sedationType: z.enum(["None", "Conscious Sedation", "Moderate Sedation", "MAC", "General Anesthesia"]).nullish(),
  sedationProvider: z.enum(["None", "Intensivist", "Anesthesia", "Proceduralist"]).nullish(),
  preOpComplete: z.number().nullish(),
  consentSigned: z.number().nullish(),
  npoStatus: z.string().nullish(),
  status: z.enum(["Pending", "Requested", "Scheduled", "Confirmed", "In Progress", "Completed", "Cancelled"]).nullish(),
  notes: z.string().nullish(),
  isRecurring: z.number().nullish(),
  recurringPattern: z.string().nullish(),
  recurringEndDate: z.date().nullish(),
  createdBy: z.number().nullish(),
  createdByName: z.string().nullish(),
  updatedBy: z.number().nullish(),
  updatedByName: z.string().nullish(),
});

// Conflict detection helper
async function checkConflicts(
  patientId: number,
  startTime: Date,
  endTime: Date,
  roomId?: number,
  staffIds?: string,
  excludeActivityId?: number
) {
  const allActivities = await getActivities();
  const conflicts = [];

  for (const activity of allActivities) {
    if (excludeActivityId && activity.id === excludeActivityId) continue;
    if (activity.status === "Cancelled") continue;

    const actStart = new Date(activity.startTime);
    const actEnd = new Date(activity.endTime);

    // Check patient conflict
    if (activity.patientId === patientId) {
      if (startTime < actEnd && endTime > actStart) {
        conflicts.push({
          type: "patient",
          message: `Patient already has activity "${activity.title}" during this time`,
          conflictingActivityId: activity.id,
        });
      }
    }

    // Check room conflict
    if (roomId && activity.roomId === roomId) {
      if (startTime < actEnd && endTime > actStart) {
        conflicts.push({
          type: "room",
          message: `Room is already booked for activity "${activity.title}" during this time`,
          conflictingActivityId: activity.id,
        });
      }
    }

    // Check staff conflict
    if (staffIds && activity.assignedStaffIds) {
      const newStaffArray = JSON.parse(staffIds);
      const existingStaffArray = JSON.parse(activity.assignedStaffIds);
      const hasConflict = newStaffArray.some((id: number) => existingStaffArray.includes(id));

      if (hasConflict && startTime < actEnd && endTime > actStart) {
        conflicts.push({
          type: "staff",
          message: `A staff member is already assigned to activity "${activity.title}" during this time`,
          conflictingActivityId: activity.id,
        });
      }
    }
  }

  return conflicts;
}

export const activitiesRouter = router({
  list: protectedProcedure.query(async () => {
    return getActivities();
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getActivityById(input.id);
  }),

  getByPatient: protectedProcedure.input(z.object({ patientId: z.number() })).query(async ({ input }) => {
    return getActivitiesByPatient(input.patientId);
  }),

  checkConflicts: protectedProcedure
    .input(
      z.object({
        patientId: z.number(),
        startTime: z.date(),
        endTime: z.date(),
        roomId: z.number().nullish(),
        staffIds: z.string().nullish(),
        excludeActivityId: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      return checkConflicts(input.patientId, input.startTime, input.endTime, input.roomId, input.staffIds, input.excludeActivityId);
    }),

  create: protectedProcedure
    .input(activitySchema)
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to create activities (admin or staff)
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can create activities");
      }

      // Validate times
      if (input.startTime >= input.endTime) {
        throw new Error("End time must be after start time");
      }

      // Check for conflicts
      const conflicts = await checkConflicts(input.patientId, input.startTime, input.endTime, input.roomId, input.assignedStaffIds);
      if (conflicts.length > 0) {
        throw new Error(`Scheduling conflict detected: ${conflicts.map((c) => c.message).join(", ")}`);
      }

      // Clean up null/undefined values for optional fields
      const activityData = {
        ...input,
        roomId: input.roomId || null,
        pmdId: input.pmdId || null,
        sedationistId: input.sedationistId || null,
        intervention: input.intervention || null,
        description: input.description || null,
        notes: input.notes || null,
        assignedStaffIds: input.assignedStaffIds || null,
        npoStatus: input.npoStatus || null,
        recurringPattern: input.recurringPattern || null,
        recurringEndDate: input.recurringEndDate || null,
        createdBy: ctx.user.id,
        updatedBy: ctx.user.id,
      };

      try {
        await createActivity(activityData);
      } catch (error: any) {
        console.error("=== ACTIVITY CREATE ERROR ===");
        console.error("Error:", error.message || error);
        console.error("Code:", error.code);
        console.error("Detail:", error.detail);

        // Extract useful error info
        let errorMsg = "Failed to create activity";
        if (error.code === '23503') {
          errorMsg = "Foreign key error - patient or activity type doesn't exist";
        } else if (error.code === '23505') {
          errorMsg = "Duplicate entry - activity already exists";
        } else if (error.code === '22P02') {
          errorMsg = "Invalid data format";
        } else if (error.detail) {
          errorMsg = error.detail;
        } else if (error.message) {
          // Try to extract just the error part, not the full query
          const match = error.message.match(/error: (.+)/i);
          errorMsg = match ? match[1] : error.message.substring(0, 200);
        }

        throw new Error(errorMsg);
      }

      // Log the action (we'll log with a placeholder ID since insertId isn't directly available)
      try {
        await createAuditLog({
          action: "CREATE",
          entityType: "Activity",
          entityId: 0, // Will be updated by database
          userId: ctx.user.id,
          newValues: JSON.stringify(input),
          createdAt: new Date(),
        });
      } catch (auditError) {
        console.error("Failed to create audit log:", auditError);
        // Don't fail the whole operation for audit log failure
      }

      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), ...activitySchema.shape }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to update activities (admin or staff)
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can update activities");
      }

      const { id, ...updateData } = input;
      const activity = await getActivityById(id);
      if (!activity) {
        throw new Error("Activity not found");
      }

      // Validate times
      if (updateData.startTime && updateData.endTime && updateData.startTime >= updateData.endTime) {
        throw new Error("End time must be after start time");
      }

      // Check for conflicts (excluding current activity)
      const conflicts = await checkConflicts(
        updateData.patientId || activity.patientId,
        updateData.startTime || activity.startTime,
        updateData.endTime || activity.endTime,
        updateData.roomId || (activity.roomId ?? undefined),
        updateData.assignedStaffIds || (activity.assignedStaffIds ?? undefined),
        id
      );

      if (conflicts.length > 0) {
        throw new Error(`Scheduling conflict detected: ${conflicts.map((c) => c.message).join(", ")}`);
      }

      await updateActivity(id, { ...updateData, updatedBy: ctx.user.id });

      // Log the action
      await createAuditLog({
        action: "UPDATE",
        entityType: "Activity",
        entityId: id,
        userId: ctx.user.id,
        previousValues: JSON.stringify(activity),
        newValues: JSON.stringify(updateData),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can delete activities");
      }

      const activity = await getActivityById(input.id);
      if (!activity) {
        throw new Error("Activity not found");
      }

      await deleteActivity(input.id);

      await createAuditLog({
        action: "DELETE",
        entityType: "Activity",
        entityId: input.id,
        userId: ctx.user.id,
        previousValues: JSON.stringify(activity),
        createdAt: new Date(),
      });

      return { success: true };
    }),

  getActivityTypes: protectedProcedure.query(async () => {
    return getActivityTypes();
  }),

  getRooms: protectedProcedure.query(async () => {
    return getRooms();
  }),

  getStaff: protectedProcedure.query(async () => {
    return getStaffWithSpecializations();
  }),

  createStaff: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      specialization: z.enum(["PMD", "Sedationist", "Nurse", "Technician", "Anesthesiologist", "Other", "Oncology", "Peds-Surgery", "Intensivist"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can create staff members");
      }
      const result = await createStaffMember(input.name, input.specialization);
      return { success: true, id: result.insertId };
    }),
});
