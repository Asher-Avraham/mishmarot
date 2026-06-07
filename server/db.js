import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'mishmarot_db.json');

// Memory storage
let database = {
  users: [],
  employees: [],
  schedule_weeks: [],
  employee_time_preferences: [],
  shift_assignments: []
};

// Auto ID counters
let idCounters = {
  users: 1,
  employees: 1,
  schedule_weeks: 1,
  employee_time_preferences: 1,
  shift_assignments: 1
};

// Load database from file
function loadData() {
  try {
    if (fs.existsSync(dbPath)) {
      const dataRaw = fs.readFileSync(dbPath, 'utf8');
      const parsed = JSON.parse(dataRaw);
      database = { ...database, ...parsed };
      
      // Compute ID counters
      Object.keys(database).forEach(key => {
        if (Array.isArray(database[key]) && database[key].length > 0) {
          idCounters[key] = Math.max(...database[key].map(item => item.id || 0)) + 1;
        }
      });
    }
  } catch (err) {
    console.error('Error loading JSON database, using empty database:', err);
  }
}

// Save database to file
function saveData() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving JSON database to file:', err);
  }
}

// Date helper functions
export function getUpcomingWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const daysUntilNextSunday = 7 - dayOfWeek;
  
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilNextSunday);
  
  const nextSaturday = new Date(nextSunday);
  nextSaturday.setDate(nextSunday.getDate() + 6);
  
  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  
  return {
    start: formatDate(nextSunday),
    end: formatDate(nextSaturday),
    nextSundayDateObj: nextSunday
  };
}

export function getUpcomingWeekDays() {
  const { nextSundayDateObj } = getUpcomingWeekRange();
  const days = [];
  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(nextSundayDateObj);
    d.setDate(nextSundayDateObj.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    days.push({
      date: dateStr,
      name: dayNames[i],
      englishName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]
    });
  }
  return days;
}

