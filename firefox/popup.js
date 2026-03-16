// popup ui

const MIN_CHROME_VERSION = 88; // manifest v3 requirement
const MIN_FIREFOX_VERSION = 109; // manifest v3 requirement

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'unknown';
  let version = 0;
  let isEdge = false;
  let isFirefox = false;

  if (ua.includes('Firefox/')) {
    isFirefox = true;
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'firefox';
  } else if (ua.includes('Edg/')) {
    isEdge = true;
    const match = ua.match(/Edg\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'edge';
  }
  else if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'chrome';
  }

  const minVersion = isFirefox ? MIN_FIREFOX_VERSION : MIN_CHROME_VERSION;
  return { browser, version, isEdge, isFirefox, isSupported: version >= minVersion };
}

function showBrowserWarning(browserInfo) {
  const statusDiv = document.getElementById('status');

  const warningDiv = document.createElement('div');
  warningDiv.id = 'browser-warning';
  warningDiv.style.cssText = `
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border: 1px solid #ffb74d;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
  `;

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
  const versionText = browserInfo.version > 0 ? `当前版本: ${browserInfo.version}` : '';

  warningDiv.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <span style="font-size: 20px;">⚠️</span>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #e65100; margin-bottom: 6px;">
          浏览器版本过低
        </div>
        <div style="font-size: 13px; color: #5d4037; line-height: 1.5;">
          ${versionText}<br>
          此插件需要 ${browserName} ${minVer}+ 版本才能正常工作。
        </div>
        <div style="font-size: 13px; color: #1565c0; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ffcc80;">
          💡 <strong>如果你在彭云二机房，建议使用 Edge 浏览器</strong>
        </div>
      </div>
    </div>
  `;

  const content = document.querySelector('.content');
  content.insertBefore(warningDiv, content.firstChild);

  if (statusDiv) {
    statusDiv.textContent = '请升级浏览器后重试';
    statusDiv.className = 'status error';
    statusDiv.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const saveBtn = document.getElementById('saveBtn');
  const togglePassword = document.getElementById('togglePassword');
  const statusDiv = document.getElementById('status');

  const browserInfo = getBrowserInfo();
  if (!browserInfo.isSupported) {
    showBrowserWarning(browserInfo);
    return;
  }

  // browser badge
  if (browserInfo.isFirefox) {
    const header = document.querySelector('.header');
    const badge = document.createElement('span');
    badge.style.cssText = 'font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; margin-left: 8px;';
    badge.textContent = 'Firefox';
    header.appendChild(badge);
  } else if (browserInfo.isEdge) {
    const header = document.querySelector('.header');
    const edgeBadge = document.createElement('span');
    edgeBadge.style.cssText = 'font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; margin-left: 8px;';
    edgeBadge.textContent = 'Edge';
    header.appendChild(edgeBadge);
  }

  chrome.storage.local.get(['username', 'password'], function(result) {
    if (result.username) usernameInput.value = result.username;
    if (result.password) passwordInput.value = result.password;
  });

  togglePassword.addEventListener('click', function() {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    togglePassword.querySelector('.eye-icon').textContent = type === 'password' ? '👁' : '🙈';
  });

  saveBtn.addEventListener('click', function() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username) { showStatus('请输入学号/工号', 'error'); return; }
    if (!password) { showStatus('请输入密码', 'error'); return; }

    chrome.storage.local.set({
      username: username,
      password: password,
      configured: true
    }, function() {
      showStatus('设置已保存', 'success');
    });
  });

  // jwxt shortcut
  const jwxtBtn = document.getElementById('jwxtBtn');
  jwxtBtn.addEventListener('click', function() {
    const url = 'http://idas.ynufe.edu.cn/authserver/login?service=http://xjwis.ynufe.edu.cn/jsxsd/sso.jsp';
    chrome.tabs.create({ url: url });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => { statusDiv.className = 'status'; statusDiv.style.display = 'none'; }, 3000);
    }
  }
});