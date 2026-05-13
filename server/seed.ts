import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { patients, activities, rooms, activityTypes, users, staffSpecializations } from "../drizzle/schema";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log("[Seed] No DATABASE_URL found, skipping seed");
    return;
  }

  console.log("[Seed] Connecting to database...");
  const db = drizzle(connectionString);

  try {
    // Create test staff/users
    console.log("[Seed] Creating staff members...");
    const staffData = [
      { openId: "staff-chen", name: "Chen, Lisa, MD", role: "staff" as const },
      { openId: "staff-jones", name: "Jones, Michael, MD", role: "staff" as const },
      { openId: "staff-patel", name: "Patel, Raj, MD", role: "staff" as const },
      { openId: "staff-smith", name: "Smith, Sarah, MD", role: "staff" as const },
      { openId: "staff-williams", name: "Williams, Amy, RN", role: "staff" as const },
    ];

    for (const staff of staffData) {
      await db.insert(users).values(staff).onConflictDoUpdate({
        target: users.openId,
        set: { name: staff.name },
      });
    }

    // Get inserted staff IDs
    const insertedStaff = await db.select().from(users);
    const smith = insertedStaff.find(s => s.openId === "staff-smith");
    const jones = insertedStaff.find(s => s.openId === "staff-jones");
    const chen = insertedStaff.find(s => s.openId === "staff-chen");
    const patel = insertedStaff.find(s => s.openId === "staff-patel");
    const williams = insertedStaff.find(s => s.openId === "staff-williams");

    // Add specializations (one per staff member)
    if (smith) {
      await db.insert(staffSpecializations).values({ userId: smith.id, specialization: "PMD", isActive: 1 }).onConflictDoNothing();
    }
    if (jones) {
      await db.insert(staffSpecializations).values({ userId: jones.id, specialization: "Oncology", isActive: 1 }).onConflictDoNothing();
    }
    if (chen) {
      await db.insert(staffSpecializations).values({ userId: chen.id, specialization: "Sedationist", isActive: 1 }).onConflictDoNothing();
    }
    if (patel) {
      await db.insert(staffSpecializations).values({ userId: patel.id, specialization: "Intensivist", isActive: 1 }).onConflictDoNothing();
    }
    if (williams) {
      await db.insert(staffSpecializations).values({ userId: williams.id, specialization: "Nurse", isActive: 1 }).onConflictDoNothing();
    }

    // Create rooms
    console.log("[Seed] Creating rooms...");
    const roomsData = [
      { name: "Peds Procedure Room", type: "Procedure Room" as const, capacity: 2, isActive: 1 },
      { name: "PICU", type: "ICU" as const, capacity: 4, isActive: 1 },
      { name: "IR", type: "Imaging" as const, capacity: 2, isActive: 1 },
      { name: "MRI", type: "Imaging" as const, capacity: 2, isActive: 1 },
    ];

    for (const room of roomsData) {
      await db.insert(rooms).values(room).onConflictDoNothing();
    }

    // Create activity types - grouped by disease/specialty
    console.log("[Seed] Creating activity types...");
    const typesData = [
      // Oncology
      { name: "LP", colorCode: "#DC2626", description: "Lumbar Puncture" },
      { name: "BMA", colorCode: "#DC2626", description: "Bone Marrow Aspiration" },
      { name: "BMBx", colorCode: "#DC2626", description: "Bone Marrow Biopsy" },
      { name: "IT Chemo", colorCode: "#DC2626", description: "Intrathecal Chemotherapy" },
      // Vascular Access
      { name: "PICC", colorCode: "#7C3AED", description: "PICC Line Placement" },
      { name: "Central Line", colorCode: "#7C3AED", description: "Central Line Placement" },
      { name: "Port Access", colorCode: "#7C3AED", description: "Port Access" },
      { name: "Port Placement", colorCode: "#7C3AED", description: "Port Placement" },
      // Imaging/Sedation
      { name: "Sedated MRI", colorCode: "#2563EB", description: "MRI with sedation" },
      { name: "Sedated CT", colorCode: "#2563EB", description: "CT with sedation" },
      { name: "Sedated Echo", colorCode: "#2563EB", description: "Echo with sedation" },
      { name: "Sedated Procedure", colorCode: "#2563EB", description: "General sedated procedure" },
      // GI/Pulmonary
      { name: "EGD", colorCode: "#059669", description: "Esophagogastroduodenoscopy" },
      { name: "Colonoscopy", colorCode: "#059669", description: "Colonoscopy" },
      { name: "Clean Out", colorCode: "#059669", description: "Bowel Clean Out / Prep" },
      { name: "Bronchoscopy", colorCode: "#059669", description: "Bronchoscopy" },
      { name: "Paracentesis", colorCode: "#059669", description: "Paracentesis" },
      { name: "Thoracentesis", colorCode: "#059669", description: "Thoracentesis" },
      // Interventional
      { name: "IR Procedure", colorCode: "#D97706", description: "Interventional Radiology" },
      { name: "Biopsy", colorCode: "#D97706", description: "Tissue Biopsy" },
      { name: "Drain Placement", colorCode: "#D97706", description: "Drain Placement" },
      { name: "Drain Removal", colorCode: "#D97706", description: "Drain Removal" },
      { name: "Chest Tube Placement", colorCode: "#D97706", description: "Chest Tube Placement" },
      // General
      { name: "Bedside Procedure", colorCode: "#6B7280", description: "Bedside procedure" },
      { name: "Wound Care", colorCode: "#6B7280", description: "Wound Care" },
      { name: "Dressing Change", colorCode: "#6B7280", description: "Dressing Change" },
      { name: "Scheduled Activity", colorCode: "#6B7280", description: "Scheduled Activity" },
      // Administrative
      { name: "Direct Admit", colorCode: "#EF4444", description: "Direct admission" },
      { name: "Consultation", colorCode: "#10B981", description: "Patient consultation" },
      { name: "Follow-up", colorCode: "#06B6D4", description: "Follow-up visit" },
      { name: "Other", colorCode: "#9CA3AF", description: "Other activity" },
    ];

    for (const type of typesData) {
      await db.insert(activityTypes).values(type).onConflictDoNothing();
    }

    // Create test patients
    console.log("[Seed] Creating patients...");
    const patientsData = [
      { mrn: "MRN001", firstName: "John", lastName: "Doe", dateOfBirth: new Date("1985-03-15"), gender: "M" as const, admissionStatus: "Inpatient" as const, status: "Active" as const, allergies: "Penicillin" },
      { mrn: "MRN002", firstName: "Jane", lastName: "Smith", dateOfBirth: new Date("1990-07-22"), gender: "F" as const, admissionStatus: "Inpatient" as const, status: "Active" as const },
      { mrn: "MRN003", firstName: "Robert", lastName: "Johnson", dateOfBirth: new Date("1978-11-08"), gender: "M" as const, admissionStatus: "Direct Admit" as const, status: "Active" as const, allergies: "Sulfa, Latex" },
      { mrn: "MRN004", firstName: "Emily", lastName: "Davis", dateOfBirth: new Date("2015-04-30"), gender: "F" as const, admissionStatus: "Inpatient" as const, status: "Active" as const },
      { mrn: "MRN005", firstName: "Michael", lastName: "Brown", dateOfBirth: new Date("1965-09-12"), gender: "M" as const, admissionStatus: "Subacute Facility" as const, status: "Active" as const },
      { mrn: "MRN006", firstName: "Sarah", lastName: "Wilson", dateOfBirth: new Date("2008-01-25"), gender: "F" as const, admissionStatus: "Inpatient" as const, status: "Active" as const },
      { mrn: "MRN007", firstName: "David", lastName: "Taylor", dateOfBirth: new Date("1972-06-18"), gender: "M" as const, admissionStatus: "Direct Admit" as const, status: "Active" as const, allergies: "Morphine" },
      { mrn: "MRN008", firstName: "Lisa", lastName: "Anderson", dateOfBirth: new Date("1995-12-03"), gender: "F" as const, admissionStatus: "Inpatient" as const, status: "Active" as const },
    ];

    for (const patient of patientsData) {
      await db.insert(patients).values(patient).onConflictDoNothing();
    }

    // Get inserted data for activities
    const insertedPatients = await db.select().from(patients);
    const insertedRooms = await db.select().from(rooms);
    const insertedTypes = await db.select().from(activityTypes);

    // Create test activities
    console.log("[Seed] Creating activities...");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activitiesData = [
      {
        patientId: insertedPatients[0]?.id || 1,
        activityTypeId: insertedTypes.find(t => t.name === "Procedure")?.id || 1,
        title: "Lumbar Puncture",
        startTime: new Date(today.setHours(9, 0, 0, 0)),
        endTime: new Date(today.setHours(10, 0, 0, 0)),
        roomId: insertedRooms[0]?.id,
        status: "Confirmed" as const,
        service: "Oncology" as const,
        priority: "Routine" as const,
        sedationType: "Conscious Sedation" as const,
        sedationProvider: "Intensivist" as const,
        pmdId: smith?.id,
        sedationistId: chen?.id,
        createdBy: 1,
      },
      {
        patientId: insertedPatients[1]?.id || 2,
        activityTypeId: insertedTypes.find(t => t.name === "Imaging")?.id || 3,
        title: "Sedated MRI",
        startTime: new Date(today.setHours(11, 0, 0, 0)),
        endTime: new Date(today.setHours(12, 30, 0, 0)),
        roomId: insertedRooms.find(r => r.name === "Imaging Room")?.id,
        status: "Scheduled" as const,
        service: "Radiology" as const,
        priority: "Routine" as const,
        sedationType: "Moderate Sedation" as const,
        sedationProvider: "Anesthesia" as const,
        pmdId: jones?.id,
        sedationistId: patel?.id,
        createdBy: 1,
      },
      {
        patientId: insertedPatients[2]?.id || 3,
        activityTypeId: insertedTypes.find(t => t.name === "Procedure")?.id || 1,
        title: "PICC Line Placement",
        startTime: new Date(today.setHours(14, 0, 0, 0)),
        endTime: new Date(today.setHours(15, 0, 0, 0)),
        roomId: insertedRooms[1]?.id,
        status: "In Progress" as const,
        service: "Vascular" as const,
        priority: "Urgent" as const,
        sedationType: "Conscious Sedation" as const,
        sedationProvider: "Intensivist" as const,
        pmdId: smith?.id,
        createdBy: 1,
      },
      {
        patientId: insertedPatients[3]?.id || 4,
        activityTypeId: insertedTypes.find(t => t.name === "Consultation")?.id || 2,
        title: "Pre-op Consultation",
        startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(10, 30, 0, 0)),
        roomId: insertedRooms.find(r => r.name === "Consultation Room")?.id,
        status: "Scheduled" as const,
        service: "General Surgery" as const,
        priority: "Planned" as const,
        pmdId: jones?.id,
        createdBy: 1,
      },
      {
        patientId: insertedPatients[4]?.id || 5,
        activityTypeId: insertedTypes.find(t => t.name === "Procedure")?.id || 1,
        title: "Bone Marrow Aspiration",
        startTime: new Date(tomorrow.setHours(13, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
        roomId: insertedRooms[0]?.id,
        status: "Requested" as const,
        service: "Oncology" as const,
        priority: "Routine" as const,
        sedationType: "Conscious Sedation" as const,
        sedationProvider: "Intensivist" as const,
        createdBy: 1,
      },
    ];

    for (const activity of activitiesData) {
      await db.insert(activities).values(activity).onConflictDoNothing();
    }

    console.log("[Seed] Test data created successfully!");
    console.log(`  - ${staffData.length} staff members`);
    console.log(`  - ${roomsData.length} rooms`);
    console.log(`  - ${typesData.length} activity types`);
    console.log(`  - ${patientsData.length} patients`);
    console.log(`  - ${activitiesData.length} activities`);

  } catch (error) {
    console.error("[Seed] Error:", error);
    throw error;
  }
}

seed().then(() => {
  console.log("[Seed] Done!");
  process.exit(0);
}).catch((error) => {
  console.error("[Seed] Failed:", error);
  process.exit(1);
});
