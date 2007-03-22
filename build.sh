#!/bin/sh -e

WIDGET="Earthquakes"
WIDGET_=`echo $WIDGET | perl -pe 's/ /_/g'`

rm -rf build
mkdir build
mkdir "build/$WIDGET.widget"
mkdir "build/$WIDGET.widget/Contents"
mkdir "build/$WIDGET.widget/Contents/Resources"
cp "$WIDGET.kon" "build/$WIDGET.widget/Contents"
cp script.js "build/$WIDGET.widget/Contents"
cp Resources/*.png "build/$WIDGET.widget/Contents/Resources"
cp Resources/*.gif "build/$WIDGET.widget/Contents/Resources"
cp Resources/*.jpg "build/$WIDGET.widget/Contents/Resources"

rm -f "$WIDGET_.widget"
cd build && zip -r "../$WIDGET_.widget" "$WIDGET.widget"
