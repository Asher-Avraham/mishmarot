import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- HEALTH CHECK ---
export async function checkDbConnection() {
  try {
    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1);
    return { connected: !error, error: error?.message || null };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

// --- SEEDING & INIT ---
export async function initDatabase() {
  // Supabase tables should be created via SQL in the Supabase Dashboard.
  // This function will just seed the admin user if it doesn't exist.
  try {
    const { data: admin, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .maybeSingle();

    if (error) throw error;

    if (!admin) {
      const adminPassHash = await bcrypt.hash('admin1234', 10);
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          username: 'admin',
          password_hash: adminPassHash,
          role: 'admin',
          is_active: true
        });
      
      if (insertError) throw insertError;
      console.log('Admin user seeded to Supabase.');
    }

    // Seed upcoming week
    const { start, end } = getUpcomingWeekRange();
    const { data: week, error: weekError } = await supabase
      .from('schedule_weeks')
      .select('*')
      .eq('week_start_date', start)
      .maybeSingle();

    if (weekError) throw weekError;

    if (!week) {
      const { error: insertWeekError } = await supabase
        .from('schedule_weeks')
        .insert({
          week_start_date: start,
          week_end_date: end,
          status: 'open'
        });
      if (insertWeekError) throw insertWeekError;
      console.log(`Upcoming week seeded to Supabase: ${start} to ${end}`);
    }
  } catch (err) {
    console.error('Supabase Init Error:', err.message);
  }
}

// --- HELPERS ---
export function getUpcomingWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay();
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

// --- AUTH ---
export async function loginUser(username) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !user) return null;

  let fullName = 'מנהל מערכת';
  if (user.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', user.employee_id)
      .maybeSingle();
    if (emp) fullName = emp.full_name;
  }

  return {
    ...user,
    full_name: fullName
  };
}

