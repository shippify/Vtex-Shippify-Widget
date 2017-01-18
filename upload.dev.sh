#!/bin/sh

PATH_PEM=
NAME_PRODUCTION_PEM=
scp -i $PATH_PEM$NAME_PRODUCTION_PEM ./src/widget.js ec2-user@52.67.193.77:/srv/adminandapi/public/vtex/widget.js
