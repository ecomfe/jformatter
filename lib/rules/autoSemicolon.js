exports.fix = function (node) {
    var util = require('../util');
    var fixType = ['VariableDeclaration', 'ExpressionStatement', 'ReturnStatement'];

    if (fixType.indexOf(node.type) !== -1 && !(node.endToken.type === 'Punctuator' && node.endToken.value === ';')) {
        var token = node.endToken;
        while (util.isLineBreak(token)) {
            token = token.prev;
        }
        util.insertAfter(token, {
            type: 'Punctuator',
            value: ';'
        });
    }
};
