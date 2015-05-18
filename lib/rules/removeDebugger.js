var util = require('../util');
var addCurly = function (start, end) {
    util.insertBefore(start, {
        type: 'Punctuator',
        value: '{'
    });
    util.insertAfter(end, {
        type: 'Punctuator',
        value: '}'
    });
};

exports.fix = function (node) {
};