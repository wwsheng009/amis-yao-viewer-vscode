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
      <title>AMIS Page preview</title>
      <style>
          html,
          body,
          .app-wrapper {
              min-height: 100vh;
              position: relative;
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
          }
  
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
  
      (function () {
          let amis = amisRequire('amis/embed');
          const match = amisRequire('path-to-regexp').match;
          const axios = amisRequire('axios')
  
          function initAmis() {
              return {
                  fetcher: function ({ url, method, data, config, headers }) {
                      config = config || {};
                      config.headers = config.headers || headers || {};
                      config.headers = Object.assign({},config.headers,${headers})
                      config.withCredentials = true;
                      const catcherr = (error) => {
                          if (error.response) {
                            if (error.response?.data && error.response?.data?.message) {
                                error.message = error.response?.data?.message;
                            }
                            if (
                                error.response.data?.code === 403 ||
                                error.response.data?.code === 402
                            ) {
                              console.log("用户认证失败，请更新配置文件中的Header配置")
                            }
                            if (error.response.data.message === "Invalid token") {
                              console.log("Invalid token，请更新配置文件中的Header配置")
                            }
                        } else if (error.request) {
                            console.log(error.request);
                        } else {
                            // Something happened in setting up the request that triggered an Error
                            console.log('Error', error.message);
                        }

                        return new Promise(function (resolve, reject) {
                            reject(error);
                        });
                      };
                      const check = (response) => {

                          //判断返回结构是否已经是amis结构
                          if (
                              typeof response.data === "object" &&
                              response.data !== null &&
                              "data" in response.data &&
                              "msg" in response.data &&
                              "status" in response.data
                          ) {
                              return new Promise(function (resolve, reject) {
                                  resolve(response);
                              });
                          }
                          // 
                          const path = url;
  
                          if (!path.startsWith("/api")) {
                              return new Promise(function (resolve, reject) {
                                  resolve(response);
                              });
                          }
                          // debugger;
                          //组成新的payload,即是修改response的数据
                          let payload = {
                              status: !response.data.code ? 0 : response.data.code,
                              msg: response.data.message ? response.data.message : "处理成功",
                              data: response.data,
                          };
                          response.data = payload;
                          // 在这个回调函数中返回一个新的 Promise 对象
                          return new Promise(function (resolve, reject) {
                              // 这里应该返回一个新的response,可以在下一个adapter里使用
                              // 执行异步操作
                              // 在异步操作完成后调用 resolve 或 reject
                              resolve(response);
                          });
                      };
                      let fllurl = "${url}" + url;
                      if (method !== "post" && method !== "put" && method !== "patch") {
                          if (data) {
                              config.params = data;
                          }
                          return axios[method](fllurl, config).then(check).catch(catcherr);
                      } else if (data && data instanceof FormData) {
                          // config.headers = config.headers || {};
                          // config.headers['Content-Type'] = 'multipart/form-data';
                      } else if (
                          data &&
                          typeof data !== "string" &&
                          !(data instanceof Blob) &&
                          !(data instanceof ArrayBuffer)
                      ) {
                          // data = JSON.stringify(data);
                          config.headers["Content-Type"] = "application/json";
                      }
                      return axios[method](fllurl, data, config).then(check).catch(catcherr);
                  },
                  jumpTo: function (to, action) {
                      var blank = false
                      if (action && action.actionType === 'url') {
                          blank = action.blank
                      }
                      location.href = to
                  },
                  updateLocation: function (to, replace) {
                      location.href = to
                  },
              }
          };
          var options = initAmis();
          // console.log("options:",options);
          var amisScope = amis.embed('#amis-container', ${schema}, ${params}, options);
      })()
  </script>`;
  return str;
}

module.exports = {
  activate,
  deactivate,
};
