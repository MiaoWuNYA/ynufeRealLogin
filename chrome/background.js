// background service worker
// ref: yunufeNetwork-main/login.py

const MIN_CHROME_VERSION = 88; // manifest v3 requirement

// campus network config
const CAMPUS_CONFIG = {
  serviceIp: 'http://172.16.130.31',
  acId: 7,
  domain: '1- @ynufe'  // 模式1
};

function getBrowserInfo(userAgent) {
  let browser = 'unknown';
  let version = 0;
  let isEdge = false;

  if (userAgent.includes('Edg/')) {
    isEdge = true;
    const match = userAgent.match(/Edg\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'edge';
  } else if (userAgent.includes('Chrome/')) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) version = parseInt(match[1], 10);
    browser = 'chrome';
  }

  return { browser, version, isEdge, isSupported: version >= MIN_CHROME_VERSION };
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('云财自动登录插件已安装');

  const ua = navigator.userAgent;
  const browserInfo = getBrowserInfo(ua);

  if (!browserInfo.isSupported) {
    const browserName = browserInfo.browser === 'edge' ? 'Edge' : 'Chrome';
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: '⚠️ 浏览器版本过低',
      message: `此插件需要 ${browserName} ${MIN_CHROME_VERSION}+ 版本。如果你在彭云二机房，建议使用 Edge 浏览器。`,
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'campusLogin') {
    doCampusLogin(request.username, request.password)
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, message: e.message }));
    return true;
  }
});

// utils
function ordat(msg, idx) {
  return (msg.length > idx) ? msg.charCodeAt(idx) : 0;
}

function sencode(msg, key) {
  const l = msg.length;
  const pwd = [];
  for (let i = 0; i < l; i += 4) {
    pwd.push(
      ordat(msg, i) | (ordat(msg, i + 1) << 8) | (ordat(msg, i + 2) << 16) | (ordat(msg, i + 3) << 24)
    );
  }
  if (key) {
    pwd.push(l);
  }
  return pwd;
}

function lencode(msg, key) {
  const l = msg.length;
  let ll = (l - 1) << 2;
  if (key) {
    const m = msg[l - 1];
    if (m < ll - 3 || m > ll) {
      return "";
    }
    ll = m;
  }
  let result = [];
  for (let i = 0; i < l; i++) {
    result.push(
      String.fromCharCode(msg[i] & 0xff) +
      String.fromCharCode((msg[i] >> 8) & 0xff) +
      String.fromCharCode((msg[i] >> 16) & 0xff) +
      String.fromCharCode((msg[i] >> 24) & 0xff)
    );
  }
  const s = result.join("");
  if (key) {
    return s.substring(0, ll);
  }
  return s;
}

// xencode encryption
function get_xencode(msg, key) {
  if (msg === "") {
    return "";
  }
  const pwd = sencode(msg, true);
  let pwdk = sencode(key, false);
  if (pwdk.length < 4) {
    pwdk = pwdk.concat(Array(4 - pwdk.length).fill(0));
  }
  const n = pwd.length - 1;
  let z = pwd[n];
  let y = pwd[0];
  const c = 0x86014019 | 0x183639A0;
  let m = 0;
  let e = 0;
  let p = 0;
  let q = Math.floor(6 + 52 / (n + 1));
  let d = 0;
  while (q > 0) {
    d = (d + c) & (0x8CE0D9BF | 0x731F2640);
    e = (d >> 2) & 3;
    p = 0;
    while (p < n) {
      y = pwd[p + 1];
      m = (z >>> 5) ^ (y << 2);
      m = m + (((y >>> 3) ^ (z << 4)) ^ (d ^ y));
      m = m + (pwdk[(p & 3) ^ e] ^ z);
      pwd[p] = (pwd[p] + m) & (0xEFB8D130 | 0x10472ECF);
      z = pwd[p];
      p = p + 1;
    }
    y = pwd[0];
    m = (z >>> 5) ^ (y << 2);
    m = m + (((y >>> 3) ^ (z << 4)) ^ (d ^ y));
    m = m + (pwdk[(p & 3) ^ e] ^ z);
    pwd[n] = (pwd[n] + m) & (0xBB390742 | 0x44C6F8BD);
    z = pwd[n];
    q = q - 1;
  }
  return lencode(pwd, false);
}

