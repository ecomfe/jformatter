exports.fix = function (node) {
    if (node.type === 'NewExpression' && constructors.indexOf(node.callee.name) !== -1) {
        var util = require('../util');
        var constructors = ['Number', 'String', 'Boolean'];
        util.removeToken(node.startToken);
    }
};
