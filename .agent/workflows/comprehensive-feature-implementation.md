# Geri-Assist Comprehensive Feature Implementation Plan

## 🎯 Overview
This document outlines all required features for the Geri-Assist healthcare scheduling system with multiple programs (Willow Place, 87 Neeve, 85 Neeve, Outreach).

---

## 📊 Schedule System Understanding

### Color Codes & Location Indicators
- **Capital Letters (D/E/N)**: Willow Place (WP)
- **Small Letters (d/e/n)**: 87 Neeve
- **With Star (*)**: 85 Neeve (e.g., 8-4*, 7-12*)
- **Yellow Rows**: Open/Vacant shifts at bottom
- **Cross Training**: FLW training indicators

### Employee Ordering
1. Full-time employees
2. Part-time employees
3. Casual employees
*(Order changes when workers pick rotation shifts)*

---

## 🏥 Client Information System

### 1. Client Profile (Main Info)
- [ ] Health Card Number
- [ ] First Name & Last Name
- [ ] Preferred Language
- [ ] **Program Group Dropdown**:
  - Outreach
  - 87 Neeve
  - 85 Neeve
  - Willow Place
- [ ] Client Ailment Type
- [ ] Address (full)
- [ ] Email
- [ ] Phone Number

### 2. Emergency Contacts
- [ ] Contact Name
- [ ] Relationship (dropdown):
  - Physician
  - Care Coordinator
  - Sister/Brother
  - Nurse
  - Other Family
- [ ] Contact Phone
- [ ] Contact Email

### 3. Medical History
- [ ] Primary Diagnosis
- [ ] Mobility Status:
  - [ ] Wheelchair User
  - [ ] Walker
  - [ ] Independent
- [ ] Medical Devices:
  - [ ] Catheter
  - [ ] Oxygen
  - [ ] Other Equipment

### 4. Care Management
- [ ] Care Manager Name
- [ ] Doctor Name & Contact
- [ ] Assigned Nurse
- [ ] Coordinator Notes (Rich Text Box)
- [ ] Individual Service Plan
- [ ] Tasks & Instructions
- [ ] Payroll Data

### 5. Client Scheduling Features
- [ ] Individual client schedule search by name
- [ ] Weekly schedule view
- [ ] Monthly schedule view
- [ ] Shift history

### 6. Document Attachments
- [ ] Upload medical documents
- [ ] Care plans
- [ ] Progress notes
- [ ] Category tags for documents
- [ ] Version control

---

## 👥 Employee Management System

### 1. Enhanced Employee Profile
- [ ] Employee Type (Full-time/Part-time/Casual)
- [ ] Cross-training Indicators (d/e next to name)
- [ ] Program Assignments (WP, 87NV, 85NV)
- [ ] Skills & Certifications

### 2. Status Management with Color Codes
- [ ] **Available** - Green gradient badge
- [ ] **Busy/Scheduled** - Blue gradient badge
- [ ] **On Leave** - Orange gradient badge
- [ ] **Offer Sent** - Purple gradient badge (NEW)
- [ ] **Sick Leave** - Red gradient badge
- [ ] **On Call** - Cyan gradient badge

### 3. Employee Schedule View
- [ ] Show ALL shifts across ALL service types
- [ ] Display hours worked vs weekly capacity
- [ ] Example: "32/40 hrs" beside employee name
- [ ] Color-coded capacity bars:
  - Green: Under capacity
  - Yellow: Near capacity (80-100%)
  - Red: Over capacity

### 4. Leave Application System
**Features:**
- [ ] Easy-access leave request button
- [ ] Leave types:
  - Sick Leave
  - Vacation
  - Personal Day
  - Unpaid Leave
- [ ] Date range selection
- [ ] Reason text box
- [ ] Approval workflow

**Email Notifications:**
- [ ] Send to common mail ID
- [ ] Send to location supervisor
- [ ] Include:
  - Employee name who is sick
  - Shifts affected
  - Who is picking up the work
  - Duration
  - Contact info

---

## 📋 Incident Reporting System

### Multi-Level Approval Flow
**FLW → Supervisor → Manager**

### Report Types
1. **Injury Report**
2. **Illness Report**
3. **Hazard Report**

### Workflow for Each Report:
1. **FLW Fills Initial Report**
   - Incident details
   - Date/Time
   - Location
   - Immediate action taken
   - Submit to Supervisor

2. **Supervisor Reviews & Adds**
   - Supervisor comments
   - Investigation notes
   - Additional actions
   - Forward to Manager
   - **Email notification sent**

