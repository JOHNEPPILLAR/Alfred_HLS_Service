/**
 * Import external libraries
 */
const scheduler = require('node-schedule');
const serviceHelper = require('alfred-helper');
const dateformat = require('dateformat');

/**
 * Import helper libraries
 */
const Arlo = require('../server/arlo.js');

async function setupSchedules() {
  // If weekend do not set schedules
  const bankHolidayOrWeekend = await serviceHelper.checkForBankHolidayWeekend();
  if (bankHolidayOrWeekend instanceof Error) return;

  if (bankHolidayOrWeekend) {
    serviceHelper.log('info', 'Not setting schedule as it\'s the weekend or a bank holiday');
    return;
  }

  const arlo = new Arlo();

  // Turn on cam each morning
  const date = new Date();
  date.setHours(8);
  date.setMinutes(45);
  let schedule = scheduler.scheduleJob(date, () => arlo.turnOffCam(false));
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `Livingroon cam on at ${dateformat(date, 'dd-mm-yyyy @ HH:MM')}`,
  );

  // Turn off cam each evening
  const kidsAtHomeToday = await serviceHelper.kidsAtHomeToday();
  if (kidsAtHomeToday) {
    date.setHours(15);
    date.setMinutes(0);
  } else {
    date.setHours(18);
    date.setMinutes(30);
  }
  schedule = scheduler.scheduleJob(date, () => arlo.turnOffCam(true));
  global.schedules.push(schedule);
  serviceHelper.log(
    'info',
    `Livingroon cam off at ${dateformat(date, 'dd-mm-yyyy @ HH:MM')}`,
  );
}

// Set up the schedules
async function setSchedule() {
  // Cancel any existing schedules
  serviceHelper.log('trace', 'Removing any existing schedules');
  await global.schedules.map((value) => value.cancel());

  // Set schedules each day to keep in sync with sunrise & sunset changes
  const rule = new scheduler.RecurrenceRule();
  rule.hour = 3;
  rule.minute = 5;
  const schedule = scheduler.scheduleJob(rule, () => setSchedule()); // Set the schedule
  global.schedules.push(schedule);
  await setupSchedules();
}

exports.setSchedule = setSchedule;
