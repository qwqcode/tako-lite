const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 23321 });

function response(success, msg, data) {
  return {success: success, msg: (msg || null), data: (data || {})};
}

function success(msg, data) {
  return response(true, msg, data);
}

function error(msg, data) {
  return response(false, msg, data);
}

let _users = {};
function userTpl(_ws, req) {
  return {
    ws_key: req.headers['sec-websocket-key'],
    id: null,
    host_id: null,
    ip: req.connection.remoteAddress,
    type: null, // TYPE_HOST or TYPE_GUEST
    is_signup: false
  };
}

wss.on('connection', function (_ws, req) {
  let _user = userTpl(_ws, req);
  _ws.user = _user;

  const TYPE_HOST = 'host';
  const TYPE_GUEST = 'guest';

  let actions = {
    signup: function (data) {
      if (_user.is_signup) {
        return error('已注册，无需再注册');
      }
      let id = (data.id || '').trim();
      let host_id = (data.host_id || '').trim();
      if (data.id === '') {
        return error('id 不能为空');
      }
      if (_users.hasOwnProperty(id)) {
        return error('id 已被占用');
      }
      if (host_id === '') {
        return error('host_id 不能为空');
      }
      if (host_id !== id && !_users.hasOwnProperty(host_id)) {
        return error('host_id 错误');
      }

      _user.id = id;
      _user.host_id = host_id,
      _user.type = (host_id === id) ? TYPE_HOST : TYPE_GUEST;
      _user.is_signup = true;
      _users[id] = _user;

      if (_user.type === TYPE_GUEST) {
        broadcast({ success: true, msg: '接收消息', action: 'badge', data: {
          content: `${_user.id} 已加入 SPACE`
        } })
      }

      return success('注册成功', {});
    },
    send: function (data) {
      if (!_user.is_signup) {
        return error('未注册');
      }
      let content = (data.content || '').trim();
      if (content === '') {
        return error('内容不能为空');
      }
      broadcast({ success: true, msg: '接收消息', action: 'message', data: {
        content: content,
        user_id: _user.id
      } })
      return success('消息已发送');
    },
    logout: function (data) {
      if (!user.is_signup) {
        return error('未注册');
      } else {
        logout();
        return success('注销成功');
      }
    }
  };

  _ws.on('message', function (data) {
    try {
      log(`接收数据：${data}`);
      data = JSON.parse(data);
      if (!!data.action && typeof actions[data.action] === 'function') {
        let respData = actions[data.action](data);
        respData.action = data.action;
        send(respData);
      }
    } catch (e) {
      log(`野生的错误：${e.toString()}`);
    }
  });

  _ws.on('close', function () {
    log('已断开通讯');
    logout();
  });

  function logout() {
    if (_users.hasOwnProperty(_user.id)) {
      delete _users[_user.id];
    }
    _user = userTpl(_ws, req);
    _ws.user = _user;
  }

  function send(obj, ws) {
    let data = JSON.stringify(obj);
    (ws || _ws).send(data);
    log(`发送数据：${data}`, ws);
  }

  function broadcast(obj) {
    wss.clients.forEach(function (client) {
      if (client !== _ws && client.readyState === WebSocket.OPEN) {
        if (client.user.host_id === _user.host_id || client.user.id == _user.host_id) {
          send(obj, client);
        }
      }
    });
  };

  function log(msg, ws) {
    ws = ws || _ws;
    console.log(`[${new Date().toLocaleString()}][${ws.user.id}][${ws.user.type}][${ws.user.ws_key}][${ws.user.ip}] ${msg}`);
  }
});
