/**
 * fix something
 * @param {string} source
 * @param {Object} fixConfig
 * @returns {string}
 */
exports.fix = function (source, fixConfig) {
    var rocambole = require('rocambole');
    var ast = rocambole.parse(source);

    var alterToken = function (token) {
        if (token.type === 'LineComment') {
            if (fixConfig.prefixSpaceToLineComment && token.value && token.value.charAt(0) !== ' ') {
                token.raw = '// ' + token.value;
            }
        } else if (token.type === 'BlockComment') {
            if (fixConfig.alterCommonBlockCommentToLineComment) {
                var valueArr = token.value.trim().split('\n');
                // /^\s*(js|css|html|less)[a-z]+
                if (valueArr[0].trim() !== '*' && !(valueArr.length === 1 && /jshint|jscs|eslint|csslint|csshint|csscomb|lesslint|lesshint|htmllint|htmlhint/.test(valueArr[0]))) {
                    var commentArr = [];
                    valueArr.forEach(function (line) {
                        line = line.trim();
                        if (line.charAt(0) === '*') {
                            line = line.substr(1);
                        }
                        commentArr.push('// ' + line.trim());
                    });
                    token.raw = commentArr.join('\n');
                }
            }
        }
    };

    var token = ast.startToken;
    while (token !== ast.endToken.next) {
        alterToken(token);
        token = token.next;
    }

    rocambole.recursive(ast, function (node) {
        // fix.singleVariableDeclarator
        if (fixConfig.singleVariableDeclarator && node.type === 'VariableDeclaration') {
            if (node.declarations.length > 1) {
                var token = node.startToken;
                while (token !== node.endToken.next) {
                    //do stuff
                    if (token.type === 'Punctuator' && token.value === ',') {
                        token.value = ';';
                    }
                    token = token.next;
                }

                for (var i = 1; i < node.declarations.length; i++) {
                    var declaration = node.declarations[i];
                    var varToken = {
                        type: 'Keyword',
                        value: 'var',
                        prev: declaration.startToken.prev,
                        next: {
                            type: 'WhiteSpace',
                            value: ' ',
                            next: declaration.startToken.next.prev
                        }
                    };
                    declaration.startToken.prev.next = varToken;
                    declaration.startToken = varToken;
                    declaration.startToken.next.prev = declaration.startToken;
                }
            }
        }

        // fix.fixInvalidTypeof
        if (fixConfig.fixInvalidTypeof && node.type === 'BinaryExpression') {
            if (node.left && node.left.type === 'UnaryExpression' && node.left.operator === 'typeof') {
                if (node.left.argument.type === 'Literal') {
                    node.right.startToken.value = '\'' + typeof node.left.argument.value + '\'';
                } else if (node.left.argument.type === 'ArrayExpression') {
                    node.right.startToken.value = '\'object\'';
                } else if (node.left.argument.type === 'Identifier' && node.left.argument.name === 'undefined') {
                    node.right.startToken.value = '\'undefined\'';
                }
            }
        }
    });

    return ast.toString();
};
