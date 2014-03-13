(function () {
    var format = function (string) {
        //TODO if while 自动加大括号
        //TODO 自动加分号

        var INDENT = '    ';
        var indentLevel = 0;

        var isForStatement = false;

        var isArrayExpression = false;
        var isArrayMultiLine = false;

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
            if (handlers[node.type]) {
                handlers[node.type](node, keyName);
            }
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

        var operateToken = function (token, callback) {
            if (token.type == 'Block' || token.type == 'Line') {
//                    console.log(token);
                obPush(token.value);
                obPush('\n');
                obIndent();
            } else {
                doInsertBefore(token);
                obPush(token.value);
                doInsertAfter(token);
                doDynamicInsert(token);
                if (callback) {
                    callback(token);
                }
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
            obPush(token.value);
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

        var handlers = {
            'ForStatement': function () {
                dynamicInsert.push({
                    type: 'Punctuator',
                    value: ';',
                    insert: ' '
                });
                dynamicInsert.push({
                    type: 'Punctuator',
                    value: ';',
                    insert: ' '
                });
            },
            'ObjectExpression': function (node) {
                if (node.properties.length > 0) {
                    forwardToken();
                    obPush('\n');
                    obIndent();
                }
            },
            'ArrayExpression': function (node) {
                if (node.isArrayMultiLine) {
                    forwardToken();
                    obPush('\n');
                    obIndent();
                }
            }
        };

        var enterHandlers = {
            'CallExpression': function (node) {
                node['arguments'].forEach(function (arg, index, arr) {
                    arg.onExit = function () {
                        toLastToken(arg);
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
                        arg.onExit = null;
                    }
                });
            },
            'ConditionalExpression': function (node) {
                //TODO:给下属node直接增加额外的onEnter和onExit，这样子可以避免为每个node类型增加条件判断，只需要统一处理onEnter和onExit，之前的实现可以改成这种

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
            'ForStatement': function () {
                isForStatement = true;
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
            'BlockStatement': function (node) {
                indentLevel++;

                toPrevToken(node);
                obPush(' ');
                forwardToken();
                obPush('\n');
                obIndent();
            },
            'IfStatement': function (node) {
                if (node.alternate) {
                    node.alternate.isIfStatementAlternate = true;
                }
            },
            'ObjectExpression': function (node) {
                indentLevel++;

                toPrevToken(node);
            },
            'Property': function (node) {
                toPrevToken(node, function (token) {
                    if (token.type === 'Punctuator' && token.value === ',') {
                        obPush('\n');
                        obIndent();
                    }
                });

                dynamicInsert.push({
                    type: 'Punctuator',
                    value: ':',
                    insert: ' '
                });
            },
            'ArrayExpression': function (node) {
                indentLevel++;
                isArrayExpression = true;
                isArrayMultiLine = false;

                toPrevToken(node);

                if (node.elements.length == 0) {
                    node.isArrayEmpty = true;
                } else {
                    node.isArrayEmpty = false;

                    var multiLine = false;
                    node.elements.forEach(function (el) {
                        if (el.type !== 'Literal' && el.type !== 'Identifier') {
                            multiLine = true;
                        }
                        el.isArrayEl = true;
                        el.isLastEl = false;
                    });
                    node.elements[node.elements.length - 1].isLastEl = true; //last

                    isArrayMultiLine = multiLine;

                    node.isArrayMultiLine = multiLine;
                }
            }
        };

        var exitHandlers = {
            'ContinueStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'DoWhileStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'Literal': function (node) {
                if (node.isArrayEl && !node.isLastEl) {
                    toNextToken(node);
                    if (isArrayMultiLine) {
                        forwardToken();
                        obPush('\n');
                        obIndent();
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
                        obPush('\n');
                        obIndent();
                    } else {
                        forwardToken();
                        obPush(' ');
                    }
                }
            },
            'ForStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();

                isForStatement = false;
            },
            'ForInStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'VariableDeclaration': function (node, key) {
                toNextToken(node);
                if ((!isForStatement || key !== 'init') && !node.isForInLeft) {
                    obPush('\n');
                    obIndent();
                }
            },
            'VariableDeclarator': function (node) {
                if (!node.isLastDeclaration) {
                    dynamicInsert.push({
                        type: 'Punctuator',
                        value: ',',
                        insert: ' '
                    });
                }
            },
            'FunctionExpression': function (node) {
                if (node.isArrayEl) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush('\n');
                        obIndent();
                    }
                }
            },
            'BlockStatement': function (node) {
                indentLevel--;

                toNextToken(node);
                backwardToken();
                var pop = obPop();
                if (pop !== INDENT) {
                    obPush(pop);
                }
                if (tokens[tokenIndex + 1].value === 'else') {
                    forwardToken();
                    obPush(' ');
                }
            },
            'IfStatement': function (node) {
                if (!node.isIfStatementAlternate) {
                    toNextToken(node);
                    obPush('\n');
                    obIndent();
                }
            },
            'ExpressionStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'ThrowStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'ReturnStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'WhileStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'BreakStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'ObjectExpression': function (node) {
                indentLevel--;

                if (node.properties.length > 0) {
                    toNextToken(node);
                    backwardToken();
                    obPush('\n');
                    obIndent();
                }

                if (node.isArrayEl && isArrayMultiLine) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush('\n');
                        obIndent();
                    }
                }
            },
            'ArrayExpression': function (node) {
                indentLevel--;

                //先完成自身使命，再完成作为数组成员的使命

                //如果自己是个多行数组，那要把结束]换行
                toLastToken(node);
                if (node.isArrayMultiLine) {
                    obPush('\n');
                    obIndent();
                }

                //作为数组成员，那所在数组一定是多行的，自身结束之后要换行
                forwardToken();
                if (node.isArrayEl) {
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush('\n');
                        obIndent();
                    }
                }

                isArrayExpression = node.isArrayEl;
                isArrayMultiLine = node.isArrayEl;
            },
            'CallExpression': function (node) {
                if (node.isArrayEl) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        obPush('\n');
                        obIndent();
                    }
                }
            },
            'FunctionDeclaration': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
                obPush('\n');
                obIndent();
            },
            'TryStatement': function (node) {
                toNextToken(node);
                obPush('\n');
                obIndent();
            },
            'UnaryExpression': function (node) {
                toLastToken(node);
                if (node.operator === '+' || node.operator === '-') { //delete is unary expression
                    obPop(); //this should be ' '
                    var op = obPop();
                    obPop(); //this should be ' ' before op
                    obPush(op);
                }
            }
        };

        var dynamicInsert = [];

        var insertBefore = {
            'Keyword': {
                'in': ' ',
                'instanceof': ' ',
                'catch': ' '
            },
            'Punctuator': {
                '+': ' ',
                '-': ' ',
                '*': ' ',
                '/': ' ',
                '%': ' ',
                '=': ' ',
                '>': ' ',
                '<': ' ',
                '^': ' ',
                '&': ' ',
                '|': ' ',
                '&&': ' ',
                '||': ' ',
                '==': ' ',
                '+=': ' ',
                '-=': ' ',
                '*=': ' ',
                '/=': ' ',
                '%=': ' ',
                '!=': ' ',
                '>=': ' ',
                '<=': ' ',
                '===': ' ',
                '!==': ' '
            }
        };
        var insertAfter = {
            'Keyword': {
                'var': ' ',
                'if': ' ',
                'else': ' ',
                'function': ' ',
                'throw': ' ',
                'return': ' ',
                'delete': ' ',
                'for': ' ',
                'while': ' ',
                'new': ' ',
                'in': ' ',
                'typeof': ' ',
                'instanceof': ' ',
                'catch': ' '
            },
            'Punctuator': {
                '+': ' ',
                '-': ' ',
                '*': ' ',
                '/': ' ',
                '%': ' ',
                '=': ' ',
                '>': ' ',
                '<': ' ',
                '^': ' ',
                '&': ' ',
                '|': ' ',
                '&&': ' ',
                '||': ' ',
                '==': ' ',
                '+=': ' ',
                '-=': ' ',
                '*=': ' ',
                '/=': ' ',
                '%=': ' ',
                '!=': ' ',
                '>=': ' ',
                '<=': ' ',
                '===': ' ',
                '!==': ' '
            }
        };

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
        var doDynamicInsert = function (token) {
            if (dynamicInsert.length > 0 && token.type === dynamicInsert[0].type && token.value === dynamicInsert[0].value) {
                obPush(dynamicInsert[0].insert);
                dynamicInsert.shift();
            }
        };

        var onEnterNode = function (node, keyName) {
            deep++;

            if (enterHandlers[node.type]) {
                toPrevToken(node);
                enterHandlers[node.type](node, keyName);
            }
        };
        var onExitNode = function (node, keyName) {
            deep--;

            if (exitHandlers[node.type]) {
                exitHandlers[node.type](node, keyName);
            }

            if (node.onExit) {
                node.onExit();
            }
        };

        var obj = require('esprima').parse(string, {
            range: true,
            comment: true,
            tokens: true,
            loc: true
        });

        var tokens = obj.tokens;
        var tokenIndex = 0;
        var tokenLen = tokens.length;

        var comments = obj.comments;

        var tempTokens = [];
        for (var i = 0, j = 0; i < tokenLen && j < comments.length;) {
            var token = tokens[i];
            var comment = comments[j];

            if (token.range[0] < comment.range[0]) {
                tempTokens.push(token);
                i++;
            } else {
                if (comment.type == 'Block') {
                    comment.value = '/*' + comment.value + '*/';
                } else {
                    comment.value = '//' + comment.value;
                }

                //检查跟在行尾的注释
                if (i > 0 && comment.loc.start.line === tokens[i - 1].loc.end.line) {
                    comment.inline = true;
                    //合并这个注释到它紧跟的token
                    var lastToken = tempTokens.pop();
                    lastToken.value = lastToken.value + ' ' + comment.value;
                    tempTokens.push(lastToken);
                } else {
                    tempTokens.push(comment);
                }
                j++;
            }
        }
        for (; i < tokenLen; i++) {
            tempTokens.push(tokens[i]);
        }
        for (; j < comments.length; j++) {
            tempTokens.push(comments[j]);
        }
        tokens = tempTokens;
        tokenLen = tempTokens.length;

        if (obj.type === 'Program') {
            var deep = 0;
            obj.body.forEach(function (node) {
                deep = 0;
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
