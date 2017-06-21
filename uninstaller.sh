#!/usr/bin/env bash

NODE_VERSION=node-v8.1.2
userdel -r jira-version-setter || true
rm -rf /opt/${NODE_VERSION} || true
systemctl disable jira-version-setter || true
rm -f /etc/systemd/system/jira-version-setter.service