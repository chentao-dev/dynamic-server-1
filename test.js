//node.js的加载模块对象
let fs = require("fs");

//读取数据库
let usersString = fs.readFileSync("db/users.json").toString();
let usersArray = JSON.parse(usersString);
console.log(usersArray);

//写入数据库
let user3 = { id: 3, name: "小王", password: "yyyyyyyy" };
usersArray.push(user3); //内存中的对象添加数据
fs.writeFileSync("db/users.json", JSON.stringify(usersArray)); //数据库中添加数据
console.log(usersArray);
