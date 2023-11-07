**# AMIS Viewer**



此插件用于在vscode中实时显示AMIS页面，AMIS页面配置json文件请参考百度AMIS低代码开发平台：https://baidu.gitee.io/amis/zh-CN/docs/index



**## Setting**



在setting中搜索AMIS，并设置assets_url(资源地址)。assets_url表示引入amis的css和js的地址



**## Configuration**



1、在项目的根目录新建amis.json. amis.json的文件中需要包含如下字段

```json
{

	"dev_url":"http:127.0.0.1", //接口请求的url

	"api_headers":{ //接口的请求头设置

		//...

   }

}
```



2、将上述dev_url的网站配置cros，允许跨域访问



**## Use**

1、打开一个amis的json文件，点击状态栏的AMIS按钮即可显示预览页面

2、如果状态栏中没有AMIS按钮，请使用control+shift+P并选择AMIS，运行AMIS后即可显示预览页面



**## 建议目录结构**



```
- 项目
 - amis.json (amis配置文件)
 - amis_pages (存放amis页面配置的目录)
   - test.json (amis页面配置文件)
 - 其他...
```

