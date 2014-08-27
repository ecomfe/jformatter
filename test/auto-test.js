var jformatter = require('../jformatter.js');
var fs = require('fs');
var ROOT = require('path').dirname(__filename);

//test for default code style
fs.readdir(ROOT, function (err, files) {
    var allPass = true;
    files.forEach(function (path) {
        pathArr = path.split('.');
        if (pathArr[0] === 'case' && pathArr[pathArr.length - 1] === 'js') {
            pathArr[0] = 'expect';
            var expect = ROOT + '/' + pathArr.join('.');
            if (fs.existsSync(expect)) {
                var formattedString = jformatter.formatFile(ROOT + '/' + path);
                if (formattedString === fs.readFileSync(expect, 'utf-8')) {
                    console.log(path + ' ... pass.');
                } else {
                    allPass = false;
                    console.log(path + ' ... fail.');
                }
            }
        }
    });
    if (allPass) {
        console.log('\nEverything is ok.\n');
    } else {
        console.log('\nSomething wrong!\n');
    }
});

//test for code style config
