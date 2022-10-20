# 从零实现前端埋点SDK
## 什么是埋点
埋点就是数据采集和数据上报的行为，例如：用户页面停留时间、按钮点击、页面跳转等
## 为什么要做埋点
埋点可以收集大量的用户行为数据，经过数据人员的分析和挖掘就能够为运营人员提供有力的数据，从而获取用户的喜好和交互习惯，从而优化流程、提升用户体验和提高核心用户转化率
## 技术栈
本次项目使用typescript + rollup
+ 使用typescript可以在开发编译的时候就发现问题
+ 使用rollup打出来的包更加简洁
## 初始化项目
### 初始化package.json和ts

```
npm init -y
```
```
tsc --init
```
### 创建目录
根据下面的目录结构创建文件夹和文件
```xml
.
├── src
│   ├── core
|   |   |── index.ts
│   ├── types
|   |   |── index.ts
│   ├── utils
|   |   |── pv.ts
├── package.json
├── rollup.config.js
├── tsconfig.json
```
### 安装依赖
```
npm install typescript -D
npm install rollup -D
npm install rollup-plugin-dts -D    // 用于生成类型声明文件
npm install rollup-plugin-typescript2 -D   // 支持使用TS来进行开发
```
### 配置rollup.config.js
```js
import path from "path"
import ts from "rollup-plugin-typescript2"
import dts from "rollup-plugin-dts"

export default [
  {
    input: "./src/core/index.ts", // 入口文件
    // 输出三个类型：es、cjs和umd
    output: [
      {
        file: path.resolve(__dirname, "./dist/index.esm.js"),
        format: "es"
      },
      {
        file: path.resolve(__dirname, "./dist/index.cjs.js"),
        format: "cjs"
      },
      {
        file: path.resolve(__dirname, "./dist/index.js"),
        format: "umd",
        name: "tracker"
      }
    ],
    plugins: [
      ts()
    ]
  },
  // 输出声明文件
  {
    input: "./src/core/index.ts", // 入口文件
    output: {
      file: path.resolve(__dirname, "./dist/index.d.ts"),
      format: "es"
    },
    plugins: [
      dts()
    ]
  },
]
```
### 配置package.json
```json
{
  "name": "tracker",
  "version": "1.0.0",
  "description": "",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "rollup -c"
  },
  "keywords": [],
  "author": "",
  "files": [
    "dist"
  ],
  "license": "ISC",
  "devDependencies": {
    "rollup": "^2.76.0",
    "rollup-plugin-dts": "^4.2.2",
    "rollup-plugin-typescript2": "^0.32.1",
    "typescript": "^4.7.4"
  }
}
```
### 测试
在core/index.ts文件写一段测试代码，执行build命令，打包成功切根目录下的dist文件夹有输出文件说明初始化项目成功
```ts
// core/index.ts

const fn = (num: number): number => {
  return num * 2
}
const a: number = 10
console.log(fn(a));
```
## 实现核心代码
### 定义类型
在types/core.ts文件夹下定义我们需要使用到类型
+ DefaultOptions - 默认参数类型
+ Options - 用户传递参数类型
+ TrackerConfig - sdk的版本号
```ts
// types/core.ts

/**
 * 默认参数类型
 * @requestUrl 接口地址
 * @historyTracker history上报
 * @hashTracker hash上报
 * @domTracker 携带Tracker-key标识的dom元素，点击上报
 * @sdkVersion sdk版本号
 * @extra 上报的数据
 * @jsError js和promise异常上报
 */
export interface DefaultOptions {
  uuid: string | undefined,
  requestUrl: string | undefined,
  historyTracker: boolean,
  hashTracker: boolean,
  domTracker: boolean,
  sdkVersion: string | number,
  extra: Record<string, any> | undefined,
  jsError: boolean
}

// 用户传递参数类型，requestUrl接口地址为必传项
export interface Options extends Partial<DefaultOptions>  {
  requestUrl: string
}

// sdk的版本号
export enum TrackerConfig {
  version = '1.0.0'
}
```
### 初始化Tracker类
在core/index.ts中导出Tracker
```ts
// core/index.ts

import {DefaultOptions, TrackerConfig, Options} from "../types/core"
export default class Tracker {
  public data: Options // 参数
  constructor(options: Options) {
    // 合并参数
    this.data = Object.assign({}, this.initDefaultOptions(), options)
  }
  // 返回默认参数
  private initDefaultOptions(): DefaultOptions {
    return <DefaultOptions>{
      sdkVersion: TrackerConfig.version,
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      jsError: false
    }
  }
}
```
### core核心功能
#### PV
PageView的缩写，即页面访问量，实现的功能是将用户对网页的访问记录并上报

