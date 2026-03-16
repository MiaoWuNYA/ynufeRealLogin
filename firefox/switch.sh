#!/bin/bash
# 切换浏览器版本的脚本

cd "$(dirname "$0")"

if [ "$1" = "chrome" ]; then
    cp manifest-chrome.json manifest.json
    echo "已切换为 Chrome/Edge 版本"
elif [ "$1" = "firefox" ]; then
    cp manifest-firefox.json manifest.json
    echo "已切换为 Firefox 版本"
else
    echo "用法: $0 [chrome|firefox]"
    echo "  chrome  - 切换为 Chrome/Edge 兼容版本"
    echo "  firefox - 切换为 Firefox 兼容版本"
fi