export async function getUserById(id) {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !user) return null;

  let fullName = 'מנהל מערכת';
  if (user.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('full_name')
      .eq('id', user.employee_id)
      .maybeSingle();
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

// --- SCHEDULE WEEKS ---
export async function getOrCreateUpcomingWeek() {
  const { start, end } = getUpcomingWeekRange();
  
  const { data: week, error } = await supabase
    .from('schedule_weeks')
    .select('*')
    .eq('week_start_date', start)
    .maybeSingle();

  if (week) return week;

  const { data: newWeek, error: insertError } = await supabase
    .from('schedule_weeks')
    .insert({
      week_start_date: start,
      week_end_date: end,
      status: 'open'
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return newWeek;
}

// --- PREFERENCES ---
export async function getEmployeePreferences(employeeId, weekId) {
  const { data, error } = await supabase
    .from('employee_time_preferences')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('schedule_week_id', weekId);

  if (error) throw error;
  return data;
}

export async function updateEmployeePreferences(employeeId, weekId, prefsList) {
  // Upsert pattern
  for (const pref of prefsList) {
    const { shift_date, time_frame, preference_status } = pref;
    if (!['can', 'prefer', 'avoid', 'cannot'].includes(preference_status)) continue;

    const { error } = await supabase
      .from('employee_time_preferences')
      .upsert({
        employee_id: employeeId,
        schedule_week_id: weekId,
        shift_date,
        time_frame,
        preference_status,
        updated_at: new Date().toISOString()
      }, { onConflict: 'employee_id,schedule_week_id,shift_date,time_frame' });
    
    if (error) throw error;
  }
  return { success: true };
}

// --- EMPLOYEES ---
export async function getAdminEmployeesList(weekId) {
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;

  // Get usernames for each employee
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('employee_id, username')
    .eq('is_active', true);

  if (usersError) throw usersError;

  // Get shift counts for the week
  const { data: assignments, error: assError } = await supabase
    .from('shift_assignments')
    .select('assigned_employee_id')
    .eq('schedule_week_id', weekId);

  if (assError) throw assError;

  return employees.map(e => ({
    id: e.id,
    full_name: e.full_name,
    phone: e.phone,
    is_active: e.is_active,
    username: users.find(u => u.employee_id === e.id)?.username || '',
    shift_count: assignments.filter(a => a.assigned_employee_id === e.id).length
  })).sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
}

export async function checkUsernameExists(username) {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('username', username);
  
  if (error) throw error;
  return count > 0;
}

export async function createEmployee(fullName, phone, username, passwordHash) {
  // 1. Create Employee
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .insert({
      full_name: fullName.trim(),
      phone: phone ? phone.trim() : null,
      is_active: true
    })
    .select()
    .single();

  if (empError) throw empError;

  // 2. Create User
  const { error: userError } = await supabase
    .from('users')
    .insert({
      username: username.trim(),
      password_hash: passwordHash,
      role: 'employee',
      employee_id: employee.id,
      is_active: true
    });

  if (userError) throw userError;

  // 3. Create default preferences
  const week = await getOrCreateUpcomingWeek();
  const days = getUpcomingWeekDays();
  const timeFrames = ['morning', 'noon', 'night'];
  
  const prefs = [];
  for (const day of days) {
    for (const tf of timeFrames) {
      prefs.push({
        employee_id: employee.id,
        schedule_week_id: week.id,
        shift_date: day.date,
        time_frame: tf,
        preference_status: 'can'
      });
    }
  }

  const { error: prefError } = await supabase
    .from('employee_time_preferences')
    .insert(prefs);

  if (prefError) throw prefError;

  return employee;
}

export async function resetEmployeePassword(employeeId, passwordHash) {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('employee_id', employeeId);
  
  return !error;
}

export async function deleteEmployee(employeeId) {
  const { error: empError } = await supabase
    .from('employees')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', employeeId);

  const { error: userError } = await supabase
    .from('users')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('employee_id', employeeId);

  return !empError && !userError;
}

// --- SCHEDULING ---
export async function getAdminScheduleData(weekId) {
  const days = getUpcomingWeekDays();
  const employees = await getAdminEmployeesList(weekId);
  
  const { data: preferences, error: prefError } = await supabase
    .from('employee_time_preferences')
    .select('*')
    .eq('schedule_week_id', weekId);

  if (prefError) throw prefError;

  const { data: assignments, error: assError } = await supabase
    .from('shift_assignments')
    .select('*')
    .eq('schedule_week_id', weekId);

  if (assError) throw assError;

  return { days, employees, preferences, assignments };
}

export async function deleteShiftAssignment(weekId, date, timeFrame, jobType) {
  const { error } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('schedule_week_id', weekId)
    .eq('shift_date', date)
    .eq('time_frame', timeFrame)
    .eq('job_type', jobType);
  
  if (error) throw error;
}

export async function deleteAllShiftAssignments(weekId) {
  const { error } = await supabase
    .from('shift_assignments')
    .delete()
    .eq('schedule_week_id', weekId);
  
  if (error) throw error;
  return true;
}

export async function getEmployeePreferenceStatus(employeeId, weekId, date, timeFrame) {
  const { data, error } = await supabase
    .from('employee_time_preferences')
    .select('preference_status')
    .eq('employee_id', employeeId)
    .eq('schedule_week_id', weekId)
    .eq('shift_date', date)
    .eq('time_frame', timeFrame)
    .maybeSingle();

  if (error || !data) return 'can';
  return data.preference_status;
}

export async function assignShift(weekId, date, timeFrame, jobType, employeeId, externalName, overrideCannot, userId) {
  // Clear existing
  await deleteShiftAssignment(weekId, date, timeFrame, jobType);

  const { data, error } = await supabase
    .from('shift_assignments')
    .insert({
      schedule_week_id: weekId,
      shift_date: date,
      time_frame: timeFrame,
      job_type: jobType,
      assigned_employee_id: employeeId ? Number(employeeId) : null,
      external_worker_name: externalName ? externalName.trim() : null,
      override_cannot: overrideCannot ? true : false,
      assigned_by_user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
