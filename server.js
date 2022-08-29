var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/

  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);

  let session = JSON.parse(fs.readFileSync("session.json").toString());

  if (path === "/register" && method === "POST") {
    response.setHeader("Content-Type", "text/html;charset=utf-8");
    //接收上传数据
    let arr = [];
    request.on("data", (v) => {
      arr.push(v);
    });
    //接收完
    request.on("end", () => {
      let obj = JSON.parse(Buffer.concat(arr).toString());
      let usersArr = JSON.parse(fs.readFileSync("db/users.json"));
      let lastUser = usersArr[usersArr.length - 1];
      let newUser = {
        id: lastUser ? lastUser.id + 1 : 1, //最后一位用户的id+1
        name: obj.name,
        password: obj.password,
      };
      //追加一条数据
      usersArr.push(newUser);
      //同步到数据库 (覆盖)
      fs.writeFileSync("db/users.json", JSON.stringify(usersArr));
      response.end();
    });
    //-------------
  } else if (path === "/sign_in" && method === "POST") {
    //接收上传数据
    let arr = [];
    request.on("data", (v) => {
      arr.push(v);
    });
    //接收完
    request.on("end", () => {
      let obj = JSON.parse(Buffer.concat(arr).toString());
      let usersArr = JSON.parse(fs.readFileSync("db/users.json"));
      //查询数据库, 是否有匹配的
      let user = usersArr.find(
        (user) => user.name === obj.name && user.password === obj.password
      );
      if (user) {
        response.statusCode = 200;
        // session删除已有的旧cookie
        let cookie = request.headers["cookie"];
        try {
          let random = cookie
            .split(";")
            .find((v) => v.indexOf("session_id=") >= 0)
            .replace(/.*\=/, "");
          for (const key in session) {
            if (session[key].user_id === user.id) {
              delete session[key];
            }
          }
        } catch (error) {
          console.log("cookie不存在");
        }
        //创建随机数绑定uid
        let random = Math.random();
        session[random] = { user_id: user.id };
        response.setHeader("Set-Cookie", `session_id=${random};HttpOnly`);
        fs.writeFileSync("session.json", JSON.stringify(session));
        response.end();
      } else {
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json;charset=utf-8");
        response.end(`{"errorCode":531}`); //根据公司文档规定, 返回指定的错误码, 没有就算了
      }
    });
    //-------------
  } else if (path === "/home.html") {
    let content = fs.readFileSync("public/home.html").toString();
    //拿cookie中的value
    let cookie = request.headers["cookie"];
    let random;
    try {
      random = cookie
        .split(";")
        .find((v) => v.indexOf("session_id=") >= 0)
        .replace(/.*\=/, "");
    } catch (error) {
      console.log("cookie不存在");
    }
    //session里存在这个随机数, 就去找对应uid的数据
    if (session[random]) {
      let usersArr = JSON.parse(fs.readFileSync("db/users.json"));
      let user = usersArr.find((v) => v.id === session[random].user_id);
      if (user) {
        content = content
          .replace("{{loginStatus}}", "已登录")
          .replace("{{user.name}}", user.name);
      }
    } else {
      content = content
        .replace("{{loginStatus}}", "未登录") //页面没有cookie
        .replace("{{user.name}}", "");
    }
    response.write(content);
    response.end();
    //--------------
  } else {
    response.statusCode = 200;
    //没写文件路径时, 默认请求主页
    let filePath = path === "/" ? "/index.html" : path;
    //文件后缀
    let suffix = filePath.replace(/.*\./, "");
    //后缀支持的类型
    ContentTypes = {
      html: "text/html",
      css: "text/css",
      js: "text/javascript",
      png: "image/png",
      jpg: "image/jpeg",
    };
    //设置响应体格式 (没支持的用text/html兜底)
    response.setHeader(
      "Content-Type",
      `${ContentTypes[suffix] || "text/html"};charset=utf-8`
    );
    //读取请求的文件, 全部存放于public下
    let content;
    try {
      content = fs.readFileSync(`public${filePath}`);
    } catch (error) {
      content = "文件不存在";
      response.statusCode = 404;
    }
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);
