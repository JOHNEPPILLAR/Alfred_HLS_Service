/**
 * Import external libraries
 */
const serviceHelper = require('../lib/helper.js');
const childProcess = require('child_process');

const poolingInterval = 5000; // 5 seconds

function convertStreams(camToProcess) {
  const child = childProcess.fork('./converter/convertRTSP.js', [camToProcess]);
  child.on('exit', () => { setTimeout(() => { convertStreams(camToProcess); }, poolingInterval); });
}

if (process.env.Mock === 'true') {
  serviceHelper.log('trace', 'convertStreams', 'Mock mode enabled - streaming static content');
} else {
  convertStreams(1);
  convertStreams(2);
}
