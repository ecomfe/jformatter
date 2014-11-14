(function () {
    var _config = {
        lineSeparator: '\n', //done
        maxLength: 120, //TODO
        wrapIfLong: false, //TODO
        indent: 4, //done
        useTabIndent: false, //done
        spaces: {
            around: {
                unaryOperators: false, //TODO
                binaryOperators: true, //done
                ternaryOperators: true //done
            },
            before: {
                functionDeclarationParentheses: false, //done function foo() {
                functionExpressionParentheses: true, //TODO has a bug var foo = function () {
                parentheses: true, //done if (), for (), while (), ...
                leftBrace: true, //done function () {, if () {, do {, try { ...
                keywords: true //done if {} else {}, do {} while (), try {} catch () {} finally
            },
            within: {
                parentheses: false //TODO this configure is complex ( a, b, c ) , if ( true ) or (a, b, c) , if (true)
            },
            other: {
                beforePropertyNameValueSeparator: false, //TODO {key: value} {key : value} {key:value}
                afterPropertyNameValueSeparator: true //done
            }
        },
        bracesPlacement: { //1. same line 2. next line
            functionDeclaration: 1, //TODO
            other: 1 //TODO
        },
        other: {
            keepArraySingleLine: false //TODO default formatted array multi line
        },
        fix: {
            prefixSpaceToLineComment: false, // done
            alterCommonBlockCommentToLineComment: false, // done
            singleVariableDeclarator: false, // done
            fixInvalidTypeof: false // done
        }
    };

    /**
     * format given string and return formatted string
     * @param {string} string code string
     * @param {Object} [userConfig] config object
     * @returns {string}
     */
    var format = function (string, userConfig) {
        userConfig = userConfig || {};

        // defaults the config
        var overwriteConfig = function (defaults, configure) {
            for (var key in defaults) {
                if (defaults.hasOwnProperty(key)) {
                    if (typeof defaults[key] === 'object') {
                        //recursive
                        if (typeof configure[key] === 'object') {
                            overwriteConfig(defaults[key], configure[key]);
                        }
                    } else {
                        //copy directly
                        if (typeof configure[key] !== 'undefined') {
                            defaults[key] = configure[key];
                        }
                    }
                }
            }
        };
        overwriteConfig(_config, userConfig); // overwrite codeStyle with user config

        var nextLineFactory = function () {
            return {
                type: 'LineBreak',
                value: _config.lineSeparator,
                formatter: true
            };
        };

        // deal with indent (new Array(indent + 1)).join(' ')
        var INDENT = (function () {
            var indentStr = '';
            var space = _config.useTabIndent ? '\t' : ' ';
            var indent = _config.indent ? Number(_config.indent) : 4;
            while (indent--) {
                indentStr += space;
            }
            return indentStr;
        })();

        var indentFactory = function () {
            var indentStr = '';
            for (var i = 0; i < indentLevel; i++) {
                indentStr += INDENT;
            }
            return {
                type: 'WhiteSpace',
                value: indentStr
            };
        };

        var whiteSpaceFactory = function () {
            return {
                type: 'WhiteSpace',
                value: ' '
            };
        };

        /**
         * check if a token is comment
         * @param token
         * @returns {boolean}
         */
        var isComment = function (token) {
            return token.type === 'LineComment' || token.type === 'BlockComment';
        };

        /**
         * @param token
         * @returns {boolean}
         */
        var isLineComment = function (token) {
            return token.type === 'LineComment';
        };

        /**
         * check if a token is white space
         * @param token
         * @returns {boolean}
         */
        var isWhiteSpace = function (token) {
            return token.type === 'WhiteSpace';
        };

        /**
         * @param token
         * @returns {boolean}
         */
        var isLineBreak = function (token) {
            return token.type === 'LineBreak';
        };

        var SPACE_AROUND_PUNCTUATOR = [
            '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|=',
            '==', '!=', '===', '!==', '>', '>=', '<', '<=',
            '+', '-', '*', '/', '%',
            '&', '|', '^', '~', '<<', '>>', '>>>',
            '&&', '||'
        ];

        /**
         * @param token
         * @returns {boolean}
         */
        var isInlineComment = function (token) {
            var inline = false;
            if (token) {
                if (token.type === 'LineComment') {
                    inline = true;
                } else if (token.type === 'BlockComment') {
                    inline = (token.value.indexOf('\n') === -1);
                }
            }
            return inline;
        };

        /**
         * check if only types between startToken and endToken
         * @param {Object} startToken
         * @param {Object} endToken
         * @param {Array} types
         * @returns {boolean}
         */
        var isTypeBetween = function (startToken, endToken, types) {
            var is = true;
            var token = startToken;
            while (token.next && token.next !== endToken) {
                token = token.next;
                if (types.indexOf(token.type) === -1) {
                    is = false;
                    break;
                }
            }
            return is;
        };

        /**
         * 保证一个语句节点是在新起一行
         * @param node
         */
        var guaranteeNewLine = function (node) {
            if (node.startToken.prev && node.startToken.prev.type !== 'LineBreak') {
                insertBefore(node.startToken, nextLineFactory());
            }
        };

        /**
         * 保证一个token两侧是空白符
         * @param token
         */
        var guaranteeWhiteSpaceAround = function (token) {
            if (token.prev.type !== 'WhiteSpace') {
                insertBefore(token, whiteSpaceFactory());
            }
            if (token.next.type !== 'WhiteSpace') {
                insertAfter(token, whiteSpaceFactory());
            }
        };

        var insertBefore = function (token, insertion) {
            if (!token.prev) { // insert at first
                token.prev = insertion;
                insertion.next = token;
            } else {
                token.prev.next = insertion;
                insertion.prev = token.prev;
                insertion.next = token;
                token.prev = insertion;
            }
        };
        var insertAfter = function (token, insertion) {
            if (!token.next) { // insert at last
                token.next = insertion;
                insertion.prev = token;
            } else {
                token.next.prev = insertion;
                insertion.next = token.next;
                insertion.prev = token;
                token.next = insertion;
            }
        };
        var replaceToken = function (token, replace) {
            for (var key in replace) {
                if (replace.hasOwnProperty(key)) {
                    token[key] = replace[key];
                }
            }
        };
        var removeToken = function (token) {
            if (token.prev && token.next) {
                token.prev.next = token.next;
                token.next.prev = token.prev;
            } else if (token.prev) {
                token.prev.next = undefined;
            } else if (token.next) {
                token.next.prev = undefined;
            }
        };

        var _rocambole = require('rocambole');
        var _ast = _rocambole.parse(string);

        // start clear
        var clearToken = function (token) {
            var remove;
            // 先去除空白
            if (isWhiteSpace(token)) {
                // 默认都要删除空白
                remove = true;

                // 跟在关键词后面的空白保留，以免出问题，但是要变成单个空白
                if (token.prev && token.prev.type === 'Keyword') {
                    remove = false;
                    token.value = ' ';
                }
                // 空白前面是换行 && 后面是注释的不删除
                if (token.prev && token.next && isLineBreak(token.prev) && isComment(token.next)) {
                    remove = false;
                }

                if (remove) {
                    removeToken(token);
                }
            }
            // TODO 独占整行的注释，要保留占用的空白，保留其原始位置：空白前面是换行后面是注释的不删除
            // 注释前后的换行一律保留，其他一律删除
            if (isLineBreak(token)) {
                // 默认都要删除换行
                remove = true;

                // 注释前面的
                if (token.next && isComment(token.next)) {
                    remove = false;
                }
                // 注释后面的
                if (token.prev && isComment(token.prev)) {
                    remove = false;
                }
                // 注释前面空白再前面的，这种是有缩进且占整行的注释
                if (token.next && token.next.next && isWhiteSpace(token.next) && isComment(token.next.next)) {
                    remove = false;
                }

                if (remove) {
                    removeToken(token);
                }
            }
        };
        var token = _ast.startToken;
        while (token !== _ast.endToken.next) {
            clearToken(token);
            token = token.next;
        }
        // end clear

        // start process
        var processToken = function (token) {
            // check around = WhiteSpace
            if (token.type === 'Punctuator' && SPACE_AROUND_PUNCTUATOR.indexOf(token.value) !== -1) {
                guaranteeWhiteSpaceAround(token);
            }
            // 特殊处理in，这货两边必须保证空白
            if (token.type === 'Keyword' && token.value === 'in') {
                guaranteeWhiteSpaceAround(token);
            }
            // 特殊处理finally，这货在ast里不是一个独立type节点
            if (token.type === 'Keyword' && token.value === 'finally') {
                if (_config.spaces.before.keywords && !isWhiteSpace(token.prev)) {
                    insertBefore(token, whiteSpaceFactory());
                }
            }
        };
        token = _ast.startToken;
        while (token !== _ast.endToken.next) {
            processToken(token);
            token = token.next;
        }
        // end process

        // loop node
        _rocambole.recursive(_ast, function (node) {
            switch (node.type) {
                case 'ConditionalExpression':
                    if (node.test && !isWhiteSpace(node.test.endToken)) {
                        insertAfter(node.test.endToken, whiteSpaceFactory());
                    }
                    if (node.consequent && !isWhiteSpace(node.consequent.startToken)) {
                        insertBefore(node.consequent.startToken, whiteSpaceFactory());
                    }
                    if (node.consequent && !isWhiteSpace(node.consequent.endToken)) {
                        insertAfter(node.consequent.endToken, whiteSpaceFactory());
                    }
                    if (node.alternate && !isWhiteSpace(node.alternate.startToken)) {
                        insertBefore(node.alternate.startToken, whiteSpaceFactory());
                    }
                    break;
                case 'DoWhileStatement':
                    guaranteeNewLine(node);
                    if (node.body.type === 'BlockStatement') {
                        if (!isWhiteSpace(node.body.endToken.next)) {
                            insertAfter(node.body.endToken, whiteSpaceFactory());
                        }
                    } else {
                        if (isWhiteSpace(node.startToken.next)) {
                            removeToken(node.startToken.next);
                        }
                        node.body.startToken.indentSelf = true;
                        if (!isWhiteSpace(node.test.startToken.prev.prev)) {
                            if (!isLineBreak(node.test.startToken.prev.prev.prev)) {
                                insertBefore(node.test.startToken.prev.prev, nextLineFactory());
                            }
                            insertBefore(node.test.startToken.prev, whiteSpaceFactory());
                        } else {
                            if (!isLineBreak(node.test.startToken.prev.prev.prev.prev)) {
                                insertBefore(node.test.startToken.prev.prev.prev, nextLineFactory());
                            }
                        }
                    }
                    break;
                case 'ForStatement':
                    guaranteeNewLine(node);
                    if (node.test && !isWhiteSpace(node.test.startToken.prev)) {
                        insertBefore(node.test.startToken, whiteSpaceFactory());
                    }
                    if (node.update && !isWhiteSpace(node.update.startToken.prev)) {
                        insertBefore(node.update.startToken, whiteSpaceFactory());
                    }
                    break;
                case 'ForInStatement':
                    guaranteeNewLine(node);
                    break;
                case 'VariableDeclaration':
                    if (node.parent.type !== 'ForStatement' && node.parent.type !== 'ForInStatement') {
                        guaranteeNewLine(node);
                    }
                    break;
                case 'VariableDeclarator':
                    if (node.endToken.next && node.endToken.next.type === 'Punctuator' && node.endToken.next.value === ',' && !isLineBreak(node.endToken.next.next)) {
                        insertAfter(node.endToken.next, whiteSpaceFactory());
                    }
                    break;
                case 'ExpressionStatement':
                    guaranteeNewLine(node);
                    break;
                case 'IfStatement':
                    guaranteeNewLine(node);
                    break;
                case 'ReturnStatement':
                    guaranteeNewLine(node);
                    break;
                case 'BlockStatement':
                    node.startToken.indentIncrease = true;
                    node.endToken.indentDecrease = true;
                    if (node.startToken.prev && !isWhiteSpace(node.startToken.prev) && !isLineBreak(node.startToken.prev)) {
                        insertBefore(node.startToken, whiteSpaceFactory());
                    }
                    if (!isLineBreak(node.endToken.prev)) {
                        insertBefore(node.endToken, nextLineFactory());
                    }
                    break;
                case 'ObjectExpression':
                    if (!isTypeBetween(node.startToken, node.endToken, ['WhiteSpace', 'LineBreak'])) {
                        node.startToken.indentIncrease = true;
                        node.endToken.indentDecrease = true;
                        insertBefore(node.endToken, nextLineFactory());
                    }
                    break;
                case 'Property':
                    guaranteeNewLine(node);
                    insertBefore(node.value.startToken, whiteSpaceFactory());
                    break;
                case 'CallExpression':
                    node.arguments.forEach(function (arg) {
                        if (arg.endToken.next && arg.endToken.next.type === 'Punctuator' && arg.endToken.next.value === ',') {
                            insertAfter(arg.endToken.next, whiteSpaceFactory());
                        }
                    });
                    break;
                case 'FunctionExpression':
                    insertAfter(node.startToken, whiteSpaceFactory());
                    node.params.forEach(function (param) {
                        if (param.endToken.next && param.endToken.next.type === 'Punctuator' && param.endToken.next.value === ',') {
                            insertAfter(param.endToken.next, whiteSpaceFactory());
                        }
                    });
                    break;
                case 'SequenceExpression':
                    node.expressions.forEach(function (exp) {
                        if (exp.endToken.next && exp.endToken.next.type === 'Punctuator' && exp.endToken.next.value === ',') {
                            insertAfter(exp.endToken.next, whiteSpaceFactory());
                        }
                    });
                    break;
                case 'UnaryExpression':
                    if (['+', '-', '!'].indexOf(node.startToken.value) !== -1) {
                        if (node.startToken.next.type === 'WhiteSpace') {
                            removeToken(node.startToken.next);
                        }
                    }
                    if (node.operator === 'void') {
                        if (node.startToken.next.type !== 'WhiteSpace') {
                            insertAfter(node.startToken, whiteSpaceFactory());
                        }
                    }
                    break;
                case 'TryStatement':
                    guaranteeNewLine(node);
                    break;
                case 'CatchClause':
                    if (_config.spaces.before.keywords && !isWhiteSpace(node.startToken.prev)) {
                        insertBefore(node.startToken, whiteSpaceFactory());
                    }
                    break;
                default:
                    break;
            }
        });

        // process indent start
        var indentLevel = 0;
        var processIndent = function (token) {
            if (token.indentIncrease) {
                indentLevel++;
            }
            if (token.type === 'LineBreak') {
                if (token.next && !isWhiteSpace(token.next)) { //
                    // 如果下一个token是要减小缩进的，那它本身就是要减少缩进的
                    if (token.next.indentDecrease) {
                        indentLevel--;
                        token.next.indentDecrease = false;
                    }
                    insertAfter(token, indentFactory());
                }
            }
            if (token.indentDecrease) {
                indentLevel--;
            }
            if (token.indentSelf) {
                indentLevel++;
                insertBefore(token, indentFactory());
                indentLevel--;
            }
        };
        token = _ast.startToken;
        while (token !== _ast.endToken.next) {
            processIndent(token);
            token = token.next;
        }
        // process indent end

        var processComment = function (token) {
            // 行尾注释保持跟前面的代码一个空格的距离
            if (isLineComment(token) && token.prev && !isWhiteSpace(token.prev)) {
                insertBefore(token, whiteSpaceFactory());
            }
        };
        token = _ast.startToken;
        while (token !== _ast.endToken.next) {
            processComment(token);
            token = token.next;
        }

        return _ast.toString();
    };

    /**
     * format given file and returns formatted code
     * @param {string} file file path
     * @param {Object} [config] config object
     * @returns {string}
     */
    var formatFile = function (file, config) {
        return format(require('fs').readFileSync(file, 'utf-8'), config);
    };

    /**
     * returns version string
     * @returns {string}
     */
    var version = function () {
        return require('./package.json').version;
    };

    /**
     * returns default config
     * @returns {Object}
     */
    var getDefaultConfig = function () {
        return _config;
    };

    exports.format = format;
    exports.formatFile = formatFile;
    exports.version = version;
    exports.getDefaultConfig = getDefaultConfig;
})();