3. **Manager Final Approval**
   - Manager review
   - Final decision
   - Close or escalate
   - **Email notification sent**

### Report Fields:
- [ ] Report Type (dropdown)
- [ ] Date & Time of Incident
- [ ] Location/Program
- [ ] Person Affected
- [ ] Description (rich text)
- [ ] Immediate Actions Taken
- [ ] Witnesses
- [ ] Photos/Attachments
- [ ] Severity Level
- [ ] Status (Draft/Pending/Approved/Rejected)

### Notification System:
- [ ] Email notifications at each stage
- [ ] In-app notifications
- [ ] Dashboard alerts
- [ ] Status tracking

---

## 📅 Master Schedule Features

### Schedule Display
- [ ] Master schedule view (all programs)
- [ ] Program-specific schedules
- [ ] Employee name search → show all their shifts
- [ ] Color coding by location:
  - WP: Purple background
  - 87NV: Blue background
  - 85NV: Green background
  - Cross-training: Striped pattern

### Shift Management
- [ ] Open/Vacant shifts highlighted (yellow)
- [ ] Shift offers to employees
- [ ] Shift swap requests
- [ ] Shift pickup notifications

### Capacity Tracking
- [ ] Weekly hours worked/capacity ratio
- [ ] Display beside each employee name
- [ ] Visual progress bars
- [ ] Overtime warnings

---

## 📧 Leave & On-Call Email System

### Email Templates

**Sick Leave Email:**
```
Subject: Sick Leave - [Employee Name] - [Date]

Employee on Sick Leave:
Name: [Employee Name]
Position: [Position]
Program: [Program]
Date(s): [Leave Dates]
Shifts Affected: [List of shifts]

Coverage Arranged:
[Employee Name] - [Shift Time] - [Program]
[Employee Name] - [Shift Time] - [Program]

Supervisor: [Name]
Contact: [Phone]
```

**On-Call Email:**
- [ ] Out of office hours notification
- [ ] Send to common mail ID
- [ ] Send to respective location supervisor
- [ ] Include on-call contact

---

## 🎨 UI/UX Enhancements

### Priority Pages for Design Update:
1. ✅ Dashboard (COMPLETED)
2. ✅ Clients Page (COMPLETED)
3. ✅ Employee Page (COMPLETED)
4. [ ] **Schedule Page** (HIGH PRIORITY)
5. [ ] Leave Application Page
6. [ ] Injury/Illness/Hazard Report Forms
7. [ ] Client Detail View with Attachments
8. [ ] Master Schedule View

### Design Requirements:
- [ ] Color-coded status badges
- [ ] Clear visual hierarchy
- [ ] Easy-to-access leave button
- [ ] Offer status visibility
- [ ] Progress bars for capacity
- [ ] Document upload interface
- [ ] Rich text editors for notes

---

## 🔧 Technical Implementation Priorities

### Phase 1: Client Management (Week 1)
1. Expand client database schema
2. Create enhanced client profile form
3. Add emergency contacts section
4. Build medical history interface
5. Implement document upload system
6. Individual client schedule search

### Phase 2: Employee Enhancements (Week 2)
1. Add employee status color codes
2. Implement "offer sent" tracking
3. Build capacity tracking system
4. Create hours worked display
5. Show all shifts in schedule search

### Phase 3: Leave Management (Week 3)
1. Design leave application form
2. Build approval workflow
3. Create email notification system
4. Add leave calendar view
5. Coverage tracking

### Phase 4: Reporting System (Week 4)
1. Create unified report form
2. Build multi-level approval flow
3. Email notification at each stage
4. Status tracking dashboard
5. Report history & search

### Phase 5: Master Schedule (Week 5-6)
1. Build master schedule view
2. Implement color coding system
3. Cross-training indicators
4. Capacity tracking integration
5. Shift management features

---

## 📝 Database Schema Updates Needed

### Client Table Extensions
```sql
- health_card_number
- program_group (WP/87NV/85NV/Outreach)
- ailment_type
- mobility_status
- medical_devices
- care_manager
- doctor_name, doctor_contact
- assigned_nurse
- coordinator_notes (TEXT)
```

### Employee Table Extensions
```sql
- employee_type (FT/PT/Casual)
- cross_training_programs
- current_status (with color code)
- offer_status
- weekly_capacity_hours
- current_week_hours
```

### New Tables
```sql
- emergency_contacts
- medical_history
- client_documents
- leave_applications
- incident_reports
- shift_offers
```

---

## ✅ Implementation Checklist

Ready to start implementing? Let me know which phase you'd like to begin with!
