// popup.js - 弹窗逻辑

document.addEventListener('DOMContentLoaded', function() {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const autoLoginCheckbox = document.getElementById('autoLogin');
  const saveBtn = document.getElementById('saveBtn');
  const campusLoginBtn = document.getElementById('campusLoginBtn');
  const togglePassword = document.getElementById('togglePassword');
  const statusDiv = document.getElementById('status');

  chrome.storage.local.get(['username', 'password', 'autoLogin'], function(result) {
    if (result.username) usernameInput.value = result.username;
    if (result.password) passwordInput.value = result.password;
    if (result.autoLogin !== undefined) autoLoginCheckbox.checked = result.autoLogin;
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
      autoLogin: autoLoginCheckbox.checked,
      configured: true
    }, function() {
      showStatus('设置已保存', 'success');
    });
  });

  // 校园网登录 - 通过 background.js 执行
  campusLoginBtn.addEventListener('click', async function() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) { showStatus('请先填写学号和密码', 'error'); return; }

    showStatus('正在登录校园网...', 'info');
    campusLoginBtn.disabled = true;

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'campusLogin',
        username: username,
        password: password
      });
      if (result.success) {
        showStatus('校园网登录成功！', 'success');
      } else {
        showStatus('登录失败: ' + result.message, 'error');
      }
    } catch (e) {
      showStatus('登录出错: ' + e.message, 'error');
    } finally {
      campusLoginBtn.disabled = false;
    }
  });

  // 本科教务系统跳转
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