单页应用分为两种路由模式：history和hash
+ hash模式我们使用 hashchange 监听来实现功能
+ history模式无法通过 popstate 监听 pushState replaceState，所以我们只能重写其函数来实现功能
```ts
// utils/pv.ts

// 捕获history事件，再自定义事件派发出去，已达到监听的目的
export const createHistoryEvnent = <T extends keyof History>(type: T): () => any => {
  const origin = history[type];
  return function (this: any) {
      const res = origin.apply(this, arguments)
      var e = new Event(type)
      window.dispatchEvent(e)
      return res;
  }
}
```
```ts
// core/index.ts

// 重写history函数
private rewriteHistoryFn() {
  window.history['pushState'] = createHistoryEvnent('pushState')
  window.history['replaceState'] = createHistoryEvnent('replaceState')
}

// 捕获事件，上报数据
private captureEvents<T>(MouseEventList: string[], targetKey: string, data?: T) {
  MouseEventList.forEach(event => {
    window.addEventListener(event, () => {
      // 执行数据上报方法
    })
  })
}

// 根据传参开启事件的捕获
private installTracker() {
  if (this.data.historyTracker) {
    if (this.data.historyTracker) {
      this.captureEvents(['pushState', 'replaceState', 'popstate'], 'histpry-pv')
    }
    if (this.data.hashTracker) {
      this.captureEvents(['hashchange'], 'hash-pv')
    }
  }
}
```
#### UV
unique view的缩写，即访问网站的自然人，用户的唯一标识，一般是用户登录后给定的userid，我们给一个函数进行userid的绑定，每次上报数据携带此参数
```ts
// core/index.ts

public setUserId<T extends DefaultOptions['uuid']>(uuid: T) {
  this.data.uuid = uuid
}
```
#### 数据上报
sdk采用 navigator.sendBeacon 的方式上报数据，原因是使用sendBeacon() 方法会使用户代理在有机会时异步地向服务器发送数据，同时不会延迟页面的卸载或影响下一导航的载入性能。这就解决了提交分析数据时的所有的问题：数据可靠，传输异步并且不会影响下一页面的加载。通俗的讲就是跟 XMLHttrequest 对比  navigator.sendBeacon 即使页面关闭了 也会完成请求 而XMLHTTPRequest 不一定，[通过MDN了解更多](https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator/sendBeacon)

我们编写一个上报函数
```ts
// core/index.ts

// 上报数据
private reportTracker<T>(data: T) {
  const params = Object.assign(this.data, data, { time: new Date().getTime() })
  let headers = {
    type: 'application/x-www-form-urlencoded'
  };
  let blob = new Blob([JSON.stringify(params)], headers);
  console.log(blob);

  navigator.sendBeacon(this.data.requestUrl, blob)
}
```

