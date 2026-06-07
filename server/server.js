import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  checkDbConnection,
  initDatabase,
  getUpcomingWeekDays,
  loginUser,
  getUserById,
  getOrCreateUpcomingWeek,
  getEmployeePreferences,
  updateEmployeePreferences,
  getAdminEmployeesList,
  checkUsernameExists,
  createEmployee,
  resetEmployeePassword,
  deleteEmployee,
  getAdminScheduleData,
  deleteShiftAssignment,
  deleteAllShiftAssignments,
  getEmployeePreferenceStatus,
  assignShift
} from './db.js';
import { authenticateToken, JWT_SECRET } from './auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// 1. Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'נא להזין שם משתמש וסיסמה.' });
  }

  try {
    const user = await loginUser(username);

    if (!user) {
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, employeeId: user.employee_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employee_id,
        fullName: user.full_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 2. Auth Get Me
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'המשתמש לא נמצא.' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 3. Upcoming Week Range
app.get('/api/weeks/upcoming', authenticateToken, async (req, res) => {
  try {
    const week = await getOrCreateUpcomingWeek();
    const days = getUpcomingWeekDays();
    res.json({ week, days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 4. Employee Preferences (Get)
app.get('/api/employee/preferences/upcoming', authenticateToken, async (req, res) => {
  if (req.user.role !== 'employee' || !req.user.employeeId) {
    return res.status(403).json({ error: 'גישה מוגבלת לעובדים בלבד.' });
  }

  try {
    const week = await getOrCreateUpcomingWeek();
    const preferences = await getEmployeePreferences(req.user.employeeId, week.id);
    res.json(preferences);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 5. Employee Preferences (Update)
app.put('/api/employee/preferences/upcoming', authenticateToken, async (req, res) => {
  if (req.user.role !== 'employee' || !req.user.employeeId) {
    return res.status(403).json({ error: 'גישה מוגבלת לעובדים בלבד.' });
  }

  const { preferences } = req.body;
  if (!Array.isArray(preferences)) {
    return res.status(400).json({ error: 'פורמט העדפות לא תקין.' });
  }

  try {
    const week = await getOrCreateUpcomingWeek();
    await updateEmployeePreferences(req.user.employeeId, week.id, preferences);
    res.json({ success: true, message: 'העדפותיך נשמרו בהצלחה.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 6. Admin Employees List with shift counters
app.get('/api/admin/employees', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  try {
    const week = await getOrCreateUpcomingWeek();
    const employees = await getAdminEmployeesList(week.id);
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 7. Admin Add Employee
app.post('/api/admin/employees', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  const { full_name, username, password, phone } = req.body;
  if (!full_name || !username || !password) {
    return res.status(400).json({ error: 'שם מלא, שם משתמש וסיסמה הם שדות חובה.' });
  }

  try {
    const exists = await checkUsernameExists(username);
    if (exists) {
      return res.status(400).json({ error: 'שם משתמש זה כבר תפוס.' });
    }

    const passHash = await bcrypt.hash(password, 10);
    await createEmployee(full_name, phone, username, passHash);

    res.status(201).json({ success: true, message: 'עובד חדש נוצר בהצלחה.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 8. Admin Reset Password
app.post('/api/admin/employees/:id/reset-password', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  const employeeId = req.params.id;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'נא להזין סיסמה חדשה.' });
  }

  try {
    const passHash = await bcrypt.hash(password, 10);
    const success = await resetEmployeePassword(employeeId, passHash);
    
    if (!success) {
      return res.status(404).json({ error: 'העובד המבוקש לא נמצא במערכת.' });
    }

    res.json({ success: true, message: 'הסיסמה שונתה בהצלחה.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 9. Admin Delete Employee
app.delete('/api/admin/employees/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  const employeeId = req.params.id;

  try {
    const success = await deleteEmployee(employeeId);
    
    if (!success) {
      return res.status(404).json({ error: 'העובד המבוקש לא נמצא במערכת.' });
    }

    res.json({ success: true, message: 'העובד הוסר מהמערכת בהצלחה.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 10. Admin Scheduling Board Data
app.get('/api/admin/schedule/upcoming', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  try {
    const week = await getOrCreateUpcomingWeek();
    const data = await getAdminScheduleData(week.id);
    
    res.json({
      week,
      ...data
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 10. Admin Assign Shift
app.put('/api/admin/shifts/assign', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  const {
    shift_date,
    time_frame,
    job_type,
    assigned_employee_id,
    external_worker_name,
    override_cannot
  } = req.body;

  if (!shift_date || !time_frame || !job_type) {
    return res.status(400).json({ error: 'חסרים פרטי משמרת לשיוך.' });
  }

  try {
    const week = await getOrCreateUpcomingWeek();

    // Clear assignment (Unassign)
    if (!assigned_employee_id && !external_worker_name) {
      await deleteShiftAssignment(week.id, shift_date, time_frame, job_type);
      return res.json({ success: true, message: 'המשמרת פונתה משיוך.' });
    }

    // Assigning internal employee
    if (assigned_employee_id) {
      const prefStatus = await getEmployeePreferenceStatus(
        Number(assigned_employee_id),
        week.id,
        shift_date,
        time_frame
      );

      // If status is 'cannot' and no override was confirmed, block the assignment
      if (prefStatus === 'cannot' && !override_cannot) {
        return res.status(409).json({
          error: 'REQUIRES_OVERRIDE',
          message: 'העובד סימן "לא יכול" למשמרת זו. האם ברצונך לשבץ אותו בכל זאת?'
        });
      }

      await assignShift(
        week.id,
        shift_date,
        time_frame,
        job_type,
        assigned_employee_id,
        null,
        prefStatus === 'cannot' ? 1 : 0,
        req.user.id
      );

      return res.json({ success: true, message: 'העובד שובץ בהצלחה.' });
    }

    // Assigning external worker
    if (external_worker_name) {
      if (!external_worker_name.trim()) {
        return res.status(400).json({ error: 'שם עובד חיצוני לא יכול להיות ריק.' });
      }

      await assignShift(
        week.id,
        shift_date,
        time_frame,
        job_type,
        null,
        external_worker_name.trim(),
        0,
        req.user.id
      );

      return res.json({ success: true, message: 'עובד חיצוני שובץ בהצלחה.' });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית במהלך השיבוץ.' });
  }
});

// 11. Admin Delete All Shifts for the Week
app.delete('/api/admin/shifts/all', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'גישה מוגבלת למנהלים בלבד.' });
  }

  try {
    const week = await getOrCreateUpcomingWeek();
    await deleteAllShiftAssignments(week.id);
    res.json({ success: true, message: 'כל השיבוצים לשבוע זה נמחקו בהצלחה.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת פנימית.' });
  }
});

// 0. Health Check
app.get('/api/health', async (_req, res) => {
  const result = await checkDbConnection();
  res.status(result.connected ? 200 : 503).json(result);
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'נתיב API לא נמצא.' });
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
