/*
 * Main-world bridge for Aliyun CAPTCHA.
 *
 * Declared in the manifest with "world": "MAIN" so it shares the page's global
 * object (content scripts live in an isolated world and cannot reach
 * window.initAliyunCaptcha). It talks to the extension through DOM events whose
 * detail is a JSON string — the only payload shape that crosses worlds reliably.
 */
(function () {
  if (window.__pickcatCaptchaBridge) return;
  window.__pickcatCaptchaBridge = true;

  var COMMAND = 'pickcat:captcha-command';
  var REPLY = 'pickcat:captcha-reply';
  var SCRIPT_SRC = 'https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js';

  var pending = null;
  var inited = false;

  function reply(payload) {
    window.dispatchEvent(new CustomEvent(REPLY, { detail: JSON.stringify(payload) }));
  }

  function loadScript(prefix, region) {
    return new Promise(function (resolve, reject) {
      window.AliyunCaptchaConfig = { prefix: prefix, region: region };
      if (window.initAliyunCaptcha) {
        resolve();
        return;
      }
      var el = document.createElement('script');
      el.src = SCRIPT_SRC;
      el.async = true;
      el.onload = function () {
        if (window.initAliyunCaptcha) resolve();
        else reject(new Error('验证脚本未提供初始化函数'));
      };
      el.onerror = function () {
        reject(new Error('人机验证脚本加载失败'));
      };
      document.head.appendChild(el);
    });
  }

  function settle(ok, value) {
    if (!pending) return;
    var waiter = pending;
    pending = null;
    if (ok) waiter.resolve(value);
    else waiter.reject(value);
  }

  window.addEventListener(COMMAND, function (event) {
    var data = {};
    try {
      data = JSON.parse(event.detail || '{}');
    } catch (error) {
      return;
    }

    if (data.command === 'init') {
      if (inited) {
        reply({ type: 'ready' });
        return;
      }
      loadScript(data.prefix, data.region)
        .then(function () {
          window.initAliyunCaptcha({
            SceneId: data.sceneId,
            mode: 'popup',
            element: '#' + data.hostId,
            button: '#' + data.anchorId,
            slideStyle: { width: 360, height: 40 },
            getInstance: function () {},
            onClose: function (reason) {
              if (reason === 'userDismiss') settle(false, '已取消人机验证');
            },
            onError: function () {
              settle(false, '人机验证初始化失败，请重试');
            },
            success: function (param) {
              settle(true, param);
            },
          });
          inited = true;
          reply({ type: 'ready' });
        })
        .catch(function (error) {
          reply({ type: 'fatal', message: (error && error.message) || '人机验证脚本加载失败' });
        });
      return;
    }

    if (data.command === 'verify') {
      var anchor = document.getElementById(data.anchorId);
      if (!anchor) {
        reply({ type: 'verify-result', nonce: data.nonce, ok: false, message: '人机验证未就绪' });
        return;
      }
      pending = {
        resolve: function (param) {
          reply({ type: 'verify-result', nonce: data.nonce, ok: true, param: param });
        },
        reject: function (message) {
          reply({ type: 'verify-result', nonce: data.nonce, ok: false, message: message });
        },
      };
      anchor.click();
    }
  });
})();
