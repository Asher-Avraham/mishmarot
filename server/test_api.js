import { initDatabase, loginUser, getOrCreateUpcomingWeek, getUpcomingWeekRange, getUpcomingWeekDays } from './db.js';
import bcrypt from 'bcryptjs';

async function runTest() {
  console.log('--- RUNNING BACKEND TESTS ---');
  
  try {
    // 1. Init DB
    await initDatabase();
    console.log('✅ Database initialized and seeded successfully.');

    // 2. Test dates
    const range = getUpcomingWeekRange();
    console.log(`✅ Date Range calculated: Start=${range.start}, End=${range.end}`);
    
    const days = getUpcomingWeekDays();
    console.log(`✅ Days array populated: ${days.length} days found. First day is ${days[0].name} (${days[0].date})`);

    // 3. Test upcoming week DB entry
    const week = await getOrCreateUpcomingWeek();
    console.log(`✅ Upcoming week DB ID: ${week.id}`);

    // 4. Test login seed user
    const admin = await loginUser('admin');
    if (admin) {
      const isMatch = await bcrypt.compare('admin1234', admin.password_hash);
      console.log(`✅ Admin user check: Username="${admin.username}", Role="${admin.role}", PasswordMatch=${isMatch}`);
    } else {
      console.log('❌ Admin user not found.');
    }

    const employee = await loginUser('omer');
    if (employee) {
      console.log(`✅ Employee user check: Username="${employee.username}", Role="${employee.role}", LinkedEmployeeID=${employee.employee_id}, FullName="${employee.full_name}"`);
    } else {
      console.log('❌ Employee "omer" not found.');
    }
    
    console.log('--- ALL BACKEND TESTS PASSED ---');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  }
}

runTest();
