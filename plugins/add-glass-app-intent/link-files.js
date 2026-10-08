const { IOSConfig } = require('expo/config-plugins');

const { writeAddGlassAppIntentFiles } = require('./write-files');

const STRING_CATALOGS = ['AppShortcuts.xcstrings', 'Localizable.xcstrings'];

/** Writes App Intent files and links them into the main iOS target. */
function linkAddGlassAppIntentFiles({ project, nativeProjectRoot, projectName }) {
  writeAddGlassAppIntentFiles({ nativeProjectRoot, projectName });

  let nextProject = project;
  for (const fileName of ['AddGlassIntent.swift', 'DrinkWaterAppShortcuts.swift']) {
    const filepath = `${projectName}/${fileName}`;
    if (!nextProject.hasFile(filepath)) {
      nextProject = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: nextProject,
      });
    }
  }

  for (const catalogName of STRING_CATALOGS) {
    const catalogPath = `${projectName}/${catalogName}`;
    if (!nextProject.hasFile(catalogPath)) {
      nextProject = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: catalogPath,
        groupName: projectName,
        project: nextProject,
        isBuildFile: true,
      });
    }

    const catalogRef = nextProject.hasFile(catalogPath);
    if (catalogRef) {
      catalogRef.lastKnownFileType = 'text.json.xcstrings';
    }
  }

  return nextProject;
}

module.exports = { linkAddGlassAppIntentFiles };
