exports.fix = function (node) {
    var util = require('../util');

    if (node.type === 'Literal' && typeof node.value === 'string') {
        var value = node.value;
        value = value.replace(/\\/g, '\\\\');
        node.startToken.value = '\'' + value.replace(/'/g, '\\\'') + '\'';
    }
};
