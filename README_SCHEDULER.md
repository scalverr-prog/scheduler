# Patient Activity Scheduler

A comprehensive, production-ready web platform for multi-user centralized patient activity scheduling in hospital and medical center settings.

## Overview

The Patient Activity Scheduler is a clinical-grade application designed to streamline the management of patient activities, appointments, and schedules across healthcare facilities. It provides role-based access control, real-time conflict prevention, comprehensive audit logging, and an intuitive interface for clinical staff.

## Key Features

### 1. Role-Based Access Control

The application supports three user roles with distinct permissions:

- **Admin**: Full access to all features, including audit logs, settings, and user management
- **Staff/Scheduler**: Can create and manage patient schedules, view activities, and manage patient records
- **Viewer**: Read-only access to schedules and patient information

### 2. Patient Management

- Add, edit, and view patient profiles with comprehensive medical information
- Track patient demographics (name, date of birth, gender, ward/room assignment)
- Maintain medical notes and allergy information
- Monitor patient status (Active, Inactive, Discharged, Transferred)
- Search and filter patients by name or Medical Record Number (MRN)

### 3. Activity & Appointment Management

- Create, edit, and delete scheduled activities (therapy, medication, consultation, procedure, etc.)
- Link activities to patients, staff members, and physical resources (rooms, equipment)
- Support multiple activity types with color-coded display
- Track activity status (Requested, Scheduled, Confirmed, In Progress, Completed, Cancelled)
- Add detailed notes and special instructions for each activity

### 4. Conflict Detection Engine

The application automatically prevents scheduling conflicts by detecting:

- **Patient conflicts**: Prevents double-booking of the same patient at overlapping times
- **Staff conflicts**: Ensures staff members are not assigned to multiple activities simultaneously
- **Room conflicts**: Prevents room/resource double-booking
- **Real-time warnings**: Visual alerts when conflicts are detected
- **Smart suggestions**: Recommends alternative time slots when conflicts occur

### 5. Interactive Calendar Views

- **Daily view**: Detailed hourly breakdown of all scheduled activities
- **Weekly view**: Overview of activities across a 7-day period
- **Monthly view**: High-level calendar with activity density indicators
- **Resource timeline view**: View activities by room or staff member
- **Patient timeline view**: Chronological list of all activities for a specific patient
- **Color-coded display**: Activities color-coded by type and status for quick visual identification

### 6. Dashboard Overview

The main dashboard provides at-a-glance statistics:

- Total number of active patients
- Today's scheduled activities count
- Pending tasks requiring attention
- Confirmed activities
- Recent activity feed with status indicators
- Quick action buttons for common tasks

### 7. Search & Filter

Comprehensive search and filtering capabilities:

- Filter by date range (start and end dates)
- Filter by patient name or MRN
- Filter by staff member
- Filter by activity type
- Filter by activity status
- Multi-criteria filtering for advanced searches
- Real-time search results

### 8. Audit Log & Compliance

Complete audit trail for all schedule modifications:

- Track all create, update, and delete actions
- Record user attribution with timestamps
- Store previous and new values for all changes
- Filter audit logs by action type, entity type, user, or date range
- Export audit logs for compliance reporting
- HIPAA-compliant access logging

### 9. Responsive Design

- Clean, clinical light theme using navy, teal, and white color palette
- Responsive sidebar dashboard layout
- Mobile-friendly interface for on-call staff
- Accessible design following WCAG 2.1 AA standards
- Clear typography and visual hierarchy

## Technology Stack

- **Frontend**: React 19 with TypeScript, Tailwind CSS 4, shadcn/ui components
- **Backend**: Express.js with tRPC for type-safe API calls
- **Database**: MySQL with Drizzle ORM for schema management
- **Authentication**: Manus OAuth with role-based access control
- **Real-time**: WebSocket support for live updates (future enhancement)

## Database Schema

### Core Tables

#### Users
- Extends the built-in user table with role support (admin, staff, user)
- Tracks user information and authentication details

#### Patients
- Medical Record Number (MRN) - unique identifier
- Personal information (name, date of birth, gender)
- Ward/room assignment
- Medical notes and allergies
- Patient status tracking

#### Activities
- Links patients, staff, and resources
- Tracks activity type, start/end times, and status
- Supports recurring activities
- Records creation and modification history

#### Activity Types
- Defines available activity categories
- Color-coded for visual identification
- Customizable descriptions

