import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getPatients, getPatientById, createPatient, updatePatient, deletePatient, getPatientByMRN } from "../db";
import { createAuditLog } from "../db";

const patientSchema = z.object({
  mrn: z.string().min(1, "MRN is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.date().optional(),
  gender: z.enum(["M", "F", "Other", "Prefer not to say"]).optional(),
  admissionStatus: z.enum(["Inpatient", "Direct Admit", "Subacute Facility"]).optional(),
  medicalNotes: z.string().optional(),
  allergies: z.string().optional(),
  status: z.enum(["Active", "Inactive", "Discharged", "Transferred"]).optional(),
});

export const patientsRouter = router({
  list: protectedProcedure.query(async () => {
    return getPatients();
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getPatientById(input.id);
  }),

  getByMRN: protectedProcedure.input(z.object({ mrn: z.string() })).query(async ({ input }) => {
    return getPatientByMRN(input.mrn);
  }),

  create: protectedProcedure
    .input(patientSchema)
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to create patients (admin or staff)
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can create patients");
      }

      // Check if MRN already exists
      const existing = await getPatientByMRN(input.mrn);
      if (existing) {
        throw new Error("Patient with this MRN already exists");
      }

      const result = await createPatient(input);
      const patientId = result.insertId;

      // Log the action
      await createAuditLog({
        action: "CREATE",
        entityType: "Patient",
        entityId: patientId || 0,
        userId: ctx.user.id,
        newValues: JSON.stringify(input),
        createdAt: new Date(),
      });

      return { success: true, id: patientId };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), ...patientSchema.shape }))
    .mutation(async ({ input, ctx }) => {
      // Check if user has permission to update patients (admin or staff)
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can update patients");
      }

      const { id, ...updateData } = input;
      const patient = await getPatientById(id);
      if (!patient) {
        throw new Error("Patient not found");
      }

      const result = await updatePatient(id, updateData);

      // Log the action
      await createAuditLog({
        action: "UPDATE",
        entityType: "Patient",
        entityId: id,
        userId: ctx.user.id,
        previousValues: JSON.stringify(patient),
        newValues: JSON.stringify(updateData),
        createdAt: new Date(),
      });

      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "staff") {
        throw new Error("Unauthorized: Only admin or staff can delete patients");
      }

      const patient = await getPatientById(input.id);
      if (!patient) {
        throw new Error("Patient not found");
      }

      await deletePatient(input.id);

      await createAuditLog({
        action: "DELETE",
        entityType: "Patient",
        entityId: input.id,
        userId: ctx.user.id,
        previousValues: JSON.stringify(patient),
        createdAt: new Date(),
      });

      return { success: true };
    }),
});
