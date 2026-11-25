/**
 * @license
 * Copyright (c) Noldova.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class Resources {
  public static readonly pathSeparator: string = "/";
  public static readonly lineBreak: string = "\n";
  public static readonly argumentSeparator: string = " ";
  public static readonly textEncoding: BufferEncoding = "utf8";
  public static readonly jsonIndent: number = 2;
  public static readonly jsonNull: string = "null";
  public static readonly argumentsStart: number = 2;
  public static readonly successExitCode: number = 0;
  public static readonly failureExitCode: number = 1;
  public static readonly signalExitBase: number = 128;
  public static readonly windowsPlatform: string = "win32";
  public static readonly missingFileCodes: readonly string[] = ["ENOENT"];
  public static readonly notExecutableCodes: readonly string[] = ["ENOENT", "ENOTDIR", "EACCES", "ELOOP", "ENAMETOOLONG", "EPERM"];
  public static readonly archiveUnreadableCodes: readonly string[] = ["ENOENT", "ENOTDIR", "EACCES", "EPERM", "EISDIR", "Z_DATA_ERROR", "Z_BUF_ERROR"];
  public static readonly errorCodeField: "code" = "code";

  public static readonly partFolders: readonly string[] = [
    "src/noldova.computer-use.protocol",
    "src/noldova.computer-use.runtime",
    "src/noldova.computer-use.window",
    "src/noldova.computer-use"
  ];
  public static readonly packageScope: string = "@noldova";
  public static readonly partSeparator: string = ".";
  public static readonly moduleSources: string = "api";
  public static readonly partSources: string = "src";
  public static readonly testsFolder: string = "tests";
  public static readonly dependenciesFolder: string = "node_modules";
  public static readonly manifestFile: string = "package.json";
  public static readonly moduleFile: string = "module.json";
  public static readonly projectFile: string = "tsconfig.json";
  public static readonly versionFile: string = "version.json";
  public static readonly licenseFile: string = "LICENSE";
  public static readonly readmeFile: string = "README.md";
  public static readonly moduleFiles: readonly string[] = [Resources.moduleFile, "settings.json"];
  public static readonly sourceExtension: string = ".ts";
  public static readonly declarationExtension: string = ".d.ts";
  public static readonly scriptExtension: string = ".js";
  public static readonly archiveExtension: string = ".tgz";
  public static readonly nameField: string = "name";
  public static readonly idField: string = "id";
  public static readonly versionField: string = "version";
  public static readonly dependenciesField: string = "dependencies";
  public static readonly privateField: string = "private";
  public static readonly exportsField: string = "exports";
  public static readonly commitField: string = "gitHead";
  public static readonly noldovaField: string = "noldova";
  public static readonly windowsAddonsField: string = "windowsAddons";
  public static readonly posixAddonsField: string = "posixAddons";
  public static readonly kitAccentField: string = "kitAccent";

  public static readonly npmPathVariable: string = "npm_execpath";
  public static readonly pathVariable: string = "PATH";
  public static readonly releaseAddonsVariable: string = "RELEASE_ADDONS";
  public static readonly releaseVersionVariable: string = "RELEASE_VERSION";
  public static readonly releaseCommitVariable: string = "RELEASE_COMMIT";
  public static readonly releaseScopeVariable: string = "RELEASE_SCOPE";

  public static readonly ignoredStdio: "ignore" = "ignore";
  public static readonly pipedStdio: "pipe" = "pipe";
  public static readonly inheritedStdio: "inherit" = "inherit";
  public static readonly maxProcessOutputBytes: number = 16 * 1024 * 1024;

  public static readonly listCopiesOption: string = "--list-copies";
  public static readonly copySeparator: string = "\t";
  public static readonly copiesEnd: string = "end of copies";
  public static readonly runThroughNpm: string = "Run it with npm run build, which installs the dependencies through npm.";
  public static readonly cleanInstallArguments: readonly string[] = ["ci", "--no-audit", "--no-fund"];
  public static readonly installArguments: readonly string[] = ["install", "--no-save", "--ignore-scripts", "--no-audit", "--no-fund"];
  public static readonly noldovaPrefix: string = `${Resources.packageScope}${Resources.pathSeparator}`;
  public static readonly rootPinFields: readonly string[] = [Resources.dependenciesField, "devDependencies"];
  public static readonly checkCommand: string = "check";

  public static readonly contextPrefix: string = `${Resources.noldovaPrefix}context.`;
  public static readonly peerDependenciesField: string = "peerDependencies";
  public static readonly viewCommand: string = "view";
  public static readonly peerVersionsArguments: readonly string[] = ["versions", "--json"];
  public static readonly peerRangePattern: RegExp = /^>=(?<lowest>(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)) <(?<refused>(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/;
  public static readonly lowestVersionGroup: string = "lowest";
  public static readonly refusedVersionGroup: string = "refused";
  public static readonly plainVersionPattern: RegExp = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
  public static readonly versionPartSeparator: string = ".";
  public static readonly versionPartWidth: number = 16;
  public static readonly versionPartPad: string = "0";

  public static readonly rootVersionPattern: RegExp = /^\d+\.\d+\.\d+(-(0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(\.(0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;
  public static readonly rootVersionInvalid: string = "The root package.json must declare a version of the form major.minor.patch, with an optional prerelease such as -rc.1.";

  public static readonly compilerSegments: readonly string[] = ["node_modules", "typescript", "bin", "tsc"];
  public static readonly sharedProjects: readonly string[] = ["scripts/tsconfig.json", "tsconfig.declarations.json", "tsconfig.declarations.window.json"];
  public static readonly projectOption: string = "--project";
  public static readonly rootDirOption: string = "--rootDir";
  public static readonly outDirOption: string = "--outDir";
  public static readonly compileTimeout: number = 300_000;

  public static readonly posixPlatforms: readonly string[] = ["linux", "darwin"];
  public static readonly windowsAddonTargets: readonly string[] = ["win32-x64", "win32-arm64"];
  public static readonly posixAddonTargets: readonly string[] = ["linux-x64", "linux-arm64", "darwin-x64", "darwin-arm64"];
  public static readonly addonExtension: string = ".node";
  public static readonly addonOutputFolder: string = "native";
  public static readonly addonSourceSegments: readonly string[] = ["src", "native"];
  public static readonly addonWorkSegments: readonly string[] = ["_build", "addons"];
  public static readonly addonHeaderSegments: readonly string[] = ["_build", "node-gyp"];
  public static readonly nodeGypSegments: readonly string[] = ["..", "node_modules", "node-gyp", "bin", "node-gyp.js"];
  public static readonly addonBuiltSegments: readonly string[] = ["build", "Release"];
  public static readonly addonRebuildArguments: readonly string[] = ["rebuild", "--loglevel=error", "--devdir"];
  public static readonly nodeApiVersion: number = 8;
  public static readonly addonProjectFile: string = "binding.gyp";
  public static readonly addonSourceExtension: string = ".c";
  public static readonly addonNamePattern: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  public static readonly addonNameSeparator: string = "-";
  public static readonly addonTargetSeparator: string = "_";

  public static readonly tarBlockSize: number = 512;
  public static readonly tarNameEnd: number = 100;
  public static readonly tarSizeStart: number = 124;
  public static readonly tarSizeEnd: number = 136;
  public static readonly tarTypeAt: number = 156;
  public static readonly tarPrefixStart: number = 345;
  public static readonly tarPrefixEnd: number = 500;
  public static readonly tarSizeRadix: number = 8;
  public static readonly tarFileTypes: readonly string[] = ["0", "\0"];
  public static readonly tarExtendedType: string = "x";
  public static readonly tarPathRecordPattern: RegExp = /^\d+ path=(.*)$/m;
  public static readonly tarFieldEndPattern: RegExp = /\0.*$/s;
  public static readonly tarHeaderEncoding: BufferEncoding = "latin1";

  public static readonly gitCommand: string = "git";
  public static readonly gitTimeout: number = 60_000;
  public static readonly gitSuccessCodes: readonly number[] = [0];
  public static readonly gitRevParse: string = "rev-parse";
  public static readonly headReference: string = "HEAD";

  public static readonly fieldPathSeparator: string = ".";

  public static readonly jxaSourceFolder: string = "jxa";
  public static readonly jxaOutputFolder: string = "jxa";
  public static readonly jxaWorkSegments: readonly string[] = ["_build", "jxa"];
  public static readonly jxaCompileArguments: readonly string[] = ["--noEmit", "false", "--rewriteRelativeImportExtensions", "--declaration", "false"];

  public static readonly kitThemeSegments: readonly string[] = ["node_modules", "@noldova", "ui.components.angular", "styles", "theme.css"];
  public static readonly cssCommentPattern: RegExp = /\/\*[\s\S]*?\*\//g;
  public static readonly cssRootBlockPattern: RegExp = /(?:^|[\s},]):root\s*\{([^}]*)\}/;
  public static readonly kitAccentPattern: RegExp = /(?:^|[\s;])--nol-accent\s*:\s*(#[0-9A-Fa-f]{6})\s*;/;

  public static readonly npmTimeout: number = 600_000;
  public static readonly npmUnavailable: string = "npm_execpath is not set; run this through npm, such as npm run build or npm test.";

  public static readonly archivesFolder: string = "_packages";
  public static readonly packageWorkSegments: readonly string[] = ["_build", "node"];
  public static readonly generatedFolder: string = "generated";
  public static readonly builtFolders: readonly string[] = [Resources.jxaOutputFolder, Resources.addonOutputFolder, Resources.generatedFolder];
  public static readonly commitPattern: RegExp = /^[0-9a-f]{40}$/;
  public static readonly manifestExport: string = "./package.json";
  public static readonly declarationImportPattern: RegExp = /(from\s+"\.{1,2}\/[^"]*)\.d\.ts"/g;
  public static readonly declarationImportReplacement: string = `$1${Resources.scriptExtension}"`;
  public static readonly packageCompileArguments: readonly string[] = ["--noEmit", "false", "--rewriteRelativeImportExtensions", "--declaration", "false", "--sourceMap"];
  public static readonly packArguments: readonly string[] = ["pack", "--ignore-scripts", "--loglevel=error", "--pack-destination"];
  public static readonly archivePathPrefix: string = "./";

  public static readonly releaseUsage: string = "Usage: check <folder> <version> <commit>\n";
  public static readonly usageExitCode: number = 2;
  public static readonly checkArgumentCount: number = 3;
  public static readonly releaseVersionPattern: RegExp = /^0\.0\.([1-9]\d*)$/;
  public static readonly archiveFolder: string = "package";
  public static readonly manifestEntryName: string = `${Resources.archiveFolder}/${Resources.manifestFile}`;
  public static readonly contextSeparator: string = " ";
  public static readonly scopePattern: RegExp = /^@([^/]+)\/(.+)$/;
  public static readonly scopedArchiveReplacement: string = "$1-$2";
  public static readonly archiveNameSeparator: string = "-";

  public static readonly checksHeading: string = "## Checks";
  public static readonly headingPrefix: string = "## ";
  public static readonly exclusionsHeader: string = "| Coverage exclusion | Why |";
  public static readonly exclusionsTable: string = "coverage exclusion";
  public static readonly pausesHeader: string = "| Test file | Why it pauses |";
  public static readonly pausesTable: string = "fixed pause";
  public static readonly tableCellMark: string = "|";
  public static readonly tableHeaderRows: number = 2;
  public static readonly checksRowPattern: RegExp = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|$/u;
  public static readonly testOptions: readonly string[] = [
    "--test",
    "--enable-source-maps",
    "--experimental-test-coverage",
    "--test-coverage-include=src/*/src/**/*.ts",
    "--test-coverage-include=src/*/api/**/*.ts",
    "--test-coverage-include=node_modules/@noldova/computer-use*/**/*.js",
    "--test-coverage-lines=100",
    "--test-coverage-branches=100",
    "--test-coverage-functions=100"
  ];
  public static readonly testFiles: readonly string[] = ["src/*/tests/**/*.test.ts", "e2e/tests/**/*.test.ts"];
  public static readonly testFileEnding: string = ".ts";
  public static readonly workflowTestOptions: readonly string[] = ["--skip-test-details", "--skip-coverage-details"];
  public static readonly filteredTestOptions: readonly string[] = ["--test", "--enable-source-maps"];
  public static readonly screenReporterOptions: readonly string[] = ["--test-reporter=spec", "--test-reporter-destination=stdout"];
  public static readonly filteredNote: string = "A filtered run measures no coverage; only the whole suite is the gate.";
  public static readonly noTestNote: string = "No test matches the filters.";
  public static readonly nativeOption: string = "--native";
  public static readonly nativeTestOptions: readonly string[] = ["--test", "--enable-source-maps", "--test-concurrency=1"];
  public static readonly nativeReport: string = "_build/native-tests.log";
  public static readonly nativeTestFiles: string = "src/*/tests/native/*.native.ts";
  public static readonly nativeTimingFileEnding: string = ".timing.native.ts";
  public static readonly nativeNone: string = "No native test file matches src/*/tests/native/*.native.ts.";
  public static readonly timingFiles: string = "src/*/tests/**/*.timing.ts";
  public static readonly nativeTimingFiles: string = "src/*/tests/**/*.timing.native.ts";
  public static readonly timingNone: string = "No timing check file matches, so there is nothing to time.";
  public static readonly timingTestOptions: readonly string[] = ["--test", "--enable-source-maps", "--test-concurrency=1"];
  public static readonly timingRuns: number = 5;
  public static readonly timingMargin: number = 0.1;
  public static readonly timingDiagnosticPattern: RegExp = /^timing: (\d+(?:\.\d+)?) ms, limit (\d+(?:\.\d+)?) ms$/u;

  public static readonly testRecordsFile: string = "_build/test-records.jsonl";
  public static readonly testRecordReporter: readonly string[] = ["scripts", "services", "test-record-reporter.ts"];
  public static readonly testFileBudgetMs: number = 1_000;
  public static readonly suiteType: string = "suite";
  public static readonly failureTypeField: "failureType" = "failureType";
  public static readonly timeoutFailureType: string = "testTimeoutFailure";
  public static readonly recordFileField: string = "file";
  public static readonly recordNameField: string = "name";
  public static readonly recordLineField: string = "line";
  public static readonly recordColumnField: string = "column";
  public static readonly recordNestingField: string = "nesting";
  public static readonly recordSuiteField: string = "suite";
  public static readonly recordPassedField: string = "passed";
  public static readonly recordSkippedField: string = "skipped";
  public static readonly recordSkippedWithoutReasonField: string = "skippedWithoutReason";
  public static readonly recordTodoField: string = "todo";
  public static readonly recordTimedOutField: string = "timedOut";
  public static readonly recordDurationField: string = "duration";
  public static readonly recordMeasuredField: string = "measuredMs";
  public static readonly recordLimitField: string = "limitMs";

  public static readonly unitSuiteName: string = "Unit tests";
  public static readonly unitHangLimitMs: number = 30_000;
  public static readonly unitHangReason: string = "the slowest unit test measured took 3.2 s, on macOS x64, so a test ten times slower is stuck, not slow";
  public static readonly nativeSuiteName: string = "Native tests";
  public static readonly nativeHangLimitMs: number = 180_000;
  public static readonly nativeHangReason: string = "the slowest native test measured took 35 s, on macOS x64, as it opens real windows and apps on a signed-in desktop and waits for them, so a test five times slower is stuck, not slow";
  public static readonly timingSuiteName: string = "Timing checks";
  public static readonly timingHangLimitMs: number = 30_000;
  public static readonly timingHangReason: string = "no package has a timing check outside the native ones yet; a timing check measures one step of under a second, so one that runs this long is stuck";
  public static readonly nativeTimingSuiteName: string = "Native timing checks";
  public static readonly nativeTimingHangLimitMs: number = 30_000;
  public static readonly nativeTimingHangReason: string = "the slowest native timing check measured took 1.9 s, on macOS x64, with the windows it opens before it measures, so a check fifteen times slower is stuck, not slow";

  public static readonly testWaitFiles: readonly string[] = ["src/*/tests/**/*.ts", "src/*/tests/**/*.cjs", "src/*/tests/**/*.js", "src/*/tests/**/*.mjs", "e2e/tests/**/*.ts"];
  public static readonly testWaitPauses: readonly RegExp[] = [
    /\bimport\s*(?:\{[^}]*\b(?:setTimeout|setImmediate|scheduler)\b[^}]*\}|\*\s*as\s+[\w$]+|[\w$]+)\s*from\s*["'](?:node:)?timers\/promises["']/g,
    /\brequire\(\s*["'](?:node:)?timers\/promises["']\s*\)/g,
    /\bscheduler\.wait\s*\(/g,
    /\bAtomics\.wait(?:Async)?\s*\(/g,
    /(?<![.\w$])setTimeout\(\s*[A-Za-z_$][\w$]*\s*,/g,
    /(?<![.\w$])setTimeout\([^\n]*,\s*\d[\d_]*\s*\)/g,
    /\bnew\s+Promise\b(?:<[^>\n]*>)?\(\s*\(?\s*[A-Za-z_$][\w$]*\s*\)?\s*=>\s*\{?\s*setTimeout\s*\(/g,
    /(?<![.\w$])setImmediate\s*\(/g,
    /\bPromise\b(?:<[^>\n]*>)?\(\s*setImmediate\s*\)/g
  ];
  public static readonly testWaitQuotes: readonly string[] = ["\"", "'", "`"];
  public static readonly testWaitEscape: string = "\\";

  public static formatListCopiesAlone(option: string): string {
    return `${option} takes no other option.`;
  }

  public static formatCopy(source: string, packageName: string, packagePath: string): string {
    return `${[source, packageName, packagePath].join(Resources.copySeparator)}${Resources.lineBreak}`;
  }

  public static formatPackageName(moduleId: string, part: string): string {
    return `${Resources.packageScope}${Resources.pathSeparator}${moduleId}${part}`;
  }

  public static formatArchiveName(name: string, version: string): string {
    return `${name.replace(Resources.scopePattern, Resources.scopedArchiveReplacement)}${Resources.archiveNameSeparator}${version}${Resources.archiveExtension}`;
  }

  public static formatArchivePath(archive: string): string {
    return `${Resources.archivePathPrefix}${Resources.archivesFolder}${Resources.pathSeparator}${archive}`;
  }

  public static formatFieldMissing(file: string, field: string): string {
    return `${file} has no ${field}.`;
  }

  public static formatFieldNotString(file: string, field: string): string {
    return `${file}'s ${field} must be a string.`;
  }

  public static formatFieldNotObject(file: string, field: string): string {
    return `${file}'s ${field} must be an object.`;
  }

  public static formatInstallFailed(exitCode: number | null, output: string): string {
    return `Installing the packed packages failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPackageSpec(name: string, version: string): string {
    return `${name}@${version}`;
  }

  public static formatPeerMoved(dependency: string, version: string): string {
    return `Moved ${dependency} to ${version}, the newest published version inside the packages' peer ranges.`;
  }

  public static formatPeerMoveFailed(exitCode: number | null, output: string): string {
    return `Installing the newest peers inside their ranges at the root failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPeerNotMoved(dependency: string, installed: string, version: string): string {
    return `The root's node_modules holds ${dependency} ${installed} after the move, not ${version}.`;
  }

  public static formatPeerVersionsUnread(dependency: string, exitCode: number | null, output: string): string {
    return `npm view ${dependency} versions failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPeerVersionsNotJson(dependency: string, output: string): string {
    return `npm view ${dependency} versions gave output that is not JSON:\n${output}`;
  }

  public static formatPeerManifestUnreadable(dependency: string, file: string): string {
    return `The root's node_modules holds no readable manifest of ${dependency} after the move: ${file} is missing or not JSON.`;
  }

  public static formatPeerNoVersion(dependency: string, ranges: readonly string[]): string {
    return `npm view gives no published version of ${dependency} inside ${ranges.join(" and ")}.`;
  }

  public static formatPeerRangeInvalid(file: string, dependency: string, taken: string): string {
    return `${file} takes the peer ${dependency} at ${taken}, not ">=<lowest version> <first version refused>".`;
  }

  public static formatReleaseAddonsNotAbsolute(variable: string, value: string): string {
    return `${variable} must be an absolute path, not ${value}.`;
  }

  public static formatReleaseAddonMissing(name: string, addon: string, target: string, variable: string, source: string): string {
    return `${name}'s addon ${addon} has no ${target} build in ${variable}: ${source} is missing.`;
  }

  public static formatNpmPathUnset(variable: string): string {
    return `${variable} is not set; run the build through npm run build.`;
  }

  public static formatAddonBuildFailed(folder: string, addon: string, target: string): string {
    return `${folder}'s addon ${addon} doesn't build for ${target}.`;
  }

  public static formatAddonListInvalid(file: string, field: string): string {
    return `${file}'s ${Resources.noldovaField}.${field} must be a list of kebab-case addon names.`;
  }

  public static formatTarget(platform: string, architecture: string): string {
    return `${platform}-${architecture}`;
  }

  public static formatReleaseBuild(target: string, addon: string): string {
    return `${target}${Resources.pathSeparator}${addon}${Resources.addonExtension}`;
  }

  public static formatNapiVersionDefine(version: number): string {
    return `NAPI_VERSION=${version}`;
  }

  public static formatArchiveUnreadable(archive: string): string {
    return `${archive} could not be read as a gzipped archive.`;
  }

  public static formatArchiveEntryMalformed(archive: string, offset: number): string {
    return `${archive} has a malformed or truncated entry at offset ${offset}.`;
  }

  public static formatGitFailed(gitArguments: readonly string[], exitCode: number | null, errors: string): string {
    return `"${Resources.gitCommand} ${gitArguments.join(Resources.argumentSeparator)}" failed with exit code ${exitCode}: ${errors}`;
  }

  public static formatFieldPath(context: string, key: string): string {
    return `${context}${Resources.fieldPathSeparator}${key}`;
  }

  public static formatGitHubObjectExpected(context: string): string {
    return `${context} must be an object.`;
  }

  public static formatGitHubTextExpected(context: string, key: string): string {
    return `${context}.${key} must be text.`;
  }

  public static formatCompileFailed(sources: string, exitCode: number | null, output: string): string {
    return `Compiling ${sources} failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatPackFailed(name: string, exitCode: number | null, output: string): string {
    return `Packing ${name} failed with exit code ${exitCode}:\n${output}`;
  }

  public static formatKitAccentMissing(theme: string): string {
    return `${theme} sets no --nol-accent of the form #RRGGBB in its first :root block.`;
  }

  public static formatPackageMisnamed(folder: string, name: string, expected: string): string {
    return `${folder}/${Resources.manifestFile} names the package ${name}; the base names it ${expected}.`;
  }

  public static formatProjectTypeCheckFailed(project: string): string {
    return `${project} doesn't type-check.`;
  }

  public static formatBuildCommitInvalid(commit: string): string {
    return `Each package records the full hash of the commit it was built from as its ${Resources.commitField}, but it is "${commit}".`;
  }

  public static formatReadmeMissing(folder: string, name: string): string {
    return `${folder} lacks ${Resources.readmeFile}, which npm shows as ${name}'s page.`;
  }

  public static formatManifestNotObject(file: string): string {
    return `${file} must be a JSON object.`;
  }

  public static formatExportsInvalid(file: string): string {
    return `${file}'s ${Resources.exportsField} must map each subpath to a source.`;
  }

  public static formatExportSourceInvalid(file: string, subpath: string): string {
    return `${file}'s export ${subpath} must name a ${Resources.sourceExtension} source.`;
  }

  public static formatOutputTooLarge(command: string, limit: number): string {
    return `"${command}" wrote more than ${limit} bytes.`;
  }

  public static formatProcessTimedOut(command: string, timeout: number): string {
    return `"${command}" did not finish within ${timeout} ms.`;
  }

  public static formatProcessNotStarted(command: string): string {
    return `"${command}" could not start.`;
  }

  public static formatVersionMismatch(released: unknown, version: string): string {
    return `${Resources.versionFile} holds the version ${JSON.stringify(released)}, but the root ${Resources.manifestFile} holds ${version}; the release reads the first and builds the second, so they must be equal.`;
  }

  public static formatManifestContext(archive: string): string {
    return `${archive}${Resources.contextSeparator}${Resources.manifestEntryName}`;
  }

  public static formatArchiveEntry(folder: string, entry: string): string {
    return `${Resources.archiveFolder}${Resources.pathSeparator}${folder}${Resources.pathSeparator}${entry}`;
  }

  public static formatScopePrefix(scope: string): string {
    return `${scope}${Resources.pathSeparator}`;
  }

  public static formatNotAJsonObject(context: string): string {
    return `${context} is not a JSON object.`;
  }

  public static formatVersionInvalid(version: string | undefined): string {
    return `The version "${version}" is not of the form 0.0.<n>, which the packages use for now.`;
  }

  public static formatCommitInvalid(commit: string | undefined): string {
    return `The commit "${commit}" is not a full 40-character commit hash.`;
  }

  public static formatVariableUnset(name: string): string {
    return `${name} is not set; the shared npm release workflow sets it.`;
  }

  public static formatCheckoutMismatch(head: string, commit: string): string {
    return `The checkout is at ${head}, not at ${commit}, the commit to release.`;
  }

  public static formatArchiveChecked(archive: string, name: string, version: string, commit: string): string {
    return `${archive}: ${name}@${version} from ${commit}`;
  }

  public static formatArchivesFolderMissing(folder: string): string {
    return `There is no folder ${folder} with the archives to release.`;
  }

  public static formatArchiveMissing(folder: string, archive: string): string {
    return `${folder} lacks ${archive}.`;
  }

  public static formatStrayFile(folder: string, file: string, version: string): string {
    return `${folder} holds ${file}, which is not a package's archive at ${version}.`;
  }

  public static formatAddonEntryMissing(archive: string, entry: string): string {
    return `${archive} lacks ${entry}, an addon its package declares, so the package would fail where it loads it.`;
  }

  public static formatScriptEntryMissing(archive: string, entry: string): string {
    return `${archive} lacks ${entry}, a script for macOS that its part's sources hold, so the package would fail where it runs it.`;
  }

  public static formatManifestEntryMissing(archive: string): string {
    return `${archive} has no ${Resources.manifestEntryName}.`;
  }

  public static formatFieldMismatch(archive: string, field: string, found: string, expected: string): string {
    return `${archive}: its ${field} is "${found}", not "${expected}".`;
  }

  public static formatOutsideScope(archive: string, name: string, scope: string): string {
    return `${archive}: ${name} is outside the scope ${scope}.`;
  }

  public static formatMarkedPrivate(archive: string): string {
    return `${archive}: is marked private, so npm would refuse to publish it.`;
  }

  public static formatCommitMissing(archive: string, commit: string): string {
    return `${archive}: records no ${Resources.commitField}, so it doesn't name ${commit} as the commit it was built from.`;
  }

  public static formatDependencyMismatch(archive: string, dependency: string, range: string, version: string): string {
    return `${archive}: its dependency ${dependency} is "${range}", not exactly "${version}".`;
  }

  public static formatReleaseFindings(findings: readonly string[]): string {
    return findings.join(Resources.lineBreak);
  }

  public static formatCoverageExcludes(file: string, reason: string): string {
    return `Coverage excludes ${file}: ${reason}`;
  }

  public static formatExclusionFileMissing(file: string): string {
    return `${Resources.readmeFile} excludes ${file} from coverage, but no such file exists.`;
  }

  public static formatChecksRowInvalid(table: string, row: string): string {
    return `${Resources.readmeFile}'s ${table} row "${row}" doesn't name a file in backticks and why.`;
  }

  public static formatCoverageExcludeOption(file: string): string {
    return `--test-coverage-exclude=${file}`;
  }

  public static formatTestNamePattern(filter: string): string {
    return `--test-name-pattern=${filter}`;
  }

  public static formatTapReporterOptions(file: string): readonly string[] {
    return ["--test-reporter=tap", `--test-reporter-destination=${file}`];
  }

  public static formatRecordReporterOptions(reporter: string, file: string): readonly string[] {
    return [`--test-reporter=${reporter}`, `--test-reporter-destination=${file}`];
  }

  public static formatTestTimeoutOption(timeout: number): string {
    return `--test-timeout=${timeout}`;
  }

  public static formatNativeAlone(option: string): string {
    return `${option} takes no filter.`;
  }

  public static formatRecordLine(text: string): string {
    return `${text}${Resources.lineBreak}`;
  }

  public static formatTestLocation(file: string, line: number, column: number, nesting: number): string {
    return `${file}:${line}:${column}:${nesting}`;
  }

  public static formatTestRecordsMissing(file: string): string {
    return `The test run wrote no records to ${file}.`;
  }

  public static formatTestRecordUnreadable(file: string, line: string): string {
    return `${file} holds a line that is not a test's record: ${line}`;
  }

  public static formatHangLimit(suite: string, limit: number, reason: string): string {
    return `${suite}: a test still running after ${limit} ms fails as hung, since ${reason}.`;
  }

  public static formatTestHung(file: string, name: string): string {
    return `${file}: "${name}" reached its suite's hang limit.`;
  }

  public static formatTestFileSlow(file: string, duration: number): string {
    return `${file} took ${duration} ms in this run, over the ${Resources.testFileBudgetMs} ms a unit test file may take; npm test fails nothing for time.`;
  }

  public static formatSkipWithoutReason(file: string, name: string): string {
    return `${file}: "${name}" is skipped without a reason; a skip names why, beside its test.`;
  }

  public static formatTimingOptions(option: string): string {
    return `npm run test:timing takes no filter, only ${option} for the native timing checks.`;
  }

  public static formatTimingCheckName(file: string, line: number, name: string): string {
    return `${file}:${line} "${name}"`;
  }

  public static formatTimingUnmeasured(check: string): string {
    return `${check} reports no measurement; a timing check measures without asserting its time, and reports it with t.diagnostic("timing: <measured> ms, limit <limit> ms").`;
  }

  public static formatTimingResult(check: string, median: number, runs: number, limit: number): string {
    return `${check}: ${median} ms at its median of ${runs} runs, against a limit of ${limit} ms.`;
  }

  public static formatTimingOver(check: string, median: number, limit: number): string {
    return `${check} takes ${median} ms at its median of ${Resources.timingRuns} runs, over its ${limit} ms limit with the ${Math.round(Resources.timingMargin * 100)}% margin a quiet test machine's jitter needs; one run slowed by a busy machine doesn't move the median.`;
  }

  public static formatTestWaitChecked(files: number, listed: number): string {
    return `Checked ${files} test files for fixed pauses; ${Resources.readmeFile} lists ${listed} that may pause.`;
  }

  public static formatTestWaitPause(file: string, line: number): string {
    return `${file}:${line}: pauses for a fixed time or a fixed number of event-loop turns; wait on the event or the promise instead, or list the file in ${Resources.readmeFile}'s Checks section, under "${Resources.pausesHeader}", with its reason.`;
  }

  public static formatTestWaitStale(line: number, file: string): string {
    return `${Resources.readmeFile}:${line}: lists ${file}, which no longer pauses for a fixed time; remove its row.`;
  }
}
