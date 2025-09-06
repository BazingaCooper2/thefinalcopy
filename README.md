# Geri-Assist
### Scheduling Software

## Key Features:
1. scheduling
2. rescheduling
3. gps tracking for automating clocking in and out
4. voice call and video call
5. chatbot
6. mobile app

## Data Base Table Schema:
4 tables:
* CLIENT: client_id(primary), name, address (composite), shift_id
* EMPLOYEE: emp_id(primary), name, service_type, list of shifts- (like a shift_id referring to all the shifts belonging to that employee)
* SHIFT: shift_id (primary), client_id(foreign), emp_id(foreign), shift_start_time, shift_end_time,  shift_status
* DAILY_SHIFT: current_date, eid (composite primary key), shift_start_time, shift_end_time, clockin, clockout, daily_hrs, monthly_hrs
