/**
 * Import external libraries
 */
require('dotenv').config();

const restify = require('restify');
const fs = require('fs');
const UUID = require('pure-uuid');
const path = require('path');
const serviceHelper = require('alfred-helper');
const { version } = require('../../package.json');

/**
 * Import helper libraries
 */
const RTSPRecorder = require('./RTSPRecorder.js');

global.APITraceID = '';
global.streamsStore = [];
let rec;

// Restify server Init
const server = restify.createServer({
  name: process.env.ServiceName,
  version,
  key: fs.readFileSync('./certs/server.key'),
  certificate: fs.readFileSync('./certs/server.crt'),
});

/**
 * Setup API middleware
 */
server.use(restify.plugins.jsonBodyParser({ mapParams: true }));
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser({ mapParams: true }));
server.use(restify.plugins.fullResponse());
server.use((req, res, next) => {
  serviceHelper.log('trace', req.url);
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self' ${process.env.ServiceDomain}`,
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
server.use((req, res, next) => {
  // Check for a trace id
  if (typeof req.headers['api-trace-id'] === 'undefined') {
    global.APITraceID = new UUID(4);
  } else {
    global.APITraceID = req.headers['api-trace-id'];
  }

  // Check for valid auth key
  const fileExt = path.extname(req.url).toLowerCase();
  if (
    req.query.clientaccesskey !== process.env.ClientAccessKey
    && fileExt !== '.ts'
  ) {
    serviceHelper.log(
      'warn',
      `Invaid client access key: ${req.headers.ClientAccessKey}`,
    );
    serviceHelper.sendResponse(
      res,
      401,
      'There was a problem authenticating you.',
    );
    return;
  }
  next();
});
server.on('NotFound', (req, res, err) => {
  serviceHelper.log('error', `${err.message}`);
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self' ${process.env.ServiceDomain}`,
  );
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains',
  );
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  serviceHelper.sendResponse(res, 404, err.message);
});
server.on('uncaughtException', (req, res, route, err) => {
  serviceHelper.log('error', `${route}: ${err.message}`);
  serviceHelper.sendResponse(res, 500, err.message);
});

server.on('close', () => {
  serviceHelper.log('trace', 'Client dis-connected');
});

/**
 * Configure API end points
 */
require('../api/root/root.js').applyRoutes(server);
require('../api/stream/stream.js').applyRoutes(server, '/stream');

/**
 * Stop server if process close event is issued
 */
function cleanExit() {
  if (process.env.Record === 'true' && rec !== undefined) {
    serviceHelper.log('info', 'Stopping recording');
    rec.stopRecording(); // Stop Recording
  }
  serviceHelper.log('warn', 'Closing rest server');
  server.close(() => {
    // Ensure rest server is stopped
    serviceHelper.log('warn', 'Exit the app');
    process.exit(); // Exit app
  });
}
process.on('SIGINT', () => {
  cleanExit();
});
process.on('SIGTERM', () => {
  cleanExit();
});
process.on('SIGUSR2', () => {
  cleanExit();
});
process.on('uncaughtException', (err) => {
  if (err) serviceHelper.log('error', err.message); // log the error
  cleanExit();
});

// Start service and listen to requests
server.listen(process.env.Port, () => {
  serviceHelper.log(
    'info',
    `${process.env.ServiceName} has started and is listening on port ${process.env.Port}`,
  );
});

setTimeout(() => {
  if (process.env.Record === 'true') {
    rec = new RTSPRecorder({
      name: 'livingroom',
      url: process.env.camURL,
      type: 'record',
      disableStreaming: false,
      timeLimit: 600, // 10 minutes for each segmented video file
    });
    rec.startRecording(); // Start Recording
  }
});