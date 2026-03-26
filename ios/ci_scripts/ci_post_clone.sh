#!/bin/sh

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
brew install node

cd $CI_PRIMARY_REPOSITORY_PATH
npm install

cd ios
pod install
