# jformatter

A JavaScript formatter

    Install:
        npm -g install jformatter

    Usage:
        jformatter yourFile.js


Github: <https://github.com/ishowshao/jformatter>

## API

    require('jformatter').format(code, configObj);
    require('jformatter').formatFile(filePath, configObj);
    require('jformatter').version();

## Command Line

    jformatter yourFile.js  //will load .jformatterrc

## Config

Default config, developing, not stable

    {
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
    }

## Important Note

please update to `>=v0.1.6`, see version change log

fixed a bug cause syntax error

## Changelog

### next

* make all config work

### v0.2.0 (2014/11/05)

* npm test: config auto test
* npm test: style auto test
* add four auto-fixer config
* fix bug: Comment at first line cause redundant LineBreak
* version rule

### v0.1.8 (2014/10/28)

* add version api

### v0.1.6 (2014/08/27)

* fix bug: lost space after `void`

### v0.1.5 (2014/08/27)

* fix bug: lost space after `typeof`
* fix bug: lost space after comma expression

### v0.1.4 (2014/08/19)

* remove config not relate to code style
* change config editable with common config editor
* support npm test

### v0.1.2 (2014/08/08)

* Fix DoWhileStatement bug

### v0.1.0 (2014/08/07)

* Initial release