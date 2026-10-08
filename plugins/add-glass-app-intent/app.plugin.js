const { IOSConfig, createRunOncePlugin, withXcodeProject } = require('expo/config-plugins');

const { linkAddGlassAppIntentFiles } = require('./link-files');

const PACKAGE_NAME = 'drinkwater-add-glass-app-intent';
const PACKAGE_VERSION = '1.0.0';

/**
 * Injects an iOS App Intent + App Shortcut that opens drinkwater://add-glass.
 * Survives `expo prebuild --clean` (CNG); no-op for Android/web.
 */
function withAddGlassAppIntent(config) {
  return withXcodeProject(config, (config) => {
    const projectName =
      config.modRequest.projectName ??
      IOSConfig.XcodeUtils.getProjectName(config.modRequest.projectRoot);

    config.modResults = linkAddGlassAppIntentFiles({
      project: config.modResults,
      nativeProjectRoot: config.modRequest.platformProjectRoot,
      projectName,
    });

    return config;
  });
}

module.exports = createRunOncePlugin(withAddGlassAppIntent, PACKAGE_NAME, PACKAGE_VERSION);
