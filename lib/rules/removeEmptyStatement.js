exports.fix = function (node) {
    var util = require('../util');
    if (node.type === 'EmptyStatement') {
        util.removeToken(node.endToken);
    }
};
