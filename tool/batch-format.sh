#!/bin/sh
for i in `find temp -name "*.js"`;
    do
        echo $i
        jformatter $i > tempjs
        cp tempjs $i
    done
rm tempjs