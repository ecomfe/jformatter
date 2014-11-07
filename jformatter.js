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
         * check if a token is white space
         * @param token
         * @returns {boolean}
         */
        var isWhiteSpace = function (token) {
            return token.type === 'WhiteSpace';
        };

        var SPACE_AROUND_PUNCTUATOR = [
            '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|=',
            '==', '!=', '===', '!==', '>', '>=', '<', '<=',
            '+', '-', '*', '/', '%', '++', '--',
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
         * 保证一个语句节点是在新起一行
         * @param node
         */
        var guaranteeNewLine = function (node) {
            if (node.startToken.prev) {
                // 新起一行只有两种情况，前面就是nl或者前面是空白，再前面是nl
                if (node.startToken.prev.type === 'LineBreak' || (node.startToken.prev.prev && node.startToken.prev.prev.type === 'LineBreak')) {
                } else {
                    insertBefore(node.startToken, nextLineFactory());
                }
            } else {
                // startToken前面没有token，说明是文件头部，那一定是新行，不用处理
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
            // 先去除空白
            if (token.type === 'WhiteSpace' && token.prev && token.prev.type !== 'Keyword') {
                removeToken(token);
            } else if (token.type === 'WhiteSpace') {
                token.value = ' ';
            }
            // 注释前后的换行一律保留，其他一律删除
            if (token.type === 'LineBreak') {
                if (token.prev && !isComment(token.prev) && token.next && !isComment(token.next)) {
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
                if (token.prev.type === 'WhiteSpace') {
                    token.prev.value = ' ';
                } else {
                    insertBefore(token, {type: 'WhiteSpace', value: ' '});
                }
                if (token.next.type === 'WhiteSpace') {
                    token.next.value = ' ';
                } else {
                    insertAfter(token, {type: 'WhiteSpace', value: ' '});
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
                case 'VariableDeclaration':
                    guaranteeNewLine(node);
                    break;
                case 'VariableDeclarator':
                    if (node.endToken.next && node.endToken.next.type === 'Punctuator' && node.endToken.next.value === ',') {
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
                    insertBefore(node.startToken, whiteSpaceFactory());
                    insertBefore(node.endToken, nextLineFactory());
                    break;
                case 'ObjectExpression':
                    node.startToken.indentIncrease = true;
                    node.endToken.indentDecrease = true;
                    insertBefore(node.endToken, nextLineFactory());
                    break;
                case 'Property':
                    guaranteeNewLine(node);
                    break;
                case 'CallExpression':
                    node.arguments.forEach(function (arg) {
                        if (arg.endToken.next && arg.endToken.next.type === 'Punctuator' && arg.endToken.next.value === ',') {
                            insertAfter(arg.endToken.next, whiteSpaceFactory());
                        }
                    });
                    break;
                case 'FunctionExpression':
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
            if (token.indentDecrease) {
                indentLevel--;
            }
            if (token.type === 'LineBreak') {
                if (token.next && token.next.indentDecrease) {
                    indentLevel--;
                    token.next.indentDecrease = false;
                }
                insertAfter(token, indentFactory());
            }
        };
        token = _ast.startToken;
        while (token !== _ast.endToken.next) {
            processIndent(token);
            token = token.next;
        }
        // process indent end

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
