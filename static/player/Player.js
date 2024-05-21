const WebSocket = require("ws");
const {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} = require("wrtc");

const { QWebChannel } = require("./qwebchannel");

const RemotePlayerMsgType = {
  MIN_USER_INPUT_MSG_ID: 0,
  MouseMove: 0,
  MouseDown: 1,
  MouseUp: 2,
  MouseWheel: 3,
  MouseDBClick: 4,
  WindowSize: 5,
  TouchDown: 6,
  TouchUp: 7,
  TouchMove: 8,
  Exit: 9,
  KeyDown: 10,
  KeyUp: 11,
  MAX_USER_INPUT_MSG_ID: 11,

  RELAY_JPG_REQ: 12,
};

// Check if Native app
global.isNativeApp = typeof qt == "object" && qt.webChannelTransport;
if (global.isNativeApp) {
  if ("undefined" != typeof QWebChannel) {
    global.NativeAppLoad = new Promise((resolve) => {
      global.gWebChannel = new QWebChannel(qt.webChannelTransport, function (
        channel
      ) {
        global.NativeApp = {};
        Object.assign(global.NativeApp, channel.objects);
        console.info("NativeApp Loaded");
        resolve();
      });
    });
  } else {
    console.warn("Link qwebchannel.js to enable native call");
    global.isNativeApp = false;
  }
}