#### Rooms
- Physical spaces and equipment available for scheduling
- Room type classification (OR, Procedure Room, Imaging, etc.)
- Capacity tracking
- Active/inactive status

#### Audit Logs
- Complete record of all system changes
- Tracks action type, entity type, and user attribution
- Stores previous and new values for modifications
- Includes timestamp and optional reason

## Getting Started

### Prerequisites

- Node.js 22.13.0 or higher
- pnpm package manager
- MySQL database

### Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up database**:
   ```bash
   pnpm db:push
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

4. **Access the application**:
   - Open your browser and navigate to `http://localhost:3000`
   - Log in with your Manus OAuth credentials

## API Documentation

### Patient Procedures

- `trpc.patients.list` - Get all patients
- `trpc.patients.getById` - Get patient by ID
- `trpc.patients.getByMRN` - Get patient by Medical Record Number
- `trpc.patients.create` - Create new patient (Admin/Staff only)
- `trpc.patients.update` - Update patient information (Admin/Staff only)

### Activity Procedures

- `trpc.activities.list` - Get all activities
- `trpc.activities.getById` - Get activity by ID
- `trpc.activities.getByPatient` - Get all activities for a patient
- `trpc.activities.checkConflicts` - Check for scheduling conflicts
- `trpc.activities.create` - Create new activity (Admin/Staff only)
- `trpc.activities.update` - Update activity (Admin/Staff only)
- `trpc.activities.getActivityTypes` - Get available activity types
- `trpc.activities.getRooms` - Get available rooms/resources

### Audit Procedures

- `trpc.audit.list` - Get audit logs (Admin only)
  - Supports filtering by action, entity type, user ID, and date range

## User Workflows

### Creating a Patient

1. Navigate to the **Patients** page
2. Click **Add Patient** button
3. Fill in patient information (MRN, name, date of birth, etc.)
4. Click **Save Patient**
5. Patient record is created and audit log entry is recorded

### Scheduling an Activity

1. Navigate to the **Schedule** page
2. Click **Schedule Activity** or use the calendar interface
3. Select patient, activity type, and time slot
4. Assign staff members and select room/resource if needed
5. System automatically checks for conflicts
6. If conflicts exist, review and select alternative time slot
7. Click **Confirm** to schedule
8. Activity is created and audit log entry is recorded

### Viewing Audit Logs

1. Navigate to the **Audit Log** page (Admin only)
2. Use filters to narrow results by action, entity type, user, or date
3. Review complete history of all system changes
4. Export logs for compliance reporting

## Color Palette

The application uses a clinical color scheme optimized for healthcare environments:

- **Navy** (#1a3a52): Primary color for text and primary actions
- **Teal** (#008B8B): Secondary color for accents and highlights
- **White** (#FFFFFF): Background and card surfaces
- **Light Gray-Blue**: Muted elements and borders
- **Red**: Destructive actions and alerts

## Accessibility

The application follows WCAG 2.1 AA accessibility standards:

- Keyboard navigation support
- Clear focus indicators
- Semantic HTML structure
- Color contrast compliance
- Screen reader support
- Responsive text sizing

## Security & Compliance

- HIPAA-compliant design with comprehensive audit logging
- Role-based access control for data protection
- Secure authentication via Manus OAuth
- Encrypted data transmission
- Soft delete support with full history retention
- User attribution for all modifications

## Future Enhancements

- Real-time WebSocket updates for live schedule changes
- Email notifications for schedule changes and conflicts
- Recurring activity templates for common procedure sequences
- Bulk scheduling capabilities
- PDF/CSV export for reports and schedules
- Mobile app for on-call staff
- Integration with hospital information systems (HIS)
- Advanced analytics and utilization reporting

## Support & Troubleshooting

### Common Issues

**Issue**: Conflict detection not working
- Ensure all activities have valid start and end times
- Check that patient, staff, and room IDs are correctly assigned
- Verify database connection is active

**Issue**: Audit logs not showing
- Ensure you are logged in as an admin user
- Check that actions have been performed (creates, updates, deletes)
- Verify database migrations have been applied

**Issue**: Activities not appearing on calendar
- Refresh the page to reload data
- Check that activities have valid start and end times
- Verify patient and activity type are correctly assigned

## Contributing

To contribute to this project:

1. Create a feature branch from `main`
2. Make your changes and test thoroughly
3. Create a pull request with a clear description
4. Ensure all tests pass before merging

## License

This project is licensed under the MIT License.

## Contact

For questions or support, please contact the development team or submit an issue through the project management system.
