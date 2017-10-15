const fs = require('fs');
const path = require('path');

const uglify = require('uglify-es');
const rimraf = require('rimraf');
const ncp = require('ncp').ncp;
const CleanCSS = require('clean-css');

const buildDir = 'dist';

try {
    rimraf.sync('./' + buildDir);
} catch(e) {}

fs.mkdirSync('./' + buildDir);

const mainHtmlFile = 'index.html';

const devFile = fs.readFileSync(mainHtmlFile, 'utf8');
const builtMarkupPath = path.join(buildDir, mainHtmlFile);
const builtJSPath = builtMarkupPath.split('.')[0] + '.min.js';
const builtCSSPath = builtMarkupPath.split('.')[0] + '.min.css';
const builtJSFile = mainHtmlFile.replace('html', 'min.js');
const builtCSSFile = mainHtmlFile.replace('html', 'min.css');

const lines = devFile.split('\n');

let jsOut = '';
let cssOut = '';
let markupOut = '';

let internalScriptSrc = '';

let inDevOnly = false;
let inBuildBlock = false;
let inBuildCssBlock = false;
let inInternalScript = false;

const externalScriptRegex = /<script[^>]*src=['"]([^'"]*)['"].*>/i;
const externalStylesheetRegex = /<link[^>]*rel=['"]stylesheet['"][^>]*href=['"]([^'"]*)['"].*>/i;
const internalScriptStartRegex = /(<script.*>)/i;
const internalScriptEndRegex = /<\/script>/i;
const buildStartRegex = /<!--\s*build-js\s*-->/i;
const buildEndRegex = /<!--\s*\/build-js\s*-->/i;
const buildCssStartRegex = /<!--\s*build-css\s*-->/i;
const buildCssEndRegex = /<!--\s*\/build-css\s*-->/i;
const devOnlyStartRegex = /<!--\s*dev-only\s*-->/i;
const devOnlyEndRegex = /<!--\s*\/dev-only\s*-->/i;


let externalFile;

for (let x = 0, len = lines.length; x < len; ++x) {
    const originalLine = lines[x];
    const line = originalLine.trim();

    if (line.match(internalScriptEndRegex) && inInternalScript && inBuildBlock && !inDevOnly) {
        inInternalScript = false;
        jsOut += internalScriptSrc + '\n';
        internalScriptSrc = '';
        continue;
    }

    if (inInternalScript) {
        internalScriptSrc += originalLine + '\n';
        continue;
    }

    if (line.match(buildStartRegex)) {
        inBuildBlock = true;
        continue;
    }

    if (line.match(buildEndRegex)) {
        inBuildBlock = false;
        markupOut += '<script src="' + builtJSFile + '"></script>\n';
        continue;
    }

    if (line.match(buildCssStartRegex)) {
        inBuildCssBlock = true;
        continue;
    }

    if (line.match(buildCssEndRegex)) {
        inBuildCssBlock = false;
        markupOut += '<link rel="stylesheet" href="' + builtCSSFile + '">\n';
        continue;
    }

    if (line.match(devOnlyStartRegex)) {
        inDevOnly = true;
        continue;
    }

    if (line.match(devOnlyEndRegex)) {
        inDevOnly = false;
        continue;
    }

    const isExternalStylesheet = line.match(externalStylesheetRegex);
    if (isExternalStylesheet && inBuildCssBlock && !inDevOnly) {
        externalFile = path.join('.', isExternalStylesheet[1]);
        cssOut += fs.readFileSync(externalFile, 'utf8') + '\n';
        continue;
    }

    const isExternalScript = line.match(externalScriptRegex);
    if (isExternalScript && inBuildBlock && !inDevOnly) {
        externalFile = path.join('.', isExternalScript[1]);
        jsOut += fs.readFileSync(externalFile, 'utf8') + '\n';
        continue;
    }

    if (line.match(internalScriptStartRegex) && inBuildBlock && !inDevOnly) {
        inInternalScript = true;
        continue;
    }

    if (!inBuildBlock && !inDevOnly && !inBuildCssBlock) {
        markupOut += originalLine + '\n';
    }

}

let finalJsOut = jsOut;

const uglifyResult = uglify.minify(finalJsOut);
if (uglifyResult.error) {
    console.error(uglifyResult.error);
} else {
    finalJsOut = uglifyResult.code;
}

const cleanCssResult = new CleanCSS({level: 2}).minify(cssOut);
if (cleanCssResult.errors && cleanCssResult.errors.length) {
    console.error(cleanCssResult.errors);
} else {
    cssOut = cleanCssResult.styles;
}

fs.writeFileSync(builtMarkupPath, markupOut);
fs.writeFileSync(builtJSPath, finalJsOut);
fs.writeFileSync(builtCSSPath, cssOut);

// Copy stuff into dist
const copyList = [
    'backgrounds',
    'icons',
    'LICENSE',
    'manifest.json',
    'README.md'
];

copyList.forEach(function(file) {
    ncp(file, path.join(buildDir, file), function(e) {
        if (e) {
            console.log(e);
        }
    });
});