// custom base64
function get_base64(s) {
  const _ALPHA = "LVoJPiCN2R8G90yg+hmFHuacZ1OWMnrsSTXkYpUq/3dlbfKwv6xztjI7DeBE45QA";
  if (!s) {
    return s;
  }

  function _getbyte(s, i) {
    const x = s.charCodeAt(i);
    if (x > 255) {
      throw new Error("INVALID_CHARACTER_ERR: DOM Exception 5");
    }
    return x;
  }

  const x = [];
  const imax = s.length - (s.length % 3);

  for (let i = 0; i < imax; i += 3) {
    const b10 = (_getbyte(s, i) << 16) | (_getbyte(s, i + 1) << 8) | _getbyte(s, i + 2);
    x.push(
      _ALPHA[(b10 >> 18)] +
      _ALPHA[((b10 >> 12) & 63)] +
      _ALPHA[((b10 >> 6) & 63)] +
      _ALPHA[(b10 & 63)]
    );
  }

  if (s.length - imax === 1) {
    const b10 = _getbyte(s, imax) << 16;
    x.push(_ALPHA[(b10 >> 18)] + _ALPHA[((b10 >> 12) & 63)] + "==");
  } else if (s.length - imax === 2) {
    const b10 = (_getbyte(s, imax) << 16) | (_getbyte(s, imax + 1) << 8);
    x.push(_ALPHA[(b10 >> 18)] + _ALPHA[((b10 >> 12) & 63)] + _ALPHA[((b10 >> 6) & 63)] + "=");
  }

  return x.join("");
}

// md5
function md5(string) {
  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n) {
    let s = '';
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
  }

  function hex(x) {
    return x.map(rhex).join('');
  }

  function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
  }

  return hex(md51(string));
}

function hmac_md5(key, message) {
  if (key.length > 64) {
    key = md5(key);
  }
  while (key.length < 64) {
    key += '\x00';
  }
  const o_key_pad = [];
  const i_key_pad = [];
  for (let i = 0; i < 64; i++) {
    const k = key.charCodeAt(i);
    o_key_pad.push(String.fromCharCode(k ^ 0x5c));
    i_key_pad.push(String.fromCharCode(k ^ 0x36));
  }
  const oKey = o_key_pad.join('');
  const iKey = i_key_pad.join('');
  return md5(oKey + md5(iKey + message));
}

