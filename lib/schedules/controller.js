/**
 * Import external libraries
 */
const debug = require('debug')('HLS:Schedule');

async function activateBaseStation(activate) {
  if (!this.arlo.loggedIn) {
    this.logger.error('Not logged in so can not update base station mode');
    return;
  }

  try {
    const baseStationID = this.arlo.baseStation.deviceId;
    if (activate) {
      this.arlo.arm(baseStationID);
    } else {
      this.arlo.disarm(baseStationID);
    }
    this.logger.info(
      `Base Station is ${
        !activate ? 'dis' : ''
      }armed - Cam motion recording is ${activate ? '' : 'not '}active`,
    );

    // Adjust privacy setting on cams to reflect arm status
    // this.arlo.setPrivacyActive(this.camLivingRoomID, !activate);
    // this.arlo.setPrivacyActive(this.camGardenID, !activate);
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

/**
 * Set up schedules
 */
async function setupSchedules() {
  try {
    // Clear current schedules array
    debug(`Clear current schedules`);
    this.schedules = [];

    debug(`Adding schedules`);
    if (await this._onHolidayToday()) {
      this.logger.info('On holiday, skipping day time schedules');
    } else {
      // Morning: off
      this.schedules.push({
        hour: 7,
        minute: 0,
        description: 'Morning: De-activate base station',
        functionToCall: activateBaseStation,
        args: false,
      });

      if (!(await this._kidsAtHomeToday())) {
        this.logger.info('Kids not staying today, skipping day time schedules');
      } else {
        if (await this._atHomeToday()) {
          this.logger.info('At home today, skipping day time schedules');
        } else {
          // School drop off: on
          this.schedules.push({
            hour: 8,
            minute: 30,
            description: 'School drop off: Activate base station',
            functionToCall: activateBaseStation,
            args: true,
          });

          // School pick up: off
          this.schedules.push({
            hour: 15,
            minute: 0,
            description: 'School pick up: De-activate base station',
            functionToCall: activateBaseStation,
            args: false,
          });
        }
      }
    }

    // Night: on
    this.schedules.push({
      hour: 21,
      minute: 30,
      description: 'Night: Activate base station',
      functionToCall: activateBaseStation,
      args: true,
    });

    // Activate schedules
    await this.activateSchedules();
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

module.exports = {
  setupSchedules,
};
