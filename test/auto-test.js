var jformatter = require('../jformatter.js');
var fs = require('fs');
fs.readdir('.', function (err, files) {
    files.forEach(function (path) {
        pathArr = path.split('.');
        if (pathArr[0] === 'case' && pathArr[pathArr.length - 1] === 'js') {
            pathArr[0] = 'expect';
            var expect = pathArr.join('.');
            if (fs.existsSync(expect)) {
                var formattedString = jformatter.formatFile(path);
                if (formattedString === fs.readFileSync(expect, 'utf-8')) {
                    console.log(path + ' ... pass.');
                } else {
                    console.log(path + ' ... fail.');
                }
            }
        }
    });
});
