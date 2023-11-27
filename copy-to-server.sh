#! /bin/bash

if [ `hostname` = "halle" ] ; then
    echo "Don't run copy-to-server.sh on the server!"
    exit 1
fi

rsync -Cavz --exclude-from=exclude-from-server /home/dfm/Dropbox/w/moments/ h:moments

