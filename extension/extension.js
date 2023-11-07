// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
var webViewPanel = null;
var statusBarItem = null;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1
  );
  statusBarItem.text = "AMIS-YAO";
  statusBarItem.command = "amis-yao-viewer.show";
  if (isAmisConfigFile()) {
    statusBarItem.show();
  }
  vscode.commands.registerCommand("amis-yao-viewer.show", function () {
    showAmisView();
  });

  let disposable = vscode.commands.registerCommand(
    "amis-yao-viewer.amis",
    function () {
      if (statusBarItem == null) {
        statusBarItem = vscode.window.createStatusBarItem(
          vscode.StatusBarAlignment.Right,
          1
        );
        statusBarItem.text = "AMIS";
        statusBarItem.command = "amis-yao-viewer.show";
      }
      toggleStatusBarItem(null);
    }
  );

  //保存文件时更改webview渲染
  vscode.workspace.onDidSaveTextDocument(function (doc) {
    if (toggleStatusBarItem(null)) {
      showAmisView();
    }
  });

  function toggleStatusBarItem(e) {
    if (!statusBarItem) return false;
    if (!isAmisConfigFile) {
      statusBarItem.hide();
      return false;
    }
    statusBarItem.show();
    showAmisView();
    return true;
  }

  function isAmisConfigFile() {
    if (!vscode.window.activeTextEditor) return false;

    let filename = vscode.window.activeTextEditor.document.fileName;
    // console.log(`Document FileName:${filename}`);

    if (filename.substring(filename.length - 5) != ".json") {
      return false;
    }
    const text = vscode.window.activeTextEditor.document.getText();
    const json = JSON.parse(text);
    if (!json.type) {
      return false;
    }
    return true;
  }

  vscode.window.onDidChangeActiveTextEditor(function (e) {
    var res = isAmisConfigFile();
    if (!res) {
      // console.log("!!!!!!!!isAmisConfigFile");
    }
  });

  context.subscriptions.push(disposable);
}

function showAmisView() {
  const filePath = vscode.window.activeTextEditor.document.uri.path;
  const workspaceFolders = vscode.workspace.workspaceFolders;
  var workspace = "";
  var folderPath = "";
  workspaceFolders.forEach((itm) => {
    if (filePath.indexOf(itm.uri.path) === 0) {
      workspace = itm.name;
      folderPath = itm.uri.path;
    }
  });

  const configFileUri = vscode.Uri.file(folderPath + "/amis.json");
  vscode.workspace.fs.readFile(configFileUri).then((value) => {
    const configJson = JSON.parse(value.toString());
    const api_headers = configJson.api_headers;
    const api_url = configJson.dev_url || configJson.api_url;
    const filename = vscode.window.activeTextEditor.document.fileName;
    if (filename.substring(filename.length - 5) != ".json") {
      // vscode.window.showErrorMessage(filename + " is not amis json file");
      return;
    }
    const text = vscode.window.activeTextEditor.document.getText();
    const json = JSON.parse(text);
    if (!json.type) {
      // console.log(filename + " is not amis file!");
      return;
    }
    const schema = text;
    const params = configJson.params || {};
    const paramsStr = JSON.stringify(params);

    if (!webViewPanel) {
      // console.log("Start to Create WebView");
      // console.log(`api_url:${api_url}`);
      webViewPanel = vscode.window.createWebviewPanel(
        "AMIS",
        "AMIS Page preview",
        vscode.ViewColumn.Beside, // web view 显示位置
        {
          enableScripts: true, // 允许 JavaScript
          retainContextWhenHidden: true, // 在 hidden 的时候保持不关闭
        }
      );
      webViewPanel.onDidDispose(function (e) {
        // debugger;
        // console.log("webViewPanel.onDidDispose", e);
        webViewPanel = null;
      });
    }
    webViewPanel.webview.html = getWebViewContent(
      api_url,
      JSON.stringify(api_headers),
      schema,
      paramsStr
    );
  });
}

// this method is called when your extension is deactivated
function deactivate() {}

