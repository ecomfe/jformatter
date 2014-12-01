exports.fix = function (node) {
    var fixType = ['VariableDeclaration', 'ExpressionStatement', 'ReturnStatement'];

    if (fixType.indexOf(node.type) !== -1 && !(node.endToken.type === 'Punctuator' && node.endToken.value === ';')) {
        var util = require('../util');
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
