(function () {
    var format = function (string, config) {
        //TODO if while 自动加大括号
        //TODO 自动加分号
        //TODO 换行之后加缩进是不对的，要在当前一行开始的时候加缩进（通常就是一个语句开始）
        //注释：如果注释独占一行，原样保留这些注释
        // To loop between all tokens inside a node you can do like this:
        // var token = node.startToken;
        // while (token !== node.endToken.next) {
        //     doStuffWithToken(token);
        //     token = token.next;
        // }

        config = config || {};
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
                    parentheses: true, //done if (), for (), while (), ...
                    leftBrace: true, //done function () {, if () {, do {, try { ...
                    keywords: true //done if {} else {}, do {} while (), try {} catch () {} finally
                },
                within: {
                    parentheses: false //todo 这个配置比较麻烦( a, b, c ) , if ( true ) or (a, b, c) , if (true)
                },
                other: {
                    beforePropertyNameValueSeparator: false, // {key: value} {key : value} {key:value}
                    afterPropertyNameValueSeparator: true //done
                }
            },
            bracesPlacement: { //1. same line 2. next line
                functionDeclaration: 1,
                other: 1
            },
            other: {
                onlyVariableDeclarator: false //todo 一个var只声明一个变量，如果true将会拆分一个var多个变量
            }
        };

        //defaults the config
        var overwriteConfig = function (defaults, configure) {
            for (var key in defaults) {
                if (defaults.hasOwnProperty(key)) {
                    if (typeof defaults[key] == 'object') {
                        //递归
                        if (typeof configure[key] == 'object') {
                            overwriteConfig(defaults[key], configure[key]);
                        }
                    } else {
                        //直接复制
                        if (typeof configure[key] !== 'undefined') {
                            defaults[key] = configure[key];
                        }
                    }
                }
            }
        };
        overwriteConfig(codeStyle, config); //用外部config覆盖默认配置

        var NEXT_LINE = {
            type: 'LineBreak',
            value: codeStyle.lineSeparator,
            formatter: true
        };
        var INDENT = codeStyle.indents;

        var indentLevel = 0;

        var isForStatement = false;

        var buffer = [];

        var bufferPush = function (token) {
            if (token === ' ') {
                token = {
                    type: 'WhiteSpace',
                    value: ' ',
                    formatter: true
                };
            }
            buffer.push(token);
        };

        var bufferPop = function () {
            return buffer.pop();
        };

        var obIndent = function () {
            var token = {
                type: 'Indent',
                value: '',
                formatter: true
            };
            for (var i = 0; i < indentLevel; i++) {
                token.value += INDENT;
            }
            bufferPush(token);
        };

        /**
         * @param {object} node 一定是个含有type属性的节点对象
         * @param {string} keyName
         */
        var exec = function (node, keyName) {
            onEnterNode(node, keyName);
            //遍历当前节点寻找下属节点递归
            for (var key in node) {
                if (node.hasOwnProperty(key) && !/parent|prev|next|depth|toString|startToken|endToken/.test(key)) {
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
         */
        var doStuffWithToken = function (token) {
            switch (token.type) {
                case 'LineComment':
                    if (buffer[buffer.length - 1] === NEXT_LINE) {
                        obIndent();
                    }
                    if (isInlineComment(token)) {
                        bufferPush(token);
                        bufferPush(NEXT_LINE);
                    } else {
                        if (buffer.length > 0 && buffer[buffer.length - 1].type !== 'Indent') {
                            bufferPush(NEXT_LINE);
                        }
                        bufferPush(token);
                        bufferPush(NEXT_LINE);
                    }
                    break;
                case 'BlockComment':
                    if (buffer[buffer.length - 1] === NEXT_LINE) {
                        obIndent();
                    }
                    if (isInlineComment(token)) {
                        bufferPush(token);
                    } else {
                        //todo  /** 的注释应该在新行，但是很难判断/**，暂时不考虑做了
                        bufferPush(NEXT_LINE);
                        if (token.originalIndent) {
                            bufferPush({
                                type: 'OriginalIndent',
                                value: token.originalIndent,
                                formatter: true
                            });
                        }
                        bufferPush(token);
                        bufferPush(NEXT_LINE);
                    }
                    break;
                case 'WhiteSpace':
                    break;
                case 'LineBreak':
                    break;
                default:
                    if (buffer[buffer.length - 1] === NEXT_LINE) {
                        obIndent();
                    }
                    doInsertBefore(token);
                    bufferPush(token);
                    doInsertAfter(token);
                    //如果token紧接着comment，或者token+空白+comment，那么直接push+换行，这个有问题吗？
                    //有问题BlockComment不一定可以换行
            }
        };

        /**
         * 同步range范围之前所有tokens
         * @param {object} node
         */
        var toPrevToken = function (node) {
            var range = node.range;
            for (var token; tokenIndex < tokenLen; tokenIndex++) {
                token = tokens[tokenIndex];

                if (token.range[1] > range[0]) {
                    break;
                }

                doStuffWithToken(token);
            }
        };

        /**
         * 同步range范围内所有tokens，同步之后tokenIndex已经到达下一个token
         * @param {object} node
         */
        var toNextToken = function (node) {
            var range = node.range;
            for (var token; tokenIndex < tokenLen; tokenIndex++) {
                token = tokens[tokenIndex];

                if (token.range[1] > range[1]) {
                    break;
                }

                doStuffWithToken(token);
            }
        };

        var toLastToken = function (node) {
            var range = node.range;
            for (var token; tokenIndex < tokenLen; tokenIndex++) {
                token = tokens[tokenIndex];

                if (token.range[1] >= range[1]) {
                    break;
                }

                doStuffWithToken(token);
            }
        };

        var forwardToken = function () {
            var token = tokens[tokenIndex];
            doStuffWithToken(token);
            tokenIndex++;
            return token;
        };

        var backwardToken = function () {
            tokenIndex--;
            var last = bufferPop();
            while (last.formatter) { //同时去除由formatter自己插入的token
                last = bufferPop();
            }
            return last;
        };

        /**
         * if a token is comment
         * @param token
         * @returns {boolean}
         */
        var isComment = function (token) {
            return token.type === 'LineComment' || token.type === 'BlockComment';
        };

        /**
         * 全部或者部分和代码所在同一行
         * @param token
         */
        var isInlineComment = function (token) {
            var inline = true;
            if (token.type === 'LineComment') {
                if (!token.prev || token.prev.type === 'LineBreak' || (token.prev.type === 'WhiteSpace' && token.prev.prev.type === 'LineBreak')) {
                    inline = false;
                }
            }
            if (token.type === 'BlockComment') {
                if (token.prev.type === 'LineBreak' || (token.prev.type === 'WhiteSpace' && token.prev.prev.type === 'LineBreak')) {
                    if (token.next.type === 'LineBreak' || (token.next.type === 'WhiteSpace' && token.next.next.type === 'LineBreak')) {
                        inline = false;
                    }
                }
            }
            return inline;
        };

        var enterHandlers = {
            'CallExpression': function (node) {
                node['arguments'].forEach(function (arg, index, arr) {
                    arg.onExit = function () {
                        toLastToken(arg);
                        var token;
                        while (token = forwardToken()) {
                            if (token.value === ',') {
                                bufferPush(' ');
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
                                bufferPush(' ');
                                forwardToken();
                                bufferPush(' ');
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
                                bufferPush(' ');
                                forwardToken();
                                bufferPush(' ');
                                break;
                            }
                        }
                    };
                }
            },
            'DoWhileStatement': function (node) {
                node.test.onExit = function () {
                    if (codeStyle.spaces.before.keywords) {
                        toLastToken(node.test);
                        var token;
                        while (true) {
                            token = backwardToken();
                            if (token.value === 'while') {
                                bufferPush(' ');
                                break;
                            }
                        }
                    }
                    toLastToken(node.test);
                };
            },
            'ForStatement': function (node) {
                isForStatement = true;

                if (node.test) {
                    node.test.onBeforeEnter = function () {
                        bufferPush(' ');
                    };
                }

                if (node.update) {
                    node.update.onBeforeEnter = function () {
                        bufferPush(' ');
                    };
                }
            },
            'ForInStatement': function (node) {
                node.left.isForInLeft = true;
                node.right.isForInRight = true;
            },
            'VariableDeclaration': function (node) {
                //检查startToken接下来的是不是注释，如果是注释，增加缩进，并把注释放在下一行
                /*这部分代码逻辑特殊，注释还是使用统一规则吧var token = node.startToken.next;
                 while (token) {
                 if (token.type == 'WhiteSpace' || token.type == 'LineBreak') {
                 token = token.next;
                 } else {
                 if (token.type == 'LineComment' || token.type == 'BlockComment') {
                 forwardToken();
                 indentLevel++;
                 node.onExit = function () {
                 indentLevel--;
                 };
                 bufferPush(NEXT_LINE);
                 }
                 break;
                 }
                 }*/

                if (node.declarations.length > 0) {
                    node.declarations[node.declarations.length - 1].isLastDeclaration = true;
                }
            },
            'FunctionDeclaration': function (node) {
                if (codeStyle.spaces.before.functionDeclarationParentheses) {
                    node.id.onExit = function () {
                        toNextToken(node.id);
                        bufferPush(' ');
                    };
                }
                node.params.forEach(function (param, index, arr) {
                    param.onExit = function () {
                        toLastToken(param);
                        var token;
                        while (true) {
                            token = forwardToken();
                            if (token.value === ',') {
                                bufferPush(' ');
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
                        bufferPush(' ');
                    };
                }
                node.params.forEach(function (param, index, arr) {
                    param.onExit = function () {
                        toLastToken(param);
                        var token;
                        while (true) {
                            token = forwardToken();
                            if (token.value === ',') { //TODO here maybe a bug
                                bufferPush(' ');
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
                    if (codeStyle.spaces.before.leftBrace) {
                        bufferPush(' ');
                    }
                }
                var token = forwardToken();
                if (isComment(token.next)) {
                    forwardToken();
//                    bufferPush(NEXT_LINE);
                } else if (isComment(token.next.next)) {
                    forwardToken();
                    forwardToken();
//                    bufferPush(NEXT_LINE);
                } else {
                    bufferPush(NEXT_LINE);
                }
//                if (!isComment(token.next) && !isComment(token.next.next)) {
//                    bufferPush(NEXT_LINE);
//                }
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
                    if (codeStyle.spaces.before.keywords) {
                        node.consequent.onExit = function () {
                            toNextToken(node.consequent);
                            bufferPush(' ');
                        }
                    }
                }

                //if consequent is not a block, should insert next line before it
                if (node.consequent && node.consequent.type !== 'BlockStatement') {
                    node.consequent.onBeforeEnter = function () {
                        bufferPush(NEXT_LINE);
                        indentLevel++;
                    };
                    node.consequent.onExit = function () {
                        indentLevel--;
                    };
                }
                //if alternate is not a block, should insert next line before it
                if (node.alternate && node.alternate.type !== 'BlockStatement' && node.alternate.type !== 'IfStatement') {
                    node.alternate.onBeforeEnter = function () {
                        bufferPush(NEXT_LINE);
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
                    bufferPush(NEXT_LINE);
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
                    if (codeStyle.spaces.other.afterPropertyNameValueSeparator) {
                        bufferPush(' ');
                    }
                }
            },
            'ArrayExpression': function (node) {
                if (node.elements.length > 0) {
                    forwardToken(); //[
                    bufferPush(NEXT_LINE);
                    indentLevel++;

                    node.elements.forEach(function (e, index, arr) {
                        e.onBeforeEnter = function () {
                        };
                        e.onExit = function () {
                            toNextToken(e);
                            if (index !== arr.length - 1) {
                                forwardToken();
                            }
                            bufferPush(NEXT_LINE);
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
                            bufferPush(' ');
                            forwardToken();
                            bufferPush(NEXT_LINE);
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
                        bufferPush(NEXT_LINE);
                        indentLevel++;
                    }
                } else {
                    forwardToken();
                    forwardToken();
                    bufferPush(NEXT_LINE);
                    indentLevel++;
                }
            }
        };

        var exitHandlers = {
            'ContinueStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'DoWhileStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'Literal': function (node) {
                if (node.isArrayEl && !node.isLastEl) {
                    toNextToken(node);
                    if (isArrayMultiLine) {
                        forwardToken();
                        bufferPush(NEXT_LINE);
                    } else {
                        forwardToken();
                        bufferPush(' ');
                    }
                }
            },
            'Identifier': function (node) {
                if (node.isArrayEl && !node.isLastEl) {
                    toNextToken(node);
                    if (isArrayMultiLine) {
                        forwardToken();
                        bufferPush(NEXT_LINE);
                    } else {
                        forwardToken();
                        bufferPush(' ');
                    }
                }
            },
            'ForStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);

                isForStatement = false; //todo 去掉这个全局变量用别的解决方法
            },
            'ForInStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'VariableDeclaration': function (node, key) {
                toNextToken(node);
                if ((!isForStatement || key !== 'init') && !node.isForInLeft) {
                    bufferPush(NEXT_LINE); //todo 已知bug var a = {}如果没有分号结束会在下一句之后插入一个\n
                }
            },
            'VariableDeclarator': function (node) {
                if (!node.isLastDeclaration) {
                    toNextToken(node);
                    forwardToken();
                    bufferPush(' ');
                }
            },
            'FunctionExpression': function (node) {
                if (node.isArrayEl) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        bufferPush(NEXT_LINE);
                    }
                }
            },
            'BlockStatement': function (node) {
                toLastToken(node);
                if (node.body.length > 0) {
                    indentLevel--;
                }
            },
            'IfStatement': function (node) {
                if (!node.isIfStatementAlternate) {
                    toNextToken(node);
                    bufferPush(NEXT_LINE);
                }
            },
            'ExpressionStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'ThrowStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'ReturnStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'WhileStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'BreakStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'ObjectExpression': function (node) {
                indentLevel--;

                if (node.properties.length > 0) {
                    toLastToken(node);
                    bufferPush(NEXT_LINE);
                }

                if (node.isArrayEl && isArrayMultiLine) {
                    toNextToken(node);
                    if (!node.isLastEl) {
                        forwardToken();
                        bufferPush(NEXT_LINE);
                    }
                }
            },
            'Property': function (node) {
                toNextToken(node);
                if (!node.isLastObjectProperty) {
                    var token = forwardToken();
                    while (!(token.type === 'Punctuator' && token.value === ',')) {
                        token = forwardToken();
                    }
                    bufferPush(NEXT_LINE);
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
                        bufferPush(NEXT_LINE);
                    }
                }
            },
            'FunctionDeclaration': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'TryStatement': function (node) {
                toNextToken(node);
                bufferPush(NEXT_LINE);
            },
            'UnaryExpression': function (node) {
                //todo 检查这里
                toLastToken(node);
                if (node.operator === '+' || node.operator === '-') { //delete is unary expression
                    bufferPop(); //this should be ' '
                    var op = bufferPop();
                    bufferPop(); //this should be ' ' before op
                    bufferPush(op);
                }
            },
            'SwitchStatement': function (node) {
                indentLevel--;
                toNextToken(node);
                bufferPush(NEXT_LINE);
            }
        };

        var insertBefore = {
            'Keyword': {
                'in': ' ',
                'instanceof': ' ',
                'catch': codeStyle.spaces.before.keywords ? ' ' : '',
                'finally': codeStyle.spaces.before.keywords ? ' ' : ''
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
                'if': codeStyle.spaces.before.parentheses ? ' ' : '',
                'else': ' ',
                'function': codeStyle.spaces.before.functionExpressionParentheses ? ' ' : '',
                'throw': ' ',
                'return': ' ',
                'delete': ' ',
                'for': codeStyle.spaces.before.parentheses ? ' ' : '',
                'while': codeStyle.spaces.before.parentheses ? ' ' : '',
                'new': ' ',
                'in': ' ',
                'typeof': ' ',
                'instanceof': ' ',
                'catch': ' ',
                'switch': codeStyle.spaces.before.parentheses ? ' ' : '',
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
                bufferPush({
                    type: 'WhiteSpace',
                    value: insertBefore[token.type][token.value]
                });
            }
        };
        var doInsertAfter = function (token) {
            if (insertAfter[token.type] && insertAfter[token.type][token.value]) {
                bufferPush({
                    type: 'WhiteSpace',
                    value: insertAfter[token.type][token.value]
                });
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

        var ast = require('rocambole').parse(string);
        var tokens = ast.tokens;
        var tokenIndex = 0;
        var tokenLen = tokens.length;

        if (ast.type === 'Program') {
            ast.body.forEach(function (node) {
                exec(node, 'root');
            });
        }

        var formattedString = '';
        var bufferLength = buffer.length;
        for (var i = 0; i < bufferLength; i++) {
            var bufferI = buffer[i];
            if (bufferI.type === 'LineComment' || bufferI.type === 'BlockComment') {
                formattedString += buffer[i].raw;
            } else {
                formattedString += buffer[i].value;
            }
        }
        return formattedString;
    };

    var formatFile = function (file) {
        return format(require('fs').readFileSync(file, 'utf-8'));
    };

    exports.format = format;
    exports.formatFile = formatFile;
})();