// Init database and seed
export async function initDatabase() {
  loadData();

  // 1. Seed Admin
  const adminExists = database.users.some(u => u.role === 'admin');
  if (!adminExists) {
    const adminPassHash = await bcrypt.hash('admin1234', 10);
    database.users.push({
      id: idCounters.users++,
      username: 'admin',
      password_hash: adminPassHash,
      role: 'admin',
      employee_id: null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log('Admin user seeded: admin / admin1234');
    saveData();
  }

  // 2. Seed Upcoming Week
  const { start, end } = getUpcomingWeekRange();
  let week = database.schedule_weeks.find(w => w.week_start_date === start);
  if (!week) {
    week = {
      id: idCounters.schedule_weeks++,
      week_start_date: start,
      week_end_date: end,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    database.schedule_weeks.push(week);
    console.log(`Upcoming week seeded: ${start} to ${end}`);
    saveData();
  }

  // 3. Seed Mock Employees
  if (database.employees.length === 0) {
    const mockEmployees = [
      { name: 'עומר כהן', username: 'omer', phone: '052-1234567' },
      { name: 'שירה לוי', username: 'shira', phone: '054-7654321' },
      { name: 'דניאל מזרחי', username: 'daniel', phone: '050-9998887' },
      { name: 'מיכל אברהם', username: 'michal', phone: '053-1112223' },
      { name: 'יוני גרין', username: 'yoni', phone: '058-4445556' }
    ];

    const passHash = await bcrypt.hash('1234', 10);
    const days = getUpcomingWeekDays();
    const timeFrames = ['morning', 'noon', 'night'];

    for (const emp of mockEmployees) {
      // Add employee
      const employee = {
        id: idCounters.employees++,
        full_name: emp.name,
        phone: emp.phone,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      database.employees.push(employee);

      // Add user
      database.users.push({
        id: idCounters.users++,
        username: emp.username,
        password_hash: passHash,
        role: 'employee',
        employee_id: employee.id,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Seed preferences
      for (const day of days) {
        for (const tf of timeFrames) {
          let status = 'can'; // default
          
          if (emp.username === 'omer') {
            if (day.englishName === 'Monday' && tf === 'morning') status = 'avoid';
            if (day.englishName === 'Sunday' && tf === 'night') status = 'prefer';
            if (day.englishName === 'Friday') status = 'cannot';
          } else if (emp.username === 'shira') {
            if (day.englishName === 'Wednesday' && tf === 'night') status = 'cannot';
            if (day.englishName === 'Thursday' && tf === 'morning') status = 'prefer';
            if (day.englishName === 'Saturday') status = 'cannot';
          } else if (emp.username === 'daniel') {
            if (day.englishName === 'Tuesday' && tf === 'morning') status = 'prefer';
            if (day.englishName === 'Monday' && tf === 'noon') status = 'avoid';
          } else if (emp.username === 'michal') {
            if (tf === 'noon') status = 'prefer';
            if (day.englishName === 'Sunday') status = 'cannot';
          } else if (emp.username === 'yoni') {
            if (day.englishName === 'Friday' && tf === 'night') status = 'cannot';
          }

          database.employee_time_preferences.push({
            id: idCounters.employee_time_preferences++,
            employee_id: employee.id,
            schedule_week_id: week.id,
            shift_date: day.date,
            time_frame: tf,
            preference_status: status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    }
    console.log('Mock employees and preferences seeded successfully.');
    saveData();
  }
}

// Database helper operations exported to server.js
export async function loginUser(username) {
  loadData();
  const user = database.users.find(u => u.username === username && u.is_active === 1);
  if (!user) return null;
  
  let fullName = 'מנהל מערכת';
  if (user.employee_id) {
    const emp = database.employees.find(e => e.id === user.employee_id);
    if (emp) fullName = emp.full_name;
  }
  
  return {
    ...user,
    full_name: fullName
  };
}

export async function getUserById(id) {
  loadData();
  const user = database.users.find(u => u.id === id);
  if (!user) return null;
  
  let fullName = 'מנהל מערכת';
  if (user.employee_id) {
    const emp = database.employees.find(e => e.id === user.employee_id);
    if (emp) fullName = emp.full_name;
  }
  
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    employee_id: user.employee_id,
    full_name: fullName
  };
}

export async function getOrCreateUpcomingWeek() {
  loadData();
  const { start, end } = getUpcomingWeekRange();
  let week = database.schedule_weeks.find(w => w.week_start_date === start);
  if (!week) {
    week = {
      id: idCounters.schedule_weeks++,
      week_start_date: start,
      week_end_date: end,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    database.schedule_weeks.push(week);
    saveData();
  }
  return week;
}

export async function getEmployeePreferences(employeeId, weekId) {
  loadData();
  return database.employee_time_preferences.filter(
    p => p.employee_id === employeeId && p.schedule_week_id === weekId
  );
}

export async function updateEmployeePreferences(employeeId, weekId, prefsList) {
  loadData();
  
  for (const pref of prefsList) {
    const { shift_date, time_frame, preference_status } = pref;
    if (!['can', 'prefer', 'avoid', 'cannot'].includes(preference_status)) continue;
    
    const existingIndex = database.employee_time_preferences.findIndex(
      p => p.employee_id === employeeId && 
           p.schedule_week_id === weekId && 
           p.shift_date === shift_date && 
           p.time_frame === time_frame
    );
    
    if (existingIndex > -1) {
      database.employee_time_preferences[existingIndex].preference_status = preference_status;
      database.employee_time_preferences[existingIndex].updated_at = new Date().toISOString();
    } else {
      database.employee_time_preferences.push({
        id: idCounters.employee_time_preferences++,
        employee_id: employeeId,
        schedule_week_id: weekId,
        shift_date,
        time_frame,
        preference_status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }
  
  saveData();
  return { success: true };
}

export async function getAdminEmployeesList(weekId) {
  loadData();
  
  return database.employees
    .filter(e => e.is_active === 1)
    .map(e => {
      const u = database.users.find(usr => usr.employee_id === e.id);
      const shiftCount = database.shift_assignments.filter(
        sa => sa.assigned_employee_id === e.id && sa.schedule_week_id === weekId
      ).length;
      
      return {
        id: e.id,
        full_name: e.full_name,
        phone: e.phone,
        is_active: e.is_active,
        username: u ? u.username : '',
        shift_count: shiftCount
      };
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
}

export async function checkUsernameExists(username) {
  loadData();
  return database.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
}

export async function createEmployee(fullName, phone, username, passwordHash) {
  loadData();
  const week = await getOrCreateUpcomingWeek();
  const days = getUpcomingWeekDays();
  const timeFrames = ['morning', 'noon', 'night'];

  // 1. Create Employee
  const employee = {
    id: idCounters.employees++,
    full_name: fullName.trim(),
    phone: phone ? phone.trim() : null,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  database.employees.push(employee);

  // 2. Create User
  database.users.push({
    id: idCounters.users++,
    username: username.trim(),
    password_hash: passwordHash,
    role: 'employee',
    employee_id: employee.id,
    is_active: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 3. Create default preferences (can)
  for (const day of days) {
    for (const tf of timeFrames) {
      database.employee_time_preferences.push({
        id: idCounters.employee_time_preferences++,
        employee_id: employee.id,
        schedule_week_id: week.id,
        shift_date: day.date,
        time_frame: tf,
        preference_status: 'can',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  saveData();
  return employee;
}

export async function resetEmployeePassword(employeeId, passwordHash) {
  loadData();
  const userIndex = database.users.findIndex(u => u.employee_id === Number(employeeId));
  if (userIndex === -1) return false;
  
  database.users[userIndex].password_hash = passwordHash;
  database.users[userIndex].updated_at = new Date().toISOString();
  saveData();
  return true;
}

export async function deleteEmployee(employeeId) {
  loadData();
  const empIndex = database.employees.findIndex(e => e.id === Number(employeeId));
  if (empIndex === -1) return false;

  // 1. Mark employee as inactive
  database.employees[empIndex].is_active = 0;
  database.employees[empIndex].updated_at = new Date().toISOString();

  // 2. Mark associated user as inactive
  const userIndex = database.users.findIndex(u => u.employee_id === Number(employeeId));
  if (userIndex !== -1) {
    database.users[userIndex].is_active = 0;
    database.users[userIndex].updated_at = new Date().toISOString();
  }

  // 3. Optional: Clear future assignments if needed, 
  // but usually it's better to keep history and just prevent new ones.

  saveData();
  return true;
}

export async function getAdminScheduleData(weekId) {
  loadData();
  const days = getUpcomingWeekDays();
  const employees = await getAdminEmployeesList(weekId);
  
  const preferences = database.employee_time_preferences.filter(
    p => Number(p.schedule_week_id) === Number(weekId)
  );
  
  const assignments = database.shift_assignments.filter(
    sa => Number(sa.schedule_week_id) === Number(weekId)
  );
  
  return {
    days,
    employees,
    preferences,
    assignments
  };
}

export async function deleteShiftAssignment(weekId, date, timeFrame, jobType) {
  loadData();
  database.shift_assignments = database.shift_assignments.filter(
    sa => !(Number(sa.schedule_week_id) === Number(weekId) && 
            sa.shift_date === date && 
            sa.time_frame === timeFrame && 
            sa.job_type === jobType)
  );
  saveData();
}

export async function deleteAllShiftAssignments(weekId) {
  loadData();
  database.shift_assignments = database.shift_assignments.filter(
    sa => Number(sa.schedule_week_id) !== Number(weekId)
  );
  saveData();
  return true;
}

export async function getEmployeePreferenceStatus(employeeId, weekId, date, timeFrame) {
  loadData();
  const pref = database.employee_time_preferences.find(
    p => p.employee_id === employeeId && 
         p.schedule_week_id === weekId && 
         p.shift_date === date && 
         p.time_frame === timeFrame
  );
  return pref ? pref.preference_status : 'can';
}

export async function assignShift(weekId, date, timeFrame, jobType, employeeId, externalName, overrideCannot, userId) {
  loadData();
  
  // Clear any existing assignment for this concrete slot
  database.shift_assignments = database.shift_assignments.filter(
    sa => !(sa.schedule_week_id === weekId && 
            sa.shift_date === date && 
            sa.time_frame === timeFrame && 
            sa.job_type === jobType)
  );

  const newAssignment = {
    id: idCounters.shift_assignments++,
    schedule_week_id: weekId,
    shift_date: date,
    time_frame: timeFrame,
    job_type: jobType,
    assigned_employee_id: employeeId ? Number(employeeId) : null,
    external_worker_name: externalName ? externalName.trim() : null,
    override_cannot: overrideCannot ? 1 : 0,
    assigned_by_user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  database.shift_assignments.push(newAssignment);
  saveData();
  return newAssignment;
}