function getWebViewContent(url, headers, schema, params) {
  var assetsPath = vscode.workspace.getConfiguration("AMIS").get("assets_url");
  if (!assetsPath) assetsPath = "";

  var theme = vscode.window.activeColorTheme;
  var themeCSS = "";
  if (theme.kind == vscode.ColorThemeKind.Dark) {
    themeCSS = '<link rel="stylesheet" href="' + assetsPath + '/dark.css" />';
  }
  var str = `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta http-equiv="X-UA-Compatible" content="IE=Edge" />
		<title>AMIS preview</title>
		<style>
			html,body {font: 12px/22px "微软雅黑", Arial, sans-serif; min-height: 100vh;}
			html {
			color: #666;
			-ms-text-size-adjust: 100%;
			-webkit-text-size-adjust: 100%;
			}
		</style>
		<link rel="stylesheet" href="${assetsPath}/sdk.css" />
		${themeCSS}
	</head>
	<body>
		<div id="amis-container"></div>
	</body>
	</html>
	<script src="${assetsPath}/sdk.js"></script>
	<script type="text/javascript">
		var Ajax = function(type, url, data, headers, async){
			// 异步对象
			var ajax;		
			window.XMLHttpRequest ? ajax =new XMLHttpRequest() : ajax=new ActiveXObject("Microsoft.XMLHTTP");
			!type ? type = "get" : type = type;
			!data ? data = {} : data = data;
			async != false ? !async ? async = true : async = async : '';
			return new Promise(function(resolve,reject){
				// get 跟post  需要分别写不同的代码
				if (type.toUpperCase()=== "GET") 
				{// get请求
					if (data) {// 如果有值
						url += '?';										
						if( typeof data === 'object' )
						{ // 如果有值 从send发送
							var convertResult = "" ;
							for(var c in data){
								convertResult += c + "=" + data[c] + "&";
							}						
							url += convertResult.substring(0,convertResult.length-1);
						}
						else
						{
							url += data;
						}
					}
					ajax.open(type, url, async); // 设置 方法 以及 url
          ajax.withCredentials = false;

					for(var key in headers) {
						ajax.setRequestHeader(key,headers[key])
					}
					ajax.send(null);// send即可
				} else if(type.toUpperCase()=== "POST") {// post请求
					ajax.open(type, url); // post请求 url 是不需要改变
					for(var key in headers) {
						ajax.setRequestHeader(key,headers[key])
					}
					ajax.setRequestHeader("Content-type","application/json"); // 需要设置请求报文
					if(data) { 
						typeof data === 'object' ? ajax.send(JSON.stringify(data)) : ajax.send(data)
					} else {
						ajax.send(); // 木有值 直接发送即可
					}
				}
				// 注册事件
				ajax.onreadystatechange = function () {
					// 在事件中 获取数据 并修改界面显示
					if (ajax.readyState == 4){
						if(ajax.status===200){ // 返回值： ajax.responseText;
							if(ajax.response && typeof ajax.response != 'object'){
								resolve(JSON.parse(ajax.response));							
							}
							else{
								resolve(ajax.response);
							}
						}else{
							reject(ajax.status);
						}
					}
				}
			});		
		}
		function responseAdpater(response,request){
			// console.log("request:",request)
      // debugger;

      const path = request.url;

			if (!path.startsWith("/api")) {
				return response;
			}

			if (
				typeof response === "object" &&
				response !== null &&
				"data" in response &&
				"msg" in response &&
				"status" in response
			  ) {
				return response;
			}
      
			let payload = {
				status: !response.code ? 0 : response.code,
				msg: response.message ? response.message : "处理成功",
				data: response,
			  };
		  
			response = payload;

			return response;
		}
		function initAmis(){
			return {
				fetcher: function(obj){
					var method = obj.method
					var headers = obj.headers || {}
					var url = "${url}" + obj.url
					var config = obj.config
					var data = obj.data
					headers = Object.assign({},headers,${headers})
					return Ajax(method,url,data,headers).then(res=>{
						return responseAdpater(res,obj)
					})
				},
				jumpTo: function(to,action){
					var blank = false
					if (action && action.actionType === 'url') {
						blank = action.blank    
					}
					location.href = to
				},
				updateLocation:function(to,replace){
					location.href = to
				},
			}
		}
    (function(){
      var amis = amisRequire('amis/embed');
      var options = initAmis();
      // console.log("options:",options);
      var amisScope = amis.embed('#amis-container', ${schema}, ${params},options);
    })()
		
	</script>`;
  return str;
}

module.exports = {
  activate,
  deactivate,
};