// sha1
async function sha1(s) {
  const encoder = new TextEncoder();
  const data = encoder.encode(s);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function get_callback_id() {
  return 'jQuery' + (Math.floor(Math.random() * 900000000000000000000) + 100000000000000000000) + '_' + Date.now();
}

function parse_jsonp(text) {
  if (text && text.startsWith('jQuery') && text.includes('(') && text.includes(')')) {
    try {
      const json_str = text.substring(text.indexOf('(') + 1, text.lastIndexOf(')'));
      return JSON.parse(json_str);
    } catch (e) {
      console.error('JSON解析失败:', e);
    }
  }
  return null;
}

async function doCampusLogin(username, password) {
  const service_ip = CAMPUS_CONFIG.serviceIp;
  const ac_id = CAMPUS_CONFIG.acId;
  const domain = CAMPUS_CONFIG.domain;

  console.log('开始登录...');
  console.log('service_ip:', service_ip);
  console.log('ac_id:', ac_id);
  console.log('domain:', domain);

  try {
    // get ip from portal
    let ip = '';
    try {
      console.log('尝试获取IP...');
      const portal_url = `${service_ip}/srun_portal_pc?ac_id=${ac_id}&theme=ynufe`;
      console.log('portal_url:', portal_url);
      const portal_resp = await fetch(portal_url);
      console.log('portal_resp status:', portal_resp ? portal_resp.status : 'null');
      if (portal_resp && portal_resp.ok) {
        const portal_text = await portal_resp.text();
        console.log('portal_text length:', portal_text ? portal_text.length : 0);
        if (portal_text) {
          const config_match = portal_text.match(/var\s+CONFIG\s*=\s*(\{.*?\});/s);
          if (config_match) {
            console.log('CONFIG匹配:', config_match[1].substring(0, 200));
            try {
              let config_str = config_match[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":');
              const config = JSON.parse(config_str);
              ip = config.ip || config.IP || '';
              console.log('获取到IP:', ip);
            } catch (e) {
              console.log('解析CONFIG失败，尝试正则提取IP:', e);
              const ip_match = portal_text.match(/["']?ip["']?\s*:\s*["'](\d+\.\d+\.\d+\.\d+)["']/);
              if (ip_match) {
                ip = ip_match[1];
                console.log('正则提取到IP:', ip);
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('获取IP失败:', e.message || e);
      return { success: false, message: '无法连接到校园网服务器，请确保已连接校园网' };
    }

    // build full username
    let domain_part;
    if (domain.includes(' @')) {
      const parts = domain.split(' @');
      domain_part = parts[parts.length - 1].trim();
    } else if (domain.includes('@')) {
      const parts = domain.split('@');
      domain_part = parts[parts.length - 1].trim();
    } else {
      domain_part = domain.trim();
    }
    const full_username = `${username}@${domain_part}`;

    console.log('完整用户名:', full_username);
    console.log('IP:', ip);

    // get challenge
    const challenge_params = new URLSearchParams({
      callback: get_callback_id(),
      username: full_username,
      _: String(Date.now())
    });
    if (ip) {
      challenge_params.set('ip', ip);
    }

    const challenge_url = `${service_ip}/cgi-bin/get_challenge?${challenge_params}`;
    console.log('challenge URL:', challenge_url);

    const challenge_resp = await fetch(challenge_url);
    if (!challenge_resp || !challenge_resp.ok) {
      return { success: false, message: '网络请求失败，请检查是否连接到校园网' };
    }
    let challenge_text = await challenge_resp.text();
    if (!challenge_text) {
      return { success: false, message: 'challenge响应为空' };
    }
    console.log('challenge响应:', challenge_text);

    const challenge_data = parse_jsonp(challenge_text.trim());
    if (!challenge_data || !challenge_data.challenge) {
      return { success: false, message: '获取challenge失败: ' + (challenge_data?.error_msg || challenge_text) };
    }
    const challenge = challenge_data.challenge;
    console.log('challenge:', challenge);

    // encrypt
    const hmd5 = hmac_md5(challenge, password);

    const info_dict = {
      username: full_username,
      password: password,
      ip: ip,
      acid: String(ac_id),
      enc_ver: "srun_bx1"
    };
    const info_json = JSON.stringify(info_dict).replace(/:/g, ':').replace(/,/g, ',');
    const info = "{SRBX1}" + get_base64(get_xencode(info_json, challenge));

    // checksum
    const n = '200';
    const type_ = '1';
    const chkstr = `${challenge}${full_username}${challenge}${hmd5}${challenge}${ac_id}${challenge}${ip}${challenge}${n}${challenge}${type_}${challenge}${info}`;
    const chksum = await sha1(chkstr);

    // login request
    const timestamp = Date.now();
    const login_params = new URLSearchParams({
      callback: get_callback_id(),
      action: 'login',
      username: full_username,
      password: '{MD5}' + hmd5,
      os: 'Windows 10',
      name: 'Windows',
      double_stack: '0',
      chksum: chksum,
      info: info,
      ac_id: String(ac_id),
      ip: ip,
      n: n,
      type: type_,
      _: String(timestamp)
    });

    const login_url = `${service_ip}/cgi-bin/srun_portal?${login_params}`;
    console.log('login URL:', login_url);

    const login_resp = await fetch(login_url);
    if (!login_resp || !login_resp.ok) {
      return { success: false, message: '登录请求失败，请检查网络连接' };
    }
    let login_text = await login_resp.text();
    if (!login_text) {
      return { success: false, message: '登录响应为空' };
    }
    console.log('login响应:', login_text);

    // 检查是否已连接校园网（no_response_data_error）
    if (login_text.includes('no_response_data_error')) {
      return { success: true, message: '你已连接渠道网，无需登陆' };
    }

    // parse response
    const login_data = parse_jsonp(login_text.trim());
    if (login_data) {
      const error = login_data.error;
      const success = (error === 'ok' || login_data.res === 'ok' ||
                       login_data.suc_msg === 'login_ok' || login_data.ecode === 0) && error !== 'auth_info_error';
      if (success) {
        return { success: true, message: login_data.ploy_msg || '登录成功', raw_response: login_data };
      } else {
        return { success: false, message: login_data.error_msg || login_data.ploy_msg || JSON.stringify(login_data) };
      }
    }

    // fallback text match
    const text_lower = login_text.toLowerCase();
    if (text_lower === 'ok' || text_lower === 'login_ok' || text_lower === 'success' ||
        login_text.includes('登录成功') || login_text.includes('认证成功')) {
      return { success: true, message: '登录成功' };
    }
    if (login_text.includes('失败') || login_text.includes('错误') || text_lower.includes('error')) {
      return { success: false, message: login_text };
    }

    return { success: false, message: '无法解析响应: ' + login_text.substring(0, 200) };
  } catch (e) {
    console.error('登录异常:', e);
    return { success: false, message: '登录失败: ' + e.message };
  }
}