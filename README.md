#jformatter

A JavaScript formatter

    Install:
        npm -g install jformatter

    Usage:
        jformatter yourFile.js


Github: <https://github.com/ishowshao/jformatter>

Default config, developing, not stable

    {
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
        }
    }

##Changelog

###next

* make all configure work

###v0.1.0 (2014/08/07)

* Initial release