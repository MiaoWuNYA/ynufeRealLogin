// background service worker

const MIN_CHROME_VERSION = 88; // manifest v3 requirement
const MIN_FIREFOX_VERSION = 109; // manifest v3 requirement

function getBrowserInfo(userAgent) {
  let browser = 'unknown';
  let version = 0;
  let isEdge = false;
  let isFirefox = false;

  if (userAgent.includes('Firefox/')) {
    isFirefox = true;
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'firefox';
  } else if (userAgent.includes('Edg/')) {
    isEdge = true;
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'edge';
  } else if (userAgent.includes('Chrome/')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'chrome';
  }

  const minVersion = isFirefox ? MIN_FIREFOX_VERSION : MIN_CHROME_VERSION;
  return { browser, version, isEdge, isFirefox, isSupported: version >= minVersion };
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('云财自动登录插件已安装');

  const ua = navigator.userAgent;
  const browserInfo = getBrowserInfo(ua);

  if (!browserInfo.isSupported) {
    let browserName, minVer;
    if (browserInfo.isFirefox) {
      browserName = 'Firefox';
      minVer = MIN_FIREFOX_VERSION;
    } else if (browserInfo.browser === 'edge') {
      browserName = 'Edge';
      minVer = MIN_CHROME_VERSION;
    } else {
      browserName = 'Chrome';
      minVer = MIN_CHROME_VERSION;
    }
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: '⚠️ 浏览器版本过低',
      message: `此插件需要 ${browserName} ${minVer}+ 版本。如果你在彭云二机房，建议使用 Edge 浏览器。`,
      priority: 2,
      requireInteraction: true
    });
  } else if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: '✅ 云财自动登录已安装',
      message: '点击扩展图标设置学号和密码即可使用',
      priority: 1
    });
  }
});