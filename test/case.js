var fs=require('fs'); var jformatter=require('../jformatter.js');
var differ=require('differ-cli/lib/differ');
var ROOT=require('path').dirname(__filename);
var n = -1;

// test for default code style
console.log('Testing code style cases ...\n');
fs.readdir(ROOT+'/test.style/case', function (err, files) {
    var allPass = true;
    files.forEach(function (path) {
        var pathArr=path.split('.');
        if (pathArr[0]==='case' && pathArr[pathArr.length-1] === 'js') {
            pathArr[0] = 'check';
            var checkFile = ROOT + '/test.style/check/' + pathArr.join('.');
            if (fs.existsSync(checkFile)) {
                var formattedString = jformatter.formatFile(ROOT + '/test.style/case/' + path);
                if (formattedString === fs.readFileSync(checkFile, 'utf-8')) {
                    console.log(path+' ... pass.');
                } else {
                    allPass = false;
                    console.log(path + ' ... fail.');
                    console.log(differ(formattedString, fs.readFileSync(checkFile, 'utf-8')));
                }
            }
        }
    });
    if (allPass) {
        console.log('\nCode style: everything is ok.\n');
    } else {
        console.log('\nCode style: something wrong!\n');
    }
});

