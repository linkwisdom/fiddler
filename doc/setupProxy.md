## mac 设置网络代理的方法

## windows 下设置网络代理的方法

设置的方式也比较简单，只需要设置http_proxy,http_proxy_user和http_proxy_pass三个环境变量就可以了。
在命令行下，执行如下命令：
set http_proxy=http://proxy.com:port/
set http_proxy_user=username
set http_proxy_pass=password

之后就可以通过代理访问网络了。

如果不想每次都设置，可以将这些环境变量，设置到系统的环境变量中。右击我的电脑–>属性–>高级–>环境变量–>系统变量，用新建的方式去设置代理服务器。