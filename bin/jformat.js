#!/usr/bin/env node

var jformatter = require('jformatter');

function showUsage() {
    console.log('Usage:');
    console.log('   jfromat file.js');
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

console.log(jformatter.formatFile(targetFile));