function RemotePlayer(config) {
  this.fileVersion = "For WIZPlayer 4.0.42+";

  let $self = this;

  // 配置检查
  config = config || {};

  if (!config.logger && config.debug) {
    const TimeToString = (t) => {
      return "[" + t.toLocaleTimeString() + ":" + t.getMilliseconds() + "]";
    };
    config.logger = {
      onRequest: function (cmdId, request, args) {
        let t = new Date();
        console.log(
          TimeToString(t) +
            ` NativeRequest:{"method": "${request}", "id":${cmdId}}`,
          args
        );
      },
      onResponse: function (cmdId, ret) {
        let t = new Date();
        console.log(TimeToString(t) + ` NativeResponse: {"id":${cmdId}}`, ret);
      },
      onConnectSignal: function (idx, signalName, callback) {
        console.log(
          TimeToString(new Date()) +
            ` signalConnect: {"method": "${signalName}", "id":${idx}}`,
          callback
        );
      },
      onDisconnectSignal: function (idx, signalName, callback) {
        console.log(
          TimeToString(new Date()) +
            ` signalDisconnect: {"method": "${signalName}", "id":${idx}}`,
          callback
        );
      },
      onSignal: function (signalName, args) {
        console.log(
          TimeToString(new Date()) +
            ` signalEmitted: {"method": "${signalName}"}`,
          args
        );
      },
    };
  }

  // 服务器地址
  config.signalServer = config.signalServer || "ws://localhost:8080";
  // 引擎ID
  config.engineId = config.engineId;
  // player要绑定的视频标签
  // config.video = config.video;
  // config.isImage = config.video.tagName == "IMG";
  config.isImage = true;
  // config.video.style.transform = "rotateX(180deg)";
  // 是否启用自定义用户输入事件，启用则不监听视频标签上的鼠标、触屏事件，需要用户自行调用输入函数
  config.customInputEvent = config.customInputEvent ? true : false;
  // 自动调整引擎画面大小与绑定视频标签同步
  config.autoResize = config.autoResize ? true : false;
  // 限制用户每秒鼠标移动和触屏的事件个数，事件过多时操作不流畅，限制事件个数来提高操作流畅性
  config.limtMoveCPS =
    config.limtMoveCPS == undefined ? 10 : config.limtMoveCPS;
  // 用户操作超时时间，当用户鼠标或触屏在该时间内没有产生操作，将首次提示用户，在exitTimeout后将断开连接来节约云渲染资源
  config.userTimeout = isNaN(config.userTimeout)
    ? 1000 * 60 * 5
    : config.userTimeout;
  // 用户操作超时后的延迟断开时间，首次提示后的将过该时间后断开连接，在真正断开前可取消resetTimer();
  config.exitTimeout = isNaN(config.exitTimeout)
    ? 1000 * 10
    : config.exitTimeout;
  // 当前断开后引擎需要保持的时间
  config.maxTimeout = isNaN(config.maxTimeout) ? 0 : config.maxTimeout;

  $self.config = config;
  // config.video.oncontextmenu = (e) => {
  //   e.preventDefault();
  // };

  $self.finishEventObjMap = {};
  $self.eventMap = {};
  $self.event = new Proxy(
    {},
    {
      set: (target, property, fn) => {
        this.eventMap[property] || (this.eventMap[property] = []);
        this.eventMap[property].push(fn);
        return true;
      },
    }
  );

  $self.isNativeApp = false;
  if (global.NativeAppLoad) {
    $self.isNativeApp = true;
    $self.reconnect = () => {};
    global.NativeAppLoad.then(() => {
      global.NativeApp.EngineMgr.create(
        $self.config.engineId,
        { visible: false },
        (objId) => {
          $self.checkVideoPos = function () {
            // var p = $self.config.video.getBoundingClientRect();
            // var pos = [p.left, p.top];
            // global.NativeApp.EngineMgr.update($self.config.engineId, {
            //   pos: pos,
            // });
          };
          // var p = $self.config.video.getBoundingClientRect();
          // global.NativeApp.EngineMgr.update($self.config.engineId, {
          //   pos: [p.left, p.top],
          //   visible: true,
          // });
          var qtTransportWrap = {
            send: (msg) => {
              qt.webChannelTransport.send(msg);
            },
          };
          new QWebChannel(
            qtTransportWrap,
            function (channel) {
              $self.Native = channel.objects[objId];
              $self.objects = channel.objects;
              global.NativeApp = {};
              global.webchannelDebug = $self.config.debug;
              Object.assign(global.NativeApp, channel.objects);
              if ($self.Native.ControlChannel) {
                $self._controlChannel = {
                  send: (buffer) => {
                    var str = global.btoa(
                      String.fromCharCode(...new Uint8Array(buffer))
                    );
                    $self.Native.ControlChannel.send(str);
                  },
                };
              } else {
                console.warn("Native not has ControlChannel");
              }
              console.info("Engine Native Loaded");
              $self.finishEventObjMap["NativeLoad"] = $self.Native;
              $self.emit("NativeLoad", $self.Native);
            },
            $self.config.logger
          );
        }
      );
    });
  } else {
    $self._ws = null;
    $self._pc = null;

    $self.resetTimer = function () {
      if ($self._pc && !$self.exited) {
        clearTimeout($self._userTimer);
        $self._userTimer = setTimeout(() => {
          $self._userTimer = setTimeout(() => {
            if (!$self.exited) {
              $self.exit();
              console.log(`长时间没有操作，已断开连接`);
              if (!$self.emit("TimeOutExit", $self)) {
                // alert(`长时间没有操作，已断开连接`);
                console.log(`长时间没有操作，已断开连接`);
              }
            }
          }, $self.config.exitTimeout);
          $self.emit("UserTimeOut", $self);
        }, $self.config.userTimeout);
      }
    };

    function configPeerConnection() {
      $self._controlChannel = null;

      var connectionCreator = RTCPeerConnection;
      // ? RTCPeerConnection
      // : webkitRTCPeerConnection;
      $self._pc = new connectionCreator({ iceServers: $self.iceServers });

      $self._pc.onicecandidate = function (evt) {
        if (evt.candidate !== null) {
          $self._ws.send(
            JSON.stringify({
              type: "IceCandidate",
              data: evt.candidate,
            })
          );
        }
      };

      $self._pc.ondatachannel = (evt) => {
        console.log("Get DataChannel", evt);
        if (evt.channel && evt.channel.label == "Control") {
          let checksend = () => {
            while (
              $self._controlChannel.sendQueue.length > 0 &&
              evt.channel.bufferedAmount <=
                evt.channel.bufferedAmountLowThreshold
            ) {
              evt.channel.send($self._controlChannel.sendQueue.shift());
            }
          };
          $self._controlChannel = {
            sendQueue: [],
            send: (msg) => {
              if (msg.length > evt.channel.bufferedAmountLowThreshold) {
                let pktCount = Math.ceil(
                  msg.length / evt.channel.bufferedAmountLowThreshold
                );
                $self._controlChannel.sendQueue.push(`NEXT_COUNT:${pktCount}`);
                let s = 0;
                while (s < msg.length) {
                  let e =
                    s +
                    Math.min(
                      evt.channel.bufferedAmountLowThreshold,
                      msg.length - evt.channel.bufferedAmountLowThreshold
                    );
                  $self._controlChannel.sendQueue.push(msg.slice(s, e));
                  s = e;
                }
              } else {
                $self._controlChannel.sendQueue.push(msg);
              }
              checksend();
            },
          };
          evt.channel.bufferedAmountLowThreshold = 65536;
          evt.channel.onbufferedamountlow = checksend;
          evt.channel.onopen = () => {
            new QWebChannel(
              $self._controlChannel,
              function (channel) {
                $self.Native = channel.objects.Native;
                $self.objects = channel.objects;
                console.info("Engine Native Loaded");
                global.webchannelDebug = $self.config.debug;
                $self.finishEventObjMap["NativeLoad"] = $self.Native;
                $self.emit("NativeLoad", $self.Native);
              },
              $self.config.logger
            );
          };

          evt.channel.onclose = () => {
            console.log("Datachannel close");
            $self._controlChannel = null;
            $self.Native = null;
            $self.nativeObjects = [];
            $self.finishEventObjMap["NativeLoad"] = null;
            $self.emit("Disconnected", "webrtc channel closed");
          };

          $self.config.buffers = [];
          $self.config.strBuffer = "";
          $self.config.strCount = 0;
          let relay_jpg_req = new ArrayBuffer(4); // for request next frame;
          let dataView = new DataView(relay_jpg_req);
          dataView.setInt32(0, RemotePlayerMsgType.RELAY_JPG_REQ, true);
          //let lastImage = new Image();
          evt.channel.onmessage = (event) => {
            const max_data_channel_buffersize = 256 * 1024;
            if (typeof event.data == "string") {
              if ("function" == typeof $self._controlChannel.onmessage) {
                // setup by QWebChannel
                $self.config.strCount--;
                if ($self.config.strCount == -1) {
                  if (event.data.startsWith("NEXT_COUNT:")) {
                    $self.config.strCount = parseInt(event.data.substr(11));
                  } else {
                    $self.config.strCount = 0;
                    $self._controlChannel.onmessage({
                      data: JSON.parse(event.data),
                    });
                  }
                } else {
                  $self.config.strBuffer += event.data;
                  if ($self.config.strCount == 0) {
                    var allStr = $self.config.strBuffer;
                    $self.config.strBuffer = "";
                    $self._controlChannel.onmessage({
                      data: JSON.parse(allStr),
                    });
                  }
                }
              }
            } else {
              if (event.data.byteLength > 4) {
                $self.config.buffers.push(event.data);
              } else {
                // not content package
              }
              if (event.data.byteLength < max_data_channel_buffersize) {
                if ($self.config.buffers.length > 0) {
                  //var src = URL.createObjectURL(new Blob($self.config.buffers));
                  $self.config.buffers = [];
                  //lastImage.src = src;
                  //lastImage
                  //  .decode()
                  //  .then(() => {
                  //    var oldSrc;
                  //    if ($self.config.tagName == "VIDEO") {
                  //      let stream = player.config.video.srcObject;
                  //      oldSrc = player.config.video.poster;
                  //      player.config.video.poster = src;
                  //      player.config.video.src = "";
                  //      player.config.video.srcObject = stream;
                  //    } // img
                  //    else {
                  //      if ($self._controlChannel)
                  //        $self._controlChannel.send(relay_jpg_req);
                  //      oldSrc = $self.config.video.src;
                  //      $self.config.video.src = src;
                  //    }
                  //    if (oldSrc) URL.revokeObjectURL(oldSrc);
                  //  })
                  //  .catch((err) => {
                  //    if (
                  //      $self._controlChannel &&
                  //      $self.config.video.tagName != "VIDEO"
                  //    )
                  //      $self._controlChannel.send(relay_jpg_req);
                  //    console.error(`decode image failed: ${err}`);
                  //    URL.revokeObjectURL(src);
                  //  });
                } else {
                  //if (
                  //  $self._controlChannel &&
                  //  $self.config.video.tagName != "VIDEO"
                  //)
                  //$self._controlChannel.send(relay_jpg_req);
                }
              }
            }
          };
        }
      };

      $self._pc.ontrack = (evt) => {
        console.log("Get Remote Track", evt);
        $self._pc._track = evt.track;
        // config.video.srcObject = evt.streams[0];
        // config.video.play();
        // $self.finishEventObjMap["VideoReady"] = $self.config.video;
        // $self.emit("VideoReady", $self.config.video);
        $self.resetTimer();
      };

      $self._pc.onconnectionstatechange = (evt) => {
        switch ($self.connectionState) {
          case "connecting":
            {
              console.log("peerconnection connecting");
            }
            break;
          case "connected":
            {
              console.log("peerconnection connected");
              $self.emit("Connected");
            }
            break;
          case "disconnected":
            {
              console.log("peerconnection disconnected");
              $self._pc.close();
              $self.finishEventObjMap["NativeLoad"] = null;
              $self.emit("Disconnected");
            }
            break;
          case "failed":
            {
              console.log("peerconnection connect failed");
              $self._pc.close();
              $self.emit("ConnectedFailed", evt);
            }
            break;
        }
      };
    }

    $self.reconnect = function () {
      if ($self.exited) return;
      try {
        $self._ws = new WebSocket(
          `${config.signalServer}?engineId=${config.engineId}&maxTimeout=${
            config.maxTimeout
          }&type=${config.isImage ? "img" : "video"}&rtcIni=${
            config.rtcIni
          }&jpgQuality=${config.jpgQuality}`
        );
        $self._ws.onopen = function () {
          console.log("signal websocket connected");
        };
        $self._ws.onerror = function (e) {
          console.log("signal websocket error", e);
          $self.emit("Disconnected", "signal websocket error");
        };
        $self._ws.onmessage = function (msgData) {
          msgData = msgData.data;
          console.debug(msgData);
          var msg = JSON.parse(msgData);

          // 提示信息
          if (msg.type == "Message") {
            console.warn(msg.data);
            if (!$self.emit("Message", msg.data)) {
              // alert(msg.data);
              console.log(msg.data);
            }
          }
          // 收到引擎会话的地址
          else if (msg.type == "EngineWs") {
            console.warn(msg.data);
            $self.sessionWs = msg.data;
            console.log(
              `Get Engine session connection info: ${$self.sessionWs}`
            );
            $self._engineWs = new WebSocket($self.sessionWs);
            let transport = {
              send: (msg) => {
                if ($self.config.debug && typeof msg == "string")
                  console.log(msg);
                $self._engineWs.send(msg);
              },
            };
            $self._engineWs.onopen = () => {
              console.log(`Engine session connected`);
              $self.emit("Connected");
              new QWebChannel(
                transport,
                function (channel) {
                  $self.Native = channel.objects.Native;
                  $self.objects = channel.objects;
                  console.info("Engine Native Loaded");
                  global.webchannelDebug = $self.config.debug;
                  $self.finishEventObjMap["NativeLoad"] = $self.Native;
                  $self._controlChannel = {
                    send: (buffer) => {
                      var str = global.btoa(
                        String.fromCharCode(...new Uint8Array(buffer))
                      );
                      $self.Native.ControlChannel.send(str);
                    },
                  };
                  $self.emit("NativeLoad", $self.Native);
                },
                $self.config.logger
              );
            };

            $self._engineWs.onclose = () => {
              $self._controlChannel = null;
              $self.Native = null;
              $self.nativeObjects = [];
              $self.finishEventObjMap["NativeLoad"] = null;
              $self.emit("Disconnected", "Engine session closed");
            };

            $self._engineWs.onmessage = (event) => {
              if (typeof event.data == "string") {
                if ("function" == typeof transport.onmessage) {
                  // setup by QWebChannel
                  transport.onmessage({ data: JSON.parse(event.data) });
                }
              } else {
                // var oldSrc = $self.config.video.src;
                // $self.config.video.src = URL.createObjectURL(event.data);
                // if (oldSrc) URL.revokeObjectURL(oldSrc);
              }
            };
          }
          // 收到连接引擎上线消息
          else if (msg.type == "OpenSession") {
            $self.iceServers = msg.data;
            const connectMsg = JSON.stringify({
              type: "ConnectRequest",
              data: {},
            });
            $self._ws.send(connectMsg);
          }
          // 收到连接引擎回复
          else if (msg.type == "OfferToClient") {
            configPeerConnection();
            var romoteSdp = new RTCSessionDescription(msg.data);
            $self._pc.setRemoteDescription(romoteSdp).then(
              () => {
                $self._pc.createAnswer().then(
                  (myDesc) => {
                    var localSdp = new RTCSessionDescription(myDesc);
                    $self._pc.setLocalDescription(localSdp).then(
                      () => {
                        $self._ws.send(
                          JSON.stringify({
                            type: "AnswerToEngine",
                            data: localSdp,
                          })
                        );
                      },
                      (err) => {
                        console.error("Set LocalDescription failed", err);
                      }
                    );
                  },
                  (err) => {
                    console.error("CreateAnswer failed", err);
                  }
                );
              },
              (err) => {
                console.error("Set RemoteDescription failed", err);
              }
            );
          }
          // 收到IceCandidate消息
          else if (msg.type === "IceCandidate") {
            $self._pc.addIceCandidate(new RTCIceCandidate(msg.data));
          }
          // 收到关闭消息
          else if (msg.type === "CloseSession") {
            $self.exit();
          } else {
            console.warn(`Un processed message ${msg.type}`, msg.data);
            // alert(`${msg.type}: ${msg.data}`);
            console.log(`${msg.type}: ${msg.data}`);
          }
        };
      } catch (e) {
        $self.emit("Disconnected", e);
      }
    };

    $self.startCheckSignal = function (tripTimeCb, packetsLostCb) {
      let maxPacketsLost = 0,
        lastPacketsLost = 0;
      let get = (sipCb, sfuCb) => {
        if ($self._pc) {
          $self._pc.getStats().then(function (report) {
            report.forEach((value, key) => {
              if (value.type === "candidate-pair") {
                sipCb(value.currentRoundTripTime);
              }
              if (
                value.type == "inbound-rtp" ||
                value.googContentType === "realtime"
              ) {
                sfuCb(value.packetsLost);
              }
            });
          });
        } else {
          sipCb(99.999);
          sfuCb(999999);
        }
      };
      let lastTripTime,
        lastLost = -1;
      $self.watchSignalTimer = setInterval(() => {
        get(
          (tripTime) => {
            if (lastTripTime != tripTime) {
              lastTripTime = tripTime;
              tripTimeCb(tripTime);
            }
          },
          (packetsLost) => {
            let lost = packetsLost - lastPacketsLost;
            if (lost <= 0) maxPacketsLost = 0;
            else if (lost > maxPacketsLost) maxPacketsLost = lost;
            else lost = maxPacketsLost;
            lastPacketsLost = packetsLost;

            if (lost > 0) {
              console.log(`WebRTC has lost ${lost} packets`);
            }
            if (lost != lastLost) {
              lastLost = lost;
              packetsLostCb(lost);
            }
          }
        );
      }, 1000);
    };

    $self.stopCheckSignalstartCheckSignal = function () {
      if ($self.watchSignalTimer) {
        clearInterval($self.watchSignalTimer);
        $self.watchSignalTimer = null;
      }
    };
  }

  // 初始化输入事件
  // let style = getComputedStyle(config.video);
  let isMouseDown = false; // 用于全局监听判断鼠标是否按下
  let mouseDownInfo = {}; // 鼠标按下信息
  let keyList = []; // 键盘按键
  // 注册输入事件
  // if (!config.customInputEvent) {
  //   var events = {
  //     MouseMove: (e) => {
  //       let x = (e.offsetX / parseFloat(style.width)) * 2 - 1;
  //       let y = (e.offsetY / parseFloat(style.height)) * 2 - 1;
  //       $self.mousemove(x, y);
  //       e.preventDefault();
  //     },
  //     MouseDown: (e) => {
  //       mouseDownInfo = e;
  //       let x = (e.offsetX / parseFloat(style.width)) * 2 - 1;
  //       let y = (e.offsetY / parseFloat(style.height)) * 2 - 1;
  //       $self.mousedown(x, y, e.button);
  //       isMouseDown = true;
  //       e.preventDefault();
  //     },
  //     MouseUp: (e) => {
  //       if (isMouseDown) {
  //         mouseDownInfo = {};
  //         let x = (e.offsetX / parseFloat(style.width)) * 2 - 1;
  //         let y = (e.offsetY / parseFloat(style.height)) * 2 - 1;
  //         $self.mouseup(x, y, e.button);
  //         isMouseDown = false;
  //         e.preventDefault();
  //       }
  //     },
  //     MouseWheel: (e) => {
  //       let x = (e.offsetX / parseFloat(style.width)) * 2 - 1;
  //       let y = (e.offsetY / parseFloat(style.height)) * 2 - 1;
  //       $self.mosuewheel(x, y, e.wheelDeltaY);
  //       e.preventDefault();
  //     },
  //     MouseDBClick: (e) => {
  //       let x = (e.offsetX / parseFloat(style.width)) * 2 - 1;
  //       let y = (e.offsetY / parseFloat(style.height)) * 2 - 1;
  //       $self.mousedbclick(x, y, e.button);
  //       e.preventDefault();
  //     },
  //     TouchDown: (e) => {
  //       let w = parseFloat(style.width);
  //       let h = parseFloat(style.height);
  //       let box = $self.config.video.getBoundingClientRect();
  //       for (let i = 0; i < e.changedTouches.length; ++i) {
  //         const t = e.changedTouches[i];
  //         let x = ((t.clientX - box.left) / w) * 2 - 1;
  //         let y = ((t.clientY - box.top) / h) * 2 - 1;
  //         y = -y;
  //         $self.touchdown(x, y, t.identifier);
  //       }
  //       e.preventDefault();
  //     },
  //     TouchUp: (e) => {
  //       let w = parseFloat(style.width);
  //       let h = parseFloat(style.height);
  //       let box = $self.config.video.getBoundingClientRect();
  //       for (let i = 0; i < e.changedTouches.length; ++i) {
  //         const t = e.changedTouches[i];
  //         let x = ((t.clientX - box.left) / w) * 2 - 1;
  //         let y = ((t.clientY - box.top) / h) * 2 - 1;
  //         y = -y;
  //         $self.touchup(x, y, t.identifier);
  //       }
  //       e.preventDefault();
  //     },
  //     TouchMove: (e) => {
  //       let w = parseFloat(style.width);
  //       let h = parseFloat(style.height);
  //       let box = $self.config.video.getBoundingClientRect();
  //       for (let i = 0; i < e.changedTouches.length; ++i) {
  //         const t = e.changedTouches[i];
  //         let x = ((t.clientX - box.left) / w) * 2 - 1;
  //         let y = ((t.clientY - box.top) / h) * 2 - 1;
  //         y = -y;
  //         $self.touchmove(x, y, t.identifier);
  //       }
  //       e.preventDefault();
  //     },
  //     KeyDown: (e) => {
  //       const keyIndex = keyList.findIndex((item) => {
  //         return item.keyCode === e.keyCode;
  //       });
  //       if (keyIndex === -1) {
  //         keyList.push(e);
  //       }
  //       $self.keydown(e.keyCode);
  //     },
  //     KeyUp: (e) => {
  //       const keyIndex = keyList.findIndex((item) => {
  //         return item.keyCode === e.keyCode;
  //       });
  //       keyList.splice(keyIndex, 1);
  //       $self.keyup(e.keyCode);
  //     },
  //     Blur: (e) => {
  //       if (isMouseDown) {
  //         let x = (mouseDownInfo.offsetX / parseFloat(style.width)) * 2 - 1;
  //         let y = (mouseDownInfo.offsetY / parseFloat(style.height)) * 2 - 1;
  //         $self.mouseup(x, y, mouseDownInfo.button);
  //         isMouseDown = false;
  //         mouseDownInfo = {};
  //       }
  //       for (let i = 0; i < keyList.length; i += 1) {
  //         $self.keyup(keyList[i].keyCode);
  //       }
  //       keyList = [];
  //     },
  //   };
  //   if (config.limtMoveCPS > 0) {
  //     var limtFuns = (function () {
  //       let mouse_x, mouse_y, mouse_hasChanged;
  //       let touch_hasChanged, touch_moveList;
  //       touch_moveList = new Map();
  //       return {
  //         mouse_intervalFun: () => {
  //           if (mouse_hasChanged) {
  //             mouse_hasChanged = false;
  //             $self.mousemove(mouse_x, mouse_y);
  //           }
  //         },
  //         mouse_moveFun: (evt) => {
  //           mouse_x = (evt.offsetX / parseFloat(style.width)) * 2 - 1;
  //           mouse_y = (evt.offsetY / parseFloat(style.height)) * 2 - 1;
  //           mouse_hasChanged = true;
  //         },
  //         touch_intervalFun: () => {
  //           if (touch_hasChanged) {
  //             touch_hasChanged = false;
  //             touch_moveList.forEach((v, k) => {
  //               $self.touchmove(v.x, v.y, k);
  //             });
  //             touch_moveList.clear();
  //           }
  //         },
  //         touch_moveFun: (evt) => {
  //           let w = parseFloat(style.width);
  //           let h = parseFloat(style.height);
  //           let box = $self.config.video.getBoundingClientRect();
  //           for (let i = 0; i < evt.changedTouches.length; ++i) {
  //             const t = evt.changedTouches[i];
  //             let x = ((t.clientX - box.left) / w) * 2 - 1;
  //             let y = ((t.clientY - box.top) / h) * 2 - 1;
  //             y = -y;
  //             var o = touch_moveList.get(t.identifier);
  //             if (!o || o.x != x || o.y != y) {
  //               touch_moveList.set(t.identifier, { x: x, y: y });
  //               touch_hasChanged = true;
  //             }
  //           }
  //         },
  //       };
  //     })();

  //     var limtFunsMouseMoveInterval = setInterval(
  //       limtFuns.mouse_intervalFun,
  //       1000 / config.limtMoveCPS
  //     );
  //     config.video.addEventListener("mousedown", (e) => {
  //       clearInterval(limtFunsMouseMoveInterval);
  //       limtFunsMouseMoveInterval = setInterval(
  //         limtFuns.mouse_intervalFun,
  //         1000 / (config.limtMoveCPS * 2)
  //       );
  //     });
  //     config.video.addEventListener("mouseup", (e) => {
  //       if (e.buttons == 0) {
  //         clearInterval(limtFunsMouseMoveInterval);
  //         limtFunsMouseMoveInterval = setInterval(
  //           limtFuns.mouse_intervalFun,
  //           1000 / config.limtMoveCPS
  //         );
  //       }
  //     });
  //     config.video.addEventListener("mousemove", limtFuns.mouse_moveFun);

  //     var limtTouchMoveInterval;
  //     config.video.addEventListener("touchstart", (e) => {
  //       limtFuns.touch_intervalFun(); // flush all mouse move event
  //       if (!limtTouchMoveInterval)
  //         limtTouchMoveInterval = setInterval(
  //           limtFuns.touch_intervalFun,
  //           1000 / (config.limtMoveCPS * 3)
  //         );
  //     });
  //     config.video.addEventListener("touchend", (e) => {
  //       limtFuns.touch_intervalFun(); // flush all mouse move event
  //       if (e.buttons == 0) clearInterval(limtTouchMoveInterval);
  //     });
  //     config.video.addEventListener("touchmove", limtFuns.touch_moveFun, {
  //       passive: false,
  //     });
  //   } else {
  //     config.video.addEventListener("mousemove", events.MouseMove);
  //     config.video.addEventListener("touchmove", events.TouchMove, {
  //       passive: false,
  //     });
  //   }
  //   config.video.addEventListener("mousedown", events.MouseDown);
  //   config.video.addEventListener("mouseup", events.MouseUp);
  //   var win = global;
  //   while (win.parent && win.parent != win) win = win.parent;
  //   win.addEventListener("mouseup", events.MouseUp);

  //   config.video.addEventListener("mousewheel", events.MouseWheel);
  //   config.video.addEventListener("dblclick", events.MouseDBClick);

  //   config.video.addEventListener("touchstart", events.TouchDown);
  //   config.video.addEventListener("touchend", events.TouchUp);

  //   win.addEventListener("keydown", events.KeyDown);
  //   win.addEventListener("keyup", events.KeyUp);
  //   win.addEventListener("blur", events.Blur);

  //   if (!$self.isNativeApp) {
  //     config.video.addEventListener("mousedown", $self.resetTimer);
  //     config.video.addEventListener("mousemove", $self.resetTimer);
  //     config.video.addEventListener("mouseup", $self.resetTimer);
  //     config.video.addEventListener("mousewheel", $self.resetTimer);
  //     config.video.addEventListener("touchstart", $self.resetTimer);
  //     config.video.addEventListener("touchmove", $self.resetTimer);
  //     config.video.addEventListener("touchend", $self.resetTimer);
  //   }
  // }

  // if (config.autoResize) {
  //   setInterval(
  //     (function () {
  //       let videoWidth, videoHeight;
  //       return function (force) {
  //         let width = Math.round(parseFloat(style.width));
  //         let height = Math.round(parseFloat(style.height));
  //         if (force || videoWidth != width || videoHeight != height) {
  //           if ($self.resize(width, height)) {
  //             videoWidth = width;
  //             videoHeight = height;
  //           }
  //         }
  //       };
  //     })(),
  //     100
  //   );
  // }

  $self.reconnect();
}

