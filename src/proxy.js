var net = require('net');

/**
 * 代理配置
 * 
 * @type {Object}
 */
var config = {
    port: 8893,
    rules: []
};

/**
 * 从http请求头部取得请求信息后，继续监听浏览器发送数据 
 * 同时连接目标服务器，并把目标服务器的数据传给浏览器
 * 
 * @param  {Object} req    请求参数
 * @param  {Object} client 客户请求链接
 * @param  {Object} buffer 请求头部缓存
 */
function relayConnection(req, client, buffer) {
    console.log(
        'method:[%s], host:[%s], port:[%s]',
        req.method, req.host, req.port
    );
    
    // 如果请求不是CONNECT方法（GET, POST），那么替换掉头部的一些东西
    if (req.method != 'CONNECT') {
        // 先从buffer中取出头部
        var idx = searchBufferBody(buffer);

        if (idx < 0) {
            idx = buffer.length;
        }

        var header = buffer.slice(0, idx).toString('utf8');

        // 替换connection头
        header = header.replace(/(proxy\-)?connection\:.+\r\n/ig,'')
                .replace(/Keep\-Alive\:.+\r\n/i,'')
                .replace("\r\n", '\r\nConnection: close\r\n');

        // 替换网址格式(去掉域名部分)
        if (req.httpVersion == '1.1') {
            var query = require('url').parse(req.path);
            if (query.path != req.path) {
                header = header.replace(req.path, query.path);
            }
        }

        buffer = concatBuffer(new Buffer(header,'utf8'), buffer.slice(idx));
    }
    
    // 建立到目标服务器的连接
    var server = net.createConnection(req.port, req.host);

    // 交换服务器与浏览器的数据
    client.on('data', function (data){
        server.write(data);
    });

    server.on('data', function (data){
        client.write(data);
    });

    if (req.method == 'CONNECT') {
        buffer = new Buffer(
            'HTTP/1.1 200 Connection ' 
            + 'established\r\nConnection: close\r\n\r\n'
        );

        client.write(buffer);
    } else {
        server.write(buffer);
    }
}

exports.listen = function (port) {
    //在本地创建一个server监听本地local_port端口
    net.createServer(function (client) {
        //首先监听浏览器的数据发送事件，直到收到的数据包含完整的http请求头
        var buffer = new Buffer(0);
        client.on('data', function (data) {
            buffer = concatBuffer(buffer,data);

            if (searchBufferBody(buffer) == -1) {
                return;
            }

            var req = parseRequest(buffer);

            if (req.port == port 
                && (req.host == 'localhost' || req.host == '127.0.0.1')) {
                console.log('loop on [%s]', port);
                client.write('end\r\n');
                return;
            }

            if (req) {
                client.removeAllListeners('data');
                relayConnection(req, client, buffer);
            }
        });
    }).listen(port);

    console.log('server listen[%s]', port);
};

// 处理各种错误
process.on('uncaughtException', function(err) {
    console.log(err);
});

/**
* 从请求头部取得请求详细信息
* 如果是 CONNECT 方法，那么会返回 { method,host,port,httpVersion}
* 如果是 GET/POST 方法，那么返回 { metod,host,port,path,httpVersion}
*/
function parseRequest(buffer)
{
    var s = buffer.toString('utf8');
    var method = 'GET';
    var _m = s.split('\n')[0].match(/^([A-Z]+)\s/);

    if (_m) {
        method = _m[1];
    }

    if (method == 'CONNECT') {
        var arr = s.match(/^([A-Z]+)\s([^\:\s]+)\:(\d+)\sHTTP\/(\d\.\d)/);
        if (arr && arr[1] && arr[2] && arr[3] && arr[4]) {
            return {
                method: arr[1], 
                host: arr[2], 
                port: arr[3],
                httpVersion: arr[4]
            };
        }
    } else {
        var arr = s.match(/^([A-Z]+)\s([^\s]+)\sHTTP\/(\d\.\d)/);
        if (arr && arr[1] && arr[2] && arr[3]) {
            var host = s.match(/Host\:\s+([^\n\s\r]+)/);
            if (host) {
                host = host[1];
                var _p = host.split(':',2);
                return {
                    method: arr[1],
                    host: _p[0],
                    port: _p[1] ? _p[1] : 80,
                    path: arr[2],
                    httpVersion: arr[3]
                };
            }
        }
    }
    return false;
}




/**
* 两个buffer对象加起来
*/
function concatBuffer(chunck1, chunck2) {
    var result = new Buffer(chunck1.length  +  chunck2.length);
    chunck1.copy(result);
    chunck2.copy(result, chunck1.length);
    return result;
}

/**
* 从缓存中找到头部结束标记("\r\n\r\n")的位置
*/
function searchBufferBody(b) {
    for(var i = 0, len = b.length - 3; i < len; i ++ ) {
        if (b[i] == 0x0d && b[i + 1] == 0x0a 
            && b[i + 2] == 0x0d && b[i + 3] == 0x0a ) {
            return i + 4;
        }
    }
    return -1;
}
