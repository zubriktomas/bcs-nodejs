#!/bin/bash

# Defined terminal variables
# bcsnodejs=ABS_PATH
# fitlayout=ABS_PATH
# evaluation=ABS_PATH

clusteringThresholds=(0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8)
echo $clusteringThresholds

echo "bcs-nodejs-folder-path: $1";
echo "bcs-fitlayout-folder-path: $2";
echo "bcs-nodejs-evaluation-folder-path: $3";
echo "URL: $4";
echo "COMMAND: $5";


# dts=(0.2 0.25 0.3 0.35 0.4 0.45)

# # node . --IGIM $4 --CT 0.1 -E68
# for ct in ${clusteringThresholds[@]}; do

#     cd $1;
#     node . --IGIM $4 --CT $ct -E4 --extended -A 
#     cd $3;    
#     node ground-truth-annotation.js $4 --S1 $1output/segments-ex-A-$ct.json 
#     # for dt in ${dts[@]}; do
#     #     cd $1;
#     #     node . --IGIM $4 --CT 0.3 -E4 --extended -A --DT $dt
#     #     cd $3;    
#     #     node ground-truth-annotation.js $4 --S1 $1output/segments-ex-A-0.5-0.2.json 
#     # done
# done
# exit 0;


if [ $6 ] 
then
    echo "WIDTH: $6";
fi

if [ $5 == "process" ]
then
    if [ $6 ] 
    then
        cd $1;
        node . --IGIM $4 --CT 0.1 -E68 -W $6
        for ct in ${clusteringThresholds[@]}; do
            node . --IGIM $4 --CT $ct -E4 -W $6
            echo "Basic $ct processed -W $6";
        done

        for ct in ${clusteringThresholds[@]}; do
            node . --IGIM $4 --CT $ct -E4 --extended -W $6
            echo "Extended $ct processed -W $6";
        done

        cd $2;
        for ct in ${clusteringThresholds[@]}; do
            java -jar FitLayout.jar RENDER -b puppeteer $4 -W $6 SEGMENT -m bcs --options=threshold=$ct EXPORT -f xml -o ./out/segments-$ct.xml
            echo "Reference $ct processed -W $6";
        done

    else
        # cd $1;
        # node . --IGIM $4 --CT 0.1 -E68
        # for ct in ${clusteringThresholds[@]}; do
        #     node . --IGIM $4 --CT $ct -E4
        #     echo "Basic $ct processed";
        # done

        # for ct in ${clusteringThresholds[@]}; do
        #     node . --IGIM $4 --CT $ct -E4 --extended 
        #     echo "Extended $ct processed";
        # done

        cd $2;
        for ct in ${clusteringThresholds[@]}; do
            java -jar newFitLayout.jar RENDER -b puppeteer $4 SEGMENT -m bcs --options=threshold=$ct EXPORT -f png -o ./out/segments-$ct.png
            # java -jar newFitLayout.jar RENDER -b puppeteer $4 SEGMENT -m bcs --options=threshold=$ct EXPORT -f xml -o ./out/segments-$ct.xml 
            echo "Reference $ct processed";
        done
    fi
fi
    
if [ $5 == "showleaf" ]
then
    cd $3;

    node ground-truth-annotation.js $4 --S1 $2out/segments-0.1.xml --S2 $2out/segments-0.2.xml --S3 $2out/segments-0.3.xml 
    node ground-truth-annotation.js $4 --S1 $2out/segments-0.4.xml --S2 $2out/segments-0.5.xml --S3 $2out/segments-0.6.xml 
    # node ground-truth-annotation.js $4 --S1 $2out/segments-0.7.xml --S2 $2out/segments-0.8.xml 

    # node ground-truth-annotation.js $4 --S1 $1output/segments-0.1.json --S2 $1output/segments-0.2.json 
    node ground-truth-annotation.js $4 --S1 $1output/segments-0.3.json --S2 $1output/segments-0.4.json --S3 $1output/segments-0.5.json
    node ground-truth-annotation.js $4 --S1 $1output/segments-0.6.json --S2 $1output/segments-0.7.json --S3 $1output/segments-0.8.json

    node ground-truth-annotation.js $4 --S1 $1output/segments-ex-0.2.json --S2 $1output/segments-ex-0.3.json --S3 $1output/segments-ex-0.4.json
    node ground-truth-annotation.js $4 --S1 $1output/segments-ex-0.5.json --S2 $1output/segments-ex-0.6.json --S3 $1output/segments-ex-0.7.json
    # node ground-truth-annotation.js $4 --S1 $1output/segments-ex-0.1.json --S2 $1output/segments-ex-0.8.json
fi

if [ $5 == "showall" ]
then
    cd $3;

    node ground-truth-annotation.js $4 --BJSON $1output/allNodesAsBoxes.json --S1 $2out/segments-0.1.xml --S2 $2out/segments-0.2.xml --S3 $2out/segments-0.3.xml 
    node ground-truth-annotation.js $4 --BJSON $1output/allNodesAsBoxes.json --S1 $2out/segments-0.4.xml --S2 $2out/segments-0.5.xml --S3 $2out/segments-0.6.xml 
    # node ground-truth-annotation.js $4 --S1 $2out/segments-0.7.xml --S2 $2out/segments-0.8.xml 

    # node ground-truth-annotation.js $4 --S1 $1output/segments-0.1.json --S2 $1output/segments-0.2.json 
    node ground-truth-annotation.js $4 --BJSON $1output/allNodesAsBoxes.json --S1 $1output/segments-0.3.json --S2 $1output/segments-0.4.json --S3 $1output/segments-0.5.json
    node ground-truth-annotation.js $4 --BJSON $1output/allNodesAsBoxes.json --S1 $1output/segments-0.6.json --S2 $1output/segments-0.7.json --S3 $1output/segments-0.8.json

    node ground-truth-annotation.js $4 --BJSON $1output/allNodesAsBoxes.json --S1 $1output/segments-ex-0.2.json --S2 $1output/segments-ex-0.3.json --S3 $1output/segments-ex-0.4.json
    node ground-truth-annotation.js $4 --BJSON $1output/allNodesAsBoxes.json --S1 $1output/segments-ex-0.5.json --S2 $1output/segments-ex-0.6.json --S3 $1output/segments-ex-0.7.json
    # node ground-truth-annotation.js $4 --S1 $1output/segments-ex-0.1.json --S2 $1output/segments-ex-0.8.json
fi