exports.fix = function (node) {
    if (node.type === 'Literal' && typeof node.value === 'string') {
        var util = require('../util');
        var value = node.value;
        value = value.replace(/\\/g, '\\\\');
        node.startToken.value = '\'' + value.replace(/'/g, '\\\'') + '\'';
    }
};
