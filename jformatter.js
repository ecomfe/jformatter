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

        var NEXT_LINE = {
            type: 'LineBreak',
            value: _config.lineSeparator,
            formatter: true
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

        /**
         * check if a token is comment
         * @param token
         * @returns {boolean}
         */
        var isComment = function (token) {
            return token.type === 'LineComment' || token.type === 'BlockComment';
        };

        var toInsertBefore = {
            'Keyword': {
                'in': ' ',
                'instanceof': ' ',
                'catch': _config.spaces.before.keywords ? ' ' : '',
                'finally': _config.spaces.before.keywords ? ' ' : ''
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

        var toInsertAfter = {
            'Keyword': {
                'var': ' ',
                'if': _config.spaces.before.parentheses ? ' ' : '',
                'else': ' ',
                'function': _config.spaces.before.functionExpressionParentheses ? ' ' : '',
                'throw': ' ',
                'return': ' ',
                'delete': ' ',
                'for': _config.spaces.before.parentheses ? ' ' : '',
                'while': _config.spaces.before.parentheses ? ' ' : '',
                'new': ' ',
                'in': ' ',
                'typeof': ' ',
                'instanceof': ' ',
                'catch': _config.spaces.before.parentheses ? ' ' : '',
                'switch': _config.spaces.before.parentheses ? ' ' : '',
                'case': ' ',
                'void': ' '
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

        var SPACE_AROUND_PUNCTUATOR = [
            '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '&=', '^=', '|=',
            '==', '!=', '===', '!==', '>', '>=', '<', '<=',
            '+', '-', '*', '/', '%', '++', '--',
            '&', '|', '^', '~', '<<', '>>', '>>>',
            '&&', '||'
        ];

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

        var _rocambole = require('rocambole');
        var _ast = _rocambole.parse(string);

        // loop node
        _rocambole.recursive(_ast, function (node) {
            switch (node.type) {
                case 'VariableDeclaration':
                    if (node.endToken.next.type === 'WhiteSpace') {
                        node.endToken.next.type = 'LineBreak';
                        node.endToken.next.value = '\n';
                    }
                    break;
                case 'VariableDeclarator':
                    break;
                default:
                    break;
            }
        });

        // loop token
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
        var token = _ast.startToken;
        while (token !== _ast.endToken.next) {
            processToken(token);
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
