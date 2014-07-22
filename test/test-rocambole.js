#!/usr/bin/env node

var rocambole = require('rocambole');
var ast = rocambole.parse(require('fs').readFileSync('case.js', 'utf-8'));
console.log(ast.tokens);
// to get a string representation of all tokens call toString()
//console.log( ast.toString() );