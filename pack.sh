#!/bin/bash
PLUGIN=`grep "<appian-extension name" appian-extension.xml | cut -f2 -d "\"" | sed -e 's/ /_/g'`
VERSION=`grep "<version>" appian-extension.xml | cut -f2 -d ">" | cut -f1 -d "<"`
COMPONENT=`grep "<component rule-name" appian-extension.xml | cut -f2 -d "\""`
rm -f ComponentPlugin_${PLUGIN}_v${VERSION}.zip
rm -fr tmp
mkdir tmp
cp appian-extension.xml tmp
mkdir tmp/${COMPONENT}
cp -r ${COMPONENT}/* tmp/${COMPONENT}
rm -f tmp/${COMPONENT}/.DS_Store
rm -f tmp/${COMPONENT}/v1/APPIAN_JS_SDK_URI
cd tmp
zip -r ../ComponentPlugin_${PLUGIN}_v${VERSION}.zip *
cd ..
rm -fr tmp