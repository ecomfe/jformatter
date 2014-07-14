(function () {
    var format = function (string) {
        //TODO if while 自动加大括号
        //TODO 自动加分号
        //TODO 换行之后加缩进是不对的，要在当前一行开始的时候加缩进（通常就是一个语句开始）

        var codeStyle = {
            lineSeparator: '\n', //done
            maxLength: 120, //todo
            wrapIfLong: false, //todo
            indents: '    ', //done
            spaces: {
                around: {
                    unaryOperators: false, //todo
                    binaryOperators: true, //done
                    ternaryOperators: true //done
                },
                before: {
                    functionDeclarationParentheses: false, //done function foo() {
                    functionExpressionParentheses: true, //done var foo = function () {
                    keywordsParentheses: true, //if (), for (), while (), ...
                    leftBrace: true, // function () {, if () {, do {, try { ...
                    keywords: true // if {} else {}, do {} while (), try {} catch () {} finally
                },
                within: {
                    parentheses: false //( a, b, c ) , if ( true ) or (a, b, c) , if (true)
                },
                other: {
                    beforeComma: false,
                    afterComma: true,
                    beforePropertyNameValueSeparator: false, // {key: value}
                    afterPropertyNameValueSeparator: true
                }
            },
            bracesPlacement: { //1. same line 2. next line
                functionDeclaration: 1,
                other: 1
            },
            functionCallArguments: {

            }
        };

        var NEXT_LINE = codeStyle.lineSeparator;
        var INDENT = codeStyle.indents;

        var indentLevel = 0;

        var isForStatement = false;

        var outputBuffer = [];

        var obPush = function (value) {
            outputBuffer.push(value);
        };

        var obPop = function () {
            return outputBuffer.pop();
        };

        var obIndent = function () {
            for (var i = 0; i < indentLevel; i++) {
                outputBuffer.push(INDENT);
            }
        };

        /**
         * @param {object} node 一定是个含有type属性的节点对象
         * @param {string} keyName
         */
        var exec = function (node, keyName) {
            onEnterNode(node, keyName);
            //遍历当前节点寻找下属节点递归
            for (var key in node) {
                if (node.hasOwnProperty(key)) {
                    if (node[key] && node[key].type) {
                        exec(node[key], key);
                    } else {
                        if (Object.prototype.toString.call(node[key]) === '[object Array]') {
                            node[key].forEach(function (sub) {
                                if (sub.type) {
                                    exec(sub, key);
                                }
                            });
                        }
                    }
                }
            }
            onExitNode(node, keyName);
        };

        /**
         * @param token
         * @param {function} [callback]
         */
        var operateToken = function (token, callback) {
            if (outputBuffer[outputBuffer.length - 1] === NEXT_LINE) {
                obIndent();
            }

            if (token.type !== 'WhiteSpace' && token.type !== 'LineBreak' && token.type !== 'LineComment' && token.type !== 'BlockComment') {
                doInsertBefore(token);
                obPush(token.value);
                doInsertAfter(token);
                if (callback) {
                    callback(token);
                }
            } else if (token.type === 'LineComment') {
                obPush(token.raw);
                obPush(token.next.value);
            } else if (token.type === 'BlockComment') {
                obPush(token.raw);
                obPush(token.next.value);
            }
        };

        /**
         * 同步range范围之前所有tokens
         * @param {object} node
         * @param {function} [callback]
         */
        var toPrevToken = function (node, callback) {
            var range = node.range;
            for (var token; tokenIndex < tokenLen; tokenIndex++) {
                token = tokens[tokenIndex];

                if (token.range[1] > range[0]) {
                    break;
                }

                operateToken(token, callback);
            }
        };

        /**
         * 同步range范围内所有tokens，同步之后tokenIndex已经到达下一个token
         * @param {object} node
         * @param {function} [callback]
         */
        var toNextToken = function (node, callback) {
            var range = node.range;
            for (var token; tokenIndex < tokenLen; tokenIndex++) {
                token = tokens[tokenIndex];

                if (token.range[1] > range[1]) {
                    break;
                }

                operateToken(token, callback);
            }
        };

        var toLastToken = function (node, callback) {
            var range = node.range;
            for (var token; tokenIndex < tokenLen; tokenIndex++) {
                token = tokens[tokenIndex];

                if (token.range[1] >= range[1]) {
                    break;
                }

                operateToken(token, callback);
            }
        };

        var forwardToken = function () {
            var token = tokens[tokenIndex];
            operateToken(token);
            tokenIndex++;
            return token;
        };

        var backwardToken = function () {
            tokenIndex--;

            var token = tokens[tokenIndex]; //这是当前token，要把当前token从ob中拿掉
            var ob;
            while (true) {
                ob = obPop();
                if (ob === token.value) {
                    break;
                }
            }

            return token;
        };

        var enterHandlers = {
            'CallExpression': function (node) {
                node['arguments'].forEach(function (arg, index, arr) {
                    arg.onExit = function () {
                        toLastToken(arg);
                        var token;
                        while (token = forwardToken()) {
                            if (token.value === ',') {
                                obPush(' ');
                                break;
                            }
                        }
                    };

                    if (index === arr.length - 1) {
                        arg.onExit = null;
                    }
                });
            },
            'ConditionalExpression': function (node) {
                if (codeStyle.spaces.around.ternaryOperators) {
                    node.test.onExit = function () {
                        toLastToken(node.test);
                        var token;
                        while (true) {
                            token = forwardToken();
                            if (token.value === '?') {
                                backwardToken();
                                obPush(' ');
                                forwardToken();
                                obPush(' ');
                                break;
                            }
                        }
                    };

                    node.consequent.onExit = function () {
                        toLastToken(node.consequent);
                        var token;
                        while (true) {
                            token = forwardToken();
                            if (token.value === ':') {
                                backwardToken();
                                obPush(' ');
                                forwardToken();
                                obPush(' ');
                                break;
                            }
                        }
                    };
                }
            },
            'DoWhileStatement': function (node) {
                node.test.onExit = function () {
                    toLastToken(node.test);
                    var token;
                    while (true) {
                        token = backwardToken();
                        if (token.value === 'while') {
                            obPush(' ');
                            break;
                        }
                    }
                    toLastToken(node.test);
                };
            },
            'ForStatement': function (node) {
                isForStatement = true;

                if (node.test) {
                    node.test.onBeforeEnter = function () {
                        obPush(' ');
                    };
                }

                if (node.update) {
                    node.update.onBeforeEnter = function () {
                        obPush(' ');
                    };
                }
            },
            'ForInStatement': function (node) {
                node.left.isForInLeft = true;
                node.right.isForInRight = true;
            },
            'VariableDeclaration': function (node) {
                if (node.declarations.length > 0) {
                    node.declarations[node.declarations.length - 1].isLastDeclaration = true;
                }
            },
            'FunctionDeclaration': function (node) {
                if (codeStyle.spaces.before.functionDeclarationParentheses) {
                    node.id.onExit = function () {
                        toNextToken(node.id);
                        obPush(' ');
                    };
                }
                node.params.forEach(function (param, index, arr) {
                    param.onExit = function () {
                        toLastToken(param);
                        var token;
                        while (true) {
                            token = forwardToken();
                            if (token.value === ',') {
                                obPush(' ');
                                break;
                            }
                        }
                    };
                    if (index === arr.length - 1) {
                        param.onExit = null;
                    }
                });
            },
            'FunctionExpression': function (node) {
                //if node has id function keyword must have space after
                if (!codeStyle.spaces.before.functionExpressionParentheses && node.id) {
                    node.id.onExit = function () {
                        obPush(' ');
                    };
                }
                node.params.forEach(function (param, index, arr) {
                    param.onExit = function () {
                        toLastToken(param);
                        var token;
                        while (true) {
                            token = forwardToken();
                            if (token.value === ',') { //TODO here maybe a bug
                                obPush(' ');
                                break;
                            }
                        }
                    };
                    if (index === arr.length - 1) {
                        param.onExit = null;
                    }
                });
            },
            'BlockStatement': function (node) {
                if (node.body.length > 0) {
                    indentLevel++;
                }

                if (!node.isIfStatementAlternate) {
                    //here push space before { and then forward { then next line
                    obPush(' ');
                }
                forwardToken();
                obPush(NEXT_LINE);
            },
            'IfStatement': function (node) {
                if (node.alternate) {
                    /**
                     * @usage BlockStatement
                     * @type {boolean}
                     */
                    node.alternate.isIfStatementAlternate = true;
                }

                //if if has alternate, should insert space after consequent(before else)
                if (node.consequent && node.consequent.type === 'BlockStatement') {
                    node.consequent.onExit = function () {
                        toNextToken(node.consequent);
                        obPush(' ');
                    }
                }

                //if consequent is not a block, should insert next line before it
                if (node.consequent && node.consequent.type !== 'BlockStatement') {
                    node.consequent.onBeforeEnter = function () {
                        obPush(NEXT_LINE);
                        indentLevel++;
                    };
                    node.consequent.onExit = function () {
                        indentLevel--;
                    };
                }
                //if alternate is not a block, should insert next line before it
                if (node.alternate && node.alternate.type !== 'BlockStatement' && node.alternate.type !== 'IfStatement') {
                    node.alternate.onBeforeEnter = function () {
                        obPush(NEXT_LINE);
                        indentLevel++;
                    };
                    node.alternate.onExit = function () {
                        indentLevel--;
                    };
                }
            },
            'ObjectExpression': function (node) {
                //go to { and next line
                if (node.properties.length > 0) {
                    forwardToken();
                    obPush(NEXT_LINE);
                }
                indentLevel++;
                if (node.properties.length > 0) {
                    node.properties[node.properties.length - 1].isLastObjectProperty = true;
                }
            },
            'Property': function (node) {
                node.key.onExit = function () {
                    toNextToken(node.key);
                    forwardToken();
                    obPush(' ');
                }
            },
            'ArrayExpression': function (node) {
                if (node.elements.length > 0) {
                    forwardToken(); //[
                    obPush(NEXT_LINE);
                    indentLevel++;

                    node.elements.forEach(function (e, index, arr) {
                        e.onBeforeEnter = function () {
                        };
                        e.onExit = function () {
                            toNextToken(e);
                            if (index !== arr.length - 1) {
                                forwardToken();
                            }
                            obPush(NEXT_LINE);
                        };
                    });
                }
            },
            'SwitchStatement': function (node) {
                node.discriminant.onExit = function () {
                    indentLevel++;
                    toNextToken(node.discriminant);
                    var token;
                    while (true) {
                        token = forwardToken();
                        if (tokens[tokenIndex].value.charAt(0) === '{') {
                            obPush(' ');
                            forwardToken();
                            obPush(NEXT_LINE);
                            break;
                        }
                    }
                };

                node.cases.forEach(function (c) {
                    c.onExit = function () {
                        indentLevel--;
                    }
                });
            },
            'SwitchCase': function (node) {
                if (node.test) {
                    node.test.onExit = function () {
                        toNextToken(node.test);
                        forwardToken();
                        obPush(NEXT_LINE);
                        indentLevel++;
                    }
                } else {
                    forwardToken();
                    forwardToken();
                    obPush(NEXT_LINE);
                    indentLevel++;
                }
            }
        };

        var exitHandlers = {
            'ContinueStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'DoWhileStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'Literal': function (node) {
                if (node.isArrayEl && !node.isLastEl) {
                    toNextToken(node);
                    if (isArrayMultiLine) {
                        forwardToken();
                        obPush(NEXT_LINE);
                    } else {
                        forwardToken();
                        obPush(' ');
                    }
                }
            },
            'Identifier': function (node) {
                if (node.isArrayEl && !node.isLastEl) {
                    toNextToken(node);
                    if (isArrayMultiLine) {
                        forwardToken();
                        obPush(NEXT_LINE);
                    } else {
                        forwardToken();
                        obPush(' ');
                    }
                }
            },
            'ForStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);

                isForStatement = false; //todo 去掉这个全局变量用别的解决方法
            },
            'ForInStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'VariableDeclaration': function (node, key) {
                toNextToken(node);
                if ((!isForStatement || key !== 'init') && !node.isForInLeft) {
                    obPush(NEXT_LINE);
                }
            },
            'VariableDeclarator': function (node) {
                if (!node.isLastDeclaration) {
                    toNextToken(node);
                    forwardToken();
                    obPush(' ');
                }
            },
            'FunctionExpression': function (node) {
                if (node.isArrayEl) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush(NEXT_LINE);
                    }
                }
            },
            'BlockStatement': function (node) {
                if (node.body.length > 0) {
                    indentLevel--;
                }
            },
            'IfStatement': function (node) {
                if (!node.isIfStatementAlternate) {
                    toNextToken(node);
                    obPush(NEXT_LINE);
                }
            },
            'ExpressionStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'ThrowStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'ReturnStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'WhileStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'BreakStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'ObjectExpression': function (node) {
                indentLevel--;

                if (node.properties.length > 0) {
                    toLastToken(node);
                    obPush(NEXT_LINE);
                }

                if (node.isArrayEl && isArrayMultiLine) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush(NEXT_LINE);
                    }
                }
            },
            'Property': function (node) {
                toNextToken(node);
                if (!node.isLastObjectProperty) {
                    forwardToken();
                    obPush(NEXT_LINE);
                }
            },
            'ArrayExpression': function (node) {
                if (node.elements.length > 0) {
                    indentLevel--;
                }
            },
            'CallExpression': function (node) {
                if (node.isArrayEl) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush(NEXT_LINE);
                    }
                }
            },
            'FunctionDeclaration': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
                obPush(NEXT_LINE);
            },
            'TryStatement': function (node) {
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'UnaryExpression': function (node) {
                toLastToken(node);
                if (node.operator === '+' || node.operator === '-') { //delete is unary expression
                    obPop(); //this should be ' '
                    var op = obPop();
                    obPop(); //this should be ' ' before op
                    obPush(op);
                }
            },
            'SwitchStatement': function (node) {
                indentLevel--;
                toNextToken(node);
                obPush(NEXT_LINE);
            },
            'SwitchCase': function (node) {
            }
        };

        var insertBefore = {
            'Keyword': {
                'in': ' ',
                'instanceof': ' ',
                'catch': ' ',
                'finally': ' '
            },
            'Punctuator': {
                '=': ' ', //Assignment operators
                '+=': ' ',
                '-=': ' ',
                '*=': ' ',
                '/=': ' ',
                '%=': ' ',
                '<<=': ' ',
                '>>=': ' ',
                '>>>=': ' ',
                '&=': ' ',
                '^=': ' ',
                '|=': ' ',
                '==': ' ', //Comparison operators
                '!=': ' ',
                '===': ' ',
                '!==': ' ',
                '>': ' ',
                '>=': ' ',
                '<': ' ',
                '<=': ' ',
                '+': ' ', //Arithmetic operators
                '-': ' ',
                '*': ' ',
                '/': ' ',
                '%': ' ',
                '++': '',
                '--': '',
                '&': ' ', //Bitwise operators
                '|': ' ',
                '^': ' ',
                '~': ' ',
                '<<': ' ',
                '>>': ' ',
                '>>>': ' ',
                '&&': ' ', //Logical operators
                '||': ' ',
                '!': ''
            }
        };
        var insertAfter = {
            'Keyword': {
                'var': ' ',
                'if': codeStyle.spaces.before.keywordsParentheses ? ' ' : '',
                'else': ' ',
                'function': codeStyle.spaces.before.functionExpressionParentheses ? ' ' : '',
                'throw': ' ',
                'return': ' ',
                'delete': ' ',
                'for': codeStyle.spaces.before.keywordsParentheses ? ' ' : '',
                'while': codeStyle.spaces.before.keywordsParentheses ? ' ' : '',
                'new': ' ',
                'in': ' ',
                'typeof': ' ',
                'instanceof': ' ',
                'catch': ' ',
                'switch': codeStyle.spaces.before.keywordsParentheses ? ' ' : '',
                'case': ' '
            },
            'Punctuator': {
                '=': ' ', //Assignment operators
                '+=': ' ',
                '-=': ' ',
                '*=': ' ',
                '/=': ' ',
                '%=': ' ',
                '<<=': ' ',
                '>>=': ' ',
                '>>>=': ' ',
                '&=': ' ',
                '^=': ' ',
                '|=': ' ',
                '==': ' ', //Comparison operators
                '!=': ' ',
                '===': ' ',
                '!==': ' ',
                '>': ' ',
                '>=': ' ',
                '<': ' ',
                '<=': ' ',
                '+': ' ', //Arithmetic operators
                '-': ' ',
                '*': ' ',
                '/': ' ',
                '%': ' ',
                '++': '',
                '--': '',
                '&': ' ', //Bitwise operators
                '|': ' ',
                '^': ' ',
                '~': ' ',
                '<<': ' ',
                '>>': ' ',
                '>>>': ' ',
                '&&': ' ', //Logical operators
                '||': ' ',
                '!': ''
            }
        };

        //codeStyle
        if (!codeStyle.spaces.around.binaryOperators) {
            delete insertBefore.Punctuator;
            delete insertAfter.Punctuator;
        }

        var doInsertBefore = function (token) {
            if (insertBefore[token.type] && insertBefore[token.type][token.value]) {
                obPush(insertBefore[token.type][token.value]);
            }
        };
        var doInsertAfter = function (token) {
            if (insertAfter[token.type] && insertAfter[token.type][token.value]) {
                obPush(insertAfter[token.type][token.value]);
            }
        };

        //在处理此节点和子节点之前进行的逻辑
        var onEnterNode = function (node, keyName) {
            toPrevToken(node);

            if (node.onBeforeEnter) {
                node.onBeforeEnter();
            }

            if (enterHandlers[node.type]) {
                enterHandlers[node.type](node, keyName);
            }
        };

        //logic after this node and all sub node
        var onExitNode = function (node, keyName) {
            if (exitHandlers[node.type]) {
                exitHandlers[node.type](node, keyName);
            }
            if (node.onExit) {
                node.onExit();
            }
        };

        var obj = require('esprima').parse(string, {
            range: true,
            tokens: true
        });

        var astRocambole = require('rocambole').parse(string);

        var tokens = astRocambole.tokens;
        var tokenIndex = 0;
        var tokenLen = tokens.length;

        if (obj.type === 'Program') {
            obj.body.forEach(function (node) {
                exec(node, 'root');
            });
        }

        return outputBuffer.join('');
    };

    var formatFile = function (file) {
        return format(require('fs').readFileSync(file, 'utf-8'));
    };

    exports.format = format;
    exports.formatFile = formatFile;
})();
