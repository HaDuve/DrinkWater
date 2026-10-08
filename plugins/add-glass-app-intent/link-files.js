const { IOSConfig } = require('expo/config-plugins');

const { APP_SHORTCUT_LOCALES, writeAddGlassAppIntentFiles } = require('./write-files');

const LOCALIZABLE_CATALOG = 'Localizable.xcstrings';
const APP_SHORTCUTS_STRINGS = 'AppShortcuts.strings';

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

  nextProject = linkAppShortcutsStringsVariantGroup(nextProject, projectName);
  nextProject = linkLocalizableCatalog(nextProject, projectName);
  removeLegacyAppShortcutsXcstrings(nextProject, projectName);

  return nextProject;
}

/**
 * Links en/de AppShortcuts.strings as one PBXVariantGroup.
 * Expo has no Resources group; addLocalizationVariantGroup would throw.
 * Naive addResourceFileToGroup twice silently drops the second locale (same basename).
 */
function linkAppShortcutsStringsVariantGroup(project, projectName) {
  const appGroupKey =
    project.findPBXGroupKey({ name: projectName }) ||
    project.findPBXGroupKey({ path: projectName });
  if (!appGroupKey) {
    return project;
  }

  let variantGroupKey = project.findPBXVariantGroupKey({ name: APP_SHORTCUTS_STRINGS });
  if (!variantGroupKey) {
    variantGroupKey = project.pbxCreateVariantGroup(APP_SHORTCUTS_STRINGS);
    project.addToPbxGroup(variantGroupKey, appGroupKey);

    const buildFile = {
      uuid: project.generateUuid(),
      fileRef: variantGroupKey,
      basename: APP_SHORTCUTS_STRINGS,
      group: 'Resources',
    };
    project.addToPbxBuildFileSection(buildFile);
    project.addToPbxResourcesBuildPhase(buildFile);
  }

  const localeFileRefs = collectVariantGroupLocaleRefs(project, variantGroupKey);

  for (const locale of APP_SHORTCUT_LOCALES) {
    const expectedPath = `${projectName}/${locale}.lproj/${APP_SHORTCUTS_STRINGS}`;
    const existingRef = localeFileRefs.get(locale);
    if (existingRef) {
      // Repair older plugin paths that omitted the app folder prefix.
      existingRef.name = locale;
      existingRef.path = expectedPath;
      existingRef.sourceTree = '"<group>"';
      continue;
    }

    const added = project.addFile(expectedPath, variantGroupKey, {
      lastKnownFileType: 'text.plist.strings',
      defaultEncoding: 4,
    });
    if (!added?.fileRef) {
      continue;
    }

    const fileRef = project.pbxFileReferenceSection()[added.fileRef];
    if (fileRef) {
      // Expo app-group children use project-root paths (DrinkWater/...), not group-relative.
      // name = locale is the Xcode localized-variant convention.
      fileRef.name = locale;
      fileRef.path = expectedPath;
      fileRef.sourceTree = '"<group>"';
    }
  }

  return project;
}

function collectVariantGroupLocaleRefs(project, variantGroupKey) {
  const locales = new Map();
  const variantGroup = project.getPBXVariantGroupByKey(variantGroupKey);
  if (!variantGroup?.children) {
    return locales;
  }

  const fileRefs = project.pbxFileReferenceSection();
  for (const child of variantGroup.children) {
    const ref = fileRefs[child.value];
    if (!ref) {
      continue;
    }
    const name = unquote(ref.name);
    const refPath = unquote(ref.path);
    let locale = name;
    if (!locale && refPath?.includes('.lproj/')) {
      locale = refPath.split('.lproj/')[0].split('/').pop();
    }
    if (locale) {
      locales.set(locale, ref);
    }
  }

  return locales;
}

function unquote(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/^"(.*)"$/, '$1');
}

function linkLocalizableCatalog(project, projectName) {
  const catalogPath = `${projectName}/${LOCALIZABLE_CATALOG}`;
  let nextProject = project;
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

  return nextProject;
}

/**
 * Strip leftover AppShortcuts.xcstrings refs from older plugin versions.
 * removeFile alone can leave orphan PBXBuildFile / group children when the
 * file ref path no longer matches hasFile().
 */
function removeLegacyAppShortcutsXcstrings(project, projectName) {
  const legacyPath = `${projectName}/AppShortcuts.xcstrings`;
  try {
    project.removeFile(legacyPath);
  } catch {
    // Continue with orphan sweep below.
  }

  const objects = project.hash.project.objects;
  const fileRefs = objects.PBXFileReference || {};
  const buildFiles = objects.PBXBuildFile || {};
  const groups = objects.PBXGroup || {};
  const orphanFileRefIds = new Set();

  for (const [id, entry] of Object.entries(fileRefs)) {
    if (id.endsWith('_comment') || !entry || typeof entry !== 'object') {
      continue;
    }
    const refPath = unquote(entry.path) || '';
    const refName = unquote(entry.name) || '';
    if (refPath.endsWith('AppShortcuts.xcstrings') || refName === 'AppShortcuts.xcstrings') {
      orphanFileRefIds.add(id);
      delete fileRefs[id];
      delete fileRefs[`${id}_comment`];
    }
  }

  const orphanBuildFileIds = new Set();
  for (const [id, entry] of Object.entries(buildFiles)) {
    if (id.endsWith('_comment') || !entry || typeof entry !== 'object') {
      continue;
    }
    const comment = buildFiles[`${id}_comment`];
    if (
      orphanFileRefIds.has(entry.fileRef) ||
      (typeof comment === 'string' && comment.includes('AppShortcuts.xcstrings'))
    ) {
      orphanBuildFileIds.add(id);
      delete buildFiles[id];
      delete buildFiles[`${id}_comment`];
    }
  }

  for (const [id, group] of Object.entries(groups)) {
    if (id.endsWith('_comment') || !group?.children) {
      continue;
    }
    group.children = group.children.filter((child) => {
      if (orphanFileRefIds.has(child.value)) {
        return false;
      }
      const childComment = typeof child.comment === 'string' ? child.comment : '';
      return !childComment.includes('AppShortcuts.xcstrings');
    });
  }

  const resourcesPhases = objects.PBXResourcesBuildPhase || {};
  for (const [id, phaseObj] of Object.entries(resourcesPhases)) {
    if (id.endsWith('_comment') || !phaseObj?.files) {
      continue;
    }
    phaseObj.files = phaseObj.files.filter((file) => {
      if (orphanBuildFileIds.has(file.value)) {
        return false;
      }
      const fileComment = typeof file.comment === 'string' ? file.comment : '';
      return !fileComment.includes('AppShortcuts.xcstrings');
    });
  }
}

module.exports = { linkAddGlassAppIntentFiles };
