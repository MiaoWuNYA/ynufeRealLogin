// auto login for ynufe idas

(function() {
  'use strict';

  if (!location.href.includes('idas.ynufe.edu.cn/authserver/login')) return;

  let executed = false;

  function main() {
    if (executed) return;
    executed = true;

    chrome.storage.local.get(['configured', 'username', 'password']).then(data => {
      if (!data.configured || !data.username || !data.password) return;
      doLogin(data.username, data.password);
    });
  }

  async function doLogin(username, password) {
    if (typeof showTabHeadAndDiv === 'function') {
      showTabHeadAndDiv('userNameLogin', 1);
    }
    await sleep(200);

    const pwdForm = document.getElementById('pwdFromId');
    if (!pwdForm) return;

    const usernameInput = pwdForm.querySelector('input[name="username"]');
    const passwordInput = pwdForm.querySelector('input[name="passwordText"]');
    const saltPasswordInput = pwdForm.querySelector('input[name="password"]');
    const pwdEncryptSaltInput = pwdForm.querySelector('#pwdEncryptSalt');
    const loginBtn = pwdForm.querySelector('#login_submit');
    const captchaDiv = pwdForm.querySelector('#captchaDiv');
    const captchaInput = pwdForm.querySelector('input[name="captcha"]');

    if (!usernameInput || !passwordInput) return;

    showTip('正在自动登录...');

    usernameInput.focus();
    setInputVal(usernameInput, username);
    await sleep(100);

    if (typeof checkUserCaptcha === 'function') {
      try { checkUserCaptcha(); } catch(e) {}
    }
    await sleep(150);

    passwordInput.focus();
    passwordInput.removeAttribute('readonly');
    setInputVal(passwordInput, password);
    await sleep(100);

    if (saltPasswordInput && pwdEncryptSaltInput && pwdEncryptSaltInput.value) {
      const salt = pwdEncryptSaltInput.value;
      if (typeof encryptPassword === 'function') {
        saltPasswordInput.value = encryptPassword(password, salt);
      } else if (typeof CryptoJS !== 'undefined') {
        try {
          saltPasswordInput.value = CryptoJS.AES.encrypt(
            password, CryptoJS.enc.Utf8.parse(salt),
            { iv: CryptoJS.enc.Utf8.parse(salt), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
          ).toString();
        } catch(e) {}
      }
    }

    if (captchaDiv && !captchaDiv.classList.contains('hide') && captchaInput) {
      captchaInput.focus();
      captchaInput.addEventListener('input', () => {
        if (captchaInput.value.length >= 4) setTimeout(() => submitLogin(loginBtn), 200);
      });
      return;
    }

    await sleep(200);
    submitLogin(loginBtn);
  }

  function setInputVal(el, val) {
    el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function submitLogin(btn) {
    if (typeof startLogin === 'function' && btn) {
      startLogin(btn);
    } else if (btn) {
      btn.click();
    }
  }

  function showTip(msg) {
    const old = document.getElementById('yuncai-tip');
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = 'yuncai-tip';
    Object.assign(div.style, {
      position: 'fixed', top: '20px', right: '20px', zIndex: '2147483647',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', transition: 'all 0.3s ease'
    });

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,#e3f2fd 0%,#fff 30%);border-left:5px solid #2196f3;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.25);padding:14px 18px;min-width:200px;">
        <b style="color:#2196f3;font-size:20px;width:24px;text-align:center;animation:spin 1s linear infinite;">⟳</b>
        <span style="flex:1;color:#333;font-size:14px;">${msg}</span>
      </div>
    `;

    document.body.appendChild(div);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  main();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  }
})();