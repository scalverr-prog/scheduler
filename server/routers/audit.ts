import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAuditLogs } from "../db";

export const auditRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        entityType: z.enum(["Activity", "Patient", "Room", "User"]).optional(),
        action: z.enum(["CREATE", "UPDATE", "DELETE", "CANCEL", "CONFIRM"]).optional(),
        userId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admin can view audit logs
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized: Only admins can view audit logs");
      }

      let logs = await getAuditLogs();

      // Apply filters
      if (input.entityType) {
        logs = logs.filter((log) => log.entityType === input.entityType);
      }

      if (input.action) {
        logs = logs.filter((log) => log.action === input.action);
      }

      if (input.userId) {
        logs = logs.filter((log) => log.userId === input.userId);
      }

      if (input.startDate) {
        logs = logs.filter((log) => new Date(log.createdAt) >= input.startDate!);
      }

      if (input.endDate) {
        logs = logs.filter((log) => new Date(log.createdAt) <= input.endDate!);
      }

      // Sort by most recent first
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return logs;
    }),
});