RemotePlayer.prototype.constructor = RemotePlayer;

// for event system
RemotePlayer.prototype.on = function (name, fn) {
  this.event[name] = fn;
  var arg = this.finishEventObjMap[name];
  if (arg) fn(arg);
};
RemotePlayer.prototype.off = function (name) {
  delete this.eventMap[name];
};
RemotePlayer.prototype.emit = function (name, ...val) {
  if (this.eventMap[name] && this.eventMap[name].length > 0)
    this.eventMap[name].forEach((fn) => {
      fn(...val);
    });
  else return false;
  return true;
};

// send mousemove event
RemotePlayer.prototype.mousemove = (function () {
  let buffer = new ArrayBuffer(12);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.MouseMove, true);
  return function (x, y) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      this._controlChannel.send(buffer);
      console.debug(`MouseMove: [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send mousedown event
RemotePlayer.prototype.mousedown = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.MouseDown, true);
  return function (x, y, btn) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, btn, true);
      this._controlChannel.send(buffer);
      console.debug(`MouseDown: [${btn}, ${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send mouseup event
RemotePlayer.prototype.mouseup = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.MouseUp, true);
  return function (x, y, btn) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, btn, true);
      this._controlChannel.send(buffer);
      console.debug(`MouseUp:${btn} [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send mousewheel event
RemotePlayer.prototype.mosuewheel = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.MouseWheel, true);
  return function (x, y, delta) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, delta, true);
      this._controlChannel.send(buffer);
      console.debug(`MouseWheel:${delta} [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send mousedbclick event
RemotePlayer.prototype.mousedbclick = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.MouseDBClick, true);
  return function (x, y, btn) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, btn, true);
      this._controlChannel.send(buffer);
      console.debug(`MouseDBClick:${btn} [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send resize event
RemotePlayer.prototype.resize = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.WindowSize, true);
  return function (w, h) {
    if (this._controlChannel && w >= 64 && h >= 64) {
      w = Math.ceil(w / 2.0) * 2.0;
      h = Math.ceil(h / 2.0) * 2.0;
      dataView.setFloat32(4, w, true);
      dataView.setFloat32(8, h, true);
      dataView.setInt32(12, 96 /*DPI*/, true);
      this._controlChannel.send(buffer);
      console.debug(`WindowSize: [${w}, ${h}]`);
      return true;
    }
    return false;
  };
})();

// send touchdown event
RemotePlayer.prototype.touchdown = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.TouchDown, true);
  return function (x, y, id) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, id, true);
      this._controlChannel.send(buffer);
      console.debug(`TouchDown:${id} [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send touchup event
RemotePlayer.prototype.touchup = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.TouchUp, true);
  return function (x, y, id) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, id, true);
      this._controlChannel.send(buffer);
      console.debug(`TouchUp:${id} [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send touchmove event
RemotePlayer.prototype.touchmove = (function () {
  let buffer = new ArrayBuffer(16);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.TouchMove, true);
  return function (x, y, id) {
    if (this._controlChannel) {
      dataView.setFloat32(4, x, true);
      dataView.setFloat32(8, y, true);
      dataView.setInt32(12, id, true);
      this._controlChannel.send(buffer);
      console.debug(`TouchMove:${id} [${x}, ${y}]`);
      return true;
    }
    return false;
  };
})();

// send keydown event
RemotePlayer.prototype.keydown = (function () {
  let buffer = new ArrayBuffer(8);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.KeyDown, true);
  return function (keycode) {
    if (this._controlChannel) {
      dataView.setInt32(4, keycode, true);
      this._controlChannel.send(buffer);
      console.debug(`KeyDown:${keycode}`);
      return true;
    }
    return false;
  };
})();

// send keyup event
RemotePlayer.prototype.keyup = (function () {
  let buffer = new ArrayBuffer(8);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.KeyUp, true);
  return function (keycode) {
    if (this._controlChannel) {
      dataView.setInt32(4, keycode, true);
      this._controlChannel.send(buffer);
      console.debug(`KeyUp:${keycode}`);
      return true;
    }
    return false;
  };
})();

// send exit event
RemotePlayer.prototype.exit = (function () {
  let buffer = new ArrayBuffer(4);
  let dataView = new DataView(buffer);
  dataView.setInt32(0, RemotePlayerMsgType.Exit, true);
  return function () {
    clearTimeout(this._userTimer);
    if (this._controlChannel) {
      this._controlChannel.send(buffer);
      this._controlChannel = null;
    }
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    if (this._pc) {
      this._pc.close();
      this._pc = null;
    }
    if (!this.exited) {
      this.exited = true;
      console.info("Exit");
    }
    return true;
  };
})();

// RemotePlayer.prototype.snapshot = function () {
//   var canvas = document.createElement("canvas");
//   canvas.width = this.config.video.width | this.config.video.videoWidth;
//   canvas.height = this.config.video.height | this.config.video.videoHeight;
//   var ctx = canvas.getContext("2d");
//   ctx.translate(canvas.width / 2, canvas.height / 2);
//   ctx.scale(1, -1);
//   ctx.translate(-canvas.width / 2, -canvas.height / 2);
//   ctx.drawImage(this.config.video, 0, 0, canvas.width, canvas.height);
//   var img = document.createElement("img");
//   img.src = canvas.toDataURL("image/jpeg", 1);
//   img.save = function () {
//     var alink = document.createElement("a");
//     alink.href = img.src;
//     alink.download = "snapshot.jpg";
//     alink.click();
//   };
//   return img;
// };

module.exports = RemotePlayer;
