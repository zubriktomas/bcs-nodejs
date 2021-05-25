#!/bin/bash

cd ./../../;

url="http://cssbox.sf.net";

node ground-truth-annotation.js $url \
    --S1 ./input/example/segments[cssbox.sf.net]-0.3.xml \
    --S2 ./input/example/segments[cssbox.sf.net]-0.5.json \
    --S3 ./input/example/segments[cssbox.sf.net]-ex-0.5.json \
    --BJSON ./input/example/boxes[cssbox.sf.net].json \
    --BPNG ./input/example/boxes[cssbox.sf.net].png \
    --WPNG ./input/example/webpage[cssbox.sf.net].png 