#!/usr/bin/env bash

NODE_VERSION=node-v8.1.2
wget https://nodejs.org/dist/v8.1.2/${NODE_VERSION}-linux-x64.tar.xz
tar -xvf ${NODE_VERSION}-linux-x64.tar.xz

rm -rf /opt/${NODE_VERSION} || true
mv ${NODE_VERSION}-linux-x64 /opt/${NODE_VERSION}

/opt/${NODE_VERSION}/bin/npm install
/opt/${NODE_VERSION}/bin/npm update

useradd -mrU jira-version-setter || true

echo "[Service]" > jira-version-setter.service
echo "User=jira-version-setter" >> jira-version-setter.service
echo "ExecStart=/opt/${NODE_VERSION}/bin/node $(pwd)/app.js" >> jira-version-setter.service
echo "WorkingDirectory=$(pwd)" >> jira-version-setter.service
echo "[Install]" >> jira-version-setter.service
echo "WantedBy=multi-user.target" >> jira-version-setter.service

cp jira-version-setter.service /etc/systemd/system/

systemctl enable jira-version-setter

rm -rf ${NODE_VERSION}-linux-x64*
rm -rf jira-version-setter.service
