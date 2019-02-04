(function () {
  let _conf = Object.assign({}, window.takoLiteConfig);
  let _ws = new window.WebSocket(_conf.server);
  let _el = {};
  let _host = {
    id: null
  };
  let _user = {
    id: null
  };

  window.onload = () => {
    console.log('Tako Lite!');

    initView();
  };

  function initView() {
    _el.notifyWrapEl = document.querySelector('.notify-wrap');

    // page-build
    _el.builderPage = document.querySelector('.builder-page');
    _el.yourIdInput = _el.builderPage.querySelector('[name="your_id"]');
    _el.createSpaceBtn = _el.builderPage.querySelector('[data-action="create-space"]');
    _el.othersIdInput = _el.builderPage.querySelector('[name="others_id"]');
    _el.enterSpaceBtn = _el.builderPage.querySelector('[data-action="enter-space"]');

    // message-page
    _el.messagePage = document.querySelector('.message-page');
    _el.board = _el.messagePage.querySelector('.board');
    _el.editorTextarea = _el.messagePage.querySelector('.editor-textarea');
    _el.sendBtn = _el.messagePage.querySelector('[data-action="send"]');

    // events
    _el.createSpaceBtn.onclick = () => {
      let id = trim(_el.yourIdInput.value);
      if (id === '') {
        _el.yourIdInput.focus();
        return;
      }
      connect(id);
    }

    _el.enterSpaceBtn.onclick = () => {
      let id = trim(_el.yourIdInput.value);
      let othersId = trim(_el.othersIdInput.value);
      if (id === '') {
        _el.yourIdInput.focus();
        return;
      }
      if (othersId === '') {
        _el.othersIdInput.focus();
        return;
      }

      connect(id, othersId);
    }

    _el.othersIdInput.oninput = () => {
      let val = trim(_el.othersIdInput.value);
      if (val !== '') {
        _el.createSpaceBtn.style.display = 'none';
      } else {
        _el.createSpaceBtn.style.display = '';
      }
    };

    _el.editorTextarea.onkeydown = (evt) => {
      let e = evt || window.event;
      let ec = e.keyCode || e.which;
      if (e.ctrlKey && ec === 13) {
        e.preventDefault();
        _el.editorTextarea.value += '\n';
      } else if (ec === 13) {
        e.preventDefault();
        _el.sendBtn.click();
      }
    };

    _el.sendBtn.onclick = () => {
      sendMsg(_el.editorTextarea.value);
    }
  }

  function connect(id, host_id) {
    if (_ws.readyState !== WebSocket.OPEN) {
      notify('还未成功建立连接，请稍等...', 'e');
      return;
    }
    host_id = host_id || id;
    wsSend('signup', { id: id, host_id: host_id });
    _user.id = id;
    _host.id = host_id;
  }

  _ws.onopen = () => {
    log(`连接已建立`);
  };

  _ws.onmessage = (evt) => {
    log(`接收数据：${evt.data}`);
    let obj = JSON.parse(evt.data);
    let success = obj.success;
    let msg = obj.msg;
    let action = obj.action;
    let data = obj.data;

    switch (action) {
      case 'signup':
        if (success) {
          _el.builderPage.style.display = 'none';
          _el.messagePage.style.display = '';
          putMessageBadge(`${_user.id} 已加入 SPACE`);
        } else {
          notify(`注册失败，${msg}`, 'e');
        }
        break;
      case 'message':
        if (success) {
          putMessageItem(data.content, data.user_id);
        } else {

        }
        break;
      case 'badge':
        if (success) {
          putMessageBadge(data.content);
        } else {

        }
        break;
    }

  };

  _ws.onclose = () => {
    notify('连接已关闭', 'w');
  };

  _ws.onerror = (evt) => {
    notify('连接建立失败', 'e');
  };

  function wsSend(action, obj) {
    let data = JSON.stringify(Object.assign({action: action}, obj));
    _ws.send(data);
    log(`发送数据：${data}`)
  }

  function trim(v) {
    return v.replace(/^\s+|\s+$/gm, '');
  }

  function log(msg) {
    console.log(`[${new Date().toLocaleString()}] ${msg}`);
  }

  function putMessageItem(content, id) {
    let el = document.createElement('div');
    el.className = 'message-item ' + (id === _user.id ? 'me' : 'other');

    let avatarEl = document.createElement('div');
    avatarEl.className = 'avatar';
    avatarEl.innerText = id.substring(0, 1).toUpperCase();
    el.appendChild(avatarEl);

    let bodyEl  = document.createElement('div');
    bodyEl.className = 'body';
    let idEl = document.createElement('div');
    idEl.className = 'id';
    idEl.innerText = id;
    let contentEl = document.createElement('div');
    contentEl.className = 'content';
    contentEl.innerText = content;
    bodyEl.appendChild(idEl);
    bodyEl.appendChild(contentEl);
    el.appendChild(bodyEl);

    _el.board.appendChild(el);
    _el.board.scrollTop = _el.board.scrollHeight;
  }

  function putMessageBadge(msg) {
    let el = document.createElement('div');
    el.className = 'message-badge';
    let msgEl = document.createElement('span');
    msgEl.innerText = msg;
    el.appendChild(msgEl);
    _el.board.appendChild(el);
  }

  window.putMessageItem = putMessageItem;

  function notify(msg, type) {
    let timeout = 4000;
    let types = {
      s: "#57d59f",
      e: "#ff6f6c",
      w: "#ffc721",
      i: "#2ebcfc"
    }
    let notifyEl = document.createElement('div');
    notifyEl.className = 'notify';
    notifyEl.innerText = msg;
    notifyEl.style.backgroundColor = types[type];
    _el.notifyWrapEl.prepend(notifyEl);
    let fn = setTimeout(() => {
      notifyEl.remove();
    }, timeout);
    notifyEl.onclick = () => {
      notifyEl.remove();
      clearTimeout(fn);
    }
  }

  function sendMsg(content) {
    content = trim(content || '');
    if (content === '') {
      _el.editorTextarea.focus();
    }
    wsSend('send', { content: content });
    putMessageItem(content, _user.id);
    _el.editorTextarea.value = '';
  }
})();
