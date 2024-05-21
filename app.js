const express = require("express");
const app = express();
const path = require("path");
const routes = require("./controller/route");
const cloudRenderNodeRoutes = require("./controller/cloudRenderNode");
const bodyParser = require("body-parser");
require("./eventEmitter");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// 跨域
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // 允许任意地址访问
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(routes);
app.use("/api", cloudRenderNodeRoutes);

app.listen(3000, () => {
  console.log("the server is running at port 3000");
});
