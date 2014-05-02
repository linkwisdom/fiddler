var http = require('http');

var proxy = {
    host: '127.0.0.1',
    port: 8199 
};

var request = function (query) {
    var option = Object.create(proxy);

    if (query.path) {
        var q = require('url').parse(query.path);
        q.path && (option.path = q.path);
        q.port && (query.port = q.port);
        q.host && (query.host = q.host);
    }

    option.method = query.method || 'GET';
    option.headers = {
        Host: query.host
    };
    option.host = proxy.host;
    option.port = proxy.port;

    var req = http.request(option,
        function (res) {
           // var contentType = res.headers['content-type'];
            var encoding = 'utf8';
            var body = [];

            //console.log(res.headers);

            // if (contentType) {
            //     encoding = contentType.match(/charset=(\w+)/)[1];
            //     console.log(encoding);
            // }

            console.log("Got response: " + res.statusCode);

            res.on('data',function (d) {
                console.log(d);
                body.push(d.toString(encoding));
            });

            res.on('end', function(){
                // console.log(res.headers);
                console.log(body.join(''));
            });
        }
    );

    req.on('error', function (e) {
        console.log("Got error: " + e.message);
    });

    req.end();
};

request({
    path: 'http://www.qq.com/'
});

module.exports = request;



