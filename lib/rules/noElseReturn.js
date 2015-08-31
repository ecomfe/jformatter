var util = require('../util');
exports.fix = function (node, pa) {
    if (node.type === 'IfStatement' && node.alternate) {
        var consequent = node.consequent;
        var alternate = node.alternate;
        var lastConsequentStatement;
        var lastAlternateStatement;


        if (consequent.type === 'BlockStatement' && consequent.body.length > 0) {
            lastConsequentStatement = consequent.body[consequent.body.length - 1];
            if (lastConsequentStatement.type === 'IfStatement' && exports.fix(lastConsequentStatement)) {
                lastConsequentStatement = lastConsequentStatement.consequent.body[
                    lastConsequentStatement.consequent.body.length - 1
                ];
            }
        } else {
            lastConsequentStatement = consequent; // 这里如果body.length为0会被赋值BlockStatement，但是不影响后面判断
        }

        if (alternate.type === 'BlockStatement' && alternate.body.length > 0) {
            lastAlternateStatement = alternate.body[alternate.body.length - 1];
        } else {
            lastAlternateStatement = alternate;
        }

        if (lastConsequentStatement.type === 'ReturnStatement') {
            var prev = alternate.startToken.prev;
            while (prev.type !== 'Keyword' && prev.value !== 'else') {
                prev = prev.prev;
            }
            util.removeToken(prev);

            if (alternate.type === 'BlockStatement') {
                util.removeToken(alternate.startToken);
                util.removeToken(alternate.endToken);

            }
            consequent.body.push.apply(consequent.body, alternate.body);
            delete node.alternate;
            return true;
        }
    }
};
