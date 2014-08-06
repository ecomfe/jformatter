#!/usr/bin/env node

var jformatter = require('jformatter');

function showUsage() {
    console.log('Usage:');
    console.log('   jformatter file.js');
    console.log();
    process.exit(1);
}

if (process.argv.length < 2) {
    showUsage();
}

var targetFile = null;
process.argv.forEach(function(arg, index) {
    if (index === 2) {
        targetFile = arg;
    }
});

if (typeof targetFile !== 'string') {
    showUsage();
    process.exit(1);
}

var getConfig = function (targetFile) {
    var config = {};
    var path = require('path');
    var fs = require('fs');
    var absolutePath = path.resolve(targetFile);
    var currentDir = path.dirname(absolutePath);
    var configPath = null;

    while (currentDir !== '/') {
        if (fs.existsSync(currentDir + '/.jformatterrc')) {
            configPath = currentDir + '/.jformatterrc';
            break;
        }
    }

    if (configPath) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    return config ? config : {};
};

console.log(jformatter.formatFile(targetFile, getConfig(targetFile)));