我们在根目录下新建一个server文件夹，使用express编写一个测试的上报接口
+ 初始化
```
npm init -y
```
+ 安装依赖
```
// cors解决跨域问题

npm install express cors -S
```
+ 在根目录下新建index.js编写接口
```js
// index.js

const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }))

app.post('/tracker', (req, res) => {
  console.log(req.body);
  res.send(200)
})

app.listen(9000, () => {
  console.log('服务启动在9000');
})
```
+ 启动服务
```
node index.js
```
测试一下
+ 修改捕获事件上报的函数
```ts
// core/index.ts

// 捕获事件，上报数据
private captureEvents<T>(MouseEventList: string[], targetKey: string, data?: T) {
  MouseEventList.forEach(event => {
    window.addEventListener(event, () => {
      this.reportTracker({
        event,
        targetKey,
        data
      })
    })
  })
}
```
+ 打包
```
npm run build
```
+ 根目录下新建index.html，引入打包后的代码，使用Live Server开启一个静态服务器（需要提前安装一下Live Server这个插件）
```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>

<body>
  <button target-key="btn">有标识按钮</button>
  <button>无标识按钮</button>
  <script src="./dist/index.js"></script>
  <script>
    new tracker({
      requestUrl: "http://127.0.0.1:9000/tracker",
      historyTracker: true,
      domTracker: true,
      jsError: true
    })
  </script>
</body>

</html>
```
+ 在控制台执行history.pushState('', '', '/a')，可以看到网络的all里面有一条请求记录，类型是ping，同时后台接口也会打印body
#### DOM事件监听
给需要监听上报的dom元素添加一个属性来标识
```html
<button target-key="btn">有标识按钮</button>
<button>无标识按钮</button>
```
在core/index.ts里面编写dom监听上报的代码
```ts
// cord/index.ts

const MouseEventList: string[] = ['click', 'dblclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseenter', 'mouseout', 'mouseover']

private targetKeyReport() {
    MouseEventList.forEach(event => {
      window.addEventListener(event, (e) => {
        const target = e.target as HTMLElement
        const targetValue = target.getAttribute('target-key')
        if (targetValue) {
          this.sendTracker({
            targetKey: targetValue,
            event
          })
        }
      })
    })
  }
```
#### js异常上报
我们上报error事件和promise的报错unhandledrejection
```ts
// cord/index.ts

private jsError() {
  this.errorEvent()
  this.promiseReject()
}
private errorEvent() {
  window.addEventListener('error', (event) => {
    this.reportTracker({
      event: 'error',
      targetKet: "error",
      message: event.message
    })
  })
}

private promiseReject() {
  window.addEventListener("unhandledrejection", (event) => {
    event.promise.catch(error => {
      this.reportTracker({
        event: 'promise',
        targetKet: "error",
        message: error
      })
    })
  })
}
```
#### 用户手动上报
再新增一个函数，让用户能够手动上报
```ts
// cord/index.ts

// 手动上报
public sendTracker<T>(data: T) {
  this.reportTracker(data)
}
```
## 完整代码
+ src/core/index.ts
```ts
import { DefaultOptions, TrackerConfig, Options } from "../types/core"
import { createHistoryEvnent } from "../utils/pv"

const MouseEventList: string[] = ['click', 'dblclick', 'contextmenu', 'mousedown', 'mouseup', 'mouseenter', 'mouseout', 'mouseover']

export default class Tracker {
  public data: Options // 参数
  constructor(options: Options) {
    // 合并参数
    this.data = Object.assign({}, this.initDefaultOptions(), options)
    this.rewriteHistoryFn()
    this.installTracker()
  }
  // 返回默认参数
  private initDefaultOptions(): DefaultOptions {
    return <DefaultOptions>{
      sdkVersion: TrackerConfig.version,
      historyTracker: false,
      hashTracker: false,
      domTracker: false,
      jsError: false
    }
  }
  // 重写history函数
  private rewriteHistoryFn() {
    window.history['pushState'] = createHistoryEvnent('pushState')
    window.history['replaceState'] = createHistoryEvnent('replaceState')
  }

  // 手动上报
  public sendTracker<T>(data: T) {
    this.reportTracker(data)
  }

  // 捕获事件，上报数据
  private captureEvents<T>(MouseEventList: string[], targetKey: string, data?: T) {
    MouseEventList.forEach(event => {
      window.addEventListener(event, () => {
        this.reportTracker({
          event,
          targetKey,
          data
        })
      })
    })
  }

  // 根据传参开启事件的捕获
  private installTracker() {
    if (this.data.historyTracker) {
      this.captureEvents(['pushState', 'replaceState', 'popstate'], 'histpry-pv')
    }
    if (this.data.hashTracker) {
      this.captureEvents(['hashchange'], 'hash-pv')
    }
    if (this.data.domTracker) {
      this.targetKeyReport()
    }
    if (this.data.jsError) {
      this.jsError()
    }
  }

  // 上报数据
  private reportTracker<T>(data: T) {
    const params = Object.assign(this.data, data, { time: new Date().getTime() })
    let headers = {
      type: 'application/x-www-form-urlencoded'
    };
    let blob = new Blob([JSON.stringify(params)], headers);
    console.log(blob);

    navigator.sendBeacon(this.data.requestUrl, blob)
  }

  public setUserId<T extends DefaultOptions['uuid']>(uuid: T) {
    this.data.uuid = uuid
  }
  public setExtra<T extends DefaultOptions['extra']>(extra: T) {
    this.data.extra = extra
  }

  private jsError() {
    this.errorEvent()
    this.promiseReject()
  }
  private errorEvent() {
    window.addEventListener('error', (event) => {
      this.reportTracker({
        event: 'error',
        targetKet: "error",
        message: event.message
      })
    })
  }

  private promiseReject() {
    window.addEventListener("unhandledrejection", (event) => {
      event.promise.catch(error => {
        this.reportTracker({
          event: 'promise',
          targetKet: "error",
          message: error
        })
      })
    })
  }

  private targetKeyReport() {
    MouseEventList.forEach(event => {
      window.addEventListener(event, (e) => {
        const target = e.target as HTMLElement
        const targetValue = target.getAttribute('target-key')
        if (targetValue) {
          this.sendTracker({
            targetKey: targetValue,
            event
          })
        }
      })
    })
  }
}
````
+ src/types/core.ts
```ts
/**
 * @requestUrl 接口地址
 * @historyTracker history上报
 * @hashTracker hash上报
 * @domTracker 携带Tracker-key标识的dom元素，点击上报
 * @sdkVersion sdk版本号
 * @extra 上报的数据
 * @jsError js和promise异常上报
 */
export interface DefaultOptions {
  uuid: string | undefined,
  requestUrl: string | undefined,
  historyTracker: boolean,
  hashTracker: boolean,
  domTracker: boolean,
  sdkVersion: string | number,
  extra: Record<string, any> | undefined,
  jsError: boolean
}

export interface Options extends Partial<DefaultOptions>  {
  requestUrl: string
}

export enum TrackerConfig {
  version = '1.0.0'
}
```
+ src/utils/pv.ts
```ts
// 捕获history事件，再自定义事件派发出去，已达到监听的目的
export const createHistoryEvnent = <T extends keyof History>(type: T): () => any => {
  const origin = history[type];
  return function (this: any) {
    const res = origin.apply(this, arguments)
    var e = new Event(type)
    window.dispatchEvent(e)
    return res;
  }
}